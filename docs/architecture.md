# Architecture

Retold modules are designed to compose into layered application stacks. Each layer builds on the one below it through the Fable service provider pattern.

## The Layer Model

A fully-realized Retold application assembles five layers, from infrastructure at the bottom to your application logic at the top.

```mermaid
graph TB
  L5["<b>Layer 5</b> — Your Application / Mid-Tier Service<br/><i>Authentication, business logic, custom endpoints</i>"]
  L4["<b>Layer 4</b> — Orator (API Server)<br/><i>HTTP lifecycle, middleware, static files, proxy</i>"]
  L3["<b>Layer 3</b> — Meadow-Endpoints<br/><i>Auto-generated CRUD routes, behavior hooks</i>"]
  L2["<b>Layer 2</b> — Meadow + FoxHound + Stricture<br/><i>Data broker, SQL generation, schema definitions</i>"]
  L1["<b>Layer 1</b> — Fable (Core Ecosystem)<br/><i>DI, configuration, logging, UUID, expressions</i>"]
  Infra["<b>Infrastructure</b><br/><i>Config files, log streams, databases, filesystem</i>"]

  L5 --> L4
  L4 --> L3
  L3 --> L2
  L2 --> L1
  L1 --> Infra

  style L5 fill:#e8f5e9,stroke:#43a047,color:#333
  style L4 fill:#e3f2fd,stroke:#42a5f5,color:#333
  style L3 fill:#e3f2fd,stroke:#64b5f6,color:#333
  style L2 fill:#fff3e0,stroke:#ffa726,color:#333
  style L1 fill:#fce4ec,stroke:#ef5350,color:#333
  style Infra fill:#f5f5f5,stroke:#bdbdbd,color:#333
```

Not every application uses every layer. A browser app might use Fable + Pict. A CLI tool might use Fable + Meadow. A full API service uses the complete stack.

## The Service Provider Pattern

Every Retold module extends `fable-serviceproviderbase`. This base class provides:

- **Registration** — Services register with a Fable instance by type and hash
- **Dependency access** — Any service can reach any other through `this.fable`
- **Logging** — Built-in `this.log` from Fable-Log
- **Configuration** — Shared settings through `this.fable.settings`
- **Identity** — UUID generation through `this.fable.getUUID()`

```javascript
const libFable = require('fable');
const libMeadow = require('meadow');
const libOrator = require('orator');

let _Fable = new libFable({ Product: 'MyApp', LogLevel: 3 });

// Services register themselves with the Fable instance
let _Meadow = _Fable.instantiateServiceProvider('Meadow');
let _Orator = _Fable.instantiateServiceProvider('Orator');

// Now every service can reach every other service
// _Meadow.fable.Orator, _Orator.fable.Meadow, etc.
```

This pattern means modules are loosely coupled. You can swap database providers, change API server implementations, or add custom services without modifying existing code.

## Layer 1: Fable — The Foundation

Fable is the only module that every other module depends on. It provides the core services that all other modules consume.

```mermaid
graph TB
  subgraph Fable["Fable (Core Ecosystem)"]
    direction TB
    settings["Fable-Settings<br/><code>.settings</code>"]
    flog["Fable-Log<br/><code>.log</code>"]
    uuid["Fable-UUID<br/><code>.getUUID()</code>"]
    spb["Service<br/>Provider Base"]
  end

  settings --> configfiles["Config Files<br/>(.json, env)"]
  flog --> logstreams["Log Streams<br/>(console, file, bunyan)"]

  style Fable fill:#fce4ec,stroke:#ef5350,color:#333
  style settings fill:#fff,stroke:#ef9a9a,color:#333
  style flog fill:#fff,stroke:#ef9a9a,color:#333
  style uuid fill:#fff,stroke:#ef9a9a,color:#333
  style spb fill:#fff,stroke:#ef9a9a,color:#333
  style configfiles fill:#f5f5f5,stroke:#bdbdbd,color:#666
  style logstreams fill:#f5f5f5,stroke:#bdbdbd,color:#666
```

**Fable-Settings** loads and merges configuration from files, defaults, and runtime overrides into a single settings object.

**Fable-Log** provides six log levels (trace, debug, info, warn, error, fatal) with extensible output streams. Logs go to console by default; add bunyan or custom loggers as needed.

**Fable-UUID** generates RFC 4122 v4 UUIDs or configurable random strings for identity and uniqueness.

**Fable-ServiceProviderBase** is the base class all Retold services extend. It provides the registration and dependency injection mechanics.

Fable also bundles an expression parser, a REST client (Fable-RestClient), a template engine, date utilities, and data format helpers — all accessible as services.

## Layer 2: Meadow — Data Access

Meadow sits on top of Fable and provides a provider-agnostic data broker. You define entities once and access them through any supported database.

```mermaid
graph TB
  subgraph Meadow["Meadow (Data Broker / ORM)"]
    direction TB
    foxhound["FoxHound<br/>(Query DSL)<br/><code>.addFilter() .setSort() .buildRead()</code>"]
    stricture["Stricture<br/>(Schema DDL)<br/>JSON schema, CREATE TABLE, docs"]
    conn["Connections<br/>meadow-connection-mysql<br/>meadow-connection-mssql<br/>meadow-connection-sqlite"]
  end

  foxhound --> sql["SQL Queries<br/>(MySQL, MSSQL, SQLite, ALASQL)"]
  stricture --> ddl["DDL Scripts<br/>(CREATE TABLE, indexes)"]
  conn --> db[("Database<br/>(pooled connections)")]

  style Meadow fill:#fff3e0,stroke:#ffa726,color:#333
  style foxhound fill:#fff,stroke:#ffcc80,color:#333
  style stricture fill:#fff,stroke:#ffcc80,color:#333
  style conn fill:#fff,stroke:#ffcc80,color:#333
  style sql fill:#f5f5f5,stroke:#bdbdbd,color:#666
  style ddl fill:#f5f5f5,stroke:#bdbdbd,color:#666
  style db fill:#ffebee,stroke:#ef5350,color:#333
```

**Meadow** handles CRUD operations (Create, Read, Reads, Update, Delete, Count, Undelete), automatic audit columns (CreatingIDUser, UpdatingIDUser, timestamps), soft deletes, GUID uniqueness, and data marshalling.

**FoxHound** generates dialect-specific SQL from a single chainable API. One query definition produces correct SQL for MySQL, MSSQL, SQLite, or ALASQL (for in-browser use).

**Stricture** is an opinionated MicroDDL — define your data model in a simple text format and generate JSON schemas, MySQL CREATE statements, Meadow schema files, and documentation from a single source.

**Connection modules** (meadow-connection-mysql, meadow-connection-mssql, meadow-connection-sqlite) provide pooled database connections as Fable services.

## Layer 3: Meadow-Endpoints — Auto-Generated API

Meadow-Endpoints takes a Meadow entity definition and automatically generates a full suite of RESTful routes.

```mermaid
graph LR
  entity["Meadow Entity<br/><b>Book</b>"] --> endpoints["<b>Meadow-Endpoints</b>"]

  endpoints --> r1["GET /Books → Reads"]
  endpoints --> r2["GET /Books/Count → Count"]
  endpoints --> r3["GET /Book/:id → Read"]
  endpoints --> r4["GET /Book/Schema → Schema"]
  endpoints --> r5["POST /Book → Create"]
  endpoints --> r6["PUT /Book → Update"]
  endpoints --> r7["DEL /Book/:id → Delete"]
  endpoints --> r8["DEL /Book/:id/Undelete"]

  entity --> hooks["+ Behavior injection hooks<br/>+ Dynamic filtering & pagination<br/>+ Bulk operations"]

  style entity fill:#fff3e0,stroke:#ffa726,color:#333
  style endpoints fill:#e3f2fd,stroke:#42a5f5,color:#333
  style hooks fill:#f3e5f5,stroke:#ab47bc,color:#333
  style r1 fill:#fff,stroke:#90caf9,color:#333
  style r2 fill:#fff,stroke:#90caf9,color:#333
  style r3 fill:#fff,stroke:#90caf9,color:#333
  style r4 fill:#fff,stroke:#90caf9,color:#333
  style r5 fill:#fff,stroke:#90caf9,color:#333
  style r6 fill:#fff,stroke:#90caf9,color:#333
  style r7 fill:#fff,stroke:#90caf9,color:#333
  style r8 fill:#fff,stroke:#90caf9,color:#333
```

Behavior hooks let you inject authentication, authorization, validation, and transformation logic at any point in the request lifecycle — before or after each CRUD operation.

## Layer 4: Orator — API Server

Orator provides the HTTP server that hosts the endpoints from Layer 3 (and any custom routes).

```mermaid
graph TB
  subgraph Orator["Orator (HTTP Server Abstraction)"]
    direction TB
    restify["orator-serviceserver-restify<br/>(Production HTTP)"]
    static["orator-static-server<br/>(File Serving)"]
    restify --> core["Orator Core<br/>Lifecycle hooks, middleware,<br/>content negotiation, IPC mode"]
    static --> core
    proxy["orator-http-proxy<br/>(Reverse Proxy)"]
    tidings["Tidings<br/>(Reporting)"]
  end

  style Orator fill:#e3f2fd,stroke:#42a5f5,color:#333
  style restify fill:#fff,stroke:#90caf9,color:#333
  style static fill:#fff,stroke:#90caf9,color:#333
  style core fill:#bbdefb,stroke:#42a5f5,color:#333
  style proxy fill:#fff,stroke:#90caf9,color:#333
  style tidings fill:#fff,stroke:#90caf9,color:#333
```

Orator is deliberately thin. It provides a consistent interface regardless of the underlying server, so you can swap Restify for another implementation or use IPC mode for testing — without changing your application code.

## Pict — MVC Tools

Pict sits alongside the server stack, providing Model-View-Controller tools for any text-based UI: browser DOM, terminal, or rendered strings.

```mermaid
graph TB
  subgraph Pict["Pict (Non-Opinionated MVC)"]
    direction TB
    subgraph Core["Core"]
      views["Views<br/><i>pict-view</i>"]
      templates["Templates<br/><i>pict-template</i>"]
      providers["Providers<br/><i>pict-provider</i>"]
      appfw["Application<br/><i>pict-application</i>"]
    end
    subgraph Sections["Sections & Components"]
      forms["Forms<br/><i>pict-section-form</i>"]
      recordset["Recordset<br/><i>pict-section-recordset</i>"]
      tuigrid["TUI Grid<br/><i>pict-section-tuigrid</i>"]
      content["Content<br/><i>pict-section-content</i>"]
    end
    Core --> Sections
  end

  style Pict fill:#f3e5f5,stroke:#ab47bc,color:#333
  style Core fill:#f3e5f5,stroke:#ce93d8,color:#333
  style Sections fill:#f3e5f5,stroke:#ce93d8,color:#333
  style views fill:#fff,stroke:#ce93d8,color:#333
  style templates fill:#fff,stroke:#ce93d8,color:#333
  style providers fill:#fff,stroke:#ce93d8,color:#333
  style appfw fill:#fff,stroke:#ce93d8,color:#333
  style forms fill:#fff,stroke:#ce93d8,color:#333
  style recordset fill:#fff,stroke:#ce93d8,color:#333
  style tuigrid fill:#fff,stroke:#ce93d8,color:#333
  style content fill:#fff,stroke:#ce93d8,color:#333
```

Pict's core philosophy: UI is text. Views render templates into strings. Providers fetch data. The Application class coordinates lifecycle. Sections provide pre-built patterns for common UI needs (forms, record lists, grids).

Pict connects to Fable for services and can use Meadow-Endpoints as its data source, but it has no hard dependency on the server stack.

## Putting It All Together

A full Retold application combines these layers. Here is the typical assembly order from the whiteboard architecture diagram:

```mermaid
graph LR
  S1["<b>Step 1</b><br/>Fable<br/><i>Config, logging, DI</i>"]
  S2["<b>Step 2</b><br/>Meadow<br/><i>Entities, DB connection</i>"]
  S3["<b>Step 3</b><br/>Meadow-Endpoints<br/><i>Auto-generate REST</i>"]
  S4["<b>Step 4</b><br/>Orator<br/><i>HTTP server</i>"]
  S5["<b>Step 5</b><br/>Your Application<br/><i>Mid-tier service</i>"]

  S1 --> S2 --> S3 --> S4 --> S5

  style S1 fill:#fce4ec,stroke:#ef5350,color:#333
  style S2 fill:#fff3e0,stroke:#ffa726,color:#333
  style S3 fill:#fff3e0,stroke:#ffcc80,color:#333
  style S4 fill:#e3f2fd,stroke:#42a5f5,color:#333
  style S5 fill:#e8f5e9,stroke:#43a047,color:#333
```

```javascript
const libFable = require('fable');
const libOrator = require('orator');
const libMeadowEndpoints = require('meadow-endpoints');

let _Fable = new libFable({
    Product: 'BookService',
    LogLevel: 3,
    "MySQL": { "Server": "localhost", "User": "root", "Database": "bookstore" }
});

// Layer 2: Data access
let _MeadowEntity = _Fable.instantiateServiceProvider('Meadow',
    { Scope: 'Book', DefaultSchema: BookSchema });

// Layer 3: Auto-generate REST endpoints
let _Endpoints = _Fable.instantiateServiceProvider('MeadowEndpoints',
    { Entity: _MeadowEntity });

// Layer 4: HTTP server
let _Orator = _Fable.instantiateServiceProvider('Orator');

// Wire endpoints to the server
_Endpoints.connectRoutes(_Orator);

// Start listening
_Orator.startService((pError) =>
{
    _Fable.log.info('BookService is running on port 8086');
});
```

## Utility Modules

Supporting the application stack are utility modules:

| Module | Purpose |
|--------|---------|
| **[Manyfest](/utility/manyfest/)** | JSON manifest for consistent data description across layers |
| **[Quackage](/utility/quackage/)** | Standardized build tool for browser bundles, testing, and packaging |
| **[Indoctrinate](/utility/indoctrinate/)** | Documentation scaffolding, catalog generation, and cross-module search |
| **[Ultravisor](/utility/ultravisor/)** | Process supervision with scheduled tasks and LLM integration |
| **[Choreographic](/utility/choreographic/)** | Scaffolding for single-run data processing scripts |

## Design Principles

### Convention Over Configuration

Modules generate rich metadata automatically. A Meadow entity with a well-named schema and standard columns needs zero additional configuration to get a full REST API.

### Provider Agnostic

Data access, server implementations, and log destinations are all pluggable. Swap MySQL for SQLite, Restify for IPC, or console logging for Bunyan — without changing application code.

### Composable, Not Monolithic

Each module does one thing. Combine the modules you need; skip the rest. A CLI tool does not need Orator. A browser widget does not need Meadow.

### Everything is a Service

The service provider pattern means modules discover and use each other through dependency injection. No global state, no singletons, no import ordering problems.
