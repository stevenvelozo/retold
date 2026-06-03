# Advanced: Decoupling Rendering Style from Theme

Companion to **[CLAUDE-pict-theme-modal-transition.md](./CLAUDE-pict-theme-modal-transition.md)**.

That doc covers the standard "add a theme to your pict app" pattern. This doc
covers the harder case: when a module's old monolithic "theme" actually bundles
together two genuinely independent things — **colors** *and* **rendering rules**
(node shape, line treatment, border jitter, shadow style, font choice).

This is the pattern we landed for **pict-section-flow** when migrating its
hand-rolled 7-theme system to the unified pict-section-theme catalog. The
flow editor's "themes" included not just colors but also bracket-vs-rectangle
node bodies, hand-drawn jitter, scanline filters, monospace fonts — all of
which are conceptually orthogonal to color. The same pattern applies to any
module that wants similar separation: a chart library where bar-shape is
independent of palette, an editor where syntax-highlighting style is
independent of theme, a diagram tool where connection-line treatment is its
own thing.

## When to use this pattern

Reach for the rendering-style decoupling when **all** of these are true:

1. Your module has > 3 visual "looks" you want users to pick from.
2. Two looks have **the same colors but different chrome** (or vice versa) is
   a meaningful combo — e.g. "I want the cyberpunk colors but with clean
   rectangles instead of scanlines."
3. The rendering vocabulary is **module-specific** — concepts like
   "bracket-shape node body" or "scanline filter" don't generalize to other
   pict modules.
4. You want users to be able to pick a **color theme from the global
   pict-section-theme catalog** so app-wide theme switches affect your
   module's chrome.

If you only have one rendering style (your module always draws rectangles),
or if your "themes" are pure color skins, stick with the standard pattern in
[CLAUDE-pict-theme-modal-transition.md](./CLAUDE-pict-theme-modal-transition.md)
— don't introduce extra axes for no reason.

## The 3-axis architecture

<!-- bespoke diagram: edit diagrams/the-3-axis-architecture.mmd or .hints.json, then: npx pict-renderer-graph build modules/pict -->
![The 3-axis architecture](diagrams/the-3-axis-architecture.svg)

### What goes in each axis

**Axis 1 — Color Theme (lives in pict-section-theme catalog)**

Pure data — `Tokens.Color.Background/Text/Brand/Border/Status/...` blocks per
[pict-default.json's structure](./pict-section-theme/source/themes/pict-default.json).
Apps consume these as `var(--theme-color-X, #fallback)` in their CSS.

If your module needs categorical color palettes (e.g. legend colors for 8
data types), use the `--theme-color-data-1..8` family added by the recent
formeditor/equation work — themes can override per-theme palettes, and apps
fall back to per-call hex defaults.

For your module's own color identities (e.g. flow's "sketch beige" or
"blueprint navy"), register them as bundled themes in the catalog under a
new `Category` — e.g. `Category: 'Flow'` for the seven `flow-*.json` themes.
Other apps can pick them too.

**Axis 2 — Renderer (lives in your module)**

A registry of named rendering definitions. Each definition contains
**module-specific rendering vocabulary** — shape choices, behavioral flags,
helper-function configuration, supplementary CSS for non-color properties.

Pattern: a `PictProvider-<Module>-Renderer.js` (singleton service provider)
holding a `Map<key, definition>` with public methods:

```javascript
register(key, definition)        // apps can add their own
setRenderer(key)                 // switch active renderer
getActiveRenderer()              // current definition
getActiveRendererKey()           // current key
getRendererKeys()                // all registered keys
```

Each definition's **shape** is module-specific. For flow it's:

```javascript
{
    Key: 'sketch',
    Label: 'Sketch',

    // Module-specific rendering knobs
    NodeBodyMode: 'bracket',                       // 'rect' | 'bracket'
    BracketConfig: { SerifLength: 20, TitleSeparator: true },
    NoiseConfig: { Enabled: true, DefaultLevel: 0.4, MaxJitterPx: 4,
                   AffectsNodes: true, AffectsConnections: true },
    ConnectionConfig: { StrokeWidth: 1.5, ArrowheadStyle: 'triangle' },

    // Shape-data overrides applied through a separate provider
    ShapeOverrides: {
        'arrowhead-connection':          { Fill: 'var(--theme-color-text-secondary, #555)' },
        'arrowhead-connection-selected': { Fill: 'var(--theme-color-brand-primary,  #2255aa)' }
    },

    // Per-renderer CSS — geometry properties (radius, stroke-width, shadow)
    // and AdditionalCSS (font-family swaps, filters) are injected at higher
    // priority than the base module CSS so they override.
    GeometryCSS: `
        .pict-<module>-container {
            --pf-node-body-stroke-width: 1.5;
            --pf-node-body-radius:       0px;
            --pf-node-shadow:            none;
            --pf-node-title-weight:      400;
        }
    `,
    AdditionalCSS: `
        .pict-<module>-node-title {
            font-family: "Courier New", "Courier", monospace !important;
        }
    `
}
```

For your module, replace the `NodeBodyMode`/`BracketConfig`/`NoiseConfig`/etc.
slots with whatever rendering vocabulary makes sense (chart-bar shapes,
syntax-highlighting variants, table row treatments). The pattern is what
matters: an explicit definition object with both **structured config**
(read by the rendering code path) and **CSS overrides** (injected at a
higher priority than your base CSS).

**Axis 3 — Edge / Layout / Sub-pattern Theme (your module, optional)**

If your module has a third pluggable concept that's neither colors nor
rendering style — like flow's edge themes (Bezier / Straight / Orthogonal /
Perimeter, each with a `GeneratePath()` function member) — keep it as its
own registry, structurally identical to the Renderer registry but with
function members instead of JSON-serializable data.

This axis usually CAN'T live in pict-section-theme's JSON catalog because
function members can't be serialized. That's fine. Keep it module-internal.

### Style Preset — the user-facing concept

Most users don't want to know about three axes. They want to pick one
visual identity and stop. So the public surface is a **preset registry**:

```javascript
{
    Hash: 'sketch',
    Label: 'Sketch',
    Description: 'Hand-drawn paper — bracket nodes with jitter and Courier text.',
    ColorTheme: 'flow-sketch',     // pict-section-theme catalog hash
    Renderer:   'sketch',          // your renderer registry key
    EdgeTheme:  'bezier',          // optional — your third-axis key
    NoiseLevel: 0.4                // optional — overrides renderer default
}
```

A separate `PictProvider-<Module>-StylePresets.js` registers these triples
and applies them via:

```javascript
applyPreset(hash)   // applies color theme, then renderer, then edge theme,
                    // then optional noise override
getActivePresetHash()  // returns hash, or null if any axis was overridden
                       // since the last applyPreset call
markCustomized()    // called by the per-axis setters to clear the
                    // "we're on preset X" tracker
```

Bundle one preset per visual identity your module ships with. Apps can
register their own via `pict.providers['<Module>-StylePresets'].register({...})`.

### Public API on your view

```javascript
// Primary path (95% of users):
view.setStylePreset('sketch');         // applies the combo
view.getStylePreset();                 // active preset hash, or null if customized

// Per-axis overrides (advanced):
view.setColorTheme('flow-blueprint');  // delegates to pict.providers.Theme.applyTheme
view.setRenderer('bracket');           // delegates to your Renderer registry
view.setEdgeTheme('orthogonal');       // your third axis (if any)

// Reading state:
view.getColorThemeKey();
view.getRendererKey();
view.getEdgeThemeKey();

// Back-compat alias (only if you had an existing setTheme API):
view.setTheme('sketch');               // → setStylePreset('sketch')
view.getThemeKey();                    // → getStylePreset()
```

Events to fire from the view:
- `'onStylePresetChanged'` — fired by `setStylePreset()` after a successful apply
- `'onColorThemeChanged'` / `'onRendererChanged'` / `'onEdgeThemeChanged'` —
  fired by the per-axis setters
- Keep firing your old `'onThemeChanged'` event from `setStylePreset()` for
  back-compat with existing host code

## Provider registration order

This trips people up. The renderer + preset providers must exist before the
CSS provider's PostInit runs, because the CSS provider's `registerRendererCSS()`
call needs the active renderer's `GeometryCSS` to inject.

In flow's case ([PictView-Flow.js](./pict-section-flow/source/views/PictView-Flow.js)):

```javascript
this._ServiceRegistry =
[
    // Noise + Renderer + StylePresets + Theme shim BEFORE CSS PostInit:
    { ServiceType: 'PictProviderFlowNoise',          Library: ..., Property: '_NoiseProvider',         NoFlowView: true },
    { ServiceType: 'PictProviderFlowRenderer',       Library: ..., Property: '_RendererProvider' },
    { ServiceType: 'PictProviderFlowStylePresets',   Library: ..., Property: '_StylePresetsProvider' },
    { ServiceType: 'PictProviderFlowTheme',          Library: ..., Property: '_ThemeProvider' },
    { ServiceType: 'PictProviderFlowCSS',            Library: ..., Property: '_CSSProvider',          PostInit: 'registerCSS' },
    // ... rest of services
];
```

In `onBeforeInitialize()`, instantiate Renderer + StylePresets explicitly
(before `_instantiateServices()` walks the registry), apply any initial
preset from options, then let `_instantiateServices()` finish setup. The
CSS provider's PostInit then registers BOTH the base CSS AND the active
renderer's `GeometryCSS`:

```javascript
if (this._CSSProvider && typeof this._CSSProvider.registerRendererCSS === 'function')
{
    this._CSSProvider.registerRendererCSS(this._RendererProvider.getActiveRenderer());
}
```

## CSS cascade strategy

The trick: get the renderer's `GeometryCSS` to win against the base CSS
without going to `!important` everywhere.

The solution: same selector, higher priority.

- **Base module CSS** at priority 500, scoped to `.pict-<module>-container { ... }`.
  Defines reasonable defaults for all `--<module>-*` vars, with color vars
  wrapped in `var(--theme-color-X, #fallback)` form so any active
  pict-section-theme automatically recolors your chrome.

- **Renderer's GeometryCSS** at priority 501, ALSO scoped to
  `.pict-<module>-container { ... }`. Same specificity as base, but later
  in the cascade (higher priority wins per CSSMap's sort) — so it overrides
  the defaults for whichever properties it sets. Only set the properties
  you're overriding; leave the rest to fall through to base.

Register via:
```javascript
this.fable.CSSMap.removeCSS('Pict<Module>-Renderer-CSS');
this.fable.CSSMap.addCSS('Pict<Module>-Renderer-CSS',
    tmpCSS, 501, 'Pict<Module>CSS');
this.fable.CSSMap.injectCSS();
```

When the renderer changes, the old `Pict<Module>-Renderer-CSS` is removed
and the new renderer's CSS replaces it at the same priority.

## Migrating an existing monolithic theme

If your module already has a hand-rolled monolithic theme registry
(`PictProvider-<Module>-Theme.js` with a `_Themes` map containing both
colors and rendering directives), here's the migration sequence that
preserves backwards compatibility:

### 1. Extract colors → pict-section-theme catalog

For each existing monolithic theme, create a `<module>-<name>.json` bundle
in [pict-section-theme/source/themes/](./pict-section-theme/source/themes/)
following [pict-default.json](./pict-section-theme/source/themes/pict-default.json)'s
`Tokens.Color.*` structure. Register them in
[_catalog.js](./pict-section-theme/source/themes/_catalog.js) under a new
`Category: '<Module>'`.

### 2. Create the Renderer provider

`PictProvider-<Module>-Renderer.js` with a `register()` / `setRenderer()` /
`getActiveRenderer()` API. Move the rendering directives from each old theme
into renderer definitions. **Strip the color values** out of these — they
now live in pict-section-theme. Only structured config + GeometryCSS (which
overrides non-color properties) + AdditionalCSS (font/filter overrides)
should remain.

### 3. Create the StylePresets provider

`PictProvider-<Module>-StylePresets.js` with `register()` / `applyPreset()` /
`getActivePresetHash()` / `markCustomized()`. Bundle one preset per old
monolithic theme, naming the new color theme + renderer + edge theme
that combine to reproduce it.

### 4. Collapse the old Theme provider to a compat shim

Keep the legacy `PictProvider-<Module>-Theme.js` file but strip out its
internal `_Themes` map. Replace every method with a delegation:

- `setTheme(key)` → `_StylePresetsProvider.applyPreset(key)`
- `getActiveTheme()` → return a synthetic object pulling rendering fields
  from `_RendererProvider.getActiveRenderer()` (so legacy consumers reading
  `theme.NoiseConfig` still get the right answer)
- `getActiveThemeKey()` → `_StylePresetsProvider.getActivePresetHash() ||
  _RendererProvider.getActiveRendererKey()`
- `setNoiseLevel()` / `getNoiseLevel()` / `processPathString()` /
  `getNodeNoiseAmplitude()` → delegate to `_RendererProvider`
- `registerTheme(key, def)` → accept a preset-shaped payload, delegate to
  `_StylePresetsProvider.register()`
- `getThemeKeys()` → `_StylePresetsProvider.getPresetHashes()`

Existing consumers calling `_ThemeProvider.getActiveTheme().NoiseConfig`
keep working unchanged.

### 5. Wire the new public methods on the view

Add `setStylePreset` / `setColorTheme` / `setRenderer` / `getStylePreset` /
`getColorThemeKey` / `getRendererKey` plus back-compat `setTheme` /
`getThemeKey` aliases. Share a `_refreshAfterStyleChange()` helper that
re-registers the renderer CSS, re-injects marker defs (if your module has
SVG marker definitions with inline fill colors), and re-renders.

### 6. Wrap any straggler bare hexes in CSS

The base CSS file probably has a handful of hard-coded `#hex` fallbacks
that didn't make it into the original theme cascade. Wrap each in
`var(--theme-color-X, #hex)` form so the active pict-section-theme
recolors them too. The flow conversion needed only 3 of these.

### 7. Update any toolbar / settings UI that read theme internals

If your toolbar UI reads `_ThemeProvider._Themes[key].Label` or similar
direct property access on the old theme, update it to use
`_StylePresetsProvider.listPresets()` (returns the array of preset
objects with `Hash`, `Label`, `Description` fields). The shim doesn't
expose the old `_Themes` map.

### 8. Add tests for both new providers

Each registry deserves a focused test file:
- Renderer: built-in renderers registered, `setRenderer()` switches active,
  `register()` accepts custom renderers, noise APIs respect renderer state
- StylePresets: all bundled presets present + well-formed, `applyPreset()`
  fires all axes in order, `markCustomized()` clears active hash, custom
  preset registration + application works

Use a small fake `FlowView` shim (object literal with the required provider
references) so the tests don't need a real Pict instance.

## What pict-section-flow actually shipped (reference)

For a complete worked example of this pattern, see:

- **Color themes (catalog)**: [`pict-section-theme/source/themes/flow-*.json`](./pict-section-theme/source/themes/)
  — 7 bundles registered under `Category: 'Flow'` in
  [_catalog.js](./pict-section-theme/source/themes/_catalog.js)
- **Renderer registry**: [`pict-section-flow/source/providers/PictProvider-Flow-Renderer.js`](./pict-section-flow/source/providers/PictProvider-Flow-Renderer.js)
  — 5 bundled renderers: `clean`, `bracket`, `sketch`, `crt`, `workstation`
- **Style presets**: [`pict-section-flow/source/providers/PictProvider-Flow-StylePresets.js`](./pict-section-flow/source/providers/PictProvider-Flow-StylePresets.js)
  — 7 bundled presets reproducing the old monolithic themes
- **Compat shim**: [`pict-section-flow/source/providers/PictProvider-Flow-Theme.js`](./pict-section-flow/source/providers/PictProvider-Flow-Theme.js)
  — collapsed from 755 lines of monolithic registry to ~180 lines of
  delegation methods
- **View wiring**: [`pict-section-flow/source/views/PictView-Flow.js`](./pict-section-flow/source/views/PictView-Flow.js)
  — see service registry, `onBeforeInitialize()`, and the Theme/Renderer/
  Style-Preset API block (around the "ǁ─ Theme / Renderer / Style-Preset API ─ǁ"
  comment)
- **CSS cascade**: [`pict-section-flow/source/providers/PictProvider-Flow-CSS.js`](./pict-section-flow/source/providers/PictProvider-Flow-CSS.js)
  — base CSS at priority 500 with theme-color fallbacks; the new
  `registerRendererCSS()` method adds the active renderer's CSS at priority 501
- **Tests**: [`pict-section-flow/test/Renderer_tests.js`](./pict-section-flow/test/Renderer_tests.js)
  and [`pict-section-flow/test/StylePresets_tests.js`](./pict-section-flow/test/StylePresets_tests.js)

## Trade-offs of this pattern

**Why introduce three axes when one would do?**

Two axes (color + renderer) is the minimum. The third axis (edge theme, or
whatever your module's equivalent is) is only worth it if that subsystem has
its own legitimate variation independent of both color and renderer. Flow
qualifies because edge routing (Bezier vs Orthogonal) is a separate
algorithmic choice. If your module's third concept is just data, fold it
into the renderer.

**Why are CSS overrides done via `GeometryCSS` strings instead of structured
properties?**

A renderer might want to override 3 properties or 30; encoding them as a
fixed JSON shape would either be too narrow (some renderer wants a property
not in the shape) or too verbose (every renderer fills in 30 fields most
care nothing about). Free-form CSS strings let renderers express exactly
what they need, at the cost of zero compile-time validation. That's the
right trade-off for visual style data.

**Why expose color via pict-section-theme rather than keeping it
module-private?**

So colors carry across the app. If your app picks `cyberpunk` from the global
theme picker, every pict-section-theme-aware view recolors — including yours.
Without this, your module is an island that always looks like itself
regardless of the host's theme choice, which is jarring.

**Why a back-compat shim instead of clean-breaking the old API?**

Because hosts in the wild call `flowView.setTheme('sketch')`,
`flowView.getThemeKey()`, etc. Breaking those forces every consumer to
rev together. The shim is ~180 lines of delegation; the cost of carrying
it is negligible compared to the cost of coordinating an ecosystem-wide
upgrade. Drop the shim only when no consumer calls the old methods.

## Anti-patterns to reject in code review

| Wrong | Right |
|---|---|
| New rendering knob added as a field on a flow theme JSON | Add to the Renderer definition shape; if it's a CSS property, into `GeometryCSS` |
| Color hex literal in a Renderer definition | Wrap in `var(--theme-color-X, #fallback)` — renderers should reference theme tokens, not bake colors |
| Renderer's `GeometryCSS` using `:root { ... }` | Use `.pict-<module>-container { ... }` so it actually wins against base CSS |
| Reading rendering data from `pict.providers.Theme.getActiveTheme()` | Read from `view._RendererProvider.getActiveRenderer()` — Theme is for colors |
| `applyPreset()` returning without restoring state if any step fails | Each axis's setter should be transactionally independent — partial application is acceptable, but `getActivePresetHash()` should accurately reflect whether ALL axes match a preset |
| Hardcoding the preset list in the toolbar picker | Read from `_StylePresetsProvider.listPresets()` — apps that register custom presets should appear in the picker automatically |
