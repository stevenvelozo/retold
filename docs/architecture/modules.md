# All Modules

An exhaustive list of every repository in the Retold suite, organized by group. Each module is its own git repository hosted at `github.com/stevenvelozo/<module-name>`.

## Fable — Core Ecosystem (8 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [fable](/fable/fable/) | `fable` | Service dependency injection, configuration, and logging library — the foundation of every Retold application |
| [fable-serviceproviderbase](/fable/fable-serviceproviderbase/) | `fable-serviceproviderbase` | Base classes for Fable services providing registration, DI, and lifecycle |
| [fable-settings](/fable/fable-settings/) | `fable-settings` | Tolerant configuration chain for loading and merging application settings |
| [fable-log](/fable/fable-log/) | `fable-log` | Flexible logging wrapper with six levels and extensible output streams |
| [fable-uuid](/fable/fable-uuid/) | `fable-uuid` | UUID generator supporting RFC 4122 v4 and configurable random strings |
| [fable-log-logger-bunyan](/fable/fable-log-logger-bunyan/) | `fable-log-logger-bunyan` | Bunyan structured logging provider for Fable-Log |
| [ultravisor-beacon](/fable/ultravisor-beacon/) | `ultravisor-beacon` | Lightweight beacon client and Fable service for remote task execution with pluggable providers |
| [ultravisor-beacon-capability](/fable/ultravisor-beacon-capability/) | `ultravisor-beacon-capability` | Convention-based base class for building beacon capabilities with action method discovery |

## Meadow — Data Access Layer (23 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [stricture](/meadow/stricture/) | `stricture` | MicroDDL schema definition language generating JSON, SQL DDL, and documentation |
| [foxhound](/meadow/foxhound/) | `foxhound` | Fluent query DSL generating dialect-specific queries for MySQL, MSSQL, SQLite, ALASQL, and MongoDB |
| [bibliograph](/meadow/bibliograph/) | `bibliograph` | Key-value record comprehension for change tracking in data ingestion pipelines |
| [bibliograph-storage-meadow](/meadow/bibliograph-storage-meadow/) | `bibliograph-storage-meadow` | Meadow-backed storage provider for Bibliograph record comprehension |
| [meadow](/meadow/meadow/) | `meadow` | Provider-agnostic data broker with CRUD operations, audit tracking, and soft deletes |
| [parime](/meadow/parime/) | `parime` | Generic data lake behaviors and services |
| [meadow-endpoints](/meadow/meadow-endpoints/) | `meadow-endpoints` | Automatic RESTful CRUD endpoint generation from Meadow entities with behavior injection |
| [meadow-connection-mysql](/meadow/meadow-connection-mysql/) | `meadow-connection-mysql` | MySQL/MariaDB pooled connection provider for Meadow |
| [meadow-connection-mssql](/meadow/meadow-connection-mssql/) | `meadow-connection-mssql` | Microsoft SQL Server connection provider for Meadow |
| [meadow-connection-sqlite](/meadow/meadow-connection-sqlite/) | `meadow-connection-sqlite` | SQLite connection provider for Meadow via better-sqlite3 |
| [meadow-connection-sqlite-browser](/meadow/meadow-connection-sqlite-browser/) | `meadow-connection-sqlite-browser` | Browser-compatible SQLite connection provider for Meadow |
| [meadow-connection-postgresql](/meadow/meadow-connection-postgresql/) | `meadow-connection-postgresql` | PostgreSQL connection provider for Meadow via pg |
| [meadow-connection-mongodb](/meadow/meadow-connection-mongodb/) | `meadow-connection-mongodb` | MongoDB document database connection provider for Meadow |
| [meadow-connection-dgraph](/meadow/meadow-connection-dgraph/) | `meadow-connection-dgraph` | DGraph graph database connection provider for Meadow |
| [meadow-connection-solr](/meadow/meadow-connection-solr/) | `meadow-connection-solr` | Apache Solr search platform connection provider for Meadow |
| [meadow-connection-rocksdb](/meadow/meadow-connection-rocksdb/) | `meadow-connection-rocksdb` | RocksDB embedded key-value store connection provider for Meadow |
| [meadow-graph-client](/meadow/meadow-graph-client/) | `meadow-graph-client` | Graph database client for Meadow |
| [retold-data-service](/meadow/retold-data-service/) | `retold-data-service` | All-in-one Fable service assembling schema → entity → endpoints → REST API |
| [retold-harness](/meadow/retold-harness/) | `retold-harness` | Composable REST API harness with 3 schemas, 7 providers, and terminal management tool |
| [retold-harness-consistency-proxy](/meadow/retold-harness-consistency-proxy/) | `retold-harness-consistency-proxy` | HTTP consistency proxy comparing responses across multiple database providers |
| [meadow-integration](/meadow/meadow-integration/) | `meadow-integration` | Data integration tools for CSV import, schema mapping, and centralized formats |
| [meadow-migrationmanager](/meadow/meadow-migrationmanager/) | `meadow-migrationmanager` | CLI, Web, and Console UI tool for managing database schemas and migrations |
| [meadow-provider-offline](/meadow/meadow-provider-offline/) | `meadow-provider-offline` | Offline-capable data provider for Meadow with local caching |

## Orator — API Server (8 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [orator](/orator/orator/) | `orator` | Unopinionated HTTP server abstraction with lifecycle hooks and route management |
| [orator-serviceserver-restify](/orator/orator-serviceserver-restify/) | `orator-serviceserver-restify` | Production HTTP server implementation powered by Restify |
| [orator-static-server](/orator/orator-static-server/) | `orator-static-server` | Static file serving with MIME detection, default files, and subdomain routing |
| [orator-http-proxy](/orator/orator-http-proxy/) | `orator-http-proxy` | HTTP reverse proxy for forwarding requests to backend services |
| [orator-endpoint](/orator/orator-endpoint/) | `orator-endpoint` | Base endpoint class for Orator route definition and request handling |
| [tidings](/orator/tidings/) | `tidings` | Extensible reporting system for generating HTML, PDF, and other format reports |
| [orator-conversion](/orator/orator-conversion/) | `orator-conversion` | File format conversion endpoints for Orator service servers |
| [orator-authentication](/orator/orator-authentication/) | `orator-authentication` | Authentication middleware and session management for Orator servers |

## Pict — MVC Tools (30 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [pict](/pict/pict/) | `pict` | Non-opinionated MVC module with template expression engine for text-based UIs |
| [pict-template](/pict/pict-template/) | `pict-template` | Template handler base class for custom expression types |
| [pict-template-preprocessor](/pict/pict-template-preprocessor/) | `pict-template-preprocessor` | Template compiler and optimizer with cached segment arrays, dependency graphs, and entity batch prefetch |
| [pict-view](/pict/pict-view/) | `pict-view` | View base class with full lifecycle (init, render, solve, marshal), renderables, and CSS |
| [pict-provider](/pict/pict-provider/) | `pict-provider` | Data provider base class for delivering data to views |
| [pict-application](/pict/pict-application/) | `pict-application` | Application base class coordinating views, state, and lifecycle |
| [pict-panel](/pict/pict-panel/) | `pict-panel` | Hot-loadable control panel component for browser applications |
| [pict-nonlinearconfig](/pict/pict-nonlinearconfig/) | `pict-nonlinearconfig` | Pict nonlinear configuration manager |
| [pict-section-flow](/pict/pict-section-flow/) | `pict-section-flow` | Pict section flow diagram |
| [pict-section-code](/pict/pict-section-code/) | `pict-section-code` | Code editor and syntax highlighter wrapping CodeJar with two-way data binding |
| [pict-section-formeditor](/pict/pict-section-formeditor/) | `pict-section-formeditor` | Visual form editor for designing pict-section-form configurations |
| [pict-docuserve](/pict/pict-docuserve/) | `pict-docuserve` | Single-page documentation viewer built on Pict |
| [cryptbrau](/pict/cryptbrau/) | `cryptbrau` | Simple in-browser symmetric encryption |
| [informary](/pict/informary/) | `informary` | Dependency-free browser form marshaling with undo/redo and field-level deltas |
| [pict-service-commandlineutility](/pict/pict-service-commandlineutility/) | `pict-service-commandlineutility` | CLI utility module built on Commander for Pict-based command-line tools |
| [pict-section-recordset](/pict/pict-section-recordset/) | `pict-section-recordset` | CRUD record management views from Meadow endpoint schemas |
| [pict-section-content](/pict/pict-section-content/) | `pict-section-content` | Markdown parsing and content rendering with Mermaid diagrams and KaTeX math |
| [pict-section-markdowneditor](/pict/pict-section-markdowneditor/) | `pict-section-markdowneditor` | Segmented markdown editor built on CodeMirror v6 with drag-and-drop reorder and live rich previews |
| [pict-section-form](/pict/pict-section-form/) | `pict-section-form` | Configuration-driven dynamic forms with 13+ input types and data marshaling |
| [pict-section-objecteditor](/pict/pict-section-objecteditor/) | `pict-section-objecteditor` | Tree-based JSON object editor section for Pict views |
| [pict-section-tuigrid](/pict/pict-section-tuigrid/) | `pict-section-tuigrid` | Toast UI Grid integration for tabular data display and editing |
| [pict-router](/pict/pict-router/) | `pict-router` | Hash-based URL routing via Navigo with template string route functions |
| [pict-serviceproviderbase](/pict/pict-serviceproviderbase/) | `pict-serviceproviderbase` | Base classes for Pict services with pre-initialization support |
| [pict-terminalui](/pict/pict-terminalui/) | `pict-terminalui` | Blessed-based terminal interface for Pict views |
| [pict-sessionmanager](/pict/pict-sessionmanager/) | `pict-sessionmanager` | Session management service handling authenticated REST requests across security contexts |
| [pict-section-histogram](/pict/pict-section-histogram/) | `pict-section-histogram` | Histogram and chart visualization section for Pict views |
| [pict-section-inlinedocumentation](/pict/pict-section-inlinedocumentation/) | `pict-section-inlinedocumentation` | Inline documentation section for contextual help in Pict applications |
| [pict-section-modal](/pict/pict-section-modal/) | `pict-section-modal` | Modal dialog section for Pict views |
| [pict-section-login](/pict/pict-section-login/) | `pict-section-login` | Login and authentication form section for Pict applications |
| [pict-section-openseadragon](/pict/pict-section-openseadragon/) | `pict-section-openseadragon` | Deep-zoom image viewer section wrapping OpenSeadragon |

## Utility — Build & Documentation Tools (5 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [cachetrax](/utility/cachetrax/) | `cachetrax` | Hash-indexed object cache with O(1) lookups, time and size based expiration, and custom pruning |
| [indoctrinate](/utility/indoctrinate/) | `indoctrinate` | Documentation scaffolding with content cataloging, label-based filtering, and multi-format output |
| [manyfest](/utility/manyfest/) | `manyfest` | JSON manifest for consistent data description, validation, and address-based access across layers |
| [precedent](/utility/precedent/) | `precedent` | Meta-templating engine with pattern-based start/end markers and word tree matching |
| [quackage](/utility/quackage/) | `quackage` | Standardized build tool for browser bundles, transpilation, testing, and packaging |

## Apps — Applications (6 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [retold-content-system](/apps/retold-content-system/) | `retold-content-system` | Content management system built on the Retold ecosystem |
| [retold-remote](/apps/retold-remote/) | `retold-remote` | Remote access application built on the Retold ecosystem |
| [ultravisor](/apps/ultravisor/) | `ultravisor` | Process supervision with scheduled tasks, distributed nodes, and LLM integration |
| [ultravisor-suite-harness](/apps/ultravisor-suite-harness/) | `ultravisor-suite-harness` | Integration test harness for the Ultravisor ecosystem |
| [retold-facto](/apps/retold-facto/) | `retold-facto` | Data warehouse with ingestion pipelines and beacon integration |
| [retold-databeacon](/apps/retold-databeacon/) | `retold-databeacon` | Lightweight data beacon for connecting data sources to Ultravisor |

## Summary

| Group | Count | Focus |
|-------|-------|-------|
| Fable | 8 | Core ecosystem, DI, configuration, logging, beacon services |
| Meadow | 23 | Data access, ORM, query DSL, schema, 9 DB connectors, harness, migrations |
| Orator | 8 | API server, HTTP, static files, proxy, auth, reporting, conversion |
| Pict | 30 | MVC, views, templates, forms, grids, editors, routing, docs, TUI, sessions |
| Utility | 5 | Build tools, caching, templating, manifests, docs |
| Apps | 6 | Full-stack applications built on Retold |
| **Total** | **80** | |

## GitHub Repositories

All modules are hosted at `github.com/stevenvelozo/<module-name>`:

- [github.com/stevenvelozo/retold](https://github.com/stevenvelozo/retold) — This meta-repository
- [github.com/stevenvelozo/fable](https://github.com/stevenvelozo/fable) — Core ecosystem
- [github.com/stevenvelozo/meadow](https://github.com/stevenvelozo/meadow) — Data access
- [github.com/stevenvelozo/orator](https://github.com/stevenvelozo/orator) — API server
- [github.com/stevenvelozo/pict](https://github.com/stevenvelozo/pict) — MVC tools

Each module follows the same structure: `package.json`, `source/`, `test/` (Mocha TDD), and optionally `docs/` (pict-docuserve).
