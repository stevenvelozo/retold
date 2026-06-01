# Live Examples

> **38 interactive, in-browser demos** of the Pict component libraries - real applications running live on GitHub Pages. Open any one and poke at it: every form, grid, editor, modal, and viewer below is the genuine component, not a screenshot. The library each one showcases is linked beside its heading, so you can jump straight from "I want that" to its documentation.

Each demo is tagged Basic, Intermediate, or Advanced - a rough guide to how much of the framework it exercises, not how hard the component is to use.

### New here? Start with these

- [**Hello World**](https://fable-retold.github.io/pict/examples/hello_world/dist/) - The smallest possible Pict app - a single template-bound view rendered into the page. Start here.
- [**Simple Table**](https://fable-retold.github.io/pict-section-form/examples/simple_table/) - A minimal tabular forms application demonstrating manifest-driven table layout, reference manifests, and dot-notation access into nested record data.
- [**Simple Cards**](https://fable-retold.github.io/pict-section-flow/examples/simple_cards/) - Twelve custom PictFlowCard subclasses across six categories - every panel type (Markdown / Template / Form / View), every BodyContent renderer (SVG / HTML / Canvas), wrapped in a multi-page Pict shell with router-driven navigation and a curated sample-graph catalog.
- [**Theme Playground**](https://fable-retold.github.io/pict-provider-theme/examples/theme-playground/) - Interactive theme builder - live-edit tokens and CSS, upload imagery, watch a representative pict-section component gallery reflow instantly, and export a compiled JSON bundle.

---

## pict

[Documentation](https://fable-retold.github.io/pict/) - [Source](https://github.com/fable-retold/pict)

- [**Hello World** (Basic)](https://fable-retold.github.io/pict/examples/hello_world/dist/)<br/>The smallest possible Pict app - a single template-bound view rendered into the page. Start here.

## pict-application

[Documentation](https://fable-retold.github.io/pict-application/) - [Source](https://github.com/fable-retold/pict-application)

- [**Postkard** (Basic)](https://fable-retold.github.io/pict-application/examples/postcard_example/)<br/>Bootstrapping pattern for pict-application: providers, configuration-only views, lifecycle hooks, and a pluggable form theme.

## pict-router

[Documentation](https://fable-retold.github.io/pict-router/) - [Source](https://github.com/fable-retold/pict-router)

- [**Routed App** (Intermediate)](https://fable-retold.github.io/pict-router/examples/routed_app/)<br/>Multi-page SPA with hash routing, parameterized routes, and a layout shell that swaps content views into a shared container.

## pict-panel

[Documentation](https://fable-retold.github.io/pict-panel/) - [Source](https://github.com/fable-retold/pict-panel)

- [**Complex Table** (Intermediate)](https://fable-retold.github.io/pict-panel/examples/complex_table/)<br/>Rich pict-section-form host with sections, tabular layout, solvers, pick lists, and entity-bundle autofill - a dense target for inspecting with Pict Panel.

## pict-section-form

[Documentation](https://fable-retold.github.io/pict-section-form/) - [Source](https://github.com/fable-retold/pict-section-form)

- [**Simple Table** (Basic)](https://fable-retold.github.io/pict-section-form/examples/simple_table/)<br/>A minimal tabular forms application demonstrating manifest-driven table layout, reference manifests, and dot-notation access into nested record data.
- [**Change Tracking** (Intermediate)](https://fable-retold.github.io/pict-section-form/examples/change_tracking/)<br/>Demonstrates the multi-input evaluate-on-change solver pattern for reacting to several fields at once.
- [**Gradebook** (Intermediate)](https://fable-retold.github.io/pict-section-form/examples/gradebook/)<br/>An advanced tabular recordset with stacked headers, row labels, dynamic columns, row/column selection, and column sorting - built purely from manifest configuration.
- [**Scope Mathematics** (Intermediate)](https://fable-retold.github.io/pict-section-form/examples/scope_mathematics/)<br/>Shows solvers reaching across scopes to read and combine data from other sections of the form.
- [**Dynamic Analysis** (Advanced)](https://fable-retold.github.io/pict-section-form/examples/dynamic_analysis/)<br/>A fruit-nutrition analysis lab with dynamic section injection, solver rewriting, charts, and histograms.
- [**NDT Field Test** (Advanced)](https://fable-retold.github.io/pict-section-form/examples/ndt_field_test/)<br/>A nuclear-density-testing field data-collection form with offline persistence and charted results.

## pict-section-formeditor

[Documentation](https://fable-retold.github.io/pict-section-formeditor/) - [Source](https://github.com/fable-retold/pict-section-formeditor)

- [**Form Editor** (Intermediate)](https://fable-retold.github.io/pict-section-formeditor/examples/form_editor/)<br/>Visual manifest editor with sample loader, drag-and-drop reordering, JSON / preview / help tabs, and an extended descriptor property hook.
- [**Form Editor (Flex Height)** (Advanced)](https://fable-retold.github.io/pict-section-formeditor/examples/form_editor_flex/)<br/>Form editor embedded in a scrolling page with patched defaults: natural flow instead of fixed viewport height, plus a position:sticky properties panel.

## pict-section-connection-form

[Documentation](https://fable-retold.github.io/pict-section-connection-form/) - [Source](https://github.com/fable-retold/pict-section-connection-form)

- [**Connection Form Demo** (Intermediate)](https://fable-retold.github.io/pict-section-connection-form/examples/connection_form_demo/)<br/>Interactive showcase for pict-section-connection-form against a five-provider schema fixture.

## pict-section-content

[Documentation](https://fable-retold.github.io/pict-section-content/) - [Source](https://github.com/fable-retold/pict-section-content)

- [**Basic Content** (Basic)](https://fable-retold.github.io/pict-section-content/examples/basic_content/)<br/>Renders one markdown document with headings, lists, tables, code blocks, KaTeX equations, and Mermaid diagrams via the provider + view pair.
- [**Content Showcase** (Intermediate)](https://fable-retold.github.io/pict-section-content/examples/content_showcase/)<br/>Sidebar-navigable catalog of eleven markdown topics covering typography, code highlighting, KaTeX math, Mermaid diagrams, GFM tables, and images.

## pict-section-markdowneditor

[Documentation](https://fable-retold.github.io/pict-section-markdowneditor/) - [Source](https://github.com/fable-retold/pict-section-markdowneditor)

- [**Embedded Editor** (Basic)](https://fable-retold.github.io/pict-section-markdowneditor/examples/embedded_editor/)<br/>The smallest useful integration - pict-section-markdowneditor mounted inside a bordered card on an ordinary page, ready to drop into a notes field or comment box.
- [**Markdown Editor** (Basic)](https://fable-retold.github.io/pict-section-markdowneditor/examples/markdown_editor/)<br/>The full-featured segmented editor with quadrant buttons, drag-and-drop reorder, rich previews, Mermaid diagrams, KaTeX math, and code highlighting - every default capability turned on.
- [**Book Viewer** (Intermediate)](https://fable-retold.github.io/pict-section-markdowneditor/examples/book_viewer/)<br/>A long-form ten-chapter book rendered with pict-section-content and click-to-edit per section - Mermaid, KaTeX, code, and tables included.
- [**Server Upload** (Intermediate)](https://fable-retold.github.io/pict-section-markdowneditor/examples/server_upload/)<br/>The onImageUpload hook wired to a live Orator backend - paste, drag, or pick an image and the editor inserts a server URL instead of an embedded base64 data URI.

## pict-section-code

[Documentation](https://fable-retold.github.io/pict-section-code/) - [Source](https://github.com/fable-retold/pict-section-code)

- [**Code Display** (Basic)](https://fable-retold.github.io/pict-section-code/examples/code_display/)<br/>Five read-only syntax-highlighted code blocks rendered with one shared view subclass across every supported language.
- [**Code Editor** (Intermediate)](https://fable-retold.github.io/pict-section-code/examples/code_editor/)<br/>Live single-file editor bound to AppData with runtime language switching, read-only toggling, and a snapshot output panel.
- [**Multi-File Editor** (Advanced)](https://fable-retold.github.io/pict-section-code/examples/multi_file_editor/)<br/>Sidebar-tabbed workspace that swaps many documents through one editor instance with save-on-switch, per-extension language detection, and new/delete file workflows.

## pict-section-inlinedocumentation

[Documentation](https://fable-retold.github.io/pict-section-inlinedocumentation/) - [Source](https://github.com/fable-retold/pict-section-inlinedocumentation)

- [**Bookshop** (Intermediate)](https://fable-retold.github.io/pict-section-inlinedocumentation/examples/bookshop/)<br/>E-commerce demo with route-mapped help, data-attribute tooltips, and F1 toggling for pict-section-inlinedocumentation.

## pict-section-tuigrid

[Documentation](https://fable-retold.github.io/pict-section-tuigrid/) - [Source](https://github.com/fable-retold/pict-section-tuigrid)

- [**Class Grid** (Basic)](https://fable-retold.github.io/pict-section-tuigrid/examples/class_grid/)<br/>The minimum-viable TuiGrid: ten student records edited via text, select, number, and date-picker editors with currency formatting and solver triggers.
- [**Inventory Grid** (Intermediate)](https://fable-retold.github.io/pict-section-tuigrid/examples/inventory_grid/)<br/>Config-only inventory table with frozen first column, validated EditorText, address-resolved select dropdown, currency and date formatters, and solver triggers.
- [**Invoice Grid** (Advanced)](https://fable-retold.github.io/pict-section-tuigrid/examples/invoice_grid/)<br/>Custom data marshaling: preChangeHandler clamps and rounds input, changeHandler recomputes line totals and applies a discount rule, plus a custom formatter and DOM writes outside the grid.

## pict-section-objecteditor

[Documentation](https://fable-retold.github.io/pict-section-objecteditor/) - [Source](https://github.com/fable-retold/pict-section-objecteditor)

- [**JSON Editor** (Intermediate)](https://fable-retold.github.io/pict-section-objecteditor/examples/json_editor/)<br/>Interactive object editor with inline editing, expand-by-depth controls, and six runtime CSS themes.

## pict-meadow-connection-manager

[Documentation](https://fable-retold.github.io/pict-meadow-connection-manager/) - [Source](https://github.com/fable-retold/pict-meadow-connection-manager)

- [**Bookstore Connections** (Intermediate)](https://fable-retold.github.io/pict-meadow-connection-manager/examples/bookstore-connections/)<br/>Manage connections to the meadow bookstore test databases (MySQL, PostgreSQL, SQLite).

## pict-section-histogram

[Documentation](https://fable-retold.github.io/pict-section-histogram/) - [Source](https://github.com/fable-retold/pict-section-histogram)

- [**Simple Histogram** (Basic)](https://fable-retold.github.io/pict-section-histogram/examples/simple_histogram/)<br/>Eight independent histogram views on one page covering selection modes, data binding, per-bar colors, gap filling, and the runtime API.
- [**Image Histogram** (Intermediate)](https://fable-retold.github.io/pict-section-histogram/examples/image_histogram/)<br/>Drag-and-drop image analyzer that drives six independent histogram views (R/G/B/A, hue, luminosity) with per-bar gradient and rainbow coloring.

## pict-section-equation

[Documentation](https://fable-retold.github.io/pict-section-equation/) - [Source](https://github.com/fable-retold/pict-section-equation)

- [**Expression Solve Explorer** (Intermediate)](https://fable-retold.github.io/pict-section-equation/examples/solve_explorer/)<br/>Live tour of the Fable Expression Parser - type an expression or pick from a catalog, watch the step-by-step solve, postfix token stack, and nested-pyramid visualizations repaint in parallel.

## pict-section-openseadragon

[Documentation](https://fable-retold.github.io/pict-section-openseadragon/) - [Source](https://github.com/fable-retold/pict-section-openseadragon)

- [**Photo Example** (Basic)](https://fable-retold.github.io/pict-section-openseadragon/examples/photo_example/)<br/>Deep-zoom image viewer with W3C Web Annotation overlays, drawing toolbar, and a comment side panel.

## pict-section-flow

[Documentation](https://fable-retold.github.io/pict-section-flow/) - [Source](https://github.com/fable-retold/pict-section-flow)

- [**Simple Cards** (Basic)](https://fable-retold.github.io/pict-section-flow/examples/simple_cards/)<br/>Twelve custom PictFlowCard subclasses across six categories - every panel type (Markdown / Template / Form / View), every BodyContent renderer (SVG / HTML / Canvas), wrapped in a multi-page Pict shell with router-driven navigation and a curated sample-graph catalog.

## pict-section-modal

[Documentation](https://fable-retold.github.io/pict-section-modal/) - [Source](https://github.com/fable-retold/pict-section-modal)

- [**Bookstore** (Intermediate)](https://fable-retold.github.io/pict-section-modal/examples/bookstore/)<br/>Practical modal usage in a data-driven inventory app - confirm on delete, double-confirm on bulk delete, custom modals for record details, toasts for feedback.
- [**Modal Garden** (Intermediate)](https://fable-retold.github.io/pict-section-modal/examples/modal_garden/)<br/>Interactive feature catalog covering every pict-section-modal primitive: confirm, doubleConfirm, show, toast, tooltip, dropdown, plus the full shell + panels playground.
- [**Acme Widgets** (Advanced)](https://fable-retold.github.io/pict-section-modal/examples/acme/)<br/>A branded multi-page app demonstrating the full shell + theme integration - custom brand, custom theme, responsive sidebar, gear menu, and bottom status bar.
- [**Panel Garden** (Advanced)](https://fable-retold.github.io/pict-section-modal/examples/panel_garden/)<br/>Visual test-bed for the shell()/addPanel() collapse-tab geometry - every side, multiple thicknesses, corner vs middle anchoring, with live theme switching.

## pict-provider-theme

[Documentation](https://fable-retold.github.io/pict-provider-theme/) - [Source](https://github.com/fable-retold/pict-provider-theme)

- [**Theme Playground** (Advanced)](https://fable-retold.github.io/pict-provider-theme/examples/theme-playground/)<br/>Interactive theme builder - live-edit tokens and CSS, upload imagery, watch a representative pict-section component gallery reflow instantly, and export a compiled JSON bundle.

---

_All 38 examples verified live (HTTP 200). Generated from each example app's `retold.ExampleApplication` metadata. Want to add one? See the [Example App Style Guide](../architecture/example-app-style-guide.md)._
