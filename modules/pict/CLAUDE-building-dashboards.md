# Building Dashboards with pict-section-recordset + pict-section-form

How to build a data dashboard — KPIs, charts, a filterable detail table, drill-down, and CSV export — entirely from configuration, on top of [pict-section-recordset](CLAUDE-pict-section-recordset.md) (PSRS, the recordset/filter chassis) and [pict-section-form](CLAUDE-pict-section-form.md) (PSF, the manifest renderer). Read those two files first; this one covers how they compose into a dashboard, with special attention to **filters that render as dropdowns**.

The golden rule: **everything is configuration.** A new dashboard is a manifest (JSON), not JavaScript. If you find yourself writing host code to transform records mid-flight or to wire a filter by hand, stop — there is a manifest knob for it, and if there genuinely isn't, the knob belongs in PSRS/PSF, not in the host.

## The moving parts

| Layer | Module | What it owns |
|---|---|---|
| Data at rest | Meadow endpoints (often a private data lake: read-only `C<IDCustomer>_<Domain>_<Table>` projections at `/1.0/PrivateDataLake/<Domain>/`) | Clean, pre-aggregated rows. Dashboards read them directly — no mid-flight fixups |
| Recordset + filters | pict-section-recordset | Fetching, paging, the search bar, quick filters, the Add Filter popover, the filter drawer, saved filter experiences, `/PSRS/:RecordSet/...` routes |
| Rendering | pict-section-form | The manifest: descriptors (KPI cells, charts, tabular rows), sections/groups layout |
| Aggregation | fable ExpressionParser via the manifest's `GlobalSolvers` | Roll filtered rows up into chart/KPI series — declaratively, re-run on every fetch |
| Hosting | the host app (e.g. Headlight's data app `DynamicDashboardLoader`) | Loads manifests from storage, projects the manifest's `Filters` block into the recordset config, registers everything. Generic — it never knows what a "Product" is |

## Anatomy of a dashboard manifest

One manifest per dashboard. Top-level blocks:

```js
{
  Form: 'WalbecMoistureForm',          // PSF form hash
  Scope: 'walbec-moisture-daily',      // unique dashboard hash (the /SpecificDashboard/<hash> route)
  Title: 'Moisture Workflow',
  WithRecordsetData: true,             // PSRS provides the records (fetch + filter pipeline)

  Filters: { /* SearchFields, QuickFilters, Definitions, Experiences, IgnoreFields — see below */ },

  GlobalSolvers: [                     // declarative aggregation, re-run after every (filtered) fetch
    'AppData.WalbecDaily.BucketLabel = OBJECTKEYSTOARRAY(AGGREGATIONHISTOGRAMBYOBJECT(RecordSubset, "BucketLabel", "SampleCount"))',
    'AppData.WalbecSummary.TotalSamples = SUM(RecordSubset[].SampleCount, "1")',
    'AppData.WalbecDailyRecords = GENERATEARRAYOFOBJECTSFROMSETS("BucketLabel", AppData.WalbecDaily.BucketLabel, /* … parallel arrays → row objects */)'
  ],

  Descriptors: {                       // PSF cells: KPIs, charts (see CLAUDE-pict-section-form.md)
    'WalbecSummary.TotalSamples': { Hash: 'KPISamples', Name: 'Total Samples', DataAddress: 'WalbecSummary.TotalSamples',
      DataType: 'Integer', PictForm: { Section: 'KPIs', Group: 'Summary', Row: 1, Width: 3, InputType: 'PreciseNumberReadOnly' } },
    MoistureTrendChart: { Hash: 'MoistureTrendChart', Name: 'Avg Moisture % Over Time', DataType: 'Object',
      PictForm: { Section: 'Charts', Group: 'Trends', Row: 1, Width: 12, InputType: 'Chart', ChartType: 'line',
        ChartLabelsSolver: 'ARRAYCONCAT(WalbecDaily.BucketLabel)',
        ChartDatasetsSolvers: [ { Label: 'Avg Moisture %', DataSolver: 'ARRAYCONCAT(WalbecDaily.AvgMoisture)' } ] } }
  },

  Sections: [                          // layout; the tabular group is ALSO the export contract
    { Name: 'KPIs',   Hash: 'KPIs',   ShowTitle: false, Groups: [ { Name: 'Summary', Hash: 'Summary' } ] },
    { Name: 'Detail', Hash: 'Detail', ShowTitle: true,  Groups: [
      { Name: 'Daily Buckets', Hash: 'Buckets', Layout: 'Tabular',
        RecordManifest: 'MoistureBucketRow',     // → ReferenceManifests entry = the columns
        RecordSetAddress: 'WalbecDailyRecords' } // → AppData address the solvers fill = the rows
    ] }
  ],

  ReferenceManifests: {                // row templates for tabular detail groups
    MoistureBucketRow: { Scope: 'MoistureBucketRow', Descriptors: {
      BucketLabel: { Hash: 'BucketLabel', Name: 'Date', DataAddress: 'BucketLabel', DataType: 'String', IsTabular: true /* … */ }
      /* … one descriptor per column … */
    } }
  }
}
```

### Data flow on every fetch

```
route /PSRS/<RecordSet>/SpecificDashboard/<Scope>[/FilterExperience/<gz>]
  → PSRS compiles scope filter + active clauses → GET <URLPrefix><Entity>s/FilteredTo/<foxhound>/<page>
  → records land in the recordset state (RecordSubset)
  → GlobalSolvers re-run → AppData.<Summary KPIs> + AppData.<parallel series> + AppData.<DetailRows>
  → PSF renders descriptors (KPIs/charts) + tabular groups from those AppData addresses
```

Because the solvers run on the **filtered** subset, every filter automatically recomputes every KPI, chart, and detail row. You never write per-dashboard aggregation code in the host.

---

## Filters — and how to get dropdowns

The manifest's `Filters` block is the whole filter story:

```js
Filters: {
  Experiences: { Enabled: true },          // saved/sharable filter experiences (URL-serialized)
  IgnoreFields: [ 'BucketLabel', 'Result' ], // columns hidden from filter discovery
  SearchFields: [ 'MixDesign', 'JMF' ],    // the search box LK-matches these columns
  QuickFilters: [ 'BucketDate', 'IDProject', 'MixDesign', 'JMF' ],  // the always-visible bar, in order
  Definitions: { /* one entry per filterable column — the clause catalog */ }
}
```

`Definitions` entries override PSRS's auto-generated clauses for their column (the host projects them into `RecordSetFieldFilterClauses[column]`), so what you declare is exactly what users get — no auto-emitted `StringMatch` crowding your `DateRange`.

### Decision table: column kind → filter Type

| Your column is… | Use | Renders as | Example |
|---|---|---|---|
| A **low-cardinality string dimension** (Product, Material, Mix Design, JMF, Status…) | `DistinctSelectedValueList` | Multi-select dropdown; options = the column's distinct values from the data itself | see below |
| An **entity ID** whose entity exists on an API (IDProject → `/1.0/Projects`) | `InternalJoinSelectedValueList` (+ Picker) | Searchable entity picker showing display names, filtering by ID | see below |
| A **date** | `DateRange` | From/To date pair | see below |
| **Free text** users type fragments of | `SearchFields` (the search bar) and/or `StringMatch` | Text input, fuzzy `LK ~ %value%` | see below |
| A **CSV list column** (e.g. provenance `IDDocuments`) | `StringMatch`, `ExactMatch: false` | Text input matching WITHIN the list | see below |
| An ID column that is **not really a FK** (lists, synthetic keys) | `StringMatch` — and add the column to `IgnoreFields` if it shouldn't filter at all | — | — |

PSRS's `ID`-prefix heuristic auto-builds entity pickers for `ID*` columns. When that's wrong (no such entity, or it's a CSV list), a `Definitions` entry overrides it.

### Dropdown from the data itself — `DistinctSelectedValueList`

For string dimensions there is no entity to join — the options ARE the distinct values of the column. Meadow already serves them (`GET <URLPrefix><Entity>s/Distinct/<Column>[/FilteredTo/<filter>]`); this clause type wires that to a dropdown (requires pict ≥ 1.0.384 / pict-section-recordset ≥ 1.11.0):

```js
Product: {
  Type: 'DistinctSelectedValueList',
  FilterByColumn: 'Product',
  DisplayName: 'Product',
  Label: 'Product',
  ClauseKey: 'Product_AnyOf',
  DistinctFilter: 'FBV~Deleted~EQ~0'   // optional: scope the option list (keep deleted rows' values out)
}
```

- **Quick bar**: a multi-select picker (pict-section-picker, `Mode: 'multi'`), options client-search-filterable, chips for selections.
- **Filter drawer / Add Filter**: a checkbox list.
- **Semantics**: "any of the checked values" — compiles to one paren group of EQ ORs:
  `FOP~0~(~0~FBVOR~Product~EQ~1%2F4%22%20Chip~FBVOR~Product~EQ~MFG'D%20Sand~FCP~0~)~0`
  (values are `encodeURIComponent`-escaped per value; NOT `FBL~INN`, whose comma-splitting corrupts string values containing commas).
- **`Options: [ … ]`** (optional) — a static option list, skipping the distinct fetch entirely.
- Options are cached per column on the recordset provider and invalidated on create/update/delete through that provider.
- Selected values that no longer appear in the data (restored from a saved experience) still render — checked — so users can un-pick them.
- A value containing a literal `~` is unrepresentable in the foxhound URL syntax and is skipped with a console warning.

### Dropdown from an entity — `InternalJoinSelectedValueList` + Picker

For ID columns whose entity lives on an API. The Walbec Project filter, verbatim:

```js
IDProject: {
  Type: 'InternalJoinSelectedValueList',
  FilterByColumn: 'IDProject',
  DisplayName: 'Project',
  Label: 'Selected Projects',
  ClauseKey: 'IDProject_Selected',
  CoreConnectionColumn: 'IDProject',
  RemoteTable: 'Project',                     // the entity to search/show
  URLPrefix: '/1.0/',                         // where that entity lives (NOT the lake prefix)
  JoinExternalConnectionColumn: 'IDProject',
  JoinInternalConnectionColumn: 'IDProject',
  ScopeToRecordSet: true,                     // options limited to IDs present in this dashboard's data
  ExternalFilterByColumns: [ 'Name' ],        // columns the picker's search box matches
  EntityListEntryTemplate: '{~D:Record.Name~}',
  PictForm: { InputType: 'Picker', Entity: 'Project', ValueField: 'IDProject', LabelField: 'Name' }
}
```

Knobs that matter:

- **`URLPrefix`** — the clause-level override that points the entity search at the right API. A lake recordset inherits the lake prefix by default, and `/1.0/PrivateDataLake/<Domain>/Projects` 404s. **Gotcha:** the table-UI search path honors clause `URLPrefix`, but **pict-section-picker (the `Picker` input) always fetches via the EntityProvider's default prefix** — so picker-mode entities must live on the default API. (Known limitation; if you need a picker against a second API, that's a pict-section-picker feature to add, not a host hack.)
- **`ScopeToRecordSet: true`** — fetches `Distinct/<FilterByColumn>` on the recordset's own entity and scopes the picker search with `FBL~<col>~INN~<ids>`, so users see the handful of projects in the data, not every project in the system. (IDs are numeric, so `FBL~INN` is safe here.)
- **`EntityListEntryTemplate`** — the option/chip label template against the fetched entity record.

### Date range

```js
BucketDate: {
  Type: 'DateRange',
  FilterByColumn: 'BucketDate',
  DisplayName: 'Date',          // ← user-facing language. "Bucket Date" is statistics jargon; say "Date"
  MinimumLabel: 'From',
  MaximumLabel: 'To'
}
```

Compiles to one paren group of flat AND bounds: `FOP~0~(~0~FBV~BucketDate~GE~<start>~FBV~BucketDate~LE~<end>~FCP~0~)~0`.

### Free text + CSV-list columns

```js
// search bar (type-to-find across columns):
SearchFields: [ 'MixDesign', 'JMF' ],

// CSV provenance column — matches WITHIN the comma-separated list:
IDDocuments: {
  Type: 'StringMatch', FilterByColumn: 'IDDocuments',
  DisplayName: 'Document ID', ClauseKey: 'IDDocuments_Contains', ExactMatch: false
}
// FBV~IDDocuments~LK~%2460689%  →  "buckets whose document list contains this ID"
```

### Staging vs Apply (the commit model)

Quick-filter and drawer inputs **stage** their clause into the active filter state but do **not** fetch. The user commits with **Apply** (drawer button) or **Search** (form submit), which compiles the clauses, navigates to a `/FilterExperience/<gzip>` URL, and fetches once. This is deliberate (PSRS ≥ 1.9.4): adjacent inputs changing in quick succession (a From/To date pair) used to fire racing fetches where the stale one finished last. Don't "fix" a dashboard by making inputs auto-apply.

The `/FilterExperience/` URL segment is the whole filter state, gzip+base64 — shareable, bookmarkable, restored on reload (dropdown chips and checkbox states included).

### Search bar vs quick filters vs Add Filter vs Experiences

| Surface | What it's for | Config |
|---|---|---|
| Search box | One type-to-find across the obvious columns | `SearchFields` |
| Quick filters bar | The 3–4 filters everyone uses, always visible | `QuickFilters` (order = display order) |
| Add Filter popover | Everything else, discoverable on demand | every `Definitions` entry (and schema-derived clauses not overridden/ignored) |
| Experiences | Saved/sharable named filter sets | `Experiences: { Enabled: true }` |

---

## Provenance / drill-down

Keep row → source-document provenance in the projection itself: a CSV `IDDocuments` column plus an `IDDocumentCount`, projected per row. The detail row then renders a Templated cell whose click opens the day's documents (resolved against the real Documents API):

```js
Documents: {
  Hash: 'MoistureDocuments', Name: 'Documents', DataAddress: 'IDDocumentCount', IsTabular: true,
  PictForm: { InputType: 'Templated',
    Template: '{~TIfAbs:DocumentsLink-Active:Record:Record.IDDocumentCount^>^0~}…',
    Templates: { 'DocumentsLink-Active': '<button onclick="_Pict.providers.DynamicDashboardLoader.openDayDocuments(…)">{~D:Record.IDDocumentCount~} docs</button>' } }
}
```

The host resolves the CSV of IDs to Document records (in-memory first, lake fetch fallback) and shows a modal. Cap the list (~200) — provenance, not a sync mechanism.

## CSV / Excel export

The manifest's tabular groups are also the export contract — `Sections[].Groups[]` entries with `Layout: 'Tabular'` pair the columns (`RecordManifest` → `ReferenceManifests[…].Descriptors`) with the rows (`RecordSetAddress` → the AppData array the solvers fill):

- **CSV** exports the on-screen detail rows, **one file per tabular group** (multi-table dashboards download one CSV per table, staggered). Columns with `PictForm.InputType: 'Link'` are skipped; `Templated` cells export their underlying `DataAddress` value.
- **Raw data CSV** exports the unaggregated backing rows straight from the lake entity (scope filter only, all columns, capped) — for offline pivoting.
- A dashboard with **no** declared tabular groups falls back to its first ReferenceManifest + the legacy roll-up address, with a console warning. Declare your groups.

So: if your export is empty, your tabular group's `RecordSetAddress` doesn't match what your `GlobalSolvers` actually write. That pairing is the single source of truth for both the on-screen table and the export.

## Usability checklist

- [ ] Date filters are labeled **"Date"** (or "Sample Date" etc.) — never internal column names like "Bucket Date"
- [ ] Every string dimension users slice by (Product / Material / Mix Design / JMF) is a **dropdown** (`DistinctSelectedValueList`), not a text input
- [ ] Entity pickers are **scoped to the data** (`ScopeToRecordSet: true`) so the dropdown lists 4 projects, not 4,000
- [ ] `QuickFilters` holds only the few filters everyone uses; everything else lives in Add Filter
- [ ] `SearchFields` covers the "I'll just type it" columns (search bar ≠ filters; have both)
- [ ] Internal columns are in `IgnoreFields` (audit columns, label twins like `BucketLabel`) — but **never** the column a Definition targets (ignoring it removes the filter)
- [ ] `Experiences` enabled so views are shareable; the URL round-trips the whole filter state
- [ ] Detail rows carry provenance (document counts/links), and the tabular group's `RecordSetAddress`/`RecordManifest` are correct (table + CSV both depend on it)
- [ ] All transformation is in `GlobalSolvers` — zero host-code data fixups

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Dropdown is empty | The option fetch failed: entity picker pointed at the wrong API (lake prefix has no `Projects`), or the Distinct route 404s on the target service | Set clause `URLPrefix` to where the entity lives; confirm `curl <prefix><Entity>s/Distinct/<Column>` returns rows |
| Picker shows nothing until you type, then still nothing | Entity search columns wrong (`ExternalFilterByColumns`), or picker-mode + non-default API (picker ignores clause `URLPrefix`) | Fix the search columns; keep picker entities on the default API |
| Date filter renders as a text input | The schema reports the column as `string`, so auto-generated `StringMatch` clauses won — your Definition isn't overriding | Ensure the Definition has `Type` + `FilterByColumn` (that's what projects into `RecordSetFieldFilterClauses` and replaces the auto clauses) |
| Filter "applies" but records don't change | You expected per-keystroke apply; clauses stage until Apply/Search | Click Apply — and leave the commit model alone (it prevents stale-fetch races) |
| Same filter appears twice (text + dropdown) | Auto-generated clause not suppressed — Definition key/column mismatch | The Definition's `FilterByColumn` must exactly match the column the auto clause targeted |
| Server 404s on a filtered fetch | Malformed foxhound URL — usually nested paren groups (`FOP(FOP(…))`) from hand-built filter strings | Let the clause compiler emit the URL; one paren group per logical clause, concatenated flat |
| Distinct dropdown missing a brand-new value | Options cached per session on the provider | The cache clears on create/update/delete through the provider; a reload also refreshes |
| Chart labels `undefined` | A `GlobalSolvers` parallel array is missing/misnamed vs `ChartLabelsSolver` | Align the AppData addresses between solvers and chart descriptor solvers |
| CSV downloads but the file is empty | Tabular group's `RecordSetAddress` doesn't match what the solvers write (the console warning names the address) | Fix the group's `RecordSetAddress` / the solver's target address |

## Versions

Dropdown-from-distinct-values needs **pict ≥ 1.0.384** (`DistinctSelectedValueList` clause compilation) and **pict-section-recordset ≥ 1.11.0** (checkbox drawer editor, quick-bar multi-picker, filtered/cached distinct fetches). Entity pickers, DateRange, staging-then-Apply, and experience URLs are older. The quick-bar pickers need the host to register **pict-section-picker** (the controls degrade to nothing, not errors, without it).
