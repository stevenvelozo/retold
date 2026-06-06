# pict-section-form

Form/dashboard rendering library for Pict applications. Manifests describe descriptors; the section-form metacontroller renders inputs (text, select, chart, etc.) into sections and groups based on a `PictForm` sub-property on each descriptor.

This is a working-knowledge reference for adding inputs/charts/forms in the host app. Pair it with [CLAUDE.md](CLAUDE.md) (general Pict patterns) and [CLAUDE-pict-section-recordset.md](CLAUDE-pict-section-recordset.md) (which transitively uses this library).

## Where things live

| Path | What it is |
|---|---|
| `pict-section-form/source/Pict-Section-Form.js` | Main service entry point |
| `pict-section-form/source/providers/inputs/` | Per-`InputType` providers — Chart, Select, ReadOnly, AutofillTriggerGroup, etc. |
| `pict-section-form/source/providers/layouts/` | Section/group layout providers |
| `pict-section-form/source/providers/dynamictemplates/Pict-DynamicTemplates-DefaultFormTemplates.js` | The HTML emitted for each `InputType` (e.g. `CANVAS-FOR-{RawHTMLID}` for charts) |
| `pict-section-form/example_applications/complex_table/` | **The reference example.** Working chart demos, solver expressions, recipe-style manifest |
| `pict-section-form/example_applications/complex_table/Complex-Tabular-Application.js` | Full descriptor catalog incl. multiple chart shapes |

When in doubt: read `complex_table/Complex-Tabular-Application.js` and copy a descriptor that's close to what you want.

## Descriptor shape (the unit of work)

Every input is a descriptor. Common shape:

```js
"DescriptorKey":
{
    Name: "Display Name",
    Hash: "DescriptorKey",       // must match the object key
    DataType: "String",          // String, PreciseNumber, Number, Object, Boolean, ...
    Default: "",                 // optional initial value
    PictForm:
    {
        Section: "SectionA",     // visual grouping (top-level)
        Group:   "GroupA",       // sub-grouping within a section
        Row:     1,              // row within the group
        Width:   3,              // 12-column grid; this cell occupies 3 cols
        InputType: "Text",       // dispatch key — selects which input provider renders this
        // ...InputType-specific properties below
    }
}
```

`Descriptors` is an object keyed by descriptor key. Manifests passed to the recordset's `manifestDefinitions` AND form configurations both use this shape — same descriptor catalog, two consumers.

## InputType cheat sheet

The dispatch key `PictForm.InputType` selects how a cell renders and the **default provider(s)** that give it its common behavior — e.g. an `Option` input's default provider manages its selectable item list. An input can run **multiple providers**, and `PictForm.Providers` attaches additional ones to layer behavior on top of the default — e.g. `Pict-Input-EntityBundleRequest` (fetch related records when the value changes) or `Pict-Input-AutofillTriggerGroup` (populate / solve sibling fields). Provider implementations live under `source/providers/inputs/Pict-Provider-Input-<Type>.js` — `ls` that directory to see what's available.

| InputType | Use for | Notable extra properties |
|---|---|---|
| `Text` / `String` | Free text | `MaxLength`, `Placeholder` |
| `TextArea` | Multi-line text | `Rows` |
| `Number` / `PreciseNumber` | Numeric inputs | `Min`, `Max`, `Step` |
| `Boolean` / `Checkbox` | Boolean toggle | — |
| `Option` | Single-select dropdown | `SelectOptions`, `SelectOptionsPickList`, `Providers` (e.g. `Pict-Input-Select`) |
| `MultiOption` | Multi-select | `SelectOptions` |
| `Date` / `DateTime` | Date pickers | `DateFormat` |
| `ReadOnly` | Display-only value (computed by a **solver elsewhere** that assigns to this field's hash — see Solvers below) | — |
| `Chart` | Chart.js visualization | See "Charts" section |
| `TabGroupSelector` / `TabSectionSelector` | UI tab switchers | `TabGroupSet`, `TabGroupNames` |
| `EntityBundleRequest` | Triggers a bundle refresh on change | `AutofillTriggerGroup` |

The exhaustive list lives in the `inputs/` directory — `ls retold/modules/pict/pict-section-form/source/providers/inputs/` to scan.

## Charts (`InputType: "Chart"`)

The chart input is a Chart.js v4 wrapper. **`window.Chart` must be loaded** before pict initializes the input — host apps add `<script src="./chart.umd.js">` to their HTML and copy `chart.js/dist/chart.umd*` in their build's copyFiles step.

The input provider is at [pict-section-form/source/providers/inputs/Pict-Provider-Input-Chart.js](pict-section-form/source/providers/inputs/Pict-Provider-Input-Chart.js). It emits a hidden config input + a canvas:

```html
<input type="hidden" id="CONFIG-FOR-{RawHTMLID}" value="">
<canvas id="CANVAS-FOR-{RawHTMLID}"></canvas>
```

Then `onInputInitialize` instantiates `new window.Chart(canvas, config)` and stores the instance in `currentChartObjects`. `onDataMarshalToForm` re-runs the solver and updates the chart's `data` only when the JSON-stringified data has changed.

### Chart descriptor shapes

**Static data (raw):**

```js
"MyStaticBarChart":
{
    Name: "Sales by Region",
    Hash: "MyStaticBarChart",
    DataType: "Object",
    PictForm:
    {
        Section: "Charts", Group: "Sales", Row: 1, Width: 6,
        InputType: "Chart",
        ChartType: "polarArea",                 // 'bar' | 'line' | 'pie' | 'polarArea' | 'doughnut' | 'radar'
        ChartLabelsRaw:   ['Red', 'Green', 'Yellow', 'Grey', 'Blue'],
        ChartDatasetsRaw: [{
            label: 'My First Dataset',
            data: [11, 16, 7, 3, 14],
            backgroundColor: ['rgb(255, 99, 132)', 'rgb(75, 192, 192)', /* ... */]
        }],
        ChartConfigCorePrototypeRaw:
        {
            // Full Chart.js options passthrough — anything in here lands on the
            // `new Chart(canvas, …)` config object. Use it for axes, plugins,
            // legend position, tooltips, etc.
            options: { scales: { y: { beginAtZero: true } }, plugins: { legend: { position: 'top' } } }
        }
    }
}
```

**Dynamic data (solver-driven):**

```js
"DynamicCaloriesChart":
{
    Name: "Calories by Fruit",
    Hash: "DynamicCaloriesChart",
    DataType: "Object",
    PictForm:
    {
        Section: "Charts", Group: "Stats", Row: 2, Width: 6,
        InputType: "Chart",
        ChartType: "bar",
        ChartLabelsSolver:    `objectkeystoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.calories"))`,
        ChartDatasetsSolvers:
        [
            { Label: 'Calories', DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.calories"))` }
        ]
    }
}
```

`ChartLabelsSolver` returns an array of labels. Each entry in `ChartDatasetsSolvers` defines one series — `Label` is the legend text and `DataSolver` returns the array of numbers for that series. You can mix multiple datasets to render stacked/grouped charts.

### Verified solver helpers

The chart provider evaluates solver strings through the manyfest expression engine. These are the helpers I've seen used in the wild (in `complex_table`):

| Helper | Returns | Example |
|---|---|---|
| `aggregationhistogrambyobject(arrayAddress, keyField, valueField)` | object: `{ keyValue: aggregatedNumber }` | aggregates `valueField` into buckets keyed by `keyField` |
| `objectkeystoarray(obj)` | array of keys | turns the histogram into chart labels |
| `objectvaluestoarray(obj)` | array of values | turns the histogram into chart series data |

The first arg of `aggregationhistogrambyobject` is **a manifest data address** (e.g. `FruitGrid` references the data at the address `FruitGrid` on the form scope; `Records` references the recordset's records when this manifest is consumed by pict-section-recordset). Quote string args with double quotes.

If you need other helpers, grep `pict-section-form` and `manyfest` for `addExpression` / `addCustomFunction` to see what's registered. Don't invent helper names — verify they exist before relying on them.

### Chart lifecycle quirks

- The chart is instantiated **once** in `onInputInitialize` and reused on subsequent data changes. Don't expect `addEventListener` on the canvas to be called on every render — the canvas DOM node is stable across renders.
- If `window.Chart` is not loaded at init time, the provider logs a warning and does **not** retry. Make sure the script tag is present and ordered before the app's bundle.
- Updating the chart calls `chart.update()` only when the JSON-stringified `data` differs from the previously-applied data. Mutating the data object in place won't trigger an update; replace it.

## Solvers

Authoritative reference: [`pict-section-form/docs/Solvers.md`](pict-section-form/docs/Solvers.md). A solver is a
string `"<TargetHash> = <expression>"`; solvers run in array order against the form's data scope and **assign
their result to a descriptor by Hash**. A `ReadOnly` field shows a computed value by being the assignment
*target* of a solver defined at one of these attach points:

| Attach point | Property | Runs |
|---|---|---|
| **Section** | `Section.Solvers: [ "Area = Width * Height" ]` | every solve pass, for that section |
| **Global / metacontroller** | `pict.views.PictFormMetacontroller.sectionSolvers.push("…")` | every solve pass, all sections |
| **Tabular group** | `Group.RecordSetSolvers` | per row of a `Layout: "Tabular"` group |
| **Manifest validation** | `Manifest.ValidationSolvers` | the validation pass |
| **Trigger group** | `PictForm.AutofillTriggerGroup[].PreSolvers` / `PostSolvers` | when that input's trigger group fires (input change / bundle load) |
| **Chart** | `PictForm.ChartLabelsSolver`, `ChartDatasetsSolvers[].DataSolver` | chart render (Chart provider only) |

**Two formats.** Each solver entry is either a **string** `"Target = expr"` (Ordinal defaults to `1`) or an
**object** `{ Expression: "Target = expr", Ordinal: 2 }`. Within a single scope (a section's `Solvers`, etc.)
entries always execute **in definition order**, ordinal or not. `Ordinal` is for sequencing **across** scopes:
in a solve pass, solvers from every section are collected and run in ascending `Ordinal` order (entries at the
same ordinal keep their definition order), so a low-ordinal solver in one section runs before a higher-ordinal
one in another.

A computed KPI: the `ReadOnly` field only displays; the section it belongs to carries the solver that assigns
to its hash.

```js
"TotalKPI":
{
    Hash: "TotalKPI", Name: "Total", DataType: "PreciseNumber",
    PictForm: { Section: "KPIs", Group: "Summary", Row: 1, Width: 3, InputType: "ReadOnly" }
}
```
```json
{
  "Sections":
  [
    { "Hash": "KPIs", "Solvers": [ "TotalKPI = sum(Items[].Amount, \"1.2345\")" ] }
  ]
}
```

**Trigger-group solvers** run on an input's change event — `PreSolvers` before, `PostSolvers` after.
`Pict-Input-EntityBundleRequest` reuses this: after its bundle fetch lands, it runs the `PostSolvers` of the
`AutofillTriggerGroup` entry whose `TriggerGroupHash` matches the input's `EntityBundleTriggerGroup` — so you
can derive a field from a freshly-fetched record. See `example_applications/complex_table` for a working
bundle + trigger-group setup.

Helper functions (`sum`, `JOIN`, `aggregationhistogrambyobject`, …) live in the fable ExpressionParser
FunctionMap (`fable/source/services/Fable-Service-ExpressionParser/Fable-Service-ExpressionParser-FunctionMap.json`).
Verify a helper is in that map before relying on it.

## Layout: Sections, Groups, Rows, Widths

`PictForm.Section`, `Group`, `Row`, `Width` (1–12, Bulma column units) wire descriptors into the form's visual layout. The metacontroller groups descriptors by section → group → row → width-ordered cells.

Tabs are first-class: `InputType: "TabSectionSelector"` with `TabSectionSet` / `TabSectionNames` produces clickable tabs that swap which sections are visible. `complex_table` uses both `TabGroupSelector` and `TabSectionSelector`.

## Tabular recordsets — advanced features

A `Layout: "Tabular"` group renders a `RecordSetAddress` array as a table whose columns come from a `RecordManifest`. Beyond the basics, these **group-level** properties are available. The reference example is `example_applications/gradebook/Gradebook-Application.js`; full docs in `pict-section-form/docs/Layouts.md`.

| Group property | Shape | What it does |
|---|---|---|
| `Headers` | `[ [ {Label, ColumnSpan, CSSClass}, … ], … ]` | Extra header rows stacked **above** the prime column-name row. `ColumnSpan` clusters cells; per-row span totals must equal the data-column count. |
| `RowLabels` | `[ {Name, Template?/RowNumber?/SourceAddress?, Cluster?, CSSClass?}, … ]` | Left-side label columns. `Template` resolves per row with the row record at `Record.Value`, index at `Record.Key`. `Cluster: true` collapses equal consecutive values into one `rowspan` cell. |
| `DynamicColumns` | `[ {SourceAddress, HashTemplate, NameTemplate, InformaryDataAddressTemplate, HeaderGroupTemplate?, DataType, PictForm, InsertAt?}, … ]` | Generates one column per row of `SourceAddress`. Templates resolve against the **source row**. `HeaderGroupTemplate` auto-adds a clustered super-header row. |
| `EditingControlsPosition` | `"right"` (default) / `"left"` / `"hidden"` | Where the del/up/down controls go. |
| `SuppressDefaultColumnHeaderRow` | boolean | Omit the prime column-name row (pair with custom `Headers`). |
| `RowSelection` / `ColumnSelection` | `true` or `{Enabled, DataAddress, HighlightClass, HeaderLabel}` | Checkbox row/column selection. State is a boolean array stored **in the form data** at `DataAddress` (default `<GroupHash>_RowSelection` / `_ColumnSelection`), so it round-trips with save/load. |
| `ColumnSorting` | boolean (default off) | Injects a clickable sort-glyph `<span>` (Pict icon registry) into every prime header. Click → asc, click again → desc. Works for static and dynamic columns. |

**`DynamicColumns` is non-destructive** — removing a source row removes the column but leaves the row data at its `InformaryDataAddress` untouched; re-adding restores the column with data intact. This is the key invariant: don't write a "dynamic columns" mechanism that deletes data when a column hides.

**Tabular styling solvers** (see `Solvers.md`): `HighlightTabularRow` / `HighlightTabularColumn` (toggle a CSS class on a `1`/`0` flag) and `ColorTabularRow` / `ColorTabularColumn` (set/clear an inline background). Signature: `(sectionHash, groupHash, rowOrColumnIndex, [color,] flag)`. They are presentational only — re-applied each solve, never touch form data. Selection state + these solvers compose: a solver reads the selection array and drives the highlight.

## When you're stuck

1. `complex_table/Complex-Tabular-Application.js` — descriptors for charts, lookups, autofills, multi-select, computed values. **First place to look.**
2. The HTML template emitted for any input lives in [Pict-DynamicTemplates-DefaultFormTemplates.js](pict-section-form/source/providers/dynamictemplates/Pict-DynamicTemplates-DefaultFormTemplates.js) — search for `CANVAS-FOR`, `INPUT-FOR`, etc. to see exactly what DOM gets generated for each `InputType`.
3. The provider source under `source/providers/inputs/Pict-Provider-Input-<Type>.js` — for the richer InputTypes that have one (not the simple ones; see the cheat sheet). Read its `onInputInitialize` and `onDataMarshalToForm` to understand the lifecycle.
4. **Don't fabricate solver helper names.** If `aggregationhistogrambyobject` isn't enough, grep manyfest's expression registrations or compose simpler helpers.
