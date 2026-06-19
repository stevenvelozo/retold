# pict-section-recordset

CRUD-and-dashboard scaffolding for record collections. Given a recordset configuration that points at a Meadow endpoint (or a custom provider), it auto-generates list, read, create, and dashboard views and registers `/PSRS/:RecordSet/...` routes.

This depends on [pict-section-form](CLAUDE-pict-section-form.md) — recordset dashboards are pict-section-form manifests with `PictDashboard` decorations. Read that file first if you're building dashboards with charts. For the end-to-end recipe (manifest anatomy, filter dropdowns, exports, usability), see [CLAUDE-building-dashboards.md](CLAUDE-building-dashboards.md).

## Where things live

| Path | What it is |
|---|---|
| `pict-section-recordset/source/Pict-Section-RecordSet.js` | Module entry point |
| `pict-section-recordset/source/services/RecordsSet-MetaController.js` | The orchestrator. Registration, manifests, route handlers all funnel through here |
| `pict-section-recordset/source/providers/RecordSet-RecordProvider-Base.js` | Provider interface — what `Custom` providers extend |
| `pict-section-recordset/source/providers/RecordSet-RecordProvider-MeadowEndpoints.js` | Default `MeadowEndpoint` provider |
| `pict-section-recordset/source/providers/RecordSet-Router.js` | Route registration |
| `pict-section-recordset/source/views/list/`, `read/`, `create/`, `dashboard/` | The four built-in views |
| `pict-section-recordset/source/views/filters/` | Filter widgets — DateRange, StringMatch, NumericRange, ExternalJoin* |
| `pict-section-recordset/source/providers/RecordSet-AssociationManager.js` | Join registry + data layer behind the association UIs (resolveSides, join CRUD, picker-cull config) |
| `pict-section-recordset/source/views/associate/RecordSet-AssociationEditor.js` | The embeddable association editor (a read-view tab) |
| `pict-section-recordset/source/views/associate/RecordSet-AssociateBulk.js` | The bulk associate screen |
| `pict-section-recordset/example_applications/bookstore/` | **The reference example.** Working app, multiple recordsets, multiple dashboards, full filter set, both association UIs |
| `pict-section-recordset/example_applications/bookstore/Bookstore-Application.js` | Full configuration including `FilterCriteria`, `Filters`, `DefaultRecordSetConfigurations` |

When in doubt: read the bookstore example. It exercises every filter family at least once.

## Routes the router registers

For every registered RecordSet, these routes become available:

```
/PSRS/:RecordSet/List
/PSRS/:RecordSet/List/FilteredTo/:Filter
/PSRS/:RecordSet/List/:Offset/:PageSize
/PSRS/:RecordSet/Read/:GUID
/PSRS/:RecordSet/Create
/PSRS/:RecordSet/Dashboard
/PSRS/:RecordSet/Dashboard/FilteredTo/:Filter
/PSRS/:RecordSet/SpecificDashboard/:DashboardHash
/PSRS/:RecordSet/SpecificDashboard/:DashboardHash/FilteredTo/:Filter
/PSRS/:RecordSet/SpecificDashboard/:DashboardHash/:Offset/:PageSize
/PSRS/:RecordSet/LoadDynamic                      // runtime registration via URL
/PSRS/:RecordSet/LoadDynamic/:Entity
/PSRS/:RecordSet/LoadDynamic/:Entity/:DefaultFilter
/PSRS/:RecordSet/Associate/:Association           // bulk associate screen (anchor = :RecordSet)
/PSRS/:RecordSet/Associate/:Association/:AnchorID  // …with the anchor record preselected
/PSRS/AssociateMatrix/:Association                 // dual-column cross-link screen (left = SideA)
/PSRS/AssociateMatrix/:Association/:LeftRecordSet  // …with the named side on the left
/PSRS/AssociateUnlink/:Association/:AnchorRecordSet            // bulk-unlink an anchor's links
/PSRS/AssociateUnlink/:Association/:AnchorRecordSet/:AnchorID  // …with the anchor preselected
```

(The read view's single-record route verb is `View` — `/PSRS/:RecordSet/View/:GUIDRecord` — not `Read`.)

`SpecificDashboard` is the route to use for dashboards driven by a named manifest. The DashboardHash matches the manifest's `Scope`.

## Recordset configuration shape

```js
{
    "RecordSet": "Book",                          // unique name — also the URL segment
    "Title": "Books",                             // display name
    "RecordSetType": "MeadowEndpoint",            // 'MeadowEndpoint' | 'Custom'
    "RecordSetMeadowEntity": "Book",              // Meadow entity to query (defaults to RecordSet name)
    "RecordSetURLPrefix": "/1.0/",                // Meadow base URL — defaults to '/1.0/'
    "RecordSetDefaultFilter": "FBV~Status~EQ~active",  // pre-applied filter string (composes with user filters)

    // Dashboard wiring
    "RecordSetDashboardManifestOnly": true,       // if true, don't auto-generate columns from schema
    "RecordSetDashboardDefaultManifest": "BookOverview",
    "RecordSetDashboardManifests": [ "BookOverview", "TopSellers", "Underdogs" ],

    // Auto-generated list (used when no manifest)
    "RecordSetListColumns":
    [
        { "Key": "Title",       "DisplayName": "Title",  "PictDashboard": { "ValueTemplate": "{~D:Record.Data.Title~}" } },
        { "Key": "PublishedYear","DisplayName": "Year" }
    ],

    // Filter wiring (references FilterCriteria + Filters defined at top level)
    "FilterExperiences":
    {
        "FilterByAuthor": { "Ordinal": 1, "FilterCriteriaHash": "FilterRecordsetByAuthor", "Default": true }
    },
    "SearchFields": [ "Title" ],

    "AvailableVerbs": [ "Dashboard", "List", "Read" ],
    "RecordSetIgnoreFilterFields": [ "Deleted", "DeletingIDUser", "DeleteDate" ]
}
```

Configurations register either at app-init time (under `pict_configuration.DefaultRecordSetConfigurations`, an array) or at runtime via `loadRecordSetConfiguration(config)`.

## Manifest shape (for dashboards)

A manifest is the same descriptor catalog you'd give pict-section-form, plus optional `PictDashboard` per descriptor (which generates a TableCell). Stored under `fable.settings.Manifests` keyed by Scope, OR registered at runtime.

```js
{
    Scope: "BookOverview",                        // must match the registry key
    Title: "Book Overview",

    // Optional FilterCriteria (recordset-scoped filters that feed the dashboard)
    FilterCriteria:
    {
        Default:
        [
            { Type: "DateRange",   FilterByColumn: "CreateDate",       Label: "Added" },
            { Type: "StringMatch", FilterByColumn: "Title",            Label: "Title" }
        ]
    },

    // Descriptors — same shape as pict-section-form. Two pieces:
    //   PictForm     — drives form-style rendering (KPIs, charts at the top of dashboards)
    //   PictDashboard — drives table-cell rendering (one column per descriptor with PictDashboard)
    Descriptors:
    {
        TitleColumn:
        {
            Hash: "TitleColumn", Name: "Title", DataType: "String",
            PictDashboard: { ValueTemplate: "{~D:Record.Data.Title~}" }
        },
        TotalSalesKPI:
        {
            Hash: "TotalSalesKPI", Name: "Total Sales", DataType: "PreciseNumber",
            PictForm:
            {
                Section: "KPIs", Group: "Summary", Row: 1, Width: 3,
                InputType: "ReadOnly",
                ValueSolver: `sum(Records, "Data.Sales")`
            }
        },
        SalesTrendChart:
        {
            Hash: "SalesTrendChart", Name: "Sales over Time", DataType: "Object",
            PictForm:
            {
                Section: "Charts", Group: "Trends", Row: 1, Width: 12,
                InputType: "Chart",
                ChartType: "line",
                ChartLabelsSolver:    `pluckpath(Records, "Data.Date")`,
                ChartDatasetsSolvers: [ { Label: "Sales", DataSolver: `pluckpath(Records, "Data.Sales")` } ]
            }
        }
    }

    // TableCells is auto-generated from any Descriptors that have PictDashboard.
    // Don't write it by hand — generateManifestTableCells() does it during initialize().
}
```

Descriptors with `PictDashboard` become table columns; descriptors with `PictForm` become form/chart inputs at the top of the dashboard. Many descriptors have both.

### TableCell auto-generation

[`RecordsSet-MetaController.generateManifestTableCells(manifest)`](pict-section-recordset/source/services/RecordsSet-MetaController.js) walks `Descriptors`, picks the ones with `PictDashboard`, and produces:

```js
{
    Key: descriptorKey,
    DisplayName: descriptor.Name || descriptorKey,
    ManifestHash: manifest.Scope,
    PictDashboard: descriptor.PictDashboard
}
```

If `PictDashboard.ValueTemplate` is missing it gets defaulted to `{~ProcessCell:Record.Data.Key~}`. If `PictDashboard.Equation` is set without a `ValueTemplate`, an `{~SBR:~}` template is generated automatically. Don't fight this — set `ValueTemplate` directly when you want explicit control.

## Runtime registration

The metacontroller exposes these methods on `pict.PictSectionRecordSet`:

| Method | Purpose |
|---|---|
| `loadRecordSetConfiguration(config)` | Register a recordset config. Returns the provider instance. |
| `loadRecordSetConfigurationArray(configs)` | Bulk variant. |
| `loadRecordSetDynamically(name OR config, entity?, defaultFilter?)` | Same as above + calls `provider.initializeAsync()` so the provider is immediately usable. |
| `getRecordSetConfiguration(recordSetName)` | Look up the registered config by name. |
| `getManifest(scope)` | Return the Manyfest instance for a manifest scope. |
| `generateManifestTableCells(manifest)` | Re-run TableCell generation (call after mutating Descriptors at runtime). |

To add a manifest at runtime (no built-in helper — host code mutates the registry directly):

```js
const tmpRS = pict.PictSectionRecordSet;
tmpRS.generateManifestTableCells(myManifest);   // populates myManifest.TableCells
tmpRS.manifestDefinitions[myManifest.Scope] = myManifest;
tmpRS.manifests[myManifest.Scope] = myManifest.Form
    ? myManifest
    : pict.newManyfest(myManifest);
```

Then register the recordset config that references the manifest hash, and navigate:

```js
pict.providers.PictRouter.navigate(`/PSRS/${RecordSetName}/SpecificDashboard/${myManifest.Scope}`);
```

## Filter strings (Meadow filter DSL)

Filters serialize to a `~`-separated string. The recordset's filter widgets compose these for you, but `RecordSetDefaultFilter` and ad-hoc URLs build them by hand.

| Token | Meaning |
|---|---|
| `FBV~Field~OP~Value` | Filter by value. OP is `EQ`, `NE`, `GT`, `GE`, `LT`, `LE`, `LK` (LIKE) |
| `FBVD~Field~OP~Value` | Same, but treats `Value` as a date (URL-encode the timestamp) |
| `FBL~Field~INN~v1,v2` | Filter by list (`INN` = IN, `NIN` = NOT IN) |
| `FSF~Field~ASC~0` / `FSF~Field~DESC~0` | Sort |

Example pre-filter (used in `RecordSetDefaultFilter`):

```
FBV~Type~EQ~AggregatedDashboardData~FBV~AppHash~EQ~walbec-moisture-daily~FBV~IDCustomer~EQ~182~FSF~CreateDate~ASC~0
```

User filters compose **on top** of `RecordSetDefaultFilter` — the user can't bypass it, so it's the right place for security/scope constraints.

## Filter types

`FilterCriteria` is an object keyed by criteria-hash; each value is an array of filter clauses. Each clause specifies the field and the filter widget type:

```js
"FilterCriteria":
{
    "Default":
    [
        { Type: "StringMatch",   FilterByColumn: "Title", Label: "Title" },
        { Type: "NumericRange",  FilterByColumn: "PublicationYear", Label: "Year" },
        { Type: "DateRange",     FilterByColumn: "CreateDate", Label: "Added" },

        // External joins — pull options from a different table
        { FilterDefinitionHash: "ExternalJoinBookByAuthor", FilterByColumn: "IDBook" }
    ]
}
```

Available filter Types (full list in [pict-section-recordset/source/views/filters/index.js](pict-section-recordset/source/views/filters/index.js)):
- `StringMatch`
- `NumericRange`
- `DateRange`
- `ExternalJoinStringMatch`, `ExternalJoinSelectedValueList`, `ExternalJoinNumericMatch`, `ExternalJoinDateRange`, `ExternalJoinStringRange`
- `InternalJoinDateMatch`, `InternalJoinNumericMatch`, `InternalJoinStringRange`

External-join filters need a corresponding entry in the top-level `Filters` object describing the join (see bookstore example for the full shape).

## Associations (joined-entity management)

First-class UI for managing many-to-many **joins** — the `XxxYyyJoin` convention: a join row with its own `ID<Join>` plus an `ID<X>` and `ID<Y>` pointing at either side (e.g. `BookAuthorJoin` with `IDBookAuthorJoin`, `IDBook`, `IDAuthor`). Four opt-in UIs, all driven entirely by light configuration:

1. **Association Editor** — a small embeddable widget (a read-view **tab**): a searchable picker of the other entity (currently-joined rows culled out) + an explicit **Add** button, over a list of the current associations, each removable. Add Book→Authors and Author→Books **independently**. The picker `PickerMode` (`'single'` default, or `'multi'`) is per-tab config.
2. **Bulk Associate screen** — a purpose-built page for one-anchor bulk ops ("assign these books to *this* store"): pick an anchor record, multi-select many other-side records, create all the joins at once.
3. **Matrix (cross-link) screen** — a dual-**table** page for linking complex records: each side is a full record table with **configurable columns** (per-side `TableColumns`, with a per-table **Columns** chooser the user toggles — persisted in localStorage), a checkbox per row, and per-table search + "Load more". Multi-select rows on **both** sides; a live stats header counts the pending cross-product; "Link selected" creates **every left × every right** join, skipping pairs that already exist. (The chip-picker controls are for the quick editor/bulk add — the matrix is for picking records by several fields.)
4. **Bulk Unlink screen** — the removal counterpart: pick one anchor (a specific book OR store), see **all** of its current links in a selectable record table (same `TableColumns` + column chooser + search + select-all), check rows, and "Unlink selected" deletes those joins together. The anchor side is the route's `:AnchorRecordSet`, so it unlinks from either side.

**Dependencies (soft, by provider hash — no hard `require`):** the picker comes from `pict-section-picker` (registered as `Pict-Section-Picker`); remove-confirmation uses `pict-section-modal` (registered as `Pict-Section-Modal`). Both degrade gracefully if absent (the editor shows a note / skips the confirm). The bookstore example registers both in `onAfterInitializeAsync`.

### Define each association once (top-level `Associations`)

Mirrors the `Filters` + `FilterExperiences` precedent — define the join once, symmetrically, then opt in per recordset. The renderer resolves which side is "this side" by matching the rendering recordset's name against `SideA`/`SideB`.

```jsonc
"Associations":
{
    "BookAuthor":
    {
        "JoinEntity": "BookAuthorJoin",          // the join table/entity
        "JoinURLPrefix": "/1.0/",                  // optional (default "/1.0/")
        "DefaultJoinValues": {},                   // optional constant columns stamped on every join create (e.g. { "IDCustomer": 1 })
        // Each side's "Title" names THAT side's records (read as the "other side" label). ChipFields show
        // extra fields as disambiguation chips in the picker + the list (3 same-Title books → ISBN tells them apart):
        "SideA": { "RecordSet": "Book",   "IDField": "IDBook",   "DisplayField": "Title", "SearchFields": ["Title","ISBN"], "ChipFields": ["ISBN", {"Field":"PublicationYear","Label":"Year"}], "Title": "Books" },
        "SideB": { "RecordSet": "Author", "IDField": "IDAuthor", "DisplayField": "Name",  "SearchFields": ["Name"],  "Title": "Authors" }
    }
}
```

Side defaults keep it light: `Entity`←`RecordSet`, `IDField`←`ID<Entity>`, `DisplayField`←`Name`, `SearchFields`←`[DisplayField]`. There is **no default sort** (alphabetical-by-display surfaces empty values first as blank rows) — set `Sort` on a side to opt in. **`ChipFields`** (array of `string | {Field, Label?, Template?}`) renders extra fields as chips on every picker option/chip *and* in the editor's current-associations list (the disambiguator when the display name isn't unique); it rides the picker's `EntityTags`. **`TableColumns`** (array of `string | {Key, DisplayName?, Template?, DefaultHidden?}`) are the columns of that side's **matrix** record table (defaults to one `DisplayField` column). `DefaultHidden: true` ships a column off-by-default; the matrix's per-table **Columns** chooser lets the user toggle any column on/off, persisted in localStorage via the `ColumnDataProvider` (the same host-overridable seam the list chooser uses, under a `Matrix_<assoc>_<side>` scope).

### Opt in per recordset

```jsonc
// On the Book recordset config — a tab per association, plus a tabbed read layout:
"ReadLayout": "Split",                              // REQUIRED for tabs (Tab or Split; the read view ignores RecordSetReadTabs when Basic)
"RecordSetReadSplitLeftWidth": "40%",               // Split only: starting width of the record (left) pane
"RecordSetReadTabs":
[
    { "Type": "Association", "Association": "BookAuthor",       "Title": "Authors" },
    { "Type": "Association", "Association": "BookStoreCatalog", "Title": "Stores", "PickerMode": "multi" }
],

// On the BookStore recordset config — surface the bulk screen (the recordset is the anchor side):
"RecordSetBulkAssociations":
[
    { "Association": "BookStoreCatalog", "Title": "Assign Books to Store" }   // Title becomes the screen title
]
```

The `Type: "Association"` tab is a new read-tab type alongside `Manifest` / `AttachedRecord` / `View` (handled in `RecordSet-Read.js` `_structureTabs`). Opting Book→Authors and Author→Books are separate `RecordSetReadTabs` entries on each recordset — that's the "from each side" requirement. `PickerMode` on the tab chooses the add control (`'single'` default vs `'multi'`).

**Layouts.** `"ReadLayout": "Tab"` makes the record its own tab alongside the association tabs. `"ReadLayout": "Split"` keeps the record in a resizable **left pane** and the association tabs **top-right**; it opens to the record alone (a leading **"Full Record"** tab is active, the association pane collapsed) and choosing an association tab toggles its editor into the right pane beside the record — choosing "Full Record" (or re-choosing the active tab) collapses back. `RecordSetReadSplitLeftWidth` (any CSS width, default `50%`) sets the record pane's starting width; `RecordSetReadFullRecordTabTitle` renames the Full Record tab.

**Bulk + matrix screens.** Navigate the single-anchor bulk screen via `/PSRS/<AnchorRecordSet>/Associate/<AssociationHash>[/<AnchorID>]`. Navigate the dual-column cross-link screen via `/PSRS/AssociateMatrix/<AssociationHash>[/<LeftRecordSet>]` (left defaults to `SideA`; name a side to put it on the left). Navigate the bulk-unlink screen via `/PSRS/AssociateUnlink/<AssociationHash>/<AnchorRecordSet>[/<AnchorID>]`. All three are registered singletons (`RSP-RecordSet-Associate`, `RSP-RecordSet-AssociateMatrix`, `RSP-RecordSet-AssociateUnlink`).

### Mechanics + advanced API

All join + display data flows through the shared, cached `pict.EntityProvider` (`createEntity` / `deleteEntity` / `getEntitySet`) — no bespoke REST. The picker culls already-joined ids via a **function-form `BaseFilter`** (`FBL~<otherIDField>~NIN~<ids>`) that re-evaluates on every search, so the cull stays live as associations change. The metacontroller registers `RecordSetAssociationManager` and parses `settings.Associations` in `initialize()`; its methods (for host/advanced use):

| Method | Purpose |
|---|---|
| `addAssociation(hash, def)` / `getAssociation(hash)` | Register / look up an association (defaults normalized). |
| `resolveSides(assocHash, thisRecordSetName)` | `{ association, thisSide, otherSide }` (false if the recordset is neither side). |
| `listAssociatedRecords(assocHash, thisRS, thisID)` | The other-side records currently joined, decorated `{ JoinID, OtherID, Display, OtherRecord, JoinRecord }`. |
| `createJoin(assocHash, thisRS, thisID, otherID)` / `removeJoin(assocHash, joinRecord)` | Create / delete one join row. |
| `buildOtherPickerConfig(assocHash, thisRS, getExcludedIDsFn, overrides)` / `buildAnchorPickerConfig(...)` | `createEntityPicker` configs (the other side culls; the anchor side does not). |

## RecordSet provider data shape

What providers return from `getRecords` / `getDecoratedRecords`:

```js
{
    Records: [ /* array of records, each shaped like { Data: {...entity fields...}, Payload: {...} } */ ],
    TotalRecordCount: { Count: 5000 },
    Offset: 0,
    PageSize: 250,
    Facets: { ByField: { /* aggregations */ }, ByRange: { /* range buckets */ } }
}
```

Inside dashboard templates, `Record.Data` is the per-record entity data. `Record.Payload.TableCells` is the resolved cell array for the current render. Use `{~D:Record.Data.FieldName~}` in `PictDashboard.ValueTemplate` to read fields.

## When you're stuck

1. **`example_applications/bookstore/Bookstore-Application.js`** — exhaustive working configuration. Every filter type, multiple recordsets, dashboards. First place to look.
2. **`RecordsSet-MetaController.js`** — every registration path goes through here. Read `initialize()`, `loadRecordSetConfiguration()`, `generateManifestTableCells()`.
3. **For dashboard rendering questions:** `source/views/dashboard/RecordSet-Dashboard.js` and `RecordSet-Dashboard-RecordListEntry.js` — the latter is the per-row template definition, including the `{~ProcessCell:~}` and `{~TBDA:~}` template tags.
4. **Provider questions:** `source/providers/RecordSet-RecordProvider-Base.js` for the interface, then the MeadowEndpoints subclass for the default implementation.
5. **Don't hand-build TableCells if Descriptors with PictDashboard would do.** The metacontroller generates them on init; mutating after init means calling `generateManifestTableCells(manifest)` again.
6. **Manifest Scope must match the registry key** — both `manifestDefinitions[X]` and the manifest's own `Scope: X`. The MetaController logs an error if they diverge but doesn't fix it.
