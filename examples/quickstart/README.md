# Retold Quickstart Examples

Working examples for each part of the Retold stack, corresponding to the
[Getting Started](../../docs/getting-started.md) documentation.

Retold applications are assembled from a layered architecture (see
[Architecture](../../docs/architecture.md)):

```
Layer 5 — Your Application (business logic, custom endpoints)
Layer 4 — Orator (HTTP server, middleware, static files)
Layer 3 — Meadow-Endpoints (auto-generated CRUD routes)
Layer 2 — Meadow + FoxHound + Stricture (data broker, SQL, schemas)
Layer 1 — Fable (DI, configuration, logging, UUID, expressions)

Pict   — Browser MVC (views, templates, providers, application lifecycle)
Utility — Build tools, manifest management, documentation, process supervision
```

## Examples

| Folder | Retold Layer | Module | Description |
|--------|-------------|--------|-------------|
| [layer1](layer1/) | Layer 1 — Fable | **Fable** | Core DI, configuration, logging, service provider pattern |
| [layer2](layer2/) | Layer 2 — Meadow | **Meadow** | Data access with MySQL (CRUD, schemas, FoxHound queries) |
| [layer3](layer3/) | Layer 4 — Orator | **Orator** | REST API server with Restify |
| [layer4](layer4/) | Pict | **Pict** | Browser MVC with views, templates, and routing |
| [layer5](layer5/) | Utility | **Manyfest** | Object navigation and schema validation |

## Running

Each example is self-contained. Enter any directory and run:

```bash
npm install
npm start        # or npm run demo for examples that need setup
```

The Meadow example (layer2) requires a running MySQL server on localhost:3306.
Run `npm run setup` first to create the database and tables.

The Pict example (layer4) requires a build step before serving:

```bash
npm install
npm run demo     # builds then serves on http://localhost:8086
```
