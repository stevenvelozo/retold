# Pict Module Development Guide

Reference for building views, providers, and applications with the Pict framework. Every module under `modules/pict/` should follow these patterns.

## **DO NOT USE JAVASCRIPT CONFIRMATION AND ALERT BOXES — USE `pict-section-modal` INSTEAD**

Native `window.confirm()`, `window.alert()`, and `window.prompt()` are banned in Pict-based applications. They block the UI thread, can't be styled, can't be keyboard-navigated consistently across browsers, aren't testable with the same infrastructure as the rest of the app, and look jarring next to the product's own design system.

Replace them with the host application's `pict-section-modal` view. Its canonical API lives at `modules/pict/pict-section-modal/source/Pict-Section-Modal.js`.

### `.confirm(message, options)` → `Promise<boolean>`

Simplest replacement for native `confirm()`. Returns `true` if the user confirmed, `false` if they cancelled or dismissed.

```javascript
let tmpModal = this.pict.views['Pict-Section-Modal'];
tmpModal.confirm('This cannot be undone.',
    {
        title:        'Delete draft?',
        confirmLabel: 'Delete',
        cancelLabel:  'Cancel',
        dangerous:    true
    }).then((pOk) =>
    {
        if (!pOk) return;
        // proceed with the action
    });
```

Use `dangerous: true` for destructive actions (delete, overwrite, clear). Use `.doubleConfirm(message, {confirmPhrase: 'DELETE'})` if you want typed-phrase gating for severe actions (e.g. dropping a weights file).

### `.show(options)` → `Promise<string|null>`

Low-level API for custom content. Resolves to the clicked button's `Hash`, or `null` if the dialog was closed via the overlay or close button. Use this for **alert** replacements, **prompts** (via an embedded `<input>`), or any multi-button dialog.

**Alert (blocking info/error):**
```javascript
tmpModal.show({
    title:   'Upload failed',
    content: '<p>Server returned <code>413 Payload Too Large</code>.</p>',
    buttons: [ { Hash: 'ok', Label: 'OK', Style: 'primary' } ]
});
```

**Prompt (text input):**
```javascript
tmpModal.show({
    title:   'New note',
    content:
        '<p>Filename (no extension):</p>' +
        '<input type="text" id="pict-prompt-input" class="pict-input" autofocus>',
    buttons: [
        { Hash: 'cancel', Label: 'Cancel' },
        { Hash: 'ok',     Label: 'Create', Style: 'primary' }
    ]
}).then((pChoice) =>
{
    if (pChoice !== 'ok') return;
    let tmpValue = (document.getElementById('pict-prompt-input') || {}).value || '';
    tmpValue = tmpValue.trim();
    if (!tmpValue) return;
    // proceed with tmpValue
});
```

**Button shape:** `{ Hash: <id>, Label: <text>, Style?: 'primary' | 'danger' }`. Only one `Style` slot per button; default styling is neutral. Order of the array is left-to-right in the dialog.

### `.toast(message, options)`

Non-blocking notification. No promise, returns a `{dismiss}` handle. Prefer this for success messages and non-critical errors that don't require acknowledgement.

```javascript
tmpModal.toast('Draft saved',             { type: 'success' });
tmpModal.toast('Could not reach server',  { type: 'error', duration: 6000 });
```

### Anti-patterns to reject in code review

| Wrong | Right |
|---|---|
| `if (confirm('...'))` | `modal.confirm('...', {...}).then((ok) => ok && ...)` |
| `alert('done')` | `modal.toast('done', {type: 'success'})` for info; `modal.show({...})` for errors requiring acknowledgement |
| `let x = prompt('...')` | `modal.show({content: '<input id="...">', buttons: [...]})` + read the input in the `.then()` |
| `window.confirm(...)` / `window.alert(...)` / `window.prompt(...)` | All four of the above |

If you need a pattern the modal doesn't support (e.g. multi-field forms, dropdowns, async loading indicators), extend `pict-section-modal` rather than falling back to native popups.

## CSS

All CSS lives in the view or provider configuration and is registered through the Pict CSS cascade (`Pict-CSS.js`). The cascade deduplicates by hash and sorts by priority before injecting into a single `<style>` element.

### For views

Define CSS in the exported configuration object. The base `pict-view` class auto-registers it via `addCSS()` during construction.

```javascript
const _ViewConfiguration =
{
    ViewIdentifier: 'My-Widget',
    CSS: /*css*/`
        .my-widget { display: flex; }
        .my-widget-item { padding: 8px; }
    `,
    CSSPriority: 500,          // optional, default 500
    Templates: [ /* ... */ ],
    Renderables: [ /* ... */ ]
};
```

### For providers

Providers do not get automatic CSS registration. Call `addCSS()` directly:

```javascript
constructor(pFable, pOptions, pServiceHash)
{
    super(pFable, pOptions, pServiceHash);

    if (this.pict && this.pict.CSSMap && typeof this.pict.CSSMap.addCSS === 'function')
    {
        this.pict.CSSMap.addCSS('My-Provider-CSS', libCSS, 500);
    }
}
```

### Common mistakes

| Wrong | Right |
|-------|-------|
| `pict.CSSMap['Hash'] = { CSS: str }` | `pict.CSSMap.addCSS(hash, str, priority)` |
| Manual `<style>` tag via innerHTML | Use the config `CSS` property or `addCSS()` |
| Forgetting `injectCSS()` in lazy views | Call `this.pict.CSSMap.injectCSS()` in `onAfterRender()` |

### CSSMap API

```
addCSS(pHash, pContent, pPriority, pProvider)
    Registers a CSS fragment. Deduplicates by hash.
    pContent is the CSS string. pPriority defaults to 1000.

removeCSS(pHash)
    Removes a fragment by hash.

generateCSS()
    Returns the full concatenated CSS string, sorted by priority.

injectCSS()
    Writes generateCSS() output to the DOM via ContentAssignment.
```

The internal storage is `CSSMap.inlineCSSMap[hash] = { Hash, Content, Provider, Priority }`. Note the property is `Content`, not `CSS`.

---

## Templates

Define templates in the configuration's `Templates` array. Each entry is registered with `pict.TemplateProvider.addTemplate()` during view construction.

```javascript
Templates:
[
    {
        Hash: 'MyWidget-Container-Template',
        Template: /*html*/`
<div class="my-widget" id="MyWidget-Root">
    <div class="my-widget-header">{~D:Record.Title~}</div>
    <div id="MyWidget-List"></div>
</div>`
    },
    {
        Hash: 'MyWidget-Row-Template',
        Template: /*html*/`
<div class="my-widget-item" onclick="{~P~}.views['{~D:Record.ViewHash~}'].selectItem('{~D:Record.ItemId~}')">
    {~D:Record.Name~}
</div>`
    }
]
```

### Template expressions

| Expression | Resolves to |
|------------|------------|
| `{~D:Record.Path~}` | Data value at address relative to the record |
| `{~D:AppData.X.Y~}` | Data value at absolute AppData address |
| `{~P~}` | The global pict reference (for onclick handlers) |
| `{~D:Record.ViewHash~}` | The view's Hash (for referencing itself in handlers) |
| `{~T:TemplateHash:Address~}` | Render `TemplateHash` once with the data at `Address` |
| `{~TS:TemplateHash:Address~}` | Render `TemplateHash` for **each** item in the array at `Address` and concatenate the results |
| `{~NE:Address^content~}` | Output `content` literally when the value at `Address` is truthy. The content is parsed (so further template tags resolve). Note the **`^` separator**, not `:`. |
| `{~TIfAbs:TemplateHash:DataAddress:LeftAddress^Op^RightValue~}` | Render `TemplateHash` (with data at `DataAddress`) only when the comparison passes. Operators: `===`, `==`, `!==`, `!=`, `<`, `>`, `<=`, `>=`, `TRUE`, `FALSE`, `LNGT`, `LNLT`. |
| `{~Join:Address:Separator~}` | Join array values with separator |
| `{~JSV:Address~}` | Pretty-print the value at `Address` as JSON (for debug panels) |
| `{~Digits:Address:N~}` / `{~Dollars:Address~}` | Numeric formatting filters |

`TS` is the workhorse for lists. The address can be **`Record.X`** (relative) or **`AppData.X.Y`** (absolute) — pict's `Pict-Template-DataWithAbsoluteFallback` resolves both. Inside the iterated child template, the per-item record is the new `Record`, and `AppData.*` still works for cross-cutting state.

For simple "render this if a flag is set" use `{~NE:~}` — its content is parsed so it can contain other template tags. Reach for `{~TIfAbs:~}` only when you need a real comparison (numeric thresholds, string equality against a sentinel, etc.).

### Parsing templates at runtime

```javascript
let tmpRecord = { ViewHash: this.Hash, Title: 'Hello' };
let tmpHTML = this.pict.parseTemplateByHash('MyWidget-Row-Template', tmpRecord);
this.pict.ContentAssignment.assignContent('#MyWidget-List', tmpHTML);
```

### **Don't hand-roll iteration. Use `{~TS:...~}`.**

Easy way to spot the smell: a `_buildXxxxHTML(pState)` method, a `for` loop that calls `parseTemplateByHash()` once per item and concatenates, and a parent template with a single `{~D:State.XxxxHTML~}` placeholder. The framework already does the loop — let it.

```javascript
// ❌ Wrong — hand-rolled iteration in JS
_buildListHTML(pState)
{
    let tmpHtml = '';
    for (let i = 0; i < pState.Items.length; i++)
    {
        tmpHtml += this.pict.parseTemplateByHash('MyWidget-Row-Template', pState.Items[i]);
    }
    return tmpHtml;
}
// then in onBeforeRender: pState.ListHTML = this._buildListHTML(pState);
// and in the parent template: {~D:State.ListHTML~}

// ✅ Right — push records into AppData, let the template iterate
onBeforeRender(pRenderable)
{
    this.pict.AppData.MyWidget.Items = this._loadItems();
    return super.onBeforeRender(pRenderable);
}
// and in the parent template: {~TS:MyWidget-Row-Template:AppData.MyWidget.Items~}
```

The `TS` form has three durable advantages:
1. **No prerender step.** Adding/removing items doesn't require re-running a build method.
2. **Single source of truth.** `AppData.MyWidget.Items` is the data; the template is the rendering. Helper methods that compute strings out of state mix the two.
3. **Empty-state handling is a one-line `{~NotEmpty:...~}` swap** instead of a JS `if` branch around the build call.

### Conditionals — prefer the single-element-array trick

The cleanest and most flexible conditional in pict templates is **a one-or-zero-element array driving a `TS` tag**. Empty array → nothing rendered; one-element → template rendered once with full template-tag support inside.

```javascript
// onBeforeRender:
this.pict.AppData.MyFeature.BusySlot = pInProgress ? [pStatusRow] : [];
this.pict.AppData.MyFeature.IdleSlot = pInProgress ? [] : [pStatusRow];
```

```html
<!-- parent template -->
<div class="action-slot">
    {~TS:MyFeature-Spinner-Template:AppData.MyFeature.BusySlot~}
    {~TS:MyFeature-Idle-Template:AppData.MyFeature.IdleSlot~}
</div>
```

Inside `MyFeature-Spinner-Template`, the per-record context is `pStatusRow`, so `{~D:Record.X~}` works. `AppData.*` still resolves to the global state.

#### Other conditional tags

- `{~NE:Address^content~}` — emits literal `content` if address is truthy. **Inner template tags are NOT recursively parsed**; this is for plain text/HTML only. Useful for "show this static label when a flag is set."
- `{~TIfAbs:TemplateHash:DataAddress:LeftAddress^Op^RightValue~}` — render `TemplateHash` if comparison passes. Inner template tags ARE parsed (it's a real template render). Operators that work in practice: `===`, `==`, `!==`, `!=`, `TRUE`, `FALSE`, `<`, `>`, `<=`, `>=`, `LNGT`, `LNLT`. Note: numeric comparisons against literal numbers can be fiddly because the right-hand value is parsed as a string — prefer string comparisons (`Status^===^running`) or boolean operators (`Flag^TRUE^`).

**Avoid the JS-side ternary that produces an HTML string and stuffs it into `Record.SomethingHTML`.** That couples markup to JS and defeats the template engine.

### Common mistakes

| Wrong | Right |
|-------|-------|
| Building HTML via string concatenation in methods | Define templates in `Templates` array, use `{~TS:~}` / `{~TIA:~}` to compose them |
| `_buildListHTML(pState)` that loops + `parseTemplateByHash` | `{~TS:Row-Template:AppData.X.Items~}` in the parent template |
| Computing `Record.XHTML` strings in `onBeforeRender` | Push the data; let `{~TIA:~}` choose the template |
| Stuffing computed strings into `pState.XxxxHTML` | Push records / values into `AppData`; reference via `{~D:AppData...~}` |
| Hardcoding `window.pict.views['ViewName']` in onclick strings | Use `{~P~}.views['{~D:Record.ViewHash~}']` in templates |
| Mutating DOM directly (`document.getElementById(...).innerHTML = ...`) | Trigger a re-render (`this.render()`) so the template engine repaints from `AppData` |

### When `parseTemplateByHash()` is still appropriate

- One-shot rendering into a destination outside the renderable cycle (e.g. injecting a single fragment from a non-Pict callback).
- Computing a string for an attribute value where a template tag wouldn't work (rare).
- Tests / debugging utilities.

For everything inside the render cycle, prefer `{~TS:~}` / `{~TIA:~}` / `{~D:~}` and let the framework drive.

---

## Renderables

A renderable connects a template to a DOM destination. Define them in the configuration's `Renderables` array. The framework's `render()` method processes them.

```javascript
Renderables:
[
    {
        RenderableHash: 'MyWidget-Display',
        TemplateHash: 'MyWidget-Container-Template',
        ContentDestinationAddress: '#MyWidget-Container',  // CSS selector
        RenderMethod: 'replace'                            // default
    }
]
```

### Render methods

| Method | Behavior |
|--------|----------|
| `replace` | Replace the target element's content (default) |
| `append` | Append to the end |
| `prepend` | Prepend to the start |
| `append_once` | Append only if not already present |

---

## ContentAssignment

Use `this.pict.ContentAssignment` for all DOM reads and writes. It abstracts the DOM so views work in both browser and server-side contexts.

```javascript
// Assign HTML to a DOM element
this.pict.ContentAssignment.assignContent('#MyWidget-List', tmpHTML);

// Get a DOM element (returns array-like)
let tmpElement = this.pict.ContentAssignment.getElement('#MyWidget-Root');

// Project content using a render method
this.pict.ContentAssignment.projectContent('append', '#MyWidget-List', tmpRowHTML);
```

### Common mistakes

| Wrong | Right |
|-------|-------|
| `document.getElementById('X').innerHTML = html` | `this.pict.ContentAssignment.assignContent('#X', html)` |
| `document.querySelector('.x')` | `this.pict.ContentAssignment.getElement('.x')` |
| Setting `.innerHTML` directly in lifecycle hooks | Use `assignContent()` or `projectContent()` |

---

## Lifecycle

### Initialization (runs once)

```
onBeforeInitialize()        Sync setup before init
onBeforeInitializeAsync(cb) Async setup before init
onInitialize()              Main init logic
onAfterInitialize()         Post-init sync
onAfterInitializeAsync(cb)  Post-init async
```

### Render cycle (runs on each render() call)

```
onBeforeRender(renderable)      Prepare data before template parsing
  -> template parsed to HTML
onBeforeProject(renderable)     Adjust content before DOM assignment
  -> HTML assigned to DOM via ContentAssignment
onAfterProject(renderable)      React to DOM update
onAfterRender(renderable)       Post-render work (wire events, inject CSS)
```

### Data marshaling

```
marshalToView()    Push AppData into the DOM (render direction)
marshalFromView()  Pull DOM state back into AppData (save direction)
```

### Rules

1. **Always call super**. Every lifecycle override must call the parent: `return super.onAfterRender(pRenderable, ...);`
2. **Never override render() directly**. Use `onBeforeRender` to prepare data and `onAfterRender` to wire up interactive behavior.
3. **Inject CSS in onAfterRender**. Call `this.pict.CSSMap.injectCSS()` so lazy-rendered views get their styles.
4. **One-time setup**: If a view needs DOM-dependent setup that should only run once, use a guard flag:

```javascript
onAfterRender(pRenderable, pAddress, pRecord, pContent)
{
    if (!this._initialSetupComplete)
    {
        this._initialSetupComplete = true;
        // one-time wiring here
    }

    this.pict.CSSMap.injectCSS();
    return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
}
```

---

## Application state

Store all view/provider state in `pict.AppData` at well-defined addresses. This keeps state observable and serializable.

```javascript
// In the application's onAfterInitializeAsync:
this.pict.AppData.MyFeature =
{
    SelectedItem: null,
    Items: [],
    IsLoading: false
};

// In views, read/write through AppData:
let tmpItems = this.pict.AppData.MyFeature.Items;
this.pict.AppData.MyFeature.SelectedItem = pSlug;
```

### **AppData stores data, not HTML.**

A common drift pattern: a view computes display strings or HTML fragments in `onBeforeRender` and stuffs them into `AppData.MyFeature.SomethingHTML` / `Record.XxxxHTML`, then the template just substitutes `{~D:State.XxxxHTML~}`. That collapses the data → template separation back into JS-stringly-typed code.

```javascript
// ❌ Wrong — HTML in AppData
this.pict.AppData.Lab.Overview.TeardownControlHTML = pInProgress
    ? '<span class="lab-spinner"></span>Cleaning…'
    : '<a class="lab-btn" href="#/system/teardown">Clean</a>';

// ✅ Right — flag in AppData, template chooses
this.pict.AppData.Lab.Overview.TeardownInProgress = pInProgress;
// then in the template:
//   {~TIA:AppData.Lab.Overview.TeardownInProgress:Overview-Teardown-Spinner-Template~}
//   {~TIA:AppData.Lab.Overview.TeardownIdle:Overview-Teardown-Button-Template~}
```

Rules of thumb:

- **Numbers, strings, booleans, dates, arrays of records** → AppData.
- **Computed HTML strings** → not AppData. Either expose the inputs and let templates compose, or define a helper template and reference it with `{~TIA:~}` / `{~TS:~}`.
- **`Record.XxxxHTML` keys** are the smell — if you find one, replace it with a template that consumes the underlying data directly.
- **One-shot derived display data is fine** (e.g. a pre-formatted timestamp string) — Pict has formatting filters but a JS-side `tmpStatus.LabelText = pretty(tmpDate)` write to AppData is not a violation. The line is "data the template reads" vs "HTML the template substitutes verbatim."

---

## Well-behaved view checklist

When writing or reviewing a Pict view, verify:

- [ ] CSS defined in configuration `CSS` property (not built at runtime)
- [ ] Templates defined in configuration `Templates` array
- [ ] At least one renderable defined in `Renderables` array
- [ ] `render()` is NOT overridden -- behavior goes in lifecycle hooks
- [ ] `onAfterRender()` calls `this.pict.CSSMap.injectCSS()`
- [ ] `onAfterRender()` calls `super.onAfterRender(...)` at the end
- [ ] DOM access uses `this.pict.ContentAssignment`, not `document.querySelector`
- [ ] **Iteration uses `{~TS:templateHash:address~}`, not a `_buildXxxxHTML` helper that loops over `parseTemplateByHash`**
- [ ] **Conditional fragments use `{~TIA:address:templateHash~}` / `{~NotEmpty:~}`, not JS-side ternaries that produce HTML strings**
- [ ] **No `Record.XxxxHTML` / `AppData.X.YyyyHTML` keys** — AppData stores data, templates render markup
- [ ] One-shot renders that escape the cycle still use `parseTemplateByHash()` + `assignContent()`, never string concat + `innerHTML`
- [ ] onclick handlers in templates use `{~P~}.views['{~D:Record.ViewHash~}']`
- [ ] View state stored in `pict.AppData`, not instance variables

---

## Provider checklist

- [ ] CSS registered via `pict.CSSMap.addCSS(hash, content, priority)`, not raw property assignment
- [ ] Templates registered via `options.Templates` if needed
- [ ] No direct DOM manipulation unless absolutely necessary (popovers, tooltips)
- [ ] Data exposed through methods that views can call, not internal state

---

## File structure convention

```
my-pict-module/
  source/
    Pict-Provider-MyModule.js       Provider class + exports
    Pict-Provider-MyModule-CSS.js   CSS string (module.exports = `...`)
    views/
      PictView-MyModule.js          View class
  test/
    MyModule_tests.js               Mocha TDD tests
  package.json
```

The provider is the main entry point (`"main"` in package.json). It exports itself and any views:

```javascript
module.exports = MyProvider;
module.exports.default_configuration = { ... };
module.exports.MyView = require('./views/PictView-MyModule.js');
```

Host applications register the provider and view separately:

```javascript
pict.addProvider('MyModule', libMyModule.default_configuration, libMyModule);
pict.addView('MyModule-View', libMyModule.MyView.default_configuration, libMyModule.MyView);
```
