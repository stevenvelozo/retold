# Retold Module Documentation Fixup — Playbook

The repeatable procedure for bringing a Retold module's documentation to
*beautiful, whole, and working*. Written while fixing up **pict-section-form**,
which is the reference module — when in doubt, compare against
`modules/pict/pict-section-form/`.

Goal of the sweep: every module ships an interactive docuserve documentation
site whose landing page sells the module, whose examples run live in the
browser, and whose links all resolve — on the hosted site, on GitHub, and on
npm.

## Toolchain fixes that already shipped

These were fixed once, in the shared tooling, during the pict-section-form
pass. Every module benefits once it depends on a new-enough version — do **not**
re-fix them per module.

| Package | Fix |
|---------|-----|
| `pict-section-content` | `parseMarkdown` folds an indented continuation line of a wrapped list item into the preceding `<li>` instead of splitting the list (which restarted ordered numbering). |
| `pict-docuserve` | Module-mode link resolution is **directory-aware** — a relative link resolves against the directory of the document that contains it, not the docs root. This is how docsify-style docs are authored; it had been broken ecosystem-wide. |
| `pict-docuserve` | New `check-links` CLI command — scans a docs folder for unresolvable local links and image references, exits non-zero when any are broken. |
| `pict-docuserve` | The Splash (landing) view renders an "Interactive Examples" section from the staged examples, and renders `docs/README.md` beneath the hero. |
| `pict-docuserve` `stage-examples` | Writes the examples table into `docs/_cover.md` (the splash's source), maintains the examples index, and stages each flagged example app into `docs/examples/<name>/`. |

## How docuserve renders a module's docs

- The **landing page** (`#/Home`) is the **Splash** — a hero built from
  `docs/_cover.md` (title, tagline, highlight bullets, action links). It is
  **not** `README.md`.
- The Splash also renders `_cover.md`'s generated examples region as an
  "Interactive Examples" table, and renders `docs/README.md` below the hero —
  the hero fills the viewport above the fold, the README follows on scroll.
- A documentation page is `#/page/<path-without-.md>`. The live example apps
  are static files staged at `docs/examples/<name>/index.html`.
- Internal links resolve **relative to the document they are written in**
  (directory-aware). A `/`-rooted link resolves against the docs root.

## Per-module fixup procedure

### 1. Survey

- Run `pict-docuserve check-links ./docs` in the module; note every broken link.
- List `example_applications/` — these are the candidate live examples.

### 2. Choose the live examples — **ask the user**

Not every example application belongs in the documentation; many are
development smoke-test harnesses. **Present the list of `example_applications/`
to the user and have them check off which ones are documentation-worthy
interactive examples.** Only the chosen ones are staged, get a writeup, and
appear on the landing page. The rest stay in `example_applications/` as smoke
tests but are removed from the docs.

### 3. Flag the chosen examples

In each chosen example's `package.json`:

```json
"retold": {
    "ExampleApplication": {
        "Stage": true,
        "Title": "Human Readable Title",
        "Summary": "One sentence on what it demonstrates.",
        "Complexity": "Basic | Intermediate | Advanced"
    }
}
```

Remove the block from any example that should not be staged.

### 4. Remove non-documentation examples from the docs

- Delete `docs/examples/<name>/` for each removed example.
- Remove their entries from `docs/_sidebar.md`, `docs/examples/README.md`
  (quick-reference / learning-path / feature-matrix), and `docs/README.md`.
- De-link or repoint any prose that referenced them.

### 5. Write a meaningful writeup for every staged example

Stub writeups ("A demo of X.") are not acceptable. Each
`docs/examples/<name>/README.md` must be a real technical walk-through.
**Read the example's application `.js` and manifest first** — the writeup must
teach the framework capabilities the example exercises, with real config.

The reference is `pict-section-form/docs/examples/gradebook/README.md`. The
structure:

1. **H1 title** with a short descriptive subtitle.
2. The `docuserve:example-launch` marker region (machine-maintained — leave it).
3. **Intro** — what the example is, end to end, and why it is interesting.
4. **"What it demonstrates"** — a `Capability | Where you see it` table.
5. **"Key files"** — each source file and its role.
6. **A data-model section** — the app-data shapes.
7. **Numbered `Feature N — ...` deep-dives** — each explains one framework
   capability and shows the **real, verbatim** config/code snippet from the
   example that uses it.
8. **"Running the example"**.
9. **Numbered "Takeaways"**.
10. **"Related documentation"** — links to the relevant reference docs.

Write about the *framework capability*, not just the example — a reader should
finish understanding the feature, not just this one app.

### 6. Fix the root README

The module's root `README.md` is the npm and GitHub front door; repo-relative
links (`docs/X.md`) do not work usefully there.

- Add a prominent documentation link at the very top — literal and absolute:
  `https://stevenvelozo.github.io/<module>/`.
- Rewrite every documentation link to the hosted site:
  `https://stevenvelozo.github.io/<module>/#/page/<Name>`.
- Rewrite every example link to its live app:
  `https://stevenvelozo.github.io/<module>/examples/<name>/`.
- Curate the example table to the staged set.

### 7. Regenerate and verify

- `npx quack prepare-docs ./docs` — stages the flagged examples, regenerates
  the `_cover.md` examples region, the examples index, and each launch block.
- `pict-docuserve check-links ./docs` — must report **clean**.
- Serve the docs and confirm: the splash shows the examples table, the README
  renders below the hero, every link resolves.

## What we had to fix in pict-section-form (the reference pass)

- Markdown list rendering split wrapped list items — fixed in pict-section-content.
- docuserve resolved links docs-root-relative while the docs were authored
  directory-relative — made docuserve resolution directory-aware.
- Five example doc pages were development smoke tests — removed from the docs.
- Four example writeups were scaffolded stubs and one was thin — rewritten to
  Gradebook quality.
- The landing page's examples block rendered as a bullet list — made a table.
- The examples table lived in `docs/README.md`, which the splash never renders —
  moved it to the splash's `_cover.md` examples region.
- The root README's documentation and example links were repo-relative and
  broke on npm and GitHub — rewritten to fully-qualified hosted-site URLs.

## Publishing

A documentation-only change to a module needs a commit + push — the hosted docs
site rebuilds from the repo. A toolchain change (`pict-section-content`,
`pict-docuserve`) needs a version bump + `npm publish`; the hosted sites load
docuserve from the jsDelivr `@1` CDN, so a published docuserve reaches every
module's docs site automatically.
