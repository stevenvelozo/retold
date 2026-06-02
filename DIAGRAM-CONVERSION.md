# Diagram Conversion -- Remaining Work

Convert every documentation diagram in the ecosystem -- inline `mermaid`
blocks **and** embedded ASCII-art diagrams -- into bespoke, theme-adaptive,
hand-drawn `pict-renderer-graph` diagrams, following the worked example in
[`docs/architecture/architecture.md`](docs/architecture/architecture.md).

The engine, the workflow, the docuserve theme-inlining, and the first showcase
doc are all done and live. What remains is breadth: applying the same pattern
across the rest of the docs.

---

## Kickoff prompt

> Convert the remaining ecosystem documentation diagrams to bespoke
> pict-renderer-graph diagrams, using `DIAGRAM-CONVERSION.md` as the guide and
> `docs/architecture/architecture.md` (already converted) as the worked
> example. For every inline ` ```mermaid ` block and every embedded ASCII-art
> diagram across the umbrella docs (`docs/`) and the module docs
> (`modules/*/*/docs/`): produce a diagram folder (`<name>.mmd` + optional
> `<name>.hints.json`, built into `<name>.excalidraw` + `<name>.svg` with
> `npx pict-renderer-graph build <dir>`) and replace the inline block with the
> SVG embed. Strip mermaid `style` directives and `<code>`/`<b>`/`<i>` tags;
> re-author ASCII diagrams as mermaid; skip directory trees and table borders
> (they are not diagrams) and any diagram type mermaid-to-excalidraw cannot
> parse (leave those inline). Add light `emphasis` hints to accent the key node
> in each diagram. Commit per repo (the umbrella and each module), pushing
> `origin` + `upstream` where a fork exists. Work in batches -- umbrella docs
> first, then module docs by group -- and report at each batch. Done when no
> unconverted ` ```mermaid ` blocks or ASCII-art diagrams remain and every new
> SVG resolves at its raw GitHub URL. Do **not** npm-publish anything without
> an explicit go-ahead.

---

## Done criteria

- No unconverted ` ```mermaid ` blocks remain in any doc (umbrella or module).
- No embedded ASCII-art **diagrams** remain (directory trees, table borders,
  and prose box-art that is not a diagram are left alone -- use judgment).
- Every replacement is an `![alt](diagrams/<name>.svg)` embed backed by a
  committed `.mmd` + `.hints.json` + `.excalidraw` + `.svg`.
- Every new `.svg` is reachable at its `raw.githubusercontent.com` URL (so the
  docuserve embed loads).
- `pict-renderer-graph` tests stay green.

## What is already built (do not redo)

- **pict-renderer-graph** (`modules/pict/pict-renderer-graph`): the `build`
  command, the hand-drawn restyle, the theme-variable SVG output, and the full
  hint protocol (`direction`, `engine`, `spacing`, `clusters`, `order`,
  `emphasis`). Runs in-repo via `npx pict-renderer-graph` -- no install needed
  beyond `npm install` in that module (pulls puppeteer + Chromium).
- **pict-docuserve `1.4.15`** (live on CDN): inlines `<img src=*.svg>` diagram
  SVGs into the DOM and defines `--diagram-*` per light/dark/system theme, so
  the bespoke diagrams follow the docs theme.
- **`docs/architecture/architecture.md`**: 7 diagrams already converted (Layer
  Model + Layers 1-5 + "Putting It All Together"). Use these `.mmd`/`.hints.json`
  in `docs/architecture/diagrams/` as templates.

## The conversion pattern (per diagram)

1. Choose a `diagrams/` folder next to the doc (e.g.
   `docs/architecture/diagrams/`, `modules/<g>/<m>/docs/diagrams/`).
2. Write `<name>.mmd` -- the graph as mermaid:
   - **From a mermaid block:** copy it, then strip the `style ...` directives
     and `<code>`/`<b>`/`<i>` tags. Keep `<br/>` (it becomes a newline). Keep
     native `subgraph`s -- they render as quiet dashed container frames
     automatically.
   - **From ASCII art:** re-author it as mermaid -- read the boxes + arrows and
     express them as nodes + edges. This is interpretation, not mechanical.
3. Write `<name>.hints.json` (optional but encouraged) -- `style` + a light
   `emphasis` accent on the key node, plus `clusters`/`direction`/`spacing`
   where they clarify. See the protocol below.
4. Build: `npx pict-renderer-graph build <diagrams-dir>` (writes `.svg` +
   `.excalidraw`). Clear `~/.cache/pict-renderer-graph/` first if a code change
   is not reflected -- the cache is keyed on input, not code.
5. Replace the inline block with:
   ```
   <!-- bespoke diagram: edit diagrams/<name>.mmd or .hints.json, then: npx pict-renderer-graph build <diagrams-dir> -->
   ![<descriptive alt text>](diagrams/<name>.svg)
   ```
6. Commit the four files + the edited doc. Push `origin` + `upstream` (forkable
   modules have both; stevenvelozo-owned non-forkable have origin only).

## The `.hints.json` protocol

Full reference: the "Documentation diagrams" section of the
[pict-renderer-graph README](modules/pict/pict-renderer-graph/README.md).

```jsonc
{
  "style":     "notebook",            // notebook | whiteboard | clean | dark
  "engine":    "dagre",               // dagre (default) | elk
  "direction": "LR",                  // TB | BT | LR | RL  (overrides the .mmd)
  "spacing":   { "node": 60, "rank": 100 },
  "clusters": [
    { "id": "edge", "label": "Edge", "nodes": ["cdn","lb"], "visible": true },
    { "id": "core", "nodes": ["api","db"], "visible": false }   // group only, no box
  ],
  "order":    [ ["auth","api","db"] ],   // best-effort left-to-right
  "emphasis": [
    { "node": "db", "accent": true, "bold": true },
    { "nodes": ["legacy"], "dim": true }
  ],
  "background":     false,            // transparent (default) -- blends with the page
  "themeVariables": true             // theme-adaptive SVG (default)
}
```

- `direction` / `engine` / `spacing` / `clusters` are translated into the
  mermaid the engine lays out, so they are honored.
- `order` is **best-effort** (invisible edges under dagre) -- a nudge, not a
  guarantee.
- `emphasis` matches a node by short id or visible label; geometry is untouched.
- Output is deterministic: editing the `.mmd` and rebuilding gives a stable
  layout.

## Worklist

Counts as of this writing (re-scan before starting -- they drift):

### Umbrella docs -- 20 mermaid blocks (architecture.md already done)

| Blocks | File |
|---|---|
| 1 | `docs/README.md` |
| 3 | `docs/architecture/comprehensions.md` |
| 1 | `docs/architecture/dependencies/in-ecosystem-dependency-graph.md` |
| 1 | `docs/architecture/fluid-models.md` |
| 2 | `docs/architecture/module-architecture.md` |
| 2 | `docs/architecture/templating/jellyfish-deep-dive.md` |
| 1 | `docs/examples/examples.md` |
| 5 | `docs/examples/todolist/*.md` (one each across the todo-list pages) |
| 4 | `docs/modules/{fable,meadow,orator,pict}.md` |

Re-scan: `grep -rl '```mermaid' docs --include=*.md | grep -v architecture/architecture.md`

### Module docs -- ~309 mermaid blocks across ~92 files

Enumerate per group:
```
grep -rl '```mermaid' modules/<group>/*/docs --include=*.md
```
This is the bulk of the work. Batch by group (fable, meadow, orator, pict,
utility, apps) and commit each module repo separately.

### ASCII-art diagrams

`grep -rlE '[─-╿]' docs modules/*/*/docs --include=*.md` flags ~90
module files + a couple of umbrella files, but **most are directory trees
(`|--`), table borders, or prose box-art -- not diagrams.** Convert only true
diagrams (boxes connected by arrows depicting a flow/architecture). Re-author
each as mermaid; leave trees and tables as-is.

## Caveats / gotchas

- **Type support:** mermaid-to-excalidraw handles flowchart / sequence / class
  / state. Exotic types (block-beta, gantt, some C4) may not convert -- if a
  build fails or renders wrong, leave that block inline (docuserve still
  renders mermaid natively) and move on.
- **Commit all four files** per diagram: `.mmd` (source), `.hints.json`
  (sidecar), `.excalidraw` (hand-editable scene), `.svg` (what docuserve
  serves). `dist/` and node_modules stay gitignored.
- **Per-repo push:** module repos push to `origin` and, if forkable, `upstream`.
- **Theme:** leave `background: false` (transparent) and `themeVariables: true`
  (default) so the inlined SVG follows the docs theme.
- **No npm publishes** without explicit approval. The `build` runs in-repo; the
  committed `.svg` is what renders. (Republishing pict-docuserve is only needed
  if its rendering/inlining code changes, which this work does not require.)
- **Verify** after each batch: `grep -rc '```mermaid'` trends to zero; new
  SVGs return 200 at raw GitHub; spot-render a few to PNG (`render ... .png`)
  to eyeball.
- **Rendering quality is automatic.** The pipeline scales text to fit its box
  (Excalifont runs larger than mermaid's font), keeps connectors clean (no
  wobble), collapses the doubled blank lines mermaid emits around hard breaks,
  and widens wrapping so long module names break at hyphens, not mid-word. You
  do not hand-tune text sizing.
- **Hub / fan diagrams** (one node pointing at many) have inherent fan-out
  arrow angles -- that is the layout, not a defect. If a particular one looks
  cramped, spread it with a `spacing` hint or a `direction` change (ELK routes
  the same as dagre here, so switching engines will not straighten a fan).

## Scale + sequencing

This is a large, multi-session sweep (~330 mermaid blocks + ASCII across ~90
module repos, committed/pushed per repo). Suggested order:

1. **Umbrella docs** (20 blocks) -- highest visibility, one repo, fast win.
2. **Module docs by group** -- fable, then meadow, orator, pict, utility, apps.
   Each module is its own commit + push.
3. **ASCII diagrams** -- last, since they require re-authoring judgment.

Report at each batch boundary. When the done criteria hold across every repo,
the ecosystem's diagrams are uniformly bespoke, themeable, and hand-editable --
and this is finished.
