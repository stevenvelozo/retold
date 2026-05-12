# Transitioning a Pict App to pict-provider-theme + pict-section-modal Panels

This is a working playbook for migrating any pre-existing Pict application
to use the unified theming / branding / panel layout stack. It captures
what the **retold-content-system** conversion taught us, written so a fresh
agent (or human) can execute the same conversion on the next app with
minimal exploration.

## What this migration buys you

- Every stylable surface reads from `--theme-color-*` tokens. Switching
  themes via the picker re-skins sidebar, topbar, editors, syntax
  highlighting, scrollbars, modals — coherently.
- Top-of-app chrome becomes the standard `Theme-TopBar` (BrandMark + a
  Nav slot + a User slot), branded via `npm run brand` from a single
  `Retold-Modules-Manifest.json` block.
- The app's visual identity is preserved as a bundled theme in
  `pict-section-theme/source/themes/<app-name>.json` so the look survives
  the migration and other themes are still pickable.
- Theme / mode / scale persistence is owned by `pict-section-theme` (its
  own localStorage scope), removing per-app theme state plumbing.
- The shell-driven panel layout (`modal.shell()` + `addPanel()`) replaces
  hand-rolled topbar / sidebar / docked-panel CSS. Panels get free
  collapse / resize / persistence / responsive-drawer behaviour.
- Mermaid + highlight.js code blocks pick up the active theme without
  per-app CSS overrides.

## Minimum versions

Pin in the host app's `package.json` (or wider semver as appropriate):

```
"pict-provider-theme":         "^0.0.6"
"pict-section-modal":          "^0.0.9"
"pict-section-theme":          "^0.0.3"
"pict-section-code":           "^1.0.7"
"pict-section-content":        "^0.1.8"   // if rendering markdown
"pict-section-markdowneditor": "^1.0.12"  // if editing markdown
"pict-section-filebrowser":    "^0.0.5"   // if exposing a file tree
```

⚠️ **Peer-dep range** — `pict-section-theme@0.0.3` declares
`pict-section-modal: ^1.0.0` as a peer but live modal is `0.0.9`. Until
that range is widened, install with `npm install --legacy-peer-deps`.
File this as a follow-up on `pict-section-theme`.

## High-level sequence

The phases below are ordered so you never break the running build for
more than one phase at a time. Run the app and click around at every
phase boundary.

```
A. Branding pipeline           → manifest + npm run brand + Brand wrapper
B. Theme-Section bootstrap     → register provider, drop the custom topbar
C. Layout → shell()+addPanel() → top / left / right / hidden settings + center
D. Slot views                  → TopBar-Nav, TopBar-User, gear button
E. Settings panel              → embed Picker/ModeToggle/ScaleSelect via mount()
F. CSS token sweep             → wrap bare hexes in var(--theme-color-*, #HEX)
G. Retire legacy state         → drop github.css, drop custom TopBar, drop
                                 modal.panel() calls, drop app-managed theme state
H. (Optional) App-specific theme → preserve existing identity as a bundled theme
```

The reference implementation is **retold-content-system**. When in
doubt, copy that app's pattern verbatim.

---

## Phase A — Branding pipeline

### A1. Add a Branding block to `Retold-Modules-Manifest.json`

Find your module's entry (under `Apps` or wherever it lives) and add:

```json
{
  "Name": "your-app",
  ...
  "Branding": {
    "Palette": "desert",
    "DisplayName": "Your App",
    "Tagline": "What the app does in 6–10 words"
  }
}
```

Curated palette keys: `mix`, `default`, `desert`, `ocean`, `forest`,
`synthwave`, `twilight`, `cosmos`, `carnival`.

### A2. Add the `brand` script to the app's `package.json`

```json
"scripts": {
  "brand": "node node_modules/pict-section-theme/bin/pict-section-theme-brand.js --manifest ../../../Retold-Modules-Manifest.json --module your-app --favicons web-application/favicons",
  "prebuild": "npm run brand",
  ...
}
```

Adjust the `--manifest` relative path to match where the manifest sits
above your app folder (`modules/apps/your-app` → `../../../`,
`source/your-app` → `../../`).

### A3. Run `npm run brand`

That writes a `retold.brand` block into `package.json` (icon SVG,
favicon SVGs, computed palette colors) and emits SVG favicons to
`web-application/favicons/`.

### A4. Create the runtime Brand wrapper

`source/YourApp-Brand.js` (mirror retold-manager / retold-content-system):

```javascript
// Path-relative require lets the LogoGenerator stay out of the runtime bundle.
const tmpPackage = require('../package.json');

if (!tmpPackage.retold || !tmpPackage.retold.brand)
{
    throw new Error('your-app: package.json is missing retold.brand — '
        + 'run `npm run brand` (which calls pict-section-theme-brand) before building');
}

module.exports = tmpPackage.retold.brand;
```

Adjust the `require('../package.json')` depth to land at the host
package.json.

### A5. Wire favicons + drop hljs github.css from your HTML

In your app's main HTML (e.g. `html/index.html` and any preview HTMLs):

```html
<link rel="icon" type="image/svg+xml" href="favicons/favicon.svg">
<link rel="icon" type="image/svg+xml" href="favicons/favicon-light.svg" media="(prefers-color-scheme: light)">
<link rel="icon" type="image/svg+xml" href="favicons/favicon-dark.svg"  media="(prefers-color-scheme: dark)">
```

And remove the static highlight.js stylesheet if you had one:

```diff
- <link href="css/github.css" rel="stylesheet">
```

`pict-section-code@>=1.0.7` ships theme-driven `.hljs-*` rules in its
own CSS, so the static github.css link becomes redundant.

Also drop the `copyFiles` entry that pulls `github.css` from
`node_modules/highlight.js`.

---

## Phase B — Theme-Section bootstrap

### B1. Add the import + brand reference to your application

```javascript
const libPictSectionModal = require('pict-section-modal');
const libPictSectionTheme = require('pict-section-theme');
const libYourAppBrand     = require('./YourApp-Brand.js');
```

### B2. Register the modal section view (if not already there)

```javascript
this.pict.addView('Pict-Section-Modal', libPictSectionModal.default_configuration, libPictSectionModal);
```

### B3. Register Theme-Section as a Pict provider

The single `addProvider` call wires the runtime + catalog + views +
persistence + apply + brand. Do this AFTER your slot views are
registered (see Phase D) but BEFORE the layout view renders.

```javascript
this.pict.addProvider('Theme-Section',
{
    ApplyDefault: 'your-app',          // or 'retold-default' to share the ecosystem look
    DefaultMode:  'system',
    DefaultScale: 1.0,
    Brand:        libYourAppBrand,
    // Common Views set. Drop 'Button' if you embed controls in a settings
    // panel instead of a topbar popover (recommended).
    Views: ['Picker', 'ModeToggle', 'ScaleSelect', 'BrandMark', 'TopBar'],
    ViewOptions:
    {
        // Height MUST match the Size of the topbar panel below.
        TopBar: { NavView: 'YourApp-TopBar-Nav', UserView: 'YourApp-TopBar-User', Height: 48 }
    }
}, libPictSectionTheme);
```

### B4. Delete the old custom topbar view registration

Remove `addView('YourApp-TopBar', ...)` and delete the source file.
Replace any `this.pict.views['YourApp-TopBar'].render()` calls with a
new `renderTopBar()` helper that re-renders both slot views (see
retold-content-system's `Pict-Application-ContentEditor.js`).

```javascript
renderTopBar()
{
    let tmpNav  = this.pict.views['YourApp-TopBar-Nav'];
    let tmpUser = this.pict.views['YourApp-TopBar-User'];
    if (tmpNav)  { tmpNav.render();  }
    if (tmpUser) { tmpUser.render(); }
}
```

---

## Phase C — Layout: shell() + addPanel()

The layout view becomes a thin shell builder + overlay host. The shell
takes over the container's DOM (its own top row, middle row with
sides + center, bottom row, overlay layer) so the layout's template
is tiny.

### C1. Strip the layout template down

```javascript
Templates:
[
    {
        Hash: "YourApp-Layout-Shell-Template",
        Template: /*html*/`
<div id="YourApp-Layout-Mount" style="height:100%"></div>
<!-- Any always-on overlays here (upload dialog, etc.) -->
`
    }
]
```

### C2. Build the shell in `onAfterRender`

Guard with a `_shellPanelsBuilt` flag so re-renders don't rebuild.

```javascript
onAfterRender(pRenderable, pRenderDestinationAddress, pRecord, pContent)
{
    this.pict.CSSMap.injectCSS();
    if (!this._shellPanelsBuilt)
    {
        this._buildShell();
        this._shellPanelsBuilt = true;
    }
    return super.onAfterRender(pRenderable, pRenderDestinationAddress, pRecord, pContent);
}

_buildShell()
{
    let tmpModal = this.pict.views['Pict-Section-Modal'];
    let tmpMount = document.getElementById('YourApp-Layout-Mount');
    this._shell = tmpModal.shell(tmpMount, { PersistenceKey: 'your-app-shell' });

    // Top — theme chrome (BrandMark + Nav + User slots)
    this._shell.addPanel(
    {
        Hash: 'topbar', Side: 'top', Mode: 'fixed', Size: 48,
        ContentDestinationId: 'Theme-TopBar', ContentView: 'Theme-TopBar'
    });

    // Left — sidebar (with responsive drawer below 900px)
    this._shell.addPanel(
    {
        Hash: 'sidebar', Side: 'left', Mode: 'resizable',
        Size: 280, MinSize: 200, MaxSize: 480, Title: 'Files',
        ContentDestinationId: 'YourApp-Sidebar-Host',
        ContentView: 'YourApp-Sidebar',
        ResponsiveDrawer: 900,
        OnExpand:   () => { /* persist if needed */ },
        OnCollapse: () => { /* persist if needed */ }
    });

    // Right (visible) — secondary content panel (docs, inspector, etc.)
    this._shell.addPanel(
    {
        Hash: 'docpanel', Side: 'right', Mode: 'resizable',
        Size: 340, MinSize: 240, MaxSize: 600,
        Collapsed: true, Title: 'Docs',
        ContentDestinationId: 'YourApp-Documentation-Panel'
    });

    // Right (Hidden + Overlay) — settings panel toggled ONLY by the gear
    this._shell.addPanel(
    {
        Hash: 'settings', Side: 'right', Mode: 'resizable',
        Position: 'overlay', Size: 360, MinSize: 280, MaxSize: 540,
        Hidden: true, Collapsed: true,
        ContentDestinationId: 'YourApp-Settings-Panel',
        ContentView: 'YourApp-SettingsPanel'
    });

    // Center — the workspace area
    this._shell.center({ ContentDestinationId: 'YourApp-Workspace' });
}
```

### C3. Expose panel toggles for cross-view triggers

```javascript
getSidebarPanel()  { return this._shell ? this._shell.getPanel('sidebar')  : null; }
getDocPanel()      { return this._shell ? this._shell.getPanel('docpanel') : null; }
getSettingsPanel() { return this._shell ? this._shell.getPanel('settings') : null; }

toggleSidebar()         { let p = this.getSidebarPanel();  if (p) p.toggle(); }
toggleDocPanel()        { let p = this.getDocPanel();      if (p) p.toggle(); }
toggleSettingsPanel()   { let p = this.getSettingsPanel(); if (p) p.toggle(); }
```

### C4. Move app CSS to use theme tokens (preview)

In the layout view's CSS:

```css
html, body { height: 100%; margin: 0; padding: 0; }
body
{
    background: var(--theme-color-background-primary, #f5f3ee);
    color:      var(--theme-color-text-primary,       #3d3229);
    font-family: var(--theme-typography-family-sans, system-ui, ...);
}
#YourApp-Application-Container { height: 100%; min-height: 0; overflow: hidden; }
.pict-modal-shell-host   { height: 100%; }
.pict-modal-shell        { background: var(--theme-color-background-primary, #f5f3ee); }
.pict-modal-shell-panel  { background: var(--theme-color-background-panel,   #ffffff); }
.pict-modal-shell-center { background: var(--theme-color-background-primary, #f5f3ee); }
```

**Why height: 100% (not 100vh)** — `pict-section-theme` applies CSS
`zoom` to `<html>` for the scale select. Under non-1.0 zoom, `vh`
units render against the un-zoomed viewport and push panels off-screen.

---

## Phase D — Slot views

### D1. TopBar-Nav (left of BrandMark)

Renders into `#Theme-TopBar-Nav`. Hosts the current-context label —
file name, page title, breadcrumbs, whatever fits "where am I in the
app right now."

```javascript
const _ViewConfiguration =
{
    ViewIdentifier: "YourApp-TopBar-Nav",
    DefaultRenderable: "YourApp-TopBar-Nav-Display",
    DefaultDestinationAddress: "#Theme-TopBar-Nav",
    AutoRender: false,
    CSS: /*css*/`
        .your-app-nav { display: flex; align-items: center; height: 100%; padding: 0 12px;
                        color: var(--theme-color-text-on-brand, var(--theme-color-text-primary, #E8E0D4)); }
    `,
    Templates: [{ Hash: "YourApp-TopBar-Nav-Template", Template: /*html*/`<div class="your-app-nav">{~D:AppData.YourApp.PageTitle~}</div>` }],
    Renderables: [{ RenderableHash: "YourApp-TopBar-Nav-Display", TemplateHash: "YourApp-TopBar-Nav-Template", DestinationAddress: "#Theme-TopBar-Nav", RenderMethod: "replace" }]
};
```

### D2. TopBar-User (right side)

Renders into `#Theme-TopBar-User`. Hosts action buttons + the gear that
opens the hidden settings panel.

```html
<button class="your-app-user-btn your-app-user-btn-gear"
    onclick="_Pict.views['YourApp-Layout'].toggleSettingsPanel()"
    title="Settings" aria-label="Settings">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 ..."/>
    </svg>
</button>
```

Style the buttons with theme tokens:
```css
.your-app-user-btn-save { background: var(--theme-color-brand-primary, #2E7D74); color: var(--theme-color-text-on-brand, #FFF); }
.your-app-user-btn-gear { background: transparent; color: var(--theme-color-text-on-brand, var(--theme-color-text-secondary, #B8AFA4)); border: 1px solid var(--theme-color-border-default, #5E5549); }
```

### D3. Register both slot views BEFORE the Theme-Section provider

Order matters — Theme-Section's `_bootstrap` looks the slot views up in
`pict.views[...]` when wiring the TopBar.

```javascript
this.pict.addView('YourApp-TopBar-Nav',  libViewTopBarNav.default_configuration,  libViewTopBarNav);
this.pict.addView('YourApp-TopBar-User', libViewTopBarUser.default_configuration, libViewTopBarUser);
// THEN:
this.pict.addProvider('Theme-Section', { ... }, libPictSectionTheme);
```

---

## Phase E — Settings panel with embedded theme controls

### E1. Make the panel content view

Its destination matches the `ContentDestinationId` from the shell's
`settings` panel (`#YourApp-Settings-Panel`). The template renders a
single mount div for the embedded theme controls + whatever app
preferences you already had.

```javascript
const _ViewConfiguration =
{
    ViewIdentifier: "YourApp-SettingsPanel",
    DefaultRenderable: "YourApp-SettingsPanel-Display",
    DefaultDestinationAddress: "#YourApp-Settings-Panel",
    AutoRender: false,
    CSS: /*css*/` /* sections, rows, labels — all use theme tokens */ `,
    Templates: [{
        Hash: "YourApp-SettingsPanel-Template",
        Template: /*html*/`
<div class="your-app-settings-body">
    <div class="your-app-settings-section">
        <div class="your-app-settings-label">Appearance</div>
        <div id="YourApp-Settings-Theme"></div>
    </div>
    <!-- the rest of your editor-preference UI here -->
</div>` }],
    Renderables: [{ /* standard */ }]
};
```

### E2. Mount theme controls on every render

```javascript
onAfterRender(pRenderable, pRenderDestinationAddress, pRecord, pContent)
{
    this.pict.CSSMap.injectCSS();
    let tmpThemeProvider = this.pict.providers && this.pict.providers['Theme-Section'];
    if (tmpThemeProvider && typeof tmpThemeProvider.mount === 'function')
    {
        tmpThemeProvider.mount(
        {
            Container: '#YourApp-Settings-Theme',
            Views: ['Picker', 'ModeToggle', 'ScaleSelect']
        });
    }
    // ... sync your other checkbox/select states with AppData ...
    return super.onAfterRender(pRenderable, pRenderDestinationAddress, pRecord, pContent);
}
```

**Important** — call `mount()` on every render (not once-and-done). The
template re-renders rewrite the inner HTML, including the previously
mounted theme view containers, so we re-mount to repopulate them.

### E3. Don't include `'Button'` in Theme-Section's Views list

If you have a gear-driven settings panel hosting the theme controls,
you don't need a separate Theme-Button popover in the topbar. Adding
both creates duplicate `#Theme-Picker` IDs in the DOM and one will
render empty.

---

## Phase F — CSS token sweep

Walk every CSS block in your app's source — view configurations,
standalone `.css` files, anything with a fill / color / border / shadow
hex — and wrap each color value in `var(--theme-color-X, #HEX)`. Keep
the original hex as the fallback so apps that don't install the theme
provider still look right.

### F1. Common token mapping (warm-beige palette → token name)

```
#F5F3EE / #f5f3ee → background-primary
#FAF8F4 / #faf8f4 → background-secondary
#F0EDE8 / #f0ede8 → background-tertiary
#EDE9E3 / #ede9e3 → background-hover
#E0EDE9            → background-selected
#3D3229 / #423D37  → text-primary
#5E5549            → text-secondary
#8A7F72 / #B8AFA4  → text-muted
#DDD6CA            → border-default
#E8E2D7            → border-light
#C4BDB0            → scrollbar-thumb
#F5F0E8            → scrollbar-track
#2E7D74            → brand-primary
#3A9E92            → brand-primary-hover
#E8A94D            → status-warning
#7BC47F            → status-success
#D9534F            → status-error
#5DA6C7            → status-info
#E8E0D4            → text-on-brand
```

### F2. Use the tokenize-css.js helper (batch wrap)

Drop this in `/tmp/` and run it once over each view file with bare
hexes. It only matches hexes NOT already inside a `var()` call.

```javascript
#!/usr/bin/env node
const fs = require('fs');
const FILES = [ /* absolute paths */ ];
const MAP = {
    '#F5F3EE': 'background-primary',
    '#FAF8F4': 'background-secondary',
    // ... fill in from the table above ...
};
const HEX_RE = /(?<![,\(])(#[0-9A-Fa-f]{6})\b/g;

for (let tmpPath of FILES)
{
    let tmpText = fs.readFileSync(tmpPath, 'utf8');
    let tmpReplaced = 0;
    let tmpOut = tmpText.replace(HEX_RE, function (pMatch, pHex)
    {
        let tmpKey = Object.keys(MAP).find(h => h.toLowerCase() === pHex.toLowerCase());
        if (!tmpKey) { return pMatch; }
        tmpReplaced++;
        return 'var(--theme-color-' + MAP[tmpKey] + ', ' + pHex + ')';
    });
    if (tmpReplaced > 0) { fs.writeFileSync(tmpPath, tmpOut, 'utf8'); }
}
```

After the bulk wrap, run a quick cleanup pass for accidentally
double-wrapped vars (when a hex was already inside a var() but the
regex matched anyway):

```javascript
let re = /var\(\s*(--theme-color-[a-z-]+)\s*,\s*var\(\s*\1\s*,\s*(#[0-9A-Fa-f]{6})\s*\)\s*\)/g;
text = text.replace(re, (m, name, hex) => 'var(' + name + ', ' + hex + ')');
```

### F3. Sanity-check

```bash
grep -rE "(?<![,\(])#[0-9A-Fa-f]{6}" source/views/ css/ | grep -v "^Binary"
```

Should return nothing meaningful (only commit hashes / comments).

---

## Phase G — Retire legacy state

| What | Why | How |
|---|---|---|
| Static `<link href="css/github.css">` | pict-section-code now ships theme-driven `.hljs-*` rules | Drop the `<link>` from HTML + the `copyFiles` entry |
| Custom TopBar view | Theme-TopBar + slot views replace it | Delete the view file + its `addView` call; replace `.render()` calls with `renderTopBar()` |
| `modal.panel(...)` legacy calls | The shell + addPanel handles this | Delete; rely on shell panel chrome instead |
| App-managed theme/mode/scale in localStorage | pict-section-theme owns its own scope (`pict-section-theme:<hostname>`) | Remove keys from app's `loadSettings` / `saveSettings`; don't migrate (users get defaults once, then their picks stick) |
| Hand-rolled `mermaid.initialize({ theme: 'default' })` in HTML | pict-section-content & pict-section-markdowneditor own initialization with `theme: 'base'` + themeVariables | Remove from HTML; let the views drive it |
| Per-app hljs CSS files | pict-section-code's `.hljs-*` aliases pick up syntax tokens | Delete the per-app file |

---

## Phase H — (Optional) App-specific theme

If your app has a distinctive palette worth preserving as a selectable
theme (rather than letting `retold-default` reskin it), bundle it.

### H1. Author the JSON

In `modules/pict/pict-section-theme/source/themes/your-app.json`,
mirror `retold-content-system.json`. Required pairs:

- `Hash`, `Name`, `Description`, `Comprehensive: true`
- `Modes: { Strategy: 'system'|'single', Default: 'system'|'light'|'dark' }`
- `Tokens.Color.{Background,Text,Brand,Border,Status,Scrollbar,Selection,Focus,Shadow,Syntax}`
- `Tokens.Typography.{Family,Size,Weight,LineHeight}` (typography is
  optional; falls through to retold-default)
- `Tokens.Layout` — `SidebarWidth`, `TopbarHeight`, `StatusbarHeight`
- `Brand: { Name, Tagline }`

Paired themes use `{ "Light": "...", "Dark": "..." }` per token.
Single-mode themes use a bare string per token.

### H2. Register in the catalog

Add an entry in `modules/pict/pict-section-theme/source/themes/_catalog.js`:

```javascript
{ Hash: 'your-app', Category: 'App', Bundle: require('./your-app.json') },
```

### H3. Bump pict-section-theme version + publish

Then pin your app to that version.

---

## Mermaid + KaTeX considerations

### KaTeX

Nothing to do. `katex.min.css@0.16.21` has zero hardcoded color values —
every math symbol inherits `currentColor` from the surrounding text.
Math text naturally follows `--theme-color-text-primary`.

### Mermaid

Already handled if you render through `pict-section-content` (>=0.1.8)
or `pict-section-markdowneditor` (>=1.0.12). They internally:

1. Read `--theme-color-*` from `:root` and call
   `mermaid.initialize({ theme: 'base', themeVariables: { ... } })`.
2. Cache each `pre.mermaid`'s source as `data-mermaid-source`
   before running.
3. Subscribe to `pict.providers.Theme.onApply` — on theme change,
   restore the cached source, drop `data-processed`, and re-run.

**If your app renders Mermaid through some other path** (a custom
markdown renderer, an iframe, etc.), replicate the same three-step
pattern. The helper functions in `pict-section-content`'s
`Pict-View-Content.js` (`_initializeMermaidTheme`,
`_subscribeToThemeChanges`, `_refreshMermaidDiagrams`) are the
reference implementation.

Also drop the static `mermaid.initialize({ theme: 'default' })`
from your HTML — the view-level code overrides it anyway, but a stale
HTML init can race the view's setup and briefly paint the wrong colors.

---

## Common gotchas

1. **Peer dep mismatch on `pict-section-theme@0.0.3`** — it declares
   `pict-section-modal: ^1.0.0` as a peer, but live modal is 0.0.9.
   Install with `npm install --legacy-peer-deps` until the range
   widens.

2. **`package-lock.json` caches `file:` paths**. If you transitioned
   through file: dependencies during development, deleting them from
   package.json isn't enough — `npm install` will still resolve to the
   old symlinks. Either delete `package-lock.json` and reinstall, or
   pass `npm install <pkg>@<ver> --save` to force a fresh resolution.

3. **height: 100vh breaks under scale**. Theme-Scale applies CSS
   `zoom` to `<html>`. vh units render against the un-zoomed viewport.
   Always use `height: 100%` for shell-managed containers.

4. **Register slot views BEFORE Theme-Section**. The provider looks
   them up by hash in `pict.views[...]` when wiring TopBar.

5. **`'Button'` view + a settings-panel mount() will duplicate
   destination IDs**. Pick one host per theme control view. The
   gear-opens-settings pattern is recommended; drop `'Button'` from
   the Theme-Section Views array.

6. **Re-mount theme controls on every settings-panel render**. The
   panel's template re-renders rewrite the destination divs and erase
   the previously-rendered views inside them.

7. **Always call `renderTopBar()` (or both slot view renders) after
   AppData changes that affect the topbar**. The shared Theme-TopBar
   chrome is data-free; only the slot views need refreshing.

8. **CSS for the file browser comes from pict-section-filebrowser
   itself** (>=0.0.5). Don't override its rules in your app — let the
   theme tokens flow through.

---

## Verification checklist

End-to-end manual smoke test (use Claude Preview tools or browser):

1. `npm install --legacy-peer-deps && npm run brand && npx quack build` — clean build, brand block populates package.json, favicons emit.
2. App boots without console errors.
3. Brand wordmark at far left of topbar (the BrandMark — RCS / RM / etc.).
4. Slot views render — Nav slot shows current context, User slot shows actions + gear.
5. Sidebar visible on left with the host's tabs / content. Resize handle works. Collapse handle works.
6. Doc / inspector panel visible on right (or its edge handle if started collapsed).
7. Settings panel hidden — no edge affordance visible at the right edge until gear is clicked.
8. Click gear → settings panel slides in from right. Theme controls (Picker, ModeToggle, ScaleSelect) render at top.
9. Switch theme to `retold-manager` via the picker → entire UI reskins to GitHub-style. Switch to `cyberpunk` → entire UI goes neon-on-black including code highlighting and any Mermaid diagrams.
10. Toggle mode Light → Dark → System; verify the active theme's dark variant looks coherent (no white flashes, no unstyled regions).
11. Open a file/page with code → confirm syntax highlighting recolors with the theme (keyword / string / comment all swap).
12. If applicable: open a markdown file with mermaid → confirm diagrams re-render coherently across theme switches.
13. Reload the page → confirm:
    - Theme + mode + scale persist (via pict-section-theme's localStorage scope `pict-section-theme:<hostname>`).
    - Panel collapse / size state persists (via `pict-modal-shell:<your-shell-key>`).
    - No app-managed theme keys leak into the legacy settings blob.
14. `preview_resize` to ~800px width → sidebar should flip to a top drawer (if ResponsiveDrawer is set).
15. Run any module tests that exist — `pict-section-modal`'s 79 tests should pass, app-level tests should still pass.

Sanity greps:
- `grep -rE "(?<![,\(])#[0-9A-Fa-f]{6}" source/views/` returns nothing (or only commit-hash false positives).
- No `PictView-YourApp-TopBar.js` or equivalent custom topbar file.
- Only one registration touches `Theme-TopBar`: the `Theme-Section` provider.
- `localStorage` keys after a clean run: `pict-section-theme:<hostname>` + `pict-modal-shell:<your-shell-key>` (+ any host-app preference blob, but with no theme keys inside).

---

## Reference implementation files (read these when in doubt)

| File | Demonstrates |
|---|---|
| [retold-content-system/source/Pict-Application-ContentEditor.js](../../apps/retold-content-system/source/Pict-Application-ContentEditor.js) | Theme-Section provider registration, slot view registration order, `renderTopBar()` helper |
| [retold-content-system/source/ContentSystem-Brand.js](../../apps/retold-content-system/source/ContentSystem-Brand.js) | Brand wrapper pattern |
| [retold-content-system/source/views/PictView-Editor-Layout.js](../../apps/retold-content-system/source/views/PictView-Editor-Layout.js) | Shell builder, panel configuration, responsive drawer, hidden settings panel |
| [retold-content-system/source/views/PictView-Editor-TopBar-Nav.js](../../apps/retold-content-system/source/views/PictView-Editor-TopBar-Nav.js) | Nav slot view shape |
| [retold-content-system/source/views/PictView-Editor-TopBar-User.js](../../apps/retold-content-system/source/views/PictView-Editor-TopBar-User.js) | User slot view shape, gear button onclick |
| [retold-content-system/source/views/PictView-Editor-SettingsPanel.js](../../apps/retold-content-system/source/views/PictView-Editor-SettingsPanel.js) | `mount()` API embedding pattern + editor preference UI |
| [retold-content-system/source/views/PictView-Editor-Sidebar-Tabs.js](../../apps/retold-content-system/source/views/PictView-Editor-Sidebar-Tabs.js) | Sidebar tab UI as a panel's ContentView |
| [retold-content-system/html/edit.html](../../apps/retold-content-system/html/edit.html) | Minimal HTML — favicons, no static github.css, no static mermaid.initialize |
| [retold-content-system/package.json](../../apps/retold-content-system/package.json) | Registry-version deps, `brand` script |
| [pict-section-theme/source/themes/retold-content-system.json](../pict-section-theme/source/themes/retold-content-system.json) | App-specific paired theme JSON shape |
| [retold-manager/source/web/client/pict-app/Pict-Application-RetoldManager.js](../../../source/retold-manager/source/web/client/pict-app/Pict-Application-RetoldManager.js) | The original reference (slightly different layout — uses BottomBar + StatusBar) |

When migrating the next app, work file-by-file against this list and
the phase sequence above. Most edits are mechanical; the judgment
calls are: which slot views you need, whether to bundle an app-specific
theme, and how much of the legacy CSS to delete vs. lightly retoken.
