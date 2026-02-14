# Layer 2: Meadow - Data Access

> Retold Layer 2 — Data broker / ORM: Meadow + FoxHound (query DSL) + Stricture
> (schema DDL), with pluggable database connections (MySQL, MSSQL, SQLite)

Meadow provides provider-agnostic CRUD operations with automatic audit columns,
soft deletes, and schema-driven query generation through FoxHound.

## Prerequisites

A MySQL server running locally on port 3306 with root access.

## Run

```bash
npm install
npm run setup   # Creates the database and table
npm start       # Runs CRUD operations
```

Or run both steps together:

```bash
npm install
npm run demo
```

## What This Demonstrates

- Connecting to MySQL via the Meadow connection provider
- Defining entity schemas (Meadow schema + JSON schema)
- Full CRUD operations: Create, Read, Reads, Update, Delete
- FoxHound query builder with filters, sorting, and pagination
- Audit columns (CreateDate, UpdateDate) and soft deletes
