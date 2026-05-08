# meadow-integration: Comprehensions

A **Comprehension** is the canonical data shape for getting structured records *into* a Meadow REST API. It's a JSON object keyed by entity name → external GUID → record fields. You build one (by hand, via `csvtransform`, via merging others), inspect it as a file, and then push it via `npx meadow-integration load_comprehension`. The push step does GUID marshaling, foreign-key resolution against the live schema, and bulk upsert with retries.

This is the right tool whenever you have records to land on a Meadow server *outside* the live UI flow — seeding demo data, ETLs, mass migrations, replays. Decoupling generation from push is the whole point: you can `cat` the JSON, diff it, version it, run intersect/array tools on it, before any server takes a write.

## Where things live

| Path | What it is |
|---|---|
| `meadow-integration/docs/comprehensions.md` | High-level overview of the format, multi-entity files, GUID design |
| `meadow-integration/docs/comprehension-push/configuration.md` | `.meadow.config.json` schema and CLI flag reference |
| `meadow-integration/docs/cli/load-comprehension.md` | Push command reference |
| `meadow-integration/docs/cli/comprehensionintersect.md` | Merge two comprehensions |
| `meadow-integration/docs/cli/comprehensionarray.md` | Convert object format ↔ array format |
| `meadow-integration/docs/examples-walkthrough.md` | End-to-end walkthroughs |
| `meadow-integration/docs/examples/bookstore/` | Working multi-entity example (Book, Author, BookAuthorJoin) with mapping files |
| `meadow-integration/docs/examples/multi_set_integration/` | Multi-set example |
| `meadow-integration/test/data/test-comprehension.json` | Smallest possible example |
| `meadow-integration/source/cli/Meadow-Integration-CLI-Run.js` | CLI entry (`bin.mdwint`) |
| `meadow-integration/source/cli/commands/Meadow-Integration-Command-ComprehensionPush.js` | The push command implementation |
| `meadow-integration/source/Meadow-Service-Integration-Adapter.js` | The adapter — marshals records, resolves FKs, calls Upsert |
| `meadow-integration/source/Meadow-Service-Integration-GUIDMap.js` | Session-scoped external-GUID → Meadow-ID map |
| `meadow-integration/source/restserver/endpoints/Endpoint-ComprehensionPush.js` | REST equivalent of the CLI push |
| `meadow-integration/source/restserver/endpoints/Endpoint-ComprehensionIntersect.js` | REST merge endpoint |

When in doubt: read [`docs/comprehensions.md`](meadow-integration/docs/comprehensions.md) and the bookstore example. They cover 90% of what you need.

## File shape

The **object format** is the working format — what you build, push, and inspect:

```json
{
  "Person": {
    "Person_1": { "GUIDPerson": "Person_1", "Name": "Alice", "City": "Seattle", "Country": "USA" },
    "Person_2": { "GUIDPerson": "Person_2", "Name": "Bob",   "City": "Portland" }
  }
}
```

Two invariants:
1. **Top-level keys are entity names** — the Meadow entity to write to.
2. **Each record's key matches its `GUID<EntityName>` field.** This is the *external* GUID — your stable identifier in source-data terms.

A multi-entity comprehension is a single file with multiple top-level keys (this is the common case):

```json
{
  "Book":           { "Book_1": { "GUIDBook": "Book_1", "Title": "..." } },
  "Author":         { "Author_SC": { "GUIDAuthor": "Author_SC", "Name": "..." } },
  "BookAuthorJoin": { "BAJ_1": { "GUIDBookAuthorJoin": "BAJ_1", "GUIDBook": "Book_1", "GUIDAuthor": "Author_SC" } }
}
```

The **array format** exists for export to other tools — convert with `comprehensionarray`. Use object format when in doubt.

### Object-format guarantees

- **O(1) lookup by GUID** — no scanning.
- **Natural deduplication** — same external GUID twice = the second write wins (object key collision).
- **Mergeability** — `Object.assign()` is the merge operator. `comprehensionintersect` is the CLI for it.
- **Field values are JSON** — strings, numbers, booleans, nested objects, arrays. There's no field-level merging; the field is the unit of replacement.

## GUID marshaling and prefixes

External GUIDs from your source data don't go to Meadow as-is. The adapter generates a Meadow GUID by composing prefixes:

```
MeadowGUID = AdapterSetGUIDMarshalPrefix - EntityGUIDMarshalPrefix - ExternalGUID
```

Defaults from [`Meadow-Service-Integration-Adapter.js:76-92`](meadow-integration/source/Meadow-Service-Integration-Adapter.js):
- `AdapterSetGUIDMarshalPrefix` = `"INTG-DEF"` (override with `--prefix` / `-p`)
- `EntityGUIDMarshalPrefix` = auto-generated from the capital letters of the entity name (`Book` → `B`, `BookAuthorJoin` → `BAJ`), or override with `--entityguidprefix` / `-e`

So `Book_1` with `--prefix MYAPP` becomes `MYAPP-B-Book_1` in Meadow. The same input always produces the same Meadow GUID — that's how re-runs upsert in place instead of duplicating.

**Length validation** ([adapter:199-234](meadow-integration/source/Meadow-Service-Integration-Adapter.js)):
- Default GUID column = 36 chars. The adapter pulls actual schema sizes during marshaling.
- If `prefix-entityprefix-externalGUID` exceeds the schema size, marshaling **errors by default**.
- Pass `--allowguidtruncation` to truncate the *prefix* while preserving the full external GUID.
- Per-entity overrides via `GUIDColumnSizes` option, or globally via `GUIDMaxLength`.

The takeaway: pick a prefix once per app/environment and stick with it. Changing the prefix later breaks idempotency — every record gets a new Meadow GUID and you'll get duplicates on the server.

## Foreign keys

Three patterns, in order of how often you'll use them:

| Field shape | Resolution | When to use |
|---|---|---|
| `GUID<Entity>: "external-guid"` | Looked up in the **session GUID map** (built from records pushed *in this run*) → converted to `ID<Entity>` | Both records are in the same comprehension |
| `_GUID<Entity>: "external-guid"` | **Async server lookup** via `GET /<Entity>/By/GUID<Entity>/<GUID>` → converted to `ID<Entity>` | Reference is to an entity already on the server |
| `_Dest_ID<Entity>_Via__GUID<Entity>: "..."` | Same as `_GUID*` but lets you control the destination field name | Advanced cases where the FK column isn't the obvious `ID<Entity>` |

So if your comprehension has both `Book` and `Author`, a `BookAuthorJoin` row uses unprefixed `GUIDBook` / `GUIDAuthor`. If `Author` already exists on the server (and you don't want to push it again), use `_GUIDAuthor` instead.

**Order within a single push matters.** The session GUID map is built as the adapter processes entities in order, so referenced entities should appear before referrers. Authors before BookAuthorJoins.

**FK validation is non-fatal.** Missing references log warnings but don't abort the push — they store NULL/0 in the FK column. Pre-validate if that's a problem for you.

## Building a comprehension

Three ways. Pick whichever fits the source.

### 1. Programmatically (Node)

The most flexible — you have full code, can mock data deterministically, can produce nested JSON in fields. **This is the right path for synthetic demo data.** Just build the object and `JSON.stringify(...)` to disk:

```js
const tmpComprehension = {
    AppData: {},
    ManifestSchema: {}
};
for (const tmpDate of tmpDays) {
    const tmpKey = `walbec-moisture-daily-${isoDate(tmpDate)}`;
    tmpComprehension.AppData[tmpKey] = {
        GUIDAppData: tmpKey,
        Type: 'AggregatedDashboardData',
        AppHash: 'walbec-moisture-daily',
        IDCustomer: 182,
        Title: tmpKey,
        Datum: JSON.stringify(bucketPayload(tmpDate))
    };
}
require('fs').writeFileSync('out.json', JSON.stringify(tmpComprehension, null, 2));
```

Now you can `cat out.json | jq` and look at every record before any push happens.

### 2. From a CSV (`csvtransform`)

When the source is tabular. Mapping files describe how columns become entity records:

```bash
npx meadow-integration csvtransform books.csv -m mapping_Book.json -o store.json
npx meadow-integration csvtransform books.csv -m mapping_Author.json -i store.json -o store.json
npx meadow-integration csvtransform books.csv -m mapping_Join.json   -i store.json -o store.json
```

The `-i <file>` flag merges into an existing comprehension. Run multiple mappings against the same CSV (or different CSVs) to accumulate entities into one file. See [examples/bookstore/](meadow-integration/docs/examples/bookstore/) for working mapping files.

### 3. From other comprehensions (`comprehensionintersect`)

Merge two comprehensions field-by-field. Later values overwrite earlier ones:

```bash
npx meadow-integration comprehensionintersect base.json -i overlay.json -e Person -o merged.json
```

Used when the same entity has data spread across files — e.g. housing characteristics in one file, housing costs in another, both keyed by neighborhood GUID.

## Pushing

```bash
npx meadow-integration load_comprehension out.json \
    --api_server  https://api.qa.headlight.com/1.0/ \
    --api_username alice \
    --api_password 'pw' \
    --prefix MYAPP
```

Aliases: `load`, `push`. Globally installed: `mdwint load_comprehension out.json …`.

### Config file

`.meadow.config.json` cascades from CWD up through parents to `~/.meadow.config.json`. CLI flags override config:

```json
{
    "Source": {
        "ServerURL": "https://api.qa.headlight.com/1.0/",
        "UserID": "service_user",
        "Password": "service_password"
    },
    "SessionManager": {
        "Sessions": {
            "Default": {
                "ServerURL": "https://api.qa.headlight.com/1.0/",
                "Credentials": { "username": "u", "password": "p" }
            }
        }
    }
}
```

Auth order ([Endpoint-ComprehensionPush.js](meadow-integration/source/restserver/endpoints/Endpoint-ComprehensionPush.js) + [docs/comprehension-push/configuration.md](meadow-integration/docs/comprehension-push/configuration.md)):
1. **SessionManager** authenticates first (if configured) and injects cookies into the REST client.
2. **Source.UserID/Password** logs in via `/Authenticate` (if set).
3. If neither, requests go unauthenticated.

Both can coexist. SessionManager is the "share the same `.meadow.config.json` with `data-clone`" pattern.

### Useful CLI flags

| Flag | Default | What |
|---|---|---|
| `-p` / `--prefix` | `INTG-DEF` | The `AdapterSetGUIDMarshalPrefix`. Set this per-app/env. |
| `-e` / `--entityguidprefix` | auto from caps | Override the per-entity prefix. |
| `--bulkupsert` | `true` | Use bulk upsert (`PUT /<Entity>/Upsert` with arrays). |
| `--batchsize` | `100` | Records per bulk batch. |
| `--progressinterval` | `100` | Log every N records per entity. |
| `--metaprogressinterval` | `0` | Cross-entity progress (0 = off). |
| `--allowguidtruncation` | off | Truncate the prefix when GUIDs would exceed the schema column size. |
| `--logfile` | none | Tee logs to a file. |

### Push behavior

- **Upsert by GUID.** Same external GUID + same prefix = same Meadow GUID = update in place. Re-runs are safe.
- **Field-level overwrite, no field-level merge.** If a field is a JSON blob (e.g. `Datum: '{"...":...}'`), the push replaces the whole blob. Pre-merge it client-side if you need partial updates.
- **Bulk by default.** Records batch into `PUT /<Entity>/Upsert` with arrays of `--batchsize`. Single mode falls back per record.
- **Retries.** Up to 5 retries on transient errors; on duplicate-GUID DB errors it falls back to a read to repopulate the session GUID map.
- **Partial failures continue.** A record that fails after retries is logged but doesn't abort the entity push. Watch the log if you need the count to match.

## REST equivalents

For programmatic use without the CLI:

- `POST /1.0/Comprehension/Push` — body: `{ Comprehension, GUIDPrefix, EntityGUIDPrefix, ServerURL }`. Response: `{ Success, EntitiesPushed, Message }` ([Endpoint-ComprehensionPush.js:33-55](meadow-integration/source/restserver/endpoints/Endpoint-ComprehensionPush.js)).
- `POST /1.0/Comprehension/Intersect` — merges two comprehensions in memory ([Endpoint-ComprehensionIntersect.js](meadow-integration/source/restserver/endpoints/Endpoint-ComprehensionIntersect.js)).

These are useful when the comprehension never needs to live on disk — e.g. another service builds it and pushes it through the same Meadow API server.

## Inspection workflow (the reason this pattern exists)

The comprehension format is *meant* to be inspected before push. The typical loop:

```bash
# 1. Generate
node build-walbec-comprehension.js > walbec.json

# 2. Eyeball the shape
jq 'keys'                         walbec.json     # which entities?
jq '.AppData | length'            walbec.json     # how many AppData rows?
jq '.AppData | to_entries | .[0]' walbec.json     # one example row
jq '.AppData | keys[]'            walbec.json     # all GUIDs

# 3. Diff against a previous run
diff <(jq -S . walbec.prev.json) <(jq -S . walbec.json) | head -100

# 4. Dry-run check (no flag for this — push to a scratch env or comment out the auth block)

# 5. Push
npx meadow-integration load_comprehension walbec.json --prefix WALBEC-DEMO
```

Version-control the generator script + the resulting comprehension if you want a fully-auditable demo trail. The push step is then a deterministic apply.

## Limitations and gotchas

1. **Don't change `--prefix` between runs.** Same data + different prefix = different Meadow GUIDs = duplicates on the server. Pick a prefix per app/env and pin it (in `.meadow.config.json` or a wrapper script).
2. **No field-level merge for JSON blobs.** `Datum` and `Manifest` are stored as strings. Pre-compute the full payload before adding it to the comprehension; don't expect the server to merge two partial comprehensions for the same record's nested JSON.
3. **Order matters within a push.** Referenced entities first. The session GUID map is built incrementally — if `BookAuthorJoin` references a Book that hasn't been written yet in this run, the FK silently lands as NULL/0.
4. **Missing FKs are non-fatal.** Watch the logs. Pre-validate references if your data depends on them.
5. **Duplicate external GUIDs within one entity = silent overwrite.** The second occurrence wins because the comprehension is an object. Make sure your GUID generation is unique inside the file.
6. **GUID column size mismatches default to error.** If you hit that, either shorten your prefix, override `GUIDColumnSizes`, or pass `--allowguidtruncation`. Note that truncation chops the prefix, not the external GUID — long prefixes with similar leading bytes can collide post-truncation.
7. **No built-in schema validation client-side.** The adapter trusts the comprehension to have valid field names; bad fields get rejected by the server during upsert. The error message is from Meadow, not from the adapter.
8. **SessionManager credentials don't override built-in auth.** Both run; SessionManager handles cookie injection while built-in auth does the direct `/Authenticate` POST. Either alone works.
9. **`comprehensionintersect` does shallow merge, not deep.** A field that's an object on both sides gets fully replaced, not key-merged. If you need a deep merge, do it in code before producing the comprehension.

## When NOT to use comprehensions

- **Tiny one-off writes from a UI flow.** The recordset/form path is simpler.
- **Reads.** Comprehensions are write-side only. Use `data-clone` or direct REST queries to read.
- **Schema migrations.** This is a record-level tool, not a DDL tool. Use `meadow-schema` / Stricture for schema changes.
- **Strict transactional consistency across entities.** Pushes are batched but not transactional; partial failures leave partial writes. If you need all-or-nothing, push to a staging environment first.

## Cheat sheet

```bash
# Build from CSV
npx meadow-integration csvtransform input.csv -m mapping.json -o out.json

# Convert object → array (for export)
npx meadow-integration comprehensionarray out.json -e MyEntity -o flat.json

# Merge two comprehensions
npx meadow-integration comprehensionintersect a.json -i b.json -e Entity -o merged.json

# Push
npx meadow-integration load_comprehension out.json --prefix MYAPP

# Inspect
jq 'keys'                       out.json
jq '.Entity | length'           out.json
jq '.Entity | to_entries[0:3]'  out.json
```
