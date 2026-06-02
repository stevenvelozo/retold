# Pict -- MVC Tools

Pict provides a non-opinionated set of Model-View-Controller tools for building user interfaces. Its core insight: UI is text. Whether you are rendering to a browser DOM, a terminal, or generating strings for another system, Pict treats the output as rendered text and gives you a consistent set of tools for managing views, templates, data, and application lifecycle.

## Design Philosophy

Pict does not impose opinions about what MVC means. It provides discrete tools -- Views, Templates, Providers, and an Application class -- that you can use individually or compose together.

*Pict is a subclass of Fable*, so does everything fable does.

- **Views** manage lifecycle (initialize, render, marshal data) and render templates into target containers
- **Templates** are text with expressions that resolve against application state
- **Providers** fetch and manage data for views
- **The Application class** coordinates view lifecycle and shared state

<!-- bespoke diagram: edit diagrams/design-philosophy.mmd or .hints.json, then: npx pict-renderer-graph build docs/modules -->
![Design Philosophy](diagrams/design-philosophy.svg)

## Core Modules

### [Pict](https://fable-retold.github.io/pict/)

The main module. Creates the application context, manages template and view registries, provides the template expression engine, and coordinates rendering.

```javascript
const libPict = require('pict');

let _Pict = new libPict({
    Product: 'MyApp',
    DefaultRenderable: true
});

// Register a template
_Pict.TemplateProvider.addTemplate('HelloTemplate',
    '<h1>Hello {~Data:Record.Name~}!</h1>');

// Set some data
_Pict.AppData.Record = { Name: 'World' };
```

**Template expressions** use the `{~ ~}` syntax to resolve data, call templates, invoke providers, and perform logic:

| Expression | Purpose | Example |
|-----------|---------|---------|
| `{~Data:Path~}` | Resolve data from AppData | `{~Data:Record.Name~}` |
| `{~Template:Name~}` | Render another template | `{~Template:Header~}` |
| `{~Each:Array:Template~}` | Iterate and render | `{~Each:Records:RowTemplate~}` |
| `{~If:Condition~}` | Conditional rendering | `{~If:Record.Active~}` |

**npm:** `pict` - **Version:** 1.0.x

---

### [Pict-View](https://fable-retold.github.io/pict-view/)

The View base class. Views manage a complete lifecycle -- initialization, rendering, data marshaling (two-way binding), CSS injection, and teardown.

```javascript
const libPictView = require('pict-view');

class MyView extends libPictView
{
    constructor(pFable, pOptions, pServiceHash)
    {
        super(pFable, pOptions, pServiceHash);
        this.serviceType = 'MyView';
    }

    onBeforeRender()
    {
        this.log.info('About to render');
    }

    onAfterMarshalFromView()
    {
        // Data has been pulled from the DOM back into AppData
    }
}
```

**View lifecycle:** Initialize -> Render -> Solve -> Marshal From View -> Marshal To View

**npm:** `pict-view` - **Version:** 1.0.x

---

### [Pict-Template](https://fable-retold.github.io/pict-template/)

Base class for custom template handlers. Extend this to add new template expression types beyond the built-in set.

**npm:** `pict-template` - **Version:** 1.0.x

---

### [Pict-Template-Preprocessor](https://fable-retold.github.io/pict-template-preprocessor/)

Template compiler and optimizer. Compiles template strings into cached segment arrays on first parse so the character-by-character trie walk only happens once per unique template. Builds an expression dependency graph with JSON and Graphviz DOT export, and batch-prefetches entities at TemplateSet boundaries to eliminate N+1 fetch patterns.

```javascript
const libPreprocessor = require('pict-template-preprocessor');

// Register and instantiate -- wrappers install automatically
_Pict.addServiceType('PictTemplatePreprocessor', libPreprocessor);
let _Preprocessor = _Pict.instantiateServiceProvider('PictTemplatePreprocessor');

// All parseTemplate calls now use the compiled fast path
// Inspect the dependency graph
console.log(_Preprocessor.graph.toDOT());
```

**npm:** `pict-template-preprocessor` - **Version:** 0.0.x

---

### [Pict-Provider](https://fable-retold.github.io/pict-provider/)

Base class for data providers. Providers fetch, transform, and deliver data to views.

**npm:** `pict-provider` - **Version:** 1.0.x

---

### [Pict-Application](https://fable-retold.github.io/pict-application/)

Application base class that coordinates multiple views, manages shared state, and provides structured lifecycle management for complete applications.

```javascript
const libPictApplication = require('pict-application');

class MyApp extends libPictApplication
{
    constructor(pFable, pOptions, pServiceHash)
    {
        super(pFable, pOptions, pServiceHash);
        this.serviceType = 'MyApp';
    }

    onAfterInitialize()
    {
        // Register views, load data, start rendering
    }
}
```

**npm:** `pict-application` - **Version:** 1.0.x

## Section Modules

Sections are pre-built view patterns for common UI needs.

### [Pict-Section-Form](https://fable-retold.github.io/pict-section-form/)

Configuration-driven dynamic forms. Define form layout, fields, validation, and data binding in JSON -- the section handles rendering, data marshaling, and mathematical solving.

Supports 13+ input types with custom providers for each. Used extensively for building data entry interfaces without writing HTML by hand.

**npm:** `pict-section-form` - **Version:** 1.0.x

---

### [Pict-Section-Recordset](https://fable-retold.github.io/pict-section-recordset/)

CRUD views (Create, Read, Update, Delete) based on Meadow endpoint schemas. Provides list views, detail views, and record management with data provider integration.

**npm:** `pict-section-recordset` - **Version:** 1.0.x

---

### [Pict-Section-TUIGrid](https://fable-retold.github.io/pict-section-tuigrid/)

Toast UI Grid integration for tabular data display. Provides spreadsheet-like data grids with sorting, filtering, and editing.

**npm:** `pict-section-tuigrid` - **Version:** 1.0.x

---

### [Pict-Section-Content](https://fable-retold.github.io/pict-section-content/)

Markdown parsing and content rendering with Mermaid diagrams and KaTeX math equations. Provides a reusable provider for markdown-to-HTML conversion and a styled view with post-render hooks.

**npm:** `pict-section-content`

---

### [Pict-Section-Code](https://fable-retold.github.io/pict-section-code/)

Code editor and syntax highlighter wrapping CodeJar. Provides editable code editors and read-only syntax-highlighted displays with built-in support for JavaScript, JSON, HTML, CSS, and SQL. Supports custom highlighter functions and two-way data binding to Pict AppData.

**npm:** `pict-section-code`

---

### [Pict-Section-MarkdownEditor](https://fable-retold.github.io/pict-section-markdowneditor/)

Segmented markdown editor built on CodeMirror v6. Splits documents into independently editable segments with drag-and-drop reorder, formatting toolbar, image upload hooks, and live rich previews with Mermaid diagrams and KaTeX math. Supports read-only mode, rendered view toggle, and server-side image upload integration.

**npm:** `pict-section-markdowneditor`

---

### [Pict-Section-Flow](https://fable-retold.github.io/pict-section-flow/)

Flow diagram section for visual workflow and process representations.

**npm:** `pict-section-flow`

## Application Modules

| Module | Purpose | npm |
|--------|---------|-----|
| [pict-docuserve](https://fable-retold.github.io/pict-docuserve/) | Single-page documentation viewer built on Pict with catalog navigation and search | `pict-docuserve` |
| [pict-nonlinearconfig](https://fable-retold.github.io/pict-nonlinearconfig/) | Nonlinear configuration manager | `pict-nonlinearconfig` |

## Supporting Modules

| Module | Purpose | npm |
|--------|---------|-----|
| [pict-router](https://fable-retold.github.io/pict-router/) | Hash-based URL routing via Navigo with template string route functions | `pict-router` |
| [pict-panel](https://fable-retold.github.io/pict-panel/) | Control panel component, hot-loadable from CDN | `pict-panel` |
| [informary](https://fable-retold.github.io/informary/) | Dependency-free browser form marshaling with undo/redo and field-level deltas | `informary` |
| [cryptbrau](https://fable-retold.github.io/cryptbrau/) | Simple in-browser symmetric encryption | `cryptbrau` |
| [pict-serviceproviderbase](https://fable-retold.github.io/pict-serviceproviderbase/) | Base classes for Pict services with pre-initialization support | `pict-serviceproviderbase` |
| [pict-service-commandlineutility](https://fable-retold.github.io/pict-service-commandlineutility/) | CLI utility tools built on Commander | `pict-service-commandlineutility` |
| [pict-terminalui](https://fable-retold.github.io/pict-terminalui/) | Blessed-based terminal interface for Pict views | `pict-terminalui` |

## All Pict Modules

| Module | Description |
|--------|-------------|
| [pict](https://fable-retold.github.io/pict/) | Core MVC module with template engine |
| [pict-template](https://fable-retold.github.io/pict-template/) | Custom template handler base class |
| [pict-template-preprocessor](https://fable-retold.github.io/pict-template-preprocessor/) | Template compiler with cached segments, dependency graphs, and entity prefetch |
| [pict-view](https://fable-retold.github.io/pict-view/) | View base class with full lifecycle |
| [pict-provider](https://fable-retold.github.io/pict-provider/) | Data provider base class |
| [pict-application](https://fable-retold.github.io/pict-application/) | Application lifecycle management |
| [pict-panel](https://fable-retold.github.io/pict-panel/) | Hot-loadable control panel |
| [pict-nonlinearconfig](https://fable-retold.github.io/pict-nonlinearconfig/) | Nonlinear configuration manager |
| [pict-section-flow](https://fable-retold.github.io/pict-section-flow/) | Flow diagram section |
| [pict-docuserve](https://fable-retold.github.io/pict-docuserve/) | Single-page documentation viewer |
| [cryptbrau](https://fable-retold.github.io/cryptbrau/) | In-browser symmetric encryption |
| [informary](https://fable-retold.github.io/informary/) | Browser form marshaling with undo/redo |
| [pict-service-commandlineutility](https://fable-retold.github.io/pict-service-commandlineutility/) | CLI utility tools |
| [pict-section-recordset](https://fable-retold.github.io/pict-section-recordset/) | CRUD record management views |
| [pict-section-content](https://fable-retold.github.io/pict-section-content/) | Markdown parsing and content rendering |
| [pict-section-code](https://fable-retold.github.io/pict-section-code/) | Code editor and syntax highlighter wrapping CodeJar |
| [pict-section-markdowneditor](https://fable-retold.github.io/pict-section-markdowneditor/) | Segmented markdown editor built on CodeMirror v6 |
| [pict-section-form](https://fable-retold.github.io/pict-section-form/) | Configuration-driven dynamic forms |
| [pict-section-tuigrid](https://fable-retold.github.io/pict-section-tuigrid/) | Toast UI Grid tabular data |
| [pict-router](https://fable-retold.github.io/pict-router/) | Hash-based URL routing |
| [pict-serviceproviderbase](https://fable-retold.github.io/pict-serviceproviderbase/) | Pict service base classes |
| [pict-terminalui](https://fable-retold.github.io/pict-terminalui/) | Blessed-based terminal interface |
