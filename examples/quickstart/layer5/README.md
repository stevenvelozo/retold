# Utility: Manyfest - Object Navigation

> Retold Utility Layer — Supporting tools: Manyfest (manifest management),
> Quackage (build), Indoctrinate (documentation), Ultravisor (process
> supervision), CacheTrax (caching), Precedent (meta-templating), and more

Manyfest provides schema-driven JSON object description, navigation, and
validation. It is used throughout Retold for consistent data access across
layers. Fable bundles Manyfest as a built-in service.

## Run

```bash
npm install
npm start
```

## What This Demonstrates

- Defining a manifest schema with descriptors, data types, and defaults
- Reading and writing values by dot-notation address (`Author.Name`)
- Hash-based lookups for aliased field access (e.g. `AuthorName` -> `Author.Name`)
- Setting values on nested paths that don't exist yet
- Populating objects with default values from the schema
- Validating objects against schema type constraints
- Using Manyfest as a Fable service via `_Fable.newManyfest()`
