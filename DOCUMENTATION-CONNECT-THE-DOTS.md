# Connect-the-Dots Documentation Plan

_Design spec for the centralized documentation layer. Companion to [`DOCUMENTATION-AUDIT.md`](DOCUMENTATION-AUDIT.md)._

The audit found that the ecosystem already has a strong *central* backbone (layered architecture, runnable 5-layer quickstart, a full worked app, templating reference) **and** strong *per-module* docs for ~two-thirds of modules. What's missing is the **connective tissue**: a complete catalog, consistent cross-module links, and a single quickstart convention. This plan specifies those four pieces.

---

## Part A — Central catalog completeness (make it self-maintaining)

**Problem.** `docs/_sidebar.md` and the `docs/modules/*.md` "All X Modules" tables are **hand-maintained**, so they drifted — 35 of 115 modules were invisible centrally. `docs/retold-catalog.json` + `docs/retold-keyword-index.json` are **generated** by `npm run build-docs` (`quack prepare-docs ./docs -d ./modules -g fable-retold`).

**Done this pass.** `_sidebar.md` now lists all 115 modules; the manifest is the source of truth and is now correct (URLs + `choreographic`).

**Proposed permanent fix.** Add a small generator (a `source/bin/regenerate-ecosystem-nav.js`, sibling to the existing `regenerate-module-docs.js`) that rewrites **only the module-list portion** of `_sidebar.md` and the "All X Modules" tables in `docs/modules/*.md` from `Retold-Modules-Manifest.json`, preserving the hand-authored prose sections (Getting Started, Architecture, Templating, Style Guides, Contributing, Examples). Wire it into `sync-deps-and-regen-docs.js` so nav, catalog, and keyword index regenerate together. A module added to the manifest then appears centrally with zero manual edits — and a CI check can fail if disk modules are absent from the manifest (this is how `choreographic` slipped through).

---

## Part B — The "Related Modules" block (the literal connect-the-dots layer)

**Problem.** Modules rarely link up/down the dependency stack or to what consumes them. The one good model is [`fable-uuid/docs/resources.md`](modules/fable/fable-uuid/docs) — a curated ecosystem link list. Make that the standard.

**Standard.** Every module gets a `docs/related.md` (and a short "Related modules" section at the end of `docs/README.md`) with three buckets, using **relative docuserve paths** (`/group/module/`) so links resolve on the hosted site regardless of GitHub owner:

```markdown
## Related Modules

**Built on** — what this module depends on, up the stack
- [fable](/fable/fable/) — service DI, config, logging this extends
- [meadow](/meadow/meadow/) — the data broker this fronts

**Used by** — what consumes this module, down the stack
- [meadow-endpoints](/meadow/meadow-endpoints/) — generates REST routes from this entity
- [retold-data-service](/meadow/retold-data-service/) — assembles this into a full API

**See also** — siblings / alternatives
- [foxhound](/meadow/foxhound/) — the query DSL this uses
```

The `RelatedModules` arrays already in the manifest are the seed for the "Built on / See also" buckets; the **"Used by"** (reverse) edges can be computed by inverting the manifest graph (the dependency-graph generators under `docs/architecture/dependencies/` already build this graph). A generator can stamp a first draft of `related.md` into every module, leaving prose curation to the author.

---

## Part C — Missing stack edges to add

High-value cross-references the audit found absent (author these first):

| From | To | Why it matters |
|---|---|---|
| orator | meadow-endpoints | The #1 real-world use — mounting generated CRUD routes on the server. Currently **zero** references. |
| orator / orator-static-server | pict / pict-docuserve | Serving a Pict browser app is the dominant pattern in this monorepo; never shown. |
| orator-authentication | pict-sessionmanager | Server-issued sessions ↔ client consumption — only half the handshake is documented. |
| each meadow-connection-* | meadow-connection-manager | Every connector is loaded *by* the manager by `Type`; the hub-and-spoke is undocumented from both ends. |
| stricture / foxhound | meadow / meadow-endpoints | Where generated schemas + queries get consumed up the stack. |
| ultravisor | fable-ultravisor-client, ultravisor-beacon[-capability] | Link to the **library doc pages**, not just GitHub repos. |
| apps (all) | their library doc pages | Apps are the best end-to-end demos; link app docs to `/fable/…`, `/meadow/…` pages. |

---

## Part D — Quickstart filename standard

Eight conventions are in use (`quickstart.md` ×33, `quick-start.md` ×13, `getting-started.md` ×10, `Getting_Started.md` ×2, plus `pict_quickstart.md`, `Quick_Start.md`, `Getting-Started.md`, `GETTING_STARTED.md`). Standardize on **`quickstart.md`** (the plurality). Rename the rest and update each module's `_sidebar.md`. This makes the central nav and any nav-generator portable.

---

## Rollout

1. **Phase 1 — Catalog completeness.** `_sidebar.md` done (this pass); build the manifest-driven nav generator + CI check (Part A).
2. **Phase 2 — Related blocks on the spine.** Stamp `related.md` across modules; hand-curate the flagships + keystones and add the Part C edges first.
3. **Phase 3 — Fill gaps.** Work the [`DOCUMENTATION-GAPS.json`](DOCUMENTATION-GAPS.json) backlog by priority, mirroring sibling templates (e.g. oracle ← mysql).
4. **Phase 4 — Cleanup.** Standardize quickstart filenames; fix the stale `tidings`/`quackage`/`cumulation` READMEs; repoint `retold-data-mapper`'s published site.
