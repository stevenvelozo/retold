# All Modules

An exhaustive list of every repository in the Retold suite, organized by group. Each module is its own git repository hosted at `github.com/stevenvelozo/<module-name>`.

## Fable — Core Ecosystem (6 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [fable](/fable/fable/) | `fable` | Service dependency injection, configuration, and logging library — the foundation of every Retold application |
| [fable-serviceproviderbase](/fable/fable-serviceproviderbase/) | `fable-serviceproviderbase` | Base classes for Fable services providing registration, DI, and lifecycle |
| [fable-settings](/fable/fable-settings/) | `fable-settings` | Tolerant configuration chain for loading and merging application settings |
| [fable-log](/fable/fable-log/) | `fable-log` | Flexible logging wrapper with six levels and extensible output streams |
| [fable-uuid](/fable/fable-uuid/) | `fable-uuid` | UUID generator supporting RFC 4122 v4 and configurable random strings |
| [fable-log-logger-bunyan](/fable/fable-log-logger-bunyan/) | `fable-log-logger-bunyan` | Bunyan structured logging provider for Fable-Log |

## Meadow — Data Access Layer (12 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [stricture](/meadow/stricture/) | `stricture` | MicroDDL schema definition language generating JSON, SQL DDL, and documentation |
| [foxhound](/meadow/foxhound/) | `foxhound` | Fluent query DSL generating dialect-specific SQL for MySQL, MSSQL, SQLite, and ALASQL |
| [bibliograph](/meadow/bibliograph/) | `bibliograph` | Key-value record comprehension for change tracking in data ingestion pipelines |
| [meadow](/meadow/meadow/) | `meadow` | Provider-agnostic data broker with CRUD operations, audit tracking, and soft deletes |
| [parime](/meadow/parime/) | `parime` | Generic data lake behaviors and services |
| [meadow-endpoints](/meadow/meadow-endpoints/) | `meadow-endpoints` | Automatic RESTful CRUD endpoint generation from Meadow entities with behavior injection |
| [meadow-connection-mysql](/meadow/meadow-connection-mysql/) | `meadow-connection-mysql` | MySQL/MariaDB pooled connection provider for Meadow |
| [meadow-connection-mssql](/meadow/meadow-connection-mssql/) | `meadow-connection-mssql` | Microsoft SQL Server connection provider for Meadow |
| [meadow-connection-sqlite](/meadow/meadow-connection-sqlite/) | `meadow-connection-sqlite` | SQLite connection provider for Meadow via better-sqlite3 |
| [retold-data-service](/meadow/retold-data-service/) | `retold-data-service` | All-in-one Fable service assembling schema → entity → endpoints → REST API |
| [retold-harness](/meadow/retold-harness/) | `retold-harness` | Pre-built API harness with a bookstore demo (8 entities, 10,000+ records) |
| [meadow-integration](/meadow/meadow-integration/) | `meadow-integration` | Data integration tools for CSV import, schema mapping, and centralized formats |

## Orator — API Server (6 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [orator](/orator/orator/) | `orator` | Unopinionated HTTP server abstraction with lifecycle hooks and route management |
| [orator-serviceserver-restify](/orator/orator-serviceserver-restify/) | `orator-serviceserver-restify` | Production HTTP server implementation powered by Restify |
| [orator-static-server](/orator/orator-static-server/) | `orator-static-server` | Static file serving with MIME detection, default files, and subdomain routing |
| [orator-http-proxy](/orator/orator-http-proxy/) | `orator-http-proxy` | HTTP reverse proxy for forwarding requests to backend services |
| [tidings](/orator/tidings/) | `tidings` | Extensible reporting system for generating HTML, PDF, and other format reports |
| [orator-conversion](/orator/orator-conversion/) | `orator-conversion` | File format conversion endpoints for Orator service servers |

## Pict — MVC Tools (20 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [pict](/pict/pict/) | `pict` | Non-opinionated MVC module with template expression engine for text-based UIs |
| [pict-template](/pict/pict-template/) | `pict-template` | Template handler base class for custom expression types |
| [pict-view](/pict/pict-view/) | `pict-view` | View base class with full lifecycle (init, render, solve, marshal), renderables, and CSS |
| [pict-provider](/pict/pict-provider/) | `pict-provider` | Data provider base class for delivering data to views |
| [pict-application](/pict/pict-application/) | `pict-application` | Application base class coordinating views, state, and lifecycle |
| [pict-panel](/pict/pict-panel/) | `pict-panel` | Hot-loadable control panel component for browser applications |
| [pict-nonlinearconfig](/pict/pict-nonlinearconfig/) | `pict-nonlinearconfig` | Pict nonlinear configuration manager |
| [pict-section-flow](/pict/pict-section-flow/) | `pict-section-flow` | Pict section flow diagram |
| [pict-docuserve](/pict/pict-docuserve/) | `pict-docuserve` | Single-page documentation viewer built on Pict |
| [cryptbrau](/pict/cryptbrau/) | `cryptbrau` | Simple in-browser symmetric encryption |
| [informary](/pict/informary/) | `informary` | Dependency-free browser form marshaling with undo/redo and field-level deltas |
| [pict-service-commandlineutility](/pict/pict-service-commandlineutility/) | `pict-service-commandlineutility` | CLI utility module built on Commander for Pict-based command-line tools |
| [pict-section-recordset](/pict/pict-section-recordset/) | `pict-section-recordset` | CRUD record management views from Meadow endpoint schemas |
| [pict-section-content](/pict/pict-section-content/) | `pict-section-content` | Markdown parsing and content rendering with Mermaid diagrams and KaTeX math |
| [pict-section-form](/pict/pict-section-form/) | `pict-section-form` | Configuration-driven dynamic forms with 13+ input types and data marshaling |
| [pict-section-objecteditor](/pict/pict-section-objecteditor/) | `pict-section-objecteditor` | Tree-based JSON object editor section for Pict views |
| [pict-section-tuigrid](/pict/pict-section-tuigrid/) | `pict-section-tuigrid` | Toast UI Grid integration for tabular data display and editing |
| [pict-router](/pict/pict-router/) | `pict-router` | Hash-based URL routing via Navigo with template string route functions |
| [pict-serviceproviderbase](/pict/pict-serviceproviderbase/) | `pict-serviceproviderbase` | Base classes for Pict services with pre-initialization support |
| [pict-terminalui](/pict/pict-terminalui/) | `pict-terminalui` | Blessed-based terminal interface for Pict views |

## Utility — Build & Documentation Tools (6 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [cachetrax](/utility/cachetrax/) | `cachetrax` | Hash-indexed object cache with O(1) lookups, time and size based expiration, and custom pruning |
| [indoctrinate](/utility/indoctrinate/) | `indoctrinate` | Documentation scaffolding with content cataloging, label-based filtering, and multi-format output |
| [manyfest](/utility/manyfest/) | `manyfest` | JSON manifest for consistent data description, validation, and address-based access across layers |
| [precedent](/utility/precedent/) | `precedent` | Meta-templating engine with pattern-based start/end markers and word tree matching |
| [quackage](/utility/quackage/) | `quackage` | Standardized build tool for browser bundles, transpilation, testing, and packaging |
| [ultravisor](/utility/ultravisor/) | `ultravisor` | Process supervision with scheduled tasks, distributed nodes, and LLM integration |

## Summary

| Group | Count | Focus |
|-------|-------|-------|
| Fable | 6 | Core ecosystem, DI, configuration, logging |
| Meadow | 12 | Data access, ORM, query DSL, schema, connectors |
| Orator | 6 | API server, HTTP, static files, proxy, reporting, conversion |
| Pict | 20 | MVC, views, templates, forms, grids, routing, docs, TUI |
| Utility | 6 | Build tools, caching, templating, manifests, docs, process supervision |
| **Total** | **50** | |

## GitHub Repositories

All modules are hosted at `github.com/stevenvelozo/<module-name>`:

- [github.com/stevenvelozo/retold](https://github.com/stevenvelozo/retold) — This meta-repository
- [github.com/stevenvelozo/fable](https://github.com/stevenvelozo/fable) — Core ecosystem
- [github.com/stevenvelozo/meadow](https://github.com/stevenvelozo/meadow) — Data access
- [github.com/stevenvelozo/orator](https://github.com/stevenvelozo/orator) — API server
- [github.com/stevenvelozo/pict](https://github.com/stevenvelozo/pict) — MVC tools

Each module follows the same structure: `package.json`, `source/`, `test/` (Mocha TDD), and optionally `docs/` (Docsify).
