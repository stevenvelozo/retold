# Retold — Live Example (GitHub Pages) Audit & Fix

_Generated 2026-05-31. Companion to DOCUMENTATION-AUDIT.md / DOCUMENTATION-GAPS.json._

Trigger: `pict-section-flow`'s live example didn't launch. Audited **every** module's
GitHub Pages live examples (standalone `docs/examples/**` apps + docuserve playground
imports) to find which weren't built/deployed.

## Method
`_audit_examples.js` (umbrella root) parses every `docs/examples/**/*.html` +
`docs/playground/**` page, resolves each local `src`/`href`, and flags any that
don't exist on disk; also checks `docs/_playground.json` `Imports[].Path`.
Verified against the live site: Pages serves `main:/docs` verbatim, so a file
missing from committed `docs/` == a guaranteed 404. Confirmed (e.g. flow's
`js/pict.min.js` returned 404 live before the fix, 200 after).

## Two problem classes found

### A. Example referenced bundles that were never staged into `docs/`
The `quack copy` step carried the app bundle + index.html but not the `js/`,
`css/`, or `vendor/` dependency folders → silent non-launch (Pict global undefined).
**11 modules.** All fixed; each = commit + push origin + ff upstream (0/0 aligned).

| Module | Fix | Commit |
|---|---|---|
| pict-section-flow | stage js/pict.min.js + css | `41bc26c` |
| pict | stage dependencies/pict.min.js (hello_world) | `a89112b` |
| pict-application | stage js/pict.min.js + 2 css (postcard) | `bafab14` |
| pict-section-modal | stage js/pict.min.js + css ×4 examples | `93e67c2` |
| pict-section-connection-form | stage js/pict.min.js + css | `7856261` |
| pict-router | **source bug**: unescaped `${~D:~}` in template literal broke `quack build` (bundle never produced) → escape `\$`, build, stage bundle + pict | `8acefc8` |
| pict-section-form | stage chart.umd.js ×2 (Chart.js; example declared no dep) | `8406a0d` |
| pict-section-tuigrid | stage tui-grid + tui-date-picker ×3 | `d23103f` |
| pict-section-openseadragon | stage OpenSeadragon + Annotorious vendor; drop dead `annotorious-pict-plugins.js` ref | `37af96e` |
| pict-provider-theme | stage full vendor/ tree (8 assets) | `335bbb2` |
| pict-meadow-connection-manager | **path bug**: root-absolute `/js/...` (server routes) → relative `./js/`; stage pict + built app.js + favicons. (Live connection tests still need the docker-compose meadow backend; static UI now renders.) | `9ad595d` |

> Source maps (4 MB `pict.min.js.map`) were initially staged then stripped from the
> 4 copy-only modules (`ecf34e5`,`9e6bbe1`,`dae3ea3`,`36f01b8`) — devtools-only, benign 404 without them.

### B. Docuserve docs site never published (GitHub Pages disabled)
Whole site 404 (not just the example). **9 example/playground-bearing modules** had
Pages off at fable-retold (and the stevenvelozo fork). Enabled all (main:/docs):
pict-section-theme, pict-section-openseadragon, pict-provider-theme,
pict-section-connection-form, pict-meadow-connection-manager, pict-editor-timeline,
pict-section-inlinedocumentation, pict-section-markdowneditor, manyfest-conversion.

## Live verification
- **49/49** previously-404 assets now return **200** (full sweep).
- 7 already-live modules confirmed serving the fixed assets.
- 9 newly-enabled sites confirmed live (root 200). pict-provider-theme's first
  build hung in `building` (a known API-enable quirk, no error) — a manual
  `POST .../pages/builds` rebuild request cleared it; then 200.
- Not done headlessly: in-browser boot test (no Chrome extension connected) — the
  asset-load chain (real 622 KB pict.min.js → Pict global → safeLoadPictApplication
  + app bundle) is the same pattern the working examples use.

## Notes
- `pict` default branch is `master` (Pages serves master:/docs) — fix pushed there, verified.
- Modules with examples that PASSED the audit (already working): pict-panel,
  pict-section-code/content/equation/histogram/objecteditor/formeditor, fable*,
  meadow-integration, indoctrinate, retold-databeacon.
