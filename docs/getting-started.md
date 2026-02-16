# Getting Started

This guide walks through building a Retold application step by step, adding one layer at a time. See the [Architecture](architecture/architecture.md) page for a full description of the layer model.

> **Working examples:** Each step below has a corresponding runnable example in
> [`examples/quickstart/`](../examples/quickstart/). Clone the repo and follow
> along with real code.

## Step 1: Fable — The Foundation

> **Layer 1 — Fable (Core Ecosystem):** DI, configuration, logging, UUID, expressions
>
> Working example: [`examples/quickstart/layer1/`](../examples/quickstart/layer1/)

Every Retold application starts with a Fable instance. Fable gives you dependency injection, configuration, and logging.

```bash
npm install fable
```

```javascript
const libFable = require('fable');

let _Fable = new libFable({
    Product: 'BookStore',
    ProductVersion: '1.0.0',
    LogLevel: 2   // info and above
});

_Fable.log.info('BookStore starting up...');
_Fable.log.trace(`Instance UUID: ${_Fable.getUUID()}`);
```

Configuration can come from the constructor, a `.fable.config.json` file, or a combination:

```json
{
    "Product": "BookStore",
    "LogLevel": 2,
    "MySQL": {
        "Server": "localhost",
        "User": "root",
        "Password": "",
        "Database": "bookstore",
        "ConnectionPoolLimit": 20
    }
}
```

## Step 2: Meadow — Define Your Data

> **Layer 2 — Meadow + FoxHound + Stricture:** Data broker, SQL generation, schema definitions
>
> Working example: [`examples/quickstart/layer2/`](../examples/quickstart/layer2/)

Add Meadow to define data entities and connect to a database.

```bash
npm install meadow foxhound stricture meadow-connection-mysql
```

Define a schema for your entity. Stricture's MicroDDL is the simplest approach, but you can also write JSON directly:

```json
{
    "title": "Book",
    "description": "A book in the bookstore",
    "defaultIdentifier": "IDBook",
    "defaultGUIDIdentifier": "GUIDBook",
    "columns": [
        { "Column": "IDBook", "Type": "AutoIdentity" },
        { "Column": "GUIDBook", "Type": "AutoGUID" },
        { "Column": "Title", "Size": 200, "Type": "String" },
        { "Column": "Author", "Size": 200, "Type": "String" },
        { "Column": "YearPublished", "Type": "Integer" },
        { "Column": "CreateDate", "Type": "DateTime" },
        { "Column": "CreatingIDUser", "Type": "Integer" },
        { "Column": "UpdateDate", "Type": "DateTime" },
        { "Column": "UpdatingIDUser", "Type": "Integer" },
        { "Column": "Deleted", "Type": "Boolean" },
        { "Column": "DeleteDate", "Type": "DateTime" },
        { "Column": "DeletingIDUser", "Type": "Integer" }
    ]
}
```

Create the Meadow entity:

```javascript
const libMeadow = require('meadow');
const BookSchema = require('./Book-Schema.json');

let _BookMeadow = _Fable.instantiateServiceProvider('Meadow',
{
    Scope: 'Book',
    DefaultSchema: BookSchema
});

// Perform data operations
_BookMeadow.doCreate({ Title: 'The Hobbit', Author: 'Tolkien', YearPublished: 1937 },
    function(pError, pQuery, pRecord)
    {
        _Fable.log.info(`Created book with ID ${pRecord.IDBook}`);
    });
```

## Step 3: Meadow-Endpoints — Auto-Generate Your API

> **Layer 3 — Meadow-Endpoints:** Auto-generated CRUD routes, behavior hooks

Add Meadow-Endpoints to automatically create RESTful routes from your entity.

```bash
npm install meadow-endpoints
```

```javascript
const libMeadowEndpoints = require('meadow-endpoints');

let _BookEndpoints = _Fable.instantiateServiceProvider('MeadowEndpoints',
{
    Entity: _BookMeadow
});

// Add authentication behavior
_BookEndpoints.BehaviorModifications.setBehavior('Create-Authorize',
    function(pRequest, fCallback)
    {
        // Only authenticated users can create books
        if (!pRequest.UserSession || !pRequest.UserSession.LoggedIn)
        {
            pRequest.CommonServices.log.warn('Unauthorized create attempt');
            return fCallback('Unauthorized');
        }
        return fCallback();
    });
```

This generates endpoints for: `GET /Books`, `GET /Book/:id`, `POST /Book`, `PUT /Book`, `DEL /Book/:id`, `GET /Books/Count`, `GET /Book/Schema`, and `DEL /Book/:id/Undelete`.

## Step 4: Orator — Serve Your API

> **Layer 4 — Orator (API Server):** HTTP lifecycle, middleware, static files, proxy
>
> Working example: [`examples/quickstart/layer3/`](../examples/quickstart/layer3/)

Add Orator to host everything over HTTP.

```bash
npm install orator orator-serviceserver-restify
```

```javascript
const libOrator = require('orator');
require('orator-serviceserver-restify');

let _Orator = _Fable.instantiateServiceProvider('Orator');

// Wire the auto-generated endpoints to the HTTP server
_BookEndpoints.connectRoutes(_Orator);

// Add a custom health check route
_Orator.addRoute('GET', '/health', function(pRequest, pResponse, fNext)
{
    pResponse.send({ status: 'ok', product: _Fable.settings.Product });
    return fNext();
});

// Start the server
_Orator.startService(function(pError)
{
    if (pError)
    {
        _Fable.log.error(`Failed to start: ${pError}`);
        return;
    }
    _Fable.log.info(`${_Fable.settings.Product} running on port ${_Fable.settings.APIServerPort}`);
});
```

Your API is now running. Test it:

```bash
# Create a book
curl -X POST http://localhost:8086/Book \
  -H "Content-Type: application/json" \
  -d '{"Title": "The Hobbit", "Author": "Tolkien", "YearPublished": 1937}'

# List all books
curl http://localhost:8086/Books

# Get a specific book
curl http://localhost:8086/Book/1

# Get the count
curl http://localhost:8086/Books/Count
```

## Step 5: Pict — Add a Browser UI (Optional)

> **Pict (MVC Tools):** Views, templates, providers, application lifecycle — sits alongside the server stack
>
> Working example: [`examples/quickstart/layer4/`](../examples/quickstart/layer4/)

If your application has a browser interface, add Pict for MVC.

```bash
npm install pict pict-view pict-application
```

```javascript
const libPict = require('pict');

let _Pict = new libPict({
    Product: 'BookStoreUI'
});

// Register templates
_Pict.TemplateProvider.addTemplate('BookList',
    '<ul>{~Each:AppData.Books:BookItem~}</ul>');
_Pict.TemplateProvider.addTemplate('BookItem',
    '<li>{~Data:Record.Title~} by {~Data:Record.Author~} ({~Data:Record.YearPublished~})</li>');

// Load data from your API
fetch('/Books')
    .then(r => r.json())
    .then(books =>
    {
        _Pict.AppData.Books = books;
        // Render into the page
        document.getElementById('book-list').innerHTML =
            _Pict.parseTemplate('BookList', {});
    });
```

## The Shortcut: Retold-Data-Service

For the common case of "schema → full REST API", **retold-data-service** wraps Layers 2–3 (Meadow + Meadow-Endpoints) into a single call:

```bash
npm install retold-data-service
```

```javascript
const libRetoldDataService = require('retold-data-service');

let _BookService = _Fable.instantiateServiceProvider('RetoldDataService',
{
    Scope: 'Book',
    Schema: BookSchema
});

// Full CRUD endpoints ready — wire to Orator and go
_BookService.connectRoutes(_Orator);
```

## Utility Modules

> **Utility Layer:** Build tools, manifest management, documentation, process supervision
>
> Working example: [`examples/quickstart/layer5/`](../examples/quickstart/layer5/) (Manyfest)

Supporting the application stack are utility modules like **Manyfest** (schema-driven object navigation), **Quackage** (browser bundling), **Indoctrinate** (documentation generation), and **Ultravisor** (process supervision). These are used throughout the stack but don't live in the numbered layer model.

## Next Steps

- **[Architecture](architecture/architecture.md)** — Understand the layer model in depth
- **[Examples](examples/examples.md)** — Complete runnable applications, including the [Todo List](examples/todolist/todo-list.md) full-stack example with four clients
- **[Fable](modules/fable.md)** — Deep dive into the core ecosystem and service provider pattern
- **[Meadow](modules/meadow.md)** — Data access, FoxHound queries, and Stricture schemas
- **[Orator](modules/orator.md)** — Server configuration, lifecycle hooks, and middleware
- **[Pict](modules/pict.md)** — Views, templates, providers, and application lifecycle
- **[All Modules](modules/modules.md)** — Every repository in the Retold suite
