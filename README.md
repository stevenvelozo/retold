# Retold

> A story-obsessed application suite.

Retold is a collection of ~50 JavaScript/Node.js modules for building web applications and APIs. The modules span five groups — from core dependency injection up through data access, API serving, and full MVC — all designed to compose together through a shared service provider pattern. Plain JavaScript, no TypeScript. MIT licensed.

## Module Groups

| Group | Purpose |
|-------|---------|
| **Fable** | Core ecosystem: dependency injection, configuration, logging, UUID generation, expression parsing, REST client, template engine |
| **Meadow** | Data access layer: provider-agnostic ORM, query generation (FoxHound), schema definitions (Stricture), database connectors (MySQL, MSSQL, SQLite), auto-generated REST endpoints |
| **Orator** | API server: HTTP server abstraction over Restify, static file serving, reverse proxy, WebSocket reporting |
| **Pict** | MVC tools: views, templates, providers, application lifecycle — for browser, terminal, or any text-based UI |
| **Utility** | Build tools (Quackage), manifest management (Manyfest), documentation generation (Indoctrinate), process supervision (Ultravisor) |

## The Service Provider Pattern

Every Retold module extends `fable-serviceproviderbase` and registers with a Fable instance. That instance provides dependency injection, logging, UUID generation, and shared configuration. Any registered service can reach any other through `this.fable`, so modules are loosely coupled — you can swap database providers, change server implementations, or add custom services without modifying existing code.

```javascript
const libFable = require('fable');
const libMeadow = require('meadow');
const libOrator = require('orator');

let _Fable = new libFable({ Product: 'MyApp', LogLevel: 3 });

// Services register with the Fable instance
let _Meadow = _Fable.instantiateServiceProvider('Meadow');
let _Orator = _Fable.instantiateServiceProvider('Orator');

// Every service can reach every other service
// _Meadow.fable.Orator, _Orator.fable.Meadow, etc.
```

## Quick Start

```bash
# Core foundation
npm install fable

# Data access
npm install meadow foxhound stricture

# API server
npm install orator orator-serviceserver-restify meadow-endpoints

# Browser MVC
npm install pict
```

```javascript
const libFable = require('fable');

let _Fable = new libFable({
	Product: 'MyApp',
	ProductVersion: '1.0.0',
	LogLevel: 3
});

_Fable.log.info('Retold application started.');
```

## Testing

Each module has its own test suite: `npm test` from any module directory. Most modules only need Node.js, but the Meadow data access modules require MySQL and MSSQL for their full test suites.

Docker scripts in `modules/meadow/meadow/scripts/` manage disposable test containers on non-standard ports (MySQL 33306, MSSQL 31433) so they won't conflict with local databases.

```bash
cd modules/meadow/meadow

# Start databases, seed data, and run tests
npm run test-mysql           # MySQL tests only
npm run test-mssql           # MSSQL tests only
npm run test-all-providers   # Both

# Tear down when done
npm run docker-cleanup
```

See [docs/testing.md](docs/testing.md) for full details on ports, connection settings, and managing containers.

## Repository Structure

Each module is its own git repo, cloned into a category folder under `modules/`. The root repo tracks module organization — individual module code lives in their respective repos.

```
retold/
├── source/Retold.cjs
├── test/
├── docs/                 # Documentation site (pict-docuserve)
└── modules/
    ├── fable/            # Core ecosystem (~6 modules)
    ├── meadow/           # Data access (~13 modules)
    ├── orator/           # API server (~7 modules)
    ├── pict/             # MVC tools (~15 modules)
    └── utility/          # Build & docs (~10 modules)
```

## Documentation

Full documentation lives in the [`docs/`](docs/) folder and is served by pict-docuserve.

- [Architecture](docs/architecture/architecture.md) — Layer model, service provider pattern, component breakdown
- [Getting Started](docs/getting-started.md) — Building your first Retold application step by step
- [Examples](docs/examples/examples.md) — Complete runnable applications including a full-stack Todo List
- [All Modules](docs/architecture/modules.md) — Every repository in the suite with descriptions and links

## License

MIT
