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
| `{~E:Entity^IDOrAddress^TemplateHash~}` / `{~Entity:…~}` | **Asynchronously** fetches a Meadow entity and renders `TemplateHash` against the resulting record. See "Entity rendering" below. |

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

## **Don't use `addEventListener` — use inline handlers**

`addEventListener('click', …)`, `addEventListener('input', …)`, etc. are banned in Pict views. Use inline DOM handlers (`onclick=`, `oninput=`, `onchange=`, `onkeydown=`) on the element itself, in the template HTML.

**Why:**
- Templates re-render frequently (after `render()`, after `renderAsync()`, after data changes). Each re-render writes new HTML into the destination element and the old DOM nodes are thrown away. Any listeners attached via `addEventListener` go with them — silently. Buttons stop working with no error.
- Event delegation on a parent (`parentElement.addEventListener('click', ...)` + `data-action` attributes + `closest()`) papers over the leak but adds a layer of indirection that's invisible from the markup, and still breaks if the parent itself gets re-rendered.
- Inline handlers live in the markup the template engine emits, so they survive every re-render automatically. They also make it trivially obvious from the template what each control does.

```javascript
// ❌ Wrong — listener gets thrown away on the next render()
onAfterRender(pRenderable)
{
    super.onAfterRender(pRenderable);
    document.getElementById('SaveButton').addEventListener('click', () =>
    {
        this.save();
    });
}

// ✅ Right — onclick lives in the template HTML, survives re-renders
Templates:
[{
    Hash: 'MyView-Container',
    Template: /*html*/`
        <button onclick="_Pict.views.MyView.save()">Save</button>
        <input id="MyView-Filter" oninput="_Pict.views.MyView.applyFilter(this.value)" />
        <select onchange="_Pict.views.MyView.pickItem(parseInt(this.value, 10))">…</select>`
}]
```

**Reach the view from inline handlers via `_Pict.views.<ViewIdentifier>.method(args)`.** Pass `this` for the originating element and `event` for the DOM event when you need them: `onclick="_Pict.views.X.removeRow(${id}, this)"`.

**For dynamically-rendered rows:** put the `onclick=` directly in the row template — every row carries its own handler, no delegation needed. The template engine is the right tool for "render this element with this behaviour for each item in this list."

**Anti-patterns to reject in code review:**

| Wrong | Right |
|---|---|
| `someElement.addEventListener('click', cb)` in `onAfterRender` | `<button onclick="_Pict.views.X.method()">…</button>` in the template |
| `parent.addEventListener('click', e => closest('[data-action]'))` (delegation) | Per-element inline `onclick` in the row template |
| `input.addEventListener('input', cb)` in `onAfterRender` | `<input oninput="_Pict.views.X.method(this.value)" />` |
| `select.addEventListener('change', cb)` | `<select onchange="_Pict.views.X.method(this.value)">…</select>` |
| `input.addEventListener('keydown', e => e.key === 'Enter' && …)` | `<input onkeydown="if (event.key === 'Enter') { event.preventDefault(); _Pict.views.X.method(); }" />` |

**Legitimate exceptions** (rare, document why with a comment):
- Browser-level events that don't have an inline equivalent at the element level: `iframe.addEventListener('load', …)` on a programmatically-created iframe, `window.addEventListener('message', …)`, `MutationObserver` callbacks, etc.
- Third-party libraries the view embeds (e.g. CodeJar / dropzone) that expose their own listener API.

If you find yourself reaching for `addEventListener('click' | 'input' | 'change' | 'keydown')` in a view's `onAfterRender`, the answer is "put the handler in the template instead."

### Entity rendering — `{~E:Entity^ID^TemplateHash~}`

Provided by `pict/source/templates/Pict-Template-Entity.js` and registered automatically when you instantiate a Pict app. Fetches a Meadow entity via `pict.EntityProvider.getEntity(entity, id, callback)` (which is cachetrax-cached, so repeated lookups for the same `(entity, id)` resolve from memory) and renders an inner template against the fetched record.

```
{~E:Project^Record.Value.IDProject^Project-Inline-Link~}
{~Entity:User^123^User-Initials~}
```

**Three `^`-separated parts:**
1. **Entity name** — the Meadow entity (`Project`, `User`, `ReportNamedInstance`, …).
2. **ID-or-address** — either a literal numeric ID (`32730`) **or** a `{~D:~}`-style address that resolves to one (`Record.Value.IDProject`, `AppData.SelectedProjectID`, …). Numeric strings are parsed; non-numeric strings are resolved through the current data scope.
3. **Inner template hash** — the template to render once the entity has been fetched. Inside that template, `Record.X` refers to fields on the fetched entity itself, while `AppData.*` still resolves the global app state.

**Async, not sync.** `{~E:~}` only works inside an asynchronous render — `pict.parseTemplateByHashAsync(...)`, `view.renderAsync(...)`, or any template tree being walked through one of those entry points. The provider's synchronous `render()` deliberately logs an error and returns `''` because there is no way to perform a network fetch without yielding. Inside a `{~TS:~}` / `{~TVS:~}` row, that just means: kick the whole render off via `renderAsync()` rather than the sync `render()` — the iteration cooperates.

**Typical pattern — entity-aware row cell:**

```javascript
// In your view configuration:
Templates:
[
    {
        Hash: 'Project-Inline-Link',
        Template: /*html*/`
            <a href="{~D:AppData.FieldbookBase~}#/project/{~D:Record.IDProject~}"
               target="_blank" rel="noopener">
                {~D:Record.Name~}
            </a>`
    },
    {
        Hash: 'DocList-Row-Template',
        Template: /*html*/`
            <tr>
                <td>{~D:Record.Value.IDDocument~}</td>
                <td>{~D:Record.Value.Name~}</td>
                <!-- The entity render fetches the Project once per IDProject and caches. -->
                <td>{~E:Project^Record.Value.IDProject^Project-Inline-Link~}</td>
            </tr>`
    }
]
```

Then iterate normally with `{~TVS:DocList-Row-Template:AppData.DocumentsList~}` inside a parent template, and call `view.renderAsync(...)` (which `pict-view` calls by default for any view configured with renderables) — the cell renders empty briefly, then fills in once the Meadow fetch resolves.

**Don't pre-resolve names yourself.** If you find yourself building a `_ProjectNameLookup` map and stamping `_ProjectName` onto every record before render, you're doing the entity provider's job badly: no caching across views, no de-duplication of in-flight requests, and you have to remember to keep the map fresh. Use `{~E:~}` instead and let the provider handle it.

**Authoritative source for the address format:** `pict/source/templates/Pict-Template-Entity.js`.

### When `parseTemplateByHash()` is still appropriate

- One-shot rendering into a destination outside the renderable cycle (e.g. injecting a single fragment from a non-Pict callback).
- Computing a string for an attribute value where a template tag wouldn't work (rare).
- Tests / debugging utilities.

For everything inside the render cycle, prefer `{~TS:~}` / `{~TIA:~}` / `{~D:~}` and let the framework drive.

---

## **Don't hand-roll SVG icons — use the built-in icon registry**

Pict ships a built-in icon provider (`pict.providers.Icon`) and a template tag (`{~Icon:~}` / `{~I:~}`) for emitting themable SVG glyphs. **Use these instead of inlining `<svg>` markup in views or templates.** Inline SVGs duplicate paint logic across modules, ignore theme tokens, and rot whenever the design language shifts.

### Template tag

```html
<button onclick="...">
    {~I:Save~}
    Save
</button>

<!-- Variant via colon -->
{~Icon:Folder:Filled~}
{~I:File:Filled~}

<!-- Short alias for terser markup -->
{~I:Settings~}
```

The tag emits `<span class="pict-icon"><svg viewBox="0 0 24 24" ...>...</svg></span>`. The SVG uses `currentColor` for paint, so it follows the parent element's text color (which is theme-driven). Size is `1em × 1em` — set `font-size` on the parent to scale.

### JS API

```javascript
pict.icon('Home');                                  // default variant
pict.icon('Folder', { variant: 'Filled' });
pict.icon('Save',   { size: 20, class: 'mr-1' });   // size override + extra class
pict.icon('Close',  { ariaLabel: 'Dismiss dialog' }); // flips role=img + aria-label
```

### Sizing — `font-size` drives everything

The icon's inner `<svg>` is `1em × 1em` per pict-core's built-in CSS:

```css
.pict-icon       { display: inline-flex; vertical-align: -0.125em; }
.pict-icon svg   { width: 1em; height: 1em; display: block; }
```

So **`font-size` on the parent scales the icon**. Three ways to set it, in order of preference:

```html
<!-- 1. Inherit from parent's font-size. Best for icons inside buttons / text
        runs — they scale with the surrounding text automatically. -->
<button style="font-size: 14px">{~I:Save~} Save</button>

<!-- 2. Set on a wrapper class targeting a specific UI region. Best when
        you have many icons in the same spot and want them all uniform. -->
<style>.my-toolbar .pict-icon { font-size: 18px; }</style>

<!-- 3. Per-call inline override via the JS API. Best for one-offs. -->
<span>${pict.icon('Settings', { size: 20 })}</span>
```

Never write `width="16" height="16"` on the SVG itself — the registry strips those at registration so the `1em` sizing wins.

### Registering your own icons (section modules)

Section providers extend the base set during their own initialization, so consumers can use `{~I:YourIcon~}` after registering the section's provider:

```javascript
// In your section's provider constructor:
constructor(pFable, pOptions, pServiceHash)
{
    super(pFable, pOptions, pServiceHash);
    if (this.pict && this.pict.providers && this.pict.providers.Icon)
    {
        this.pict.providers.Icon.registerSet({
            Outline: {
                YourCustomGlyph:     '<svg viewBox="0 0 24 24" ...>...</svg>',
                AnotherCustomGlyph:  '<svg viewBox="0 0 24 24" ...>...</svg>'
            },
            Filled: {
                YourCustomGlyph:     '<svg viewBox="0 0 24 24" ...>...</svg>'
            }
        });
    }
}
```

**First registration sets the per-name default variant** — so `registerSet({ Outline: { Foo: ... }, Filled: { Foo: ... } })` makes `Outline` the default for `Foo`. `{~I:Foo~}` resolves to Outline; `{~I:Foo:Filled~}` is explicit.

### Naming convention

- **PascalCase canonical names** — `FileFolder`, `ChevronDown`, `ExternalLink`.
- **Aliases are built in** for common alternates — `Gear` → `Settings`, `House` → `Home`, `X` → `Close`, `Hamburger` → `Menu`. Don't add aliases for your own icons in section modules; pick a canonical name and stick with it.
- **Namespace section-specific glyphs that overlap with core names.** pict-section-filebrowser ships its own warm-beige `Folder`/`File`/`FileText`/`Home` variants — these are registered as `FileBrowserFolder`, `FileBrowserFile`, `FileBrowserFileText`, `FileBrowserHome` so installing the section doesn't silently re-skin every `{~I:Folder~}` reference elsewhere in the app. File-type-specific names (`FilePdf`, `FileImage`, `FileCode`, ...) don't clash with anything in core, so those go in unprefixed.

### Multi-color icons + theme tokens

The base set is monoline `currentColor`. Section modules can register multi-color glyphs that use CSS custom-property paint:

```javascript
const _Colors = {
    Outline: 'var(--theme-color-icon-outline, var(--theme-color-text-primary,    #3D3229))',
    Accent:  'var(--theme-color-icon-accent,  var(--theme-color-brand-primary,   #2E7D74))',
    Folder:  'var(--theme-color-icon-folder,  var(--theme-color-background-tertiary, #EAE3D8))'
};
const _Folder = '<svg viewBox="0 0 24 24" fill="none">'
    + '<path d="..." fill="' + _Colors.Folder + '" stroke="' + _Colors.Outline + '" stroke-width="1.8"/>'
    + '</svg>';
```

SVG presentation attributes (`fill="..."`, `stroke="..."`) accept `var()` substitutions in modern browsers. The pattern: every paint value is a `var(--theme-color-icon-*, var(--theme-color-*, #fallback))` chain — themes that define the icon-specific token win, themes that only define the generic token still get the right color family, hosts without a theme provider get the hand-picked hex. Apps switching themes recolor the icon without re-rendering. **pict-section-filebrowser's `_Colors` palette is the canonical example** — read it before designing a new multi-color icon set.

### Base set shipped with Pict

`Folder`, `FolderOpen`, `File`, `FileText`, `Spreadsheet`, `Image`, `Code`, `Chevron{Up/Down/Left/Right}`, `Arrow{Up/Down/Left/Right}`, `Save`, `Close`, `Check`, `Plus`, `Minus`, `Edit`, `Trash`, `Copy`, `Share`, `Search`, `Refresh`, `Download`, `Upload`, `Link`, `ExternalLink`, `Info`, `Warning`, `Error`, `Success`, `Home`, `Settings`, `Menu`, `More`, `Eye`, `EyeOff`, `Lock`, `User`, `Help`.

Outline variant available for all. Filled variant for closed-shape icons where the filled visual is meaningfully distinct (Folder, FolderOpen, File, FileText, Spreadsheet, Home, Settings, Trash, User, Lock, Info, Warning).

### Anti-patterns to reject in code review

| Wrong | Right |
|---|---|
| `<svg viewBox="0 0 24 24" stroke="currentColor">...</svg>` inlined in a template or view | `{~I:Name~}` (template) or `pict.icon('Name')` (JS) |
| Hardcoded hex colors in icon `fill=` or `stroke=` attributes | `currentColor` — let theme cascade drive color |
| `width="16" height="16"` on the SVG itself | No width/height on SVG; control via `font-size` on parent |
| Emoji glyphs (`📁` `🏠`) used as UI icons | A themable SVG from the registry |
| Unicode arrow characters (`▼ ▶ ▸`) used as toggle indicators | `{~I:ChevronDown~}` etc. |
| Per-module icon palette objects with hardcoded hex values | Use theme tokens (`var(--theme-color-icon-*)`); the registry already does this |

Inline SVG is acceptable only for genuinely **bespoke** illustrative content (a brand mark, a hand-tuned multi-color illustration, an empty-state graphic) — not for everyday UI glyphs. If you find yourself writing `<svg viewBox="0 0 24 24" stroke="currentColor">` more than once in the same module, the second one belongs in the registry.

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

---

## Quack browser bundles — naming convention

`npx quack build` (via `quackage`) produces a browserified UMD bundle from the package's `main` entry. The bundle's filename and global name are **derived from `package.json`**, so getting them right matters or the HTML can't load the app:

| Field | Source | Example |
|-------|--------|---------|
| Bundle filename | `<package.json#name>.min.js` (and `.js` unminified) | `name: "document_browser_example"` → `document_browser_example.min.js` |
| Standalone global | PascalCase of `package.json#name` | `document_browser_example` → `window.DocumentBrowserExample` |
| Output folder | `./dist/` | `dist/document_browser_example.min.js` |

The defaults live in `retold/modules/utility/quackage/source/Default-Quackage-Configuration.json` (`LibraryMinifiedFileName`, `LibraryObjectName`).

### Writing the HTML shell

**Real applications: always serve Pict locally, with the version pinned in `package.json`.** Production code must not depend on a CDN — it pulls in whatever happens to be latest, can disappear, and breaks reproducibility. Copy it from `node_modules`:

```html
<script src="./pict.min.js"></script>
<script src="./<package_name>.min.js"></script>
<script>
    Pict.safeOnDocumentReady(() =>
    {
        Pict.safeLoadPictApplication(window.<PascalCasePackageName>, 1);
    });
</script>
```

```json
"dependencies": { "pict": "1.0.361" },
"copyFiles": [
    { "from": "./html/*",                   "to": "./dist/" },
    { "from": "./node_modules/pict/dist/*", "to": "./dist/" }
]
```

**`example_applications/` only — CDN is acceptable** for tiny demos that do not need version pinning and want a one-line `copyFiles`:

```html
<!-- example_applications only — never in a real app -->
<script src="https://cdn.jsdelivr.net/npm/pict@1/dist/pict.min.js"></script>
<script src="./<package_name>.min.js"></script>
```

```json
"copyFiles": [
    { "from": "./html/*", "to": "./dist/" }
]
```

### Easy traps

- **Long package names produce long bundle names.** `web-headlight-document-render-example-document-browser` becomes `web-headlight-document-render-example-document-browser.min.js`. Pick short snake_case names like `document_browser_example`.
- **Hyphens vs underscores.** Both legal, but `PascalCaseIdentifier` collapses delimiters consistently — `pict-section-code` → `PictSectionCode`, `code_display_example` → `CodeDisplayExample`.
- **The `<script src>` must match the actual bundle name.** A `404` here is silent in the console (browser just doesn't load it) and the form falls back to default browser behaviour — submits look like reloads, no JS runs, no errors. If clicking a button reloads the page, check the network tab for a missing bundle first.
- **`window.<Global>` won't exist if you forgot the `<script>` tag for the bundle.** `Pict.safeLoadPictApplication(undefined, 1)` is silently a no-op.
- **Always reach the application from views via `this.pict.PictApplication`.** Don't stash it on `window`; the framework already exposes it.
