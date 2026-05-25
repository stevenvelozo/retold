# Section playground rollout — per-module checklist

Adds the docuserve **section playground** (full-page `#/playground/section` route) to a `pict-section-*` UI-control module. The triangulated infrastructure handles wrapper-Application synthesis, runtime-bundle staging, and the splash "Playground" button — module authors write **zero** wrapper code.

The reference impl is **pict-section-objecteditor** (`docs/_playground.json` + 4 starter files only; no `source/application/` wrapper). pict-section-form predates the triangulation and ships a hand-authored `PictFormApplication` — don't copy its shape for new modules unless your section has app-level complexity (metacontroller, multi-view registration).

## When to add a section playground

A module is a candidate if it:
- exports a `pict-view` subclass that renders something visible,
- consumes its data via a Pict-style address (`DataAddress`, `ObjectDataAddress`, manifest key, …), and
- doesn't require live REST endpoints / external runtime servers.

Modules with imperative APIs (e.g. `pict-section-modal`'s `.toast()` / `.confirm()`) don't fit — the playground assumes a declarative manifest + render cycle.

## One-time prerequisite — the module needs a UMD bundle

If `dist/<package-name>.min.js` doesn't exist, run `npx quack build` once in the module root. Quackage auto-generates `.gulpfile-quackage.js` and `.gulpfile-quackage-config.json` from defaults. The generated `LibraryObjectName` becomes `window.<PascalCaseName>` in the iframe — **note the exact casing**, you'll need it in `_playground.json` (e.g. `pict-section-objecteditor` → `PictSectionObjecteditor`, lowercase `e` in `editor` because there's no hyphen).

## The 5 files

All five live under `docs/`. The `docs/playground/runtime/` folder is **machine-managed** — never hand-author files there; `quack prepare-docs` (or its sub-step `pict-docuserve stage-playground <docs>`) copies the UMD bundles in from `node_modules/` or the sibling monorepo checkout.

### 1. `docs/_playground.json`

```json
{
  "Kind":              "section",
  "WrapperKind":       "view",
  "SectionType":       "pict-section-<name>",
  "ApplicationModule": "PictSection<Name>",
  "ApplicationGlobal": "PictSection<Name>",
  "ViewName":          "<SectionShortName>",
  "ViewConfigKey":     "<SectionShortName>ViewConfig",
  "ManifestKey":       "Default<SectionShortName>Manifest",
  "Editors":
  [
    { "Hash": "pictConfig",  "Label": "Pict Config",      "Language": "json",       "DefaultPath": "playground/pict.json" },
    { "Hash": "appConfig",   "Label": "App Config",       "Language": "json",       "DefaultPath": "playground/app.json" },
    { "Hash": "appData",     "Label": "Initial AppData",  "Language": "json",       "DefaultPath": "playground/appdata.json" },
    { "Hash": "application", "Label": "Application Code", "Language": "javascript", "DefaultPath": "playground/application.js" }
  ],
  "Imports":
  [
    { "Name": "pict",                "Source": "local", "Path": "playground/runtime/pict.min.js" },
    { "Name": "pict-application",    "Source": "local", "Path": "playground/runtime/pict-application.min.js" },
    { "Name": "pict-section-modal",  "Source": "local", "Path": "playground/runtime/pict-section-modal.min.js" },
    { "Name": "pict-section-<name>", "Source": "local", "Path": "playground/runtime/pict-section-<name>.min.js" }
  ]
}
```

Field meanings:

| Field | What it does |
|---|---|
| `WrapperKind: "view"` | Tells the iframe bootstrap: the resolved class is a `pict-view`, **synthesize** a `PictApplication` wrapper around it. No hand-authored wrapper class needed. |
| `ApplicationModule` | The `window.<X>` global the UMD bundle puts the class under. Match the `LibraryObjectName` from `.gulpfile-quackage-config.json` exactly — case-sensitive. |
| `ApplicationGlobal` | Property on `window[ApplicationModule]` that holds the class. For modules whose main `module.exports` IS the class (typical), set this equal to `ApplicationModule` — the bootstrap falls through to the module itself. |
| `ViewName` | Hash to register the view as. Pick something short and unique (`ObjectEditor`, `CodeEditor`, `Histogram`). Determines `pict.views.<X>.render()` in custom Application Code. |
| `ViewConfigKey` | Where in `pictConfig` the view's options live (e.g. `ObjectEditorViewConfig`). The bootstrap reads `pictConfig[ViewConfigKey]`, shallow-merges over the view's `default_configuration`, and passes the result to `pict.addView`. |
| `ManifestKey` | Lands the **manifest** editor tab's content at `pict_configuration[ManifestKey]`. For view-kind modules without a manifest concept, this can stay unused (drop the `manifest` editor from `Editors`). |
| `Imports` | Every UMD `<script>` the iframe needs (see "Import sources" below). The first three (`pict`, `pict-application`, `pict-section-modal`) are always required. |

#### Optional fields (use when the section needs them)

| Field | What it does |
|---|---|
| `MountID` | Adds a `<div id="<MountID>"></div>` next to `#Section-Playground-Mount` in the iframe, and the wrapper auto-targets it. Use when the section's `DefaultDestinationAddress` is fixed and doesn't match `#Section-Playground-Mount` (e.g. `pict-editor-timeline` defaults to `#PictEditorTimeline`). |
| `BootstrapMethod` | Name of a method on the view to call once after initialization, with the value at `BootstrapSeedAddress` as the argument. Use for sections whose data is loaded imperatively (`pict-editor-timeline.loadStoryboard`, `pict-section-equation.setSolveResult`) rather than via a `<X>DataAddress` config option. |
| `BootstrapSeedAddress` | Address in `pict.AppData` whose value is the `BootstrapMethod`'s argument (e.g. `"AppData.Timeline.Cuts"`). |
| `Stylesheets` | Array of CSS `<link rel="stylesheet">` declarations — see "Stylesheets" below. Use for sections wrapping external libraries with CSS (Toast UI Grid, KaTeX, Mermaid themes). |

The bootstrap **auto-targets** `#Section-Playground-Mount` (or `#<MountID>` if set) when your injected `ViewConfig` doesn't override `DefaultDestinationAddress`. Don't override unless the section uses multiple mount points.

#### Import sources

| Source | Shape | When |
|---|---|---|
| `"cdn"` | `{ "Name": "<pkg>", "Source": "cdn", "Version": "1" }` → `<script src="https://cdn.jsdelivr.net/npm/<pkg>@<ver>/dist/<pkg>.min.js">` | External UMD package on npm with a sane jsDelivr layout. |
| `"local"` | `{ "Name": "<pkg>", "Source": "local", "Path": "playground/runtime/<pkg>.min.js" }` → `<script src="<Path>">` after `stage-playground` copies the bundle. | The pict-family packages, or anything you've built locally. |
| `"esm"` | `{ "Name": "codejar", "Source": "esm", "URL": "https://cdn.jsdelivr.net/npm/codejar@4.2.0/dist/codejar.min.js", "GlobalName": "CodeJar", "ExportName": "CodeJar" }` → `<script type="module">import { <ExportName> } from "<URL>"; window["<GlobalName>"] = ...</script>` | ES-module-only packages (CodeJar 4.x and friends) that can't be loaded via plain `<script src>`. The bootstrap awaits all ESM imports before initializing the application — you can rely on `window.<GlobalName>` being available by the time your view's `onInitialize` runs. |

#### Stylesheets

```json
"Stylesheets":
[
  { "Source": "cdn",   "Name": "tui-grid",       "Version": "4", "Path": "dist/tui-grid.css" },
  { "Source": "cdn",   "Name": "katex",          "Version": "0.16.21", "Path": "dist/katex.min.css" },
  { "Source": "local", "Path": "playground/runtime/custom.css" }
]
```

CDN sources build a jsDelivr URL from `Name@Version/Path`. Local sources are copied by `stage-playground` exactly like Import bundles.

### 2. `docs/playground/pict.json`

```json
{
  "Product": "<Name>Playground",
  "<SectionShortName>ViewConfig":
  {
    "<SectionSpecificOption1>": "...",
    "<SectionSpecificOption2>": "..."
  }
}
```

The view-config sub-object goes under the `ViewConfigKey` you picked. For objecteditor this is `ObjectEditorViewConfig` with `ObjectDataAddress`, `InitialExpandDepth`, `Editable`, …

### 3. `docs/playground/app.json`

```json
{
  "Name": "<Name> Playground",
  "Hash": "<Name>Playground",
  "MainViewportViewIdentifier": "<SectionShortName>",
  "AutoRenderMainViewportViewAfterInitialize": true
}
```

`MainViewportViewIdentifier` must equal `ViewName` from `_playground.json`.

### 4. `docs/playground/appdata.json`

```json
{
  "<TopLevelKey>": { ...starter data... }
}
```

This becomes `pict.AppData` on bootstrap. The view's `<X>DataAddress` (in `pict.json`) reads from here.

### 5. `docs/playground/application.js`

```js
// `Base` is the synthesized wrapper PictApplication.  Return a class
// that extends Base to add lifecycle hooks or register additional views.
return class extends Base
{
    onAfterInitialize()
    {
        super.onAfterInitialize();
        // ...
    }
};
```

Keep it minimal — most playgrounds need no customizations.

## Per-module rollout — 4 commands

```bash
cd modules/pict/pict-section-<name>

# 1. (one-time, if needed) Build the UMD bundle
npx quack build

# 2. Write the 5 files described above

# 3. Stage runtime bundles into docs/playground/runtime/
node ../../../node_modules/pict-docuserve/source/cli/Docuserve-CLI-Run.js \
    stage-playground ./docs -m .

# 4. Start a serve and visit #/playground/section
node ../../../node_modules/pict-docuserve/source/cli/Docuserve-CLI-Run.js \
    serve . -p <port>
```

Or, if the module is wired to `quack prepare-docs` (the umbrella build pipeline), the staging happens automatically as step 1b — no manual `stage-playground` invocation.

## Verifying

In the running serve:

1. The splash should show a **Playground** button alongside GitHub / Get Started (auto-detected from the presence of `_playground.json`).
2. Clicking it lands at `#/playground/section` and renders the multi-editor + iframe sandbox.
3. The iframe's section should mount inside `#Section-Playground-Mount` (auto-targeted unless overridden).
4. Editing any tab + clicking **Run** re-bootstraps the iframe with the new config.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Section module <Name> is not loaded` in the iframe error banner | `ApplicationModule` doesn't match `LibraryObjectName` in `.gulpfile-quackage-config.json` (case mismatch). |
| `WrapperKind: "view" requires pict-application to be loaded` | `pict-application` is missing from the `Imports` array. |
| Bundle 404s in DevTools network tab | `stage-playground` didn't find the source bundle. Run `npx quack build` in the relevant module + re-run staging. |
| Section renders but at the wrong place / not at all | Your `ViewConfig` set `DefaultDestinationAddress` to something that doesn't exist in the iframe HTML. Either drop the override (auto-target kicks in) or change the iframe template in `PictView-Docuserve-Section-Playground.js`. |
| "Cannot read properties of undefined" on initial render | Your `appdata.json` doesn't have the top-level key the view's `<X>DataAddress` points at. Match them. |
