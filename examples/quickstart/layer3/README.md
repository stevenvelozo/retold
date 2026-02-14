# Layer 4: Orator - REST API Server

> Retold Layer 4 — API Server: HTTP lifecycle management, middleware,
> content negotiation, static file serving, with pluggable server implementations
> (Restify, IPC)

Orator provides a consistent HTTP server interface. This example uses the
Restify service server for production HTTP. Orator also supports an IPC mode
for in-process testing without network overhead.

In a full Retold application, Layer 3 (Meadow-Endpoints) auto-generates CRUD
routes from your Meadow entities and wires them to Orator. This example shows
Orator with manually defined routes.

## Run

```bash
npm install
npm start
```

Then test with curl:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/books
curl http://localhost:8080/api/books/1
curl -X POST http://localhost:8080/api/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Snow Crash","author":"Neal Stephenson","year":1992}'
```

## What This Demonstrates

- Creating an HTTP server with Orator and the Restify service server
- Defining GET and POST routes with request/response handling
- Route parameters and JSON responses
- Body parsing middleware (postWithBodyParser)
- Starting and stopping the server lifecycle
