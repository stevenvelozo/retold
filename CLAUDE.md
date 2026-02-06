# Retold

A suite of ~50 JavaScript/Node.js modules for building web applications and APIs. MIT licensed.

## Architecture

Five module groups, each in `modules/<group>/`:

- **Fable** — Core framework: dependency injection (service provider pattern), configuration, logging, UUID generation, expression parser, REST client, template engine
- **Meadow** — Data access layer: ORM, query DSL (FoxHound), schema definitions (Stricture), DB connectors (MySQL, MSSQL, SQLite), RESTful endpoint generation
- **Orator** — API server: Restify wrapper, static file serving, HTTP proxy, WebSocket support (Tidings)
- **Pict** — MVC framework: views, templates, providers, application framework, form builders, TUI grid, CLI utilities
- **Utility** — Build tools (Quackage), manifest management (Manyfest), documentation (Indoctrinate), process supervision (Ultravisor)

## Repository Structure

Each module is its own git repo cloned into a category folder under `modules/`. The root repo tracks module organization only — individual module code lives in their own repos.

```
retold/
├── source/Retold.js        # Minimal common service class
├── test/                    # Root-level tests
├── modules/
│   ├── fable/              # 6 modules
│   ├── meadow/             # 13 modules
│   ├── orator/             # 6 modules
│   ├── pict/               # 15 modules
│   └── utility/            # 10+ modules
```

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
