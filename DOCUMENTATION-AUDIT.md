# Retold Documentation Audit

_Generated 2026-05-30. Covers all **115 on-disk modules** across the six groups._

This is a living reference for the documentation initiative. Companion files:
- [`DOCUMENTATION-GAPS.json`](DOCUMENTATION-GAPS.json) — machine-checkable backlog (per-module tier + gap + fix + template).
- [`DOCUMENTATION-CONNECT-THE-DOTS.md`](DOCUMENTATION-CONNECT-THE-DOTS.md) — design spec for the centralized "connect the dots" layer.

## Methodology

1. **Mechanical census** of every `modules/<group>/<module>/`: README size, `docs/` *content* markdown vs docuserve machinery, and presence of quickstart / playground / examples / api / architecture / built site.
2. **Topical inventory** — doc filenames mapped to coverage.
3. **Six per-group deep reads** judging quality by *reading* representative docs (not counts).
4. **Reconciliation** against the central `docs/` catalog (`_sidebar.md`, `modules/*.md`, generated `retold-catalog.json`).

**Tier definitions:** `SOLID` = substantive, multi-topic, usable · `PARTIAL` = real but thin/incomplete · `STUB` = placeholder/near-empty · `MISSING` = no usable docs.

## Scorecard

| Group | Modules | SOLID | PARTIAL | STUB | MISSING |
|---|---|---|---|---|---|
| fable | 9 | 7 | 2 | 0 | 0 |
| meadow | 27 | 21 | 3 | 3 | 0 |
| orator | 10 | 5 | 4 | 1 | 0 |
| pict | 42 | 24 | 11 | 4 | 3 |
| utility | 13 | 7 | 2 | 3 | 1 |
| apps | 14 | 8 | 1 | 2 | 3 |
| **Total** | **115** | **~72 (63%)** | **~23 (20%)** | **~13 (11%)** | **~7 (6%)** |

Roughly two-thirds of modules are genuinely well-documented. The problems are concentrated: a tail of ~20 stub/empty modules, an incomplete central catalog, and almost no cross-module linking.

## The documentation *system*

Every module is wired for the same toolchain — **indoctrinate → pict-docuserve** — producing a standardized `docs/` layout (`README.md`, `architecture.md`, a quickstart, topic pages, `api/`, optional `playground/`, plus machinery: `_sidebar.md`, `_cover.md`, `retold-catalog.json`, built `index.html` + `pict-docuserve.min.js`). Verified quality signals:

- **API docs are hand-written prose, not generated stubs** (e.g. `meadow/docs/api/doCreate.md` explains *why* create-overrides aren't supported).
- **Playgrounds are real interactive demos** (live editor + `app.json`/`appdata.json`/`application.js` + prebuilt `runtime/` bundles) in **18 modules — all Pict (14) + Fable (4)**. None in meadow/orator/utility/apps.
- **Flagships are excellent:** `fable` (137 hand-written service + expression-function refs — the gold standard), `pict-section-form`, `ultravisor` (~10k operator-doc lines), `orator-ssl-proxy` (4 OS-specific CA-install guides).

## Central "connect-the-dots" layer (already strong, but incomplete)

The root [`docs/`](docs) already has a real ecosystem backbone:
- **[Layered architecture](docs/architecture/architecture.md)** — the 5-layer model with per-layer Mermaid diagrams.
- **[Getting Started](docs/getting-started.md)** — layered tutorial backed by 5 runnable projects ([`examples/quickstart/layer1-5`](examples/quickstart)).
- **Full worked app** — [`examples/todo-list`](examples/todo-list) (model + server + web/console/CLI clients + Docker).
- **Jellyfish templating reference** (~70 files), **generated dependency graph**, per-group pages, and **style guides**.

**Gap:** the central catalog (`docs/_sidebar.md`, `docs/modules/*.md`, generated `docs/retold-catalog.json`) was surfacing only **80 of 115 modules — 35 invisible centrally**, including well-documented ones (`manyfest-conversion`, `retold-sample-data`, `retold-remote-ios`, `ultravisor-file-stream`, `orator-ssl-proxy`, `pict-renderer-graph`). _The `_sidebar.md` was completed in this pass; see the connect-the-dots plan for making it self-maintaining._

## Quick start / examples / playground coverage

- **Quick start: widespread but inconsistently named** — 8 filename conventions in use: `quickstart.md` (33), `quick-start.md` (13), `getting-started.md` (10), `Getting_Started.md` (2), plus one-offs `pict_quickstart.md`, `Quick_Start.md`, `Getting-Started.md`, `GETTING_STARTED.md`. Standardize on `quickstart.md`.
- **Examples: strong where present** — best: `ultravisor-beacon-capability` (11 runnable programs), `meadow-integration` (full runnable Pict app), `orator-authentication` (`simple_login`), `retold-databeacon` (6 workflow guides). Most others embed examples inline in the quickstart.
- **Playground: a Pict/Fable feature only** (18 modules). Reasonable that server/infra/data modules lack one.

## Cross-cutting issues

1. **Cross-module linking is thin** — the biggest connect-the-dots gap. The one good model is `fable-uuid/docs/resources.md`. Missing edges: orator docs have **zero** references to meadow-endpoints or pict; every meadow connector is loaded *by* meadow-connection-manager yet none link to it; apps link to GitHub repos instead of the hosted library doc pages.
2. **Manifest/data-quality** — broken Documentation URLs (`retold-facto`, `retold-remote-desktop`, `retold-remote-ios` had `fable-retold.io-…`) **[fixed this pass]**; `choreographic` was absent from the manifest **[added this pass]**; `retold-data-mapper` publishes dev-planning artifacts (`PROMPT-PHASE-2B.md`) as its doc site while its good README sits in the repo root.
3. **Stale content shipping** — `tidings` README has literal `### REWRITE THIS` / `#### TODO` markers + a duplicated `apt-get`; `quackage` README advertises commands that don't match its real surface; `cumulation` README has an unclosed code fence.
4. **README-as-only-doc (no hosted site)** — `pict-renderer-graph` (292-line README), `pict-section-theme` (520), `fable-ultravisor-client`, `stricture` (README richer than its command-reference site), `elucidator`, `retold-sharp`.

## Per-group quality tiers

### fable (9)
- **SOLID (7):** fable, ultravisor-beacon, ultravisor-beacon-capability, fable-log, fable-uuid, fable-settings, fable-serviceproviderbase
- **PARTIAL (2):** fable-log-logger-bunyan _(narrow but adequate adapter)_, fable-ultravisor-client _(good README, no docs site)_

### meadow (27)
- **SOLID (21):** meadow, foxhound, stricture, meadow-integration, retold-data-service, retold-harness, retold-harness-consistency-proxy, bibliograph, bibliograph-storage-meadow, parime, meadow-graph-client, meadow-provider-offline, + connection family (mysql, mssql, postgresql, sqlite, sqlite-browser, mongodb, dgraph, solr, rocksdb)
- **PARTIAL (3):** meadow-endpoints _(great README, no docs-site pages — Layer-3 keystone)_, meadow-migrationmanager _(thin)_, meadow-connection-retold-databeacon _(README only, no site)_
- **STUB (3):** meadow-connection-oracle _(working code, zero docs)_, meadow-connection-manager _(keystone loader, site shell only)_, meadow-connection-meadow-endpoints _(README only, empty site)_

### orator (10)
- **SOLID (5):** orator _(borderline — thin on errors/`invoke()` payload/full hook ref)_, orator-authentication, orator-ssl-proxy, tidings _(README-carried; stale markers)_, orator-conversion
- **PARTIAL (4):** orator-serviceserver-restify, orator-serviceserver-base, orator-static-server, orator-http-proxy _(all thin but acceptable for their scope)_
- **STUB (1):** orator-endpoint _(3-line README, base class others extend, advertised in central sidebar)_

### pict (42)
- **SOLID (24):** pict, pict-view, pict-template, pict-template-preprocessor, pict-provider, pict-application, pict-section-form, pict-section-flow, pict-section-modal, pict-section-histogram, pict-section-login, pict-section-openseadragon, pict-section-inlinedocumentation, pict-section-objecteditor, pict-section-markdowneditor, pict-section-content, pict-section-code, pict-terminalui, pict-docuserve, pict-serviceproviderbase, pict-sessionmanager, pict-panel, pict-router, pict-section-theme _(README-as-doc)_
- **PARTIAL (11):** pict-section-formeditor, pict-section-recordset, pict-section-tuigrid, pict-section-equation, pict-section-connection-form, pict-section-filebrowser, pict-service-commandlineutility, informary, cryptbrau, pict-renderer-graph _(big README, no site)_, pict-provider _(borderline SOLID)_
- **STUB (4):** pict-meadow-connection-manager, pict-provider-theme, pict-editor-timeline, pict-nonlinearconfig
- **MISSING (3):** pict-section-usermanagement, pict-provider-vocabulary, pict-section-entitymanagement

### utility (13)
- **SOLID (7):** indoctrinate, manyfest, manyfest-conversion, retold-sample-data, quackage, precedent, cachetrax
- **PARTIAL (2):** retold-sharp _(good README, no site, is a live dep)_, elucidator _(long README but skeletal/invalid examples)_
- **STUB (3):** choreographic _(self-admittedly incomplete; now in manifest)_, cumulation _(broken README)_, pict-cruisecontrol _(no descriptive prose)_
- **MISSING (1):** merquerial _(354 LOC, 5-line README)_

### apps (14)
- **SOLID (8):** ultravisor, retold-databeacon, retold-facto, retold-content-system, retold-remote _(root README missing; docs/ excellent)_, ultravisor-suite-harness, retold-remote-ios, ultravisor-file-stream _(lib-scope)_
- **PARTIAL (1):** retold-data-mapper _(good root README, but published site = planning artifacts)_
- **STUB (2):** ultravisor-lab _(v1.0.2 webapp, only a plan doc)_, retold-remote-desktop _(empty scaffold)_
- **MISSING (3):** retold-beacon-host _(v1.0.0)_, ultravisor-auth-beacon _(v1.0.3, security)_, retold-synth-databeacon _(v0.0.1)_

## Prioritized gap backlog

**Tier 1 — keystones / shipping & undocumented:** meadow-connection-manager, meadow-endpoints (hosted pages), orator-endpoint, ultravisor-auth-beacon, meadow-connection-oracle. — ✅ **all 5 authored 2026-05-30** and committed to each module's own repo (`orator-endpoint` with a source-verification caveat — no `source/` in the checkout). See `tier1AuthoredThisPass` in [DOCUMENTATION-GAPS.json](DOCUMENTATION-GAPS.json). Per-module docuserve sites still need building via the normal pipeline.

**Tier 2 — shipping but empty:** retold-beacon-host, ultravisor-lab, retold-remote-desktop, retold-synth-databeacon, merquerial, meadow-connection-meadow-endpoints. — ✅ **all 6 authored + sites built 2026-05-30** (retold-beacon-host & retold-remote-desktop with source-verification caveats — no `source/` in checkout). See `tier2AuthoredThisPass` in [DOCUMENTATION-GAPS.json](DOCUMENTATION-GAPS.json).

**Tier 3 — pict/utility stubs & thin partials:** pict-section-usermanagement, pict-provider-vocabulary, pict-section-entitymanagement, pict-section-excalidraw, pict-meadow-connection-manager, pict-provider-theme, pict-nonlinearconfig, pict-editor-timeline, cumulation, pict-cruisecontrol, choreographic, elucidator, plus README-only-no-site (pict-renderer-graph, pict-section-theme, fable-ultravisor-client, retold-sharp). — ✅ **all 18 authored + sites built 2026-05-30** (also covered meadow-connection-retold-databeacon and meadow-migrationmanager). Several are scaffolds, documented honestly; the doc pass surfaced **8 real source bugs** — see `codeIssuesFound` in [DOCUMENTATION-GAPS.json](DOCUMENTATION-GAPS.json). Still pending: the `stricture` README→docs-pages mirror (it has a command-reference site but no architecture/quickstart pages).

**Tier 4 — cleanup of existing docs:** stale `tidings`/`quackage`/`cumulation` READMEs; repoint `retold-data-mapper` published site; (done) 3 manifest URLs + `choreographic` manifest entry.

The 12 hardest (no content docs **and** ≤15-line README): meadow-connection-manager, meadow-connection-oracle, orator-endpoint, pict-editor-timeline, pict-provider-vocabulary, pict-section-entitymanagement, pict-section-usermanagement, merquerial, retold-beacon-host, retold-remote-desktop, retold-synth-databeacon, ultravisor-auth-beacon.

## Recommendations

1. **Make the central catalog complete and self-maintaining** — drive the module portion of `_sidebar.md` and the `docs/modules/*.md` tables from the manifest + on-disk reality so modules can't go invisible. (`_sidebar.md` completed this pass.)
2. **Add a standard "Related modules / built-on / consumed-by" block** to every module (template from `fable-uuid/docs/resources.md`) — the literal connect-the-dots layer.
3. **Standardize the quickstart filename** (`quickstart.md`).
4. **Add the missing stack edges** — orator↔meadow-endpoints↔pict, connectors↔connection-manager, apps→hosted library docs.
5. **Fill the Tier-1/2 gaps**, mirroring sibling templates where they exist (e.g. oracle ← mysql).
