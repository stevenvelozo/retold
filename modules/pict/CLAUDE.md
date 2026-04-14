# Pict Module Development Guide

Reference for building views, providers, and applications with the Pict framework. Every module under `modules/pict/` should follow these patterns.

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

### Parsing templates at runtime

```javascript
let tmpRecord = { ViewHash: this.Hash, Title: 'Hello' };
let tmpHTML = this.pict.parseTemplateByHash('MyWidget-Row-Template', tmpRecord);
this.pict.ContentAssignment.assignContent('#MyWidget-List', tmpHTML);
```

### Common mistakes

| Wrong | Right |
|-------|-------|
| Building HTML via string concatenation in methods | Define templates in `Templates` array, parse with `parseTemplateByHash()` |
| Hardcoding `window.pict.views['ViewName']` in onclick strings | Use `{~P~}.views['{~D:Record.ViewHash~}']` in templates |

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
- [ ] Dynamic HTML uses `parseTemplateByHash()` + `assignContent()`, not string concat + innerHTML
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
