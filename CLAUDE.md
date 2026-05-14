# Retold

A suite of 60+ JavaScript/Node.js modules for building web applications and APIs. MIT licensed.

## Architecture

Six module groups, each in `modules/<group>/`:

- **Fable** — Core ecosystem: dependency injection (service provider pattern), configuration, logging, UUID generation, expression parser, REST client, template engine
- **Meadow** — Data access layer: ORM, query DSL (FoxHound), schema definitions (Stricture), DB connectors (MySQL, MSSQL, PostgreSQL, SQLite, MongoDB, DGraph, Solr, RocksDB), RESTful endpoint generation
- **Orator** — API server: Restify wrapper, static file serving, HTTP proxy, WebSocket support (Tidings)
- **Pict** — MVC tools: views, templates, providers, application lifecycle, form builders, TUI grid, CLI utilities
- **Utility** — Build tools (Quackage), manifest management (Manyfest), documentation (Indoctrinate)
- **Apps** — Full-stack applications: content management (retold-content-system), remote access (retold-remote), process supervision (Ultravisor)

## Repository Structure

Each module is its own git repo cloned into a category folder under `modules/`. The root repo tracks module organization only — individual module code lives in their own repos.

```
retold/
├── Retold-Modules-Manifest.json   # Source of truth for module/group membership
├── source/                         # → retold-manager package (see below)
├── modules/
│   ├── fable/                     # 6 modules
│   ├── meadow/                    # 19 modules
│   ├── orator/                    # 7 modules
│   ├── pict/                      # 22 modules
│   ├── utility/                   # 5 modules
│   └── apps/                      # 3 applications
└── docs/                           # ecosystem docs (dep graphs, architecture)
```

### `source/` is retold-manager — an internal tool with a non-standard layout

`retold/source/` is **not** a generic source folder — it *is* the retold-manager package. The web + CLI tool that drives this pseudo-monorepo (status, update, ripple-publish, dep audit, etc.) is the only first-party software the umbrella repo ships, so it lives directly at `source/` rather than under a `source/retold-manager/` subdir.

```
retold/source/
├── package.json              # retold-manager's package.json (name: "retold-manager")
├── retold-manager.js         # TUI entry — `node retold-manager.js`
├── retold-manager-web.js     # Web entry — `node retold-manager-web.js`
├── bin/                      # manifest-audit / -rebuild-shell / -backfill
├── core/                     # Manager-Core-* services (RippleGraph, ManifestLoader, ProcessRunner, supervisors, …)
├── tui/, views/              # blessed renderer + TUI views
├── web/client/, web/server/  # pict-app (client) + Orator routes / WebSocket bridge (server)
├── css/, html/               # static assets for the web UI
└── web-application/          # built browser bundle (committed; rebuild with `npx quack build`)
```

**Why this is different from the modules:** every package under `modules/` follows the standard `<package-root>/source/` convention (`modules/pict/pict-section-modal/source/...`). retold-manager intentionally does **not** — its package root *is* `retold/source/`, so there's no nested `source/source/`. When working in it, treat `retold/source/` as if it were any other package root.

**External tooling that references this layout:**
- The umbrella `retold/package.json` declares `"bin": { "manager": "./source/retold-manager.js" }` so `npx manager` works from anywhere in the monorepo, and its `audit` / `rebuild-modules` scripts point at `source/bin/*.js`. Its `main` is `source/retold-manager.js`.
- **All of the retold-manager's runtime + dev dependencies live in the umbrella `retold/package.json`**, not in `source/package.json`. Node's module resolution walks up from `source/` and finds them at `retold/node_modules/`, so a single `npm install` at the retold root is enough — there is no separate install step inside `source/`, and `source/node_modules/` should not exist. `source/package.json` is intentionally a dependency-less shim that documents the brand block + per-package scripts (`npm run web`, `npm run build`, `npm run brand`) and the `retold-manager` / `retold-manager-web` bin names. The `//deps` field at the top of `source/package.json` carries this explanation inline.
- `.claude/launch.json` — preview-server config (`cd /Users/.../retold/source && node retold-manager-web.js`)
- `Retold-Modules-Manifest.json` — the `retold-manager` entry has `Path: "source"` (one segment, not `source/retold-manager`)
- `docs/architecture/dependencies/in-ecosystem-dependency-graph.json` — `"path": "./source"`
- `__dirname`-based repo-root walks inside the package: `core/*.js` and `web/server/*.js` reach the retold repo root via `__dirname/../..` (two levels), not `../../..`

## Code Style

- Tabs for indentation, never spaces
- Plain JavaScript only — no TypeScript
- Opening braces on new lines (Allman style)
- Variable naming:
  - `pVariable` — function parameters
  - `tmpVariable` — scoped/temporary variables
  - `VARIABLE` — globals and constants
  - `libSomeLibrary` — imported/required libraries
- Always follow existing patterns in the module you are editing

## Common Commands

- `npm test` — Run tests (Mocha, TDD style)
- `npx quack build` — Build with Quackage
- `npm run coverage` — Code coverage via nyc/Istanbul
- `npm run docker-dev-build` / `docker-dev-run` — Docker dev environment (some modules)

## Key Services Pattern

Modules extend `fable-serviceproviderbase`. Services register with a Fable instance and get access to logging, configuration, and other services through dependency injection. When writing new services, follow this pattern.
