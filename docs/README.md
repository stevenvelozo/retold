# Retold

A suite of JavaScript/Node.js modules for building web applications and APIs.

## Module Groups

### [Fable](/fable/) - Core Framework
Dependency injection, configuration, logging, UUID generation, expression parsing, REST client, and template engine.

### [Meadow](/meadow/) - Data Access Layer
ORM, query DSL (FoxHound), schema definitions (Stricture), database connectors (MySQL, MSSQL, SQLite), and RESTful endpoint generation.

### [Orator](/orator/) - API Server
Restify wrapper, static file serving, HTTP proxy, and WebSocket support (Tidings).

### [Pict](/pict/) - MVC Framework
Views, templates, providers, application framework, form builders, TUI grid, and CLI utilities.

### [Utility](/utility/) - Build Tools
Build tools (Quackage), manifest management (Manyfest), documentation (Indoctrinate), and process supervision (Ultravisor).

## Getting Started

Each module is independently installable via npm:

```bash
npm install fable
npm install meadow
npm install orator
npm install pict
```

All modules follow the Fable service provider pattern for dependency injection and are designed to work together seamlessly.

## Architecture

Retold modules extend `fable-serviceproviderbase`. Services register with a Fable instance and get access to logging, configuration, and other services through dependency injection.

```javascript
const libFable = require('fable');

let tmpFable = new libFable({
    Product: 'MyApplication',
    LogLevel: 3
});

// Services are available through the fable instance
tmpFable.log.info('Application started');
```

## License

MIT
