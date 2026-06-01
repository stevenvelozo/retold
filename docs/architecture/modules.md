# All Modules

An exhaustive list of every repository in the Retold suite, organized by group. Most modules are hosted at `github.com/fable-retold/<module-name>` (the canonical org); a small set still lives at `github.com/stevenvelozo/<module-name>` (Ultravisor, Retold-Remote, Retold-Facto, and a few sub-libraries).

## Fable -- Core Ecosystem (8 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [fable](https://fable-retold.github.io/fable/) | `fable` | Service dependency injection, configuration, and logging library -- the foundation of every Retold application |
| [fable-serviceproviderbase](https://fable-retold.github.io/fable-serviceproviderbase/) | `fable-serviceproviderbase` | Base classes for Fable services providing registration, DI, and lifecycle |
| [fable-settings](https://fable-retold.github.io/fable-settings/) | `fable-settings` | Tolerant configuration chain for loading and merging application settings |
| [fable-log](https://fable-retold.github.io/fable-log/) | `fable-log` | Flexible logging wrapper with six levels and extensible output streams |
| [fable-uuid](https://fable-retold.github.io/fable-uuid/) | `fable-uuid` | UUID generator supporting RFC 4122 v4 and configurable random strings |
| [fable-log-logger-bunyan](https://fable-retold.github.io/fable-log-logger-bunyan/) | `fable-log-logger-bunyan` | Bunyan structured logging provider for Fable-Log |
| [ultravisor-beacon](https://github.com/stevenvelozo/ultravisor-beacon) | `ultravisor-beacon` | Lightweight beacon client and Fable service for remote task execution with pluggable providers |
| [ultravisor-beacon-capability](https://stevenvelozo.github.io/ultravisor-beacon-capability/) | `ultravisor-beacon-capability` | Convention-based base class for building beacon capabilities with action method discovery |

## Meadow -- Data Access Layer (23 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [stricture](https://fable-retold.github.io/stricture/) | `stricture` | MicroDDL schema definition language generating JSON, SQL DDL, and documentation |
| [foxhound](https://fable-retold.github.io/foxhound/) | `foxhound` | Fluent query DSL generating dialect-specific queries for MySQL, MSSQL, SQLite, ALASQL, and MongoDB |
| [bibliograph](https://fable-retold.github.io/bibliograph/) | `bibliograph` | Key-value record comprehension for change tracking in data ingestion pipelines |
| [bibliograph-storage-meadow](https://fable-retold.github.io/bibliograph-storage-meadow/) | `bibliograph-storage-meadow` | Meadow-backed storage provider for Bibliograph record comprehension |
| [meadow](https://fable-retold.github.io/meadow/) | `meadow` | Provider-agnostic data broker with CRUD operations, audit tracking, and soft deletes |
| [parime](https://fable-retold.github.io/parime/) | `parime` | Generic data lake behaviors and services |
| [meadow-endpoints](https://fable-retold.github.io/meadow-endpoints/) | `meadow-endpoints` | Automatic RESTful CRUD endpoint generation from Meadow entities with behavior injection |
| [meadow-connection-mysql](https://fable-retold.github.io/meadow-connection-mysql/) | `meadow-connection-mysql` | MySQL/MariaDB pooled connection provider for Meadow |
| [meadow-connection-mssql](https://fable-retold.github.io/meadow-connection-mssql/) | `meadow-connection-mssql` | Microsoft SQL Server connection provider for Meadow |
| [meadow-connection-sqlite](https://fable-retold.github.io/meadow-connection-sqlite/) | `meadow-connection-sqlite` | SQLite connection provider for Meadow via better-sqlite3 |
| [meadow-connection-sqlite-browser](https://github.com/fable-retold/meadow-connection-sqlite-browser) | `meadow-connection-sqlite-browser` | Browser-compatible SQLite connection provider for Meadow |
| [meadow-connection-postgresql](https://fable-retold.github.io/meadow-connection-postgresql/) | `meadow-connection-postgresql` | PostgreSQL connection provider for Meadow via pg |
| [meadow-connection-mongodb](https://fable-retold.github.io/meadow-connection-mongodb/) | `meadow-connection-mongodb` | MongoDB document database connection provider for Meadow |
| [meadow-connection-dgraph](https://fable-retold.github.io/meadow-connection-dgraph/) | `meadow-connection-dgraph` | DGraph graph database connection provider for Meadow |
| [meadow-connection-solr](https://fable-retold.github.io/meadow-connection-solr/) | `meadow-connection-solr` | Apache Solr search platform connection provider for Meadow |
| [meadow-connection-rocksdb](https://fable-retold.github.io/meadow-connection-rocksdb/) | `meadow-connection-rocksdb` | RocksDB embedded key-value store connection provider for Meadow |
| [meadow-graph-client](https://github.com/fable-retold/meadow-graph-client) | `meadow-graph-client` | Graph database client for Meadow |
| [retold-data-service](https://fable-retold.github.io/retold-data-service/) | `retold-data-service` | All-in-one Fable service assembling schema -> entity -> endpoints -> REST API |
| [retold-harness](https://fable-retold.github.io/retold-harness/) | `retold-harness` | Composable REST API harness with 3 schemas, 7 providers, and terminal management tool |
| [retold-harness-consistency-proxy](https://fable-retold.github.io/retold-harness-consistency-proxy/) | `retold-harness-consistency-proxy` | HTTP consistency proxy comparing responses across multiple database providers |
| [meadow-integration](https://fable-retold.github.io/meadow-integration/) | `meadow-integration` | Data integration tools for CSV import, schema mapping, and centralized formats |
| [meadow-migrationmanager](https://github.com/fable-retold/meadow-migrationmanager) | `meadow-migrationmanager` | CLI, Web, and Console UI tool for managing database schemas and migrations |
| [meadow-provider-offline](https://fable-retold.github.io/meadow-provider-offline/) | `meadow-provider-offline` | Offline-capable data provider for Meadow with local caching |

## Orator -- API Server (8 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [orator](https://fable-retold.github.io/orator/) | `orator` | Unopinionated HTTP server abstraction with lifecycle hooks and route management |
| [orator-serviceserver-restify](https://fable-retold.github.io/orator-serviceserver-restify/) | `orator-serviceserver-restify` | Production HTTP server implementation powered by Restify |
| [orator-static-server](https://fable-retold.github.io/orator-static-server/) | `orator-static-server` | Static file serving with MIME detection, default files, and subdomain routing |
| [orator-http-proxy](https://fable-retold.github.io/orator-http-proxy/) | `orator-http-proxy` | HTTP reverse proxy for forwarding requests to backend services |
| [orator-endpoint](https://github.com/fable-retold/orator-endpoint) | `orator-endpoint` | Base endpoint class for Orator route definition and request handling |
| [tidings](https://fable-retold.github.io/tidings/) | `tidings` | Extensible reporting system for generating HTML, PDF, and other format reports |
| [orator-conversion](https://fable-retold.github.io/orator-conversion/) | `orator-conversion` | File format conversion endpoints for Orator service servers |
| [orator-authentication](https://github.com/fable-retold/orator-authentication) | `orator-authentication` | Authentication middleware and session management for Orator servers |

## Pict -- MVC Tools (30 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [pict](https://fable-retold.github.io/pict/) | `pict` | Non-opinionated MVC module with template expression engine for text-based UIs |
| [pict-template](https://fable-retold.github.io/pict-template/) | `pict-template` | Template handler base class for custom expression types |
| [pict-template-preprocessor](https://fable-retold.github.io/pict-template-preprocessor/) | `pict-template-preprocessor` | Template compiler and optimizer with cached segment arrays, dependency graphs, and entity batch prefetch |
| [pict-view](https://fable-retold.github.io/pict-view/) | `pict-view` | View base class with full lifecycle (init, render, solve, marshal), renderables, and CSS |
| [pict-provider](https://fable-retold.github.io/pict-provider/) | `pict-provider` | Data provider base class for delivering data to views |
| [pict-application](https://fable-retold.github.io/pict-application/) | `pict-application` | Application base class coordinating views, state, and lifecycle |
| [pict-panel](https://fable-retold.github.io/pict-panel/) | `pict-panel` | Hot-loadable control panel component for browser applications |
| [pict-nonlinearconfig](https://fable-retold.github.io/pict-nonlinearconfig/) | `pict-nonlinearconfig` | Pict nonlinear configuration manager |
| [pict-section-flow](https://fable-retold.github.io/pict-section-flow/) | `pict-section-flow` | Pict section flow diagram |
| [pict-section-code](https://fable-retold.github.io/pict-section-code/) | `pict-section-code` | Code editor and syntax highlighter wrapping CodeJar with two-way data binding |
| [pict-section-formeditor](https://github.com/fable-retold/pict-section-formeditor) | `pict-section-formeditor` | Visual form editor for designing pict-section-form configurations |
| [pict-docuserve](https://fable-retold.github.io/pict-docuserve/) | `pict-docuserve` | Single-page documentation viewer built on Pict |
| [cryptbrau](https://fable-retold.github.io/cryptbrau/) | `cryptbrau` | Simple in-browser symmetric encryption |
| [informary](https://fable-retold.github.io/informary/) | `informary` | Dependency-free browser form marshaling with undo/redo and field-level deltas |
| [pict-service-commandlineutility](https://fable-retold.github.io/pict-service-commandlineutility/) | `pict-service-commandlineutility` | CLI utility module built on Commander for Pict-based command-line tools |
| [pict-section-recordset](https://fable-retold.github.io/pict-section-recordset/) | `pict-section-recordset` | CRUD record management views from Meadow endpoint schemas |
| [pict-section-content](https://fable-retold.github.io/pict-section-content/) | `pict-section-content` | Markdown parsing and content rendering with Mermaid diagrams and KaTeX math |
| [pict-section-markdowneditor](https://fable-retold.github.io/pict-section-markdowneditor/) | `pict-section-markdowneditor` | Segmented markdown editor built on CodeMirror v6 with drag-and-drop reorder and live rich previews |
| [pict-section-form](https://fable-retold.github.io/pict-section-form/) | `pict-section-form` | Configuration-driven dynamic forms with 13+ input types and data marshaling |
| [pict-section-objecteditor](https://fable-retold.github.io/pict-section-objecteditor/) | `pict-section-objecteditor` | Tree-based JSON object editor section for Pict views |
| [pict-section-tuigrid](https://fable-retold.github.io/pict-section-tuigrid/) | `pict-section-tuigrid` | Toast UI Grid integration for tabular data display and editing |
| [pict-router](https://fable-retold.github.io/pict-router/) | `pict-router` | Hash-based URL routing via Navigo with template string route functions |
| [pict-serviceproviderbase](https://fable-retold.github.io/pict-serviceproviderbase/) | `pict-serviceproviderbase` | Base classes for Pict services with pre-initialization support |
| [pict-terminalui](https://fable-retold.github.io/pict-terminalui/) | `pict-terminalui` | Blessed-based terminal interface for Pict views |
| [pict-sessionmanager](https://github.com/fable-retold/pict-sessionmanager) | `pict-sessionmanager` | Session management service handling authenticated REST requests across security contexts |
| [pict-section-histogram](https://fable-retold.github.io/pict-section-histogram/) | `pict-section-histogram` | Histogram and chart visualization section for Pict views |
| [pict-section-inlinedocumentation](https://fable-retold.github.io/pict-section-inlinedocumentation/) | `pict-section-inlinedocumentation` | Inline documentation section for contextual help in Pict applications |
| [pict-section-modal](https://fable-retold.github.io/pict-section-modal/) | `pict-section-modal` | Modal dialog section for Pict views |
| [pict-section-login](https://github.com/fable-retold/pict-section-login) | `pict-section-login` | Login and authentication form section for Pict applications |
| [pict-section-openseadragon](https://fable-retold.github.io/pict-section-openseadragon/) | `pict-section-openseadragon` | Deep-zoom image viewer section wrapping OpenSeadragon |

## Utility -- Build & Documentation Tools (5 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [cachetrax](https://fable-retold.github.io/cachetrax/) | `cachetrax` | Hash-indexed object cache with O(1) lookups, time and size based expiration, and custom pruning |
| [indoctrinate](https://fable-retold.github.io/indoctrinate/) | `indoctrinate` | Documentation scaffolding with content cataloging, label-based filtering, and multi-format output |
| [manyfest](https://fable-retold.github.io/manyfest/) | `manyfest` | JSON manifest for consistent data description, validation, and address-based access across layers |
| [precedent](https://fable-retold.github.io/precedent/) | `precedent` | Meta-templating engine with pattern-based start/end markers and word tree matching |
| [quackage](https://fable-retold.github.io/quackage/) | `quackage` | Standardized build tool for browser bundles, transpilation, testing, and packaging |

## Apps -- Applications (6 modules)

| Module | npm | Description |
|--------|-----|-------------|
| [retold-content-system](https://github.com/fable-retold/retold-content-system) | `retold-content-system` | Content management system built on the Retold ecosystem |
| [retold-remote](https://github.com/stevenvelozo/retold-remote) | `retold-remote` | Remote access application built on the Retold ecosystem |
| [ultravisor](https://stevenvelozo.github.io/ultravisor/) | `ultravisor` | Process supervision with scheduled tasks, distributed nodes, and LLM integration |
| [ultravisor-suite-harness](https://github.com/stevenvelozo/ultravisor-suite-harness) | `ultravisor-suite-harness` | Integration test harness for the Ultravisor ecosystem |
| [retold-facto](https://stevenvelozo.github.io/retold-facto/) | `retold-facto` | Data warehouse with ingestion pipelines and beacon integration |
| [retold-databeacon](https://fable-retold.github.io/retold-databeacon/) | `retold-databeacon` | Lightweight data beacon for connecting data sources to Ultravisor |

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

Most modules are hosted at `github.com/fable-retold/<module-name>`:

- [github.com/fable-retold/retold](https://github.com/fable-retold/retold) -- This meta-repository
- [github.com/fable-retold/fable](https://github.com/fable-retold/fable) -- Core ecosystem
- [github.com/fable-retold/meadow](https://github.com/fable-retold/meadow) -- Data access
- [github.com/fable-retold/orator](https://github.com/fable-retold/orator) -- API server
- [github.com/fable-retold/pict](https://github.com/fable-retold/pict) -- MVC tools

Each module follows the same structure: `package.json`, `source/`, `test/` (Mocha TDD), and optionally `docs/` (pict-docuserve).
