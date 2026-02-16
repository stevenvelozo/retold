# Utility — Build & Documentation Tools

The utility group provides supporting tools for building, documenting, testing, and supervising Retold applications.

## Modules

### [Indoctrinate](/utility/indoctrinate/)

Documentation scaffolding and generation. Scans source trees, catalogs content with automatic label-based metadata, and generates structured output in multiple formats. Powers the Retold documentation hub by generating cross-module catalogs and keyword search indexes.

**Key features:** Content cataloging with label-based filtering, multi-format output (HTML, LaTeX, text), Retold catalog generation for cross-repo documentation, lunr-based keyword index for cross-module search.

**npm:** `indoctrinate` · **Version:** 1.0.x

---

### [Manyfest](/utility/manyfest/)

JSON manifest for consistent data description and parsing across all application layers — database, API, frontend, and UI. Provides address-based access patterns for reading and writing nested object properties with validation and type coercion.

**Key features:** Address-based data access (dot notation and array indexing), type validation and coercion, manifest-driven form generation, schema description for data layers.

**npm:** `manyfest` · **Version:** 1.0.x

---

### [Quackage](/utility/quackage/)

Standardized build tool for Retold modules. Handles browser bundling (Browserify), transpilation, unit testing, file management, JSON view assembly, and documentation generation from a single CLI.

```bash
npx quack build          # Build browser bundle
npx quack test           # Run Mocha tests
npx quack coverage       # Generate coverage report
```

**npm:** `quackage` · **Version:** 1.0.x

---

### [Ultravisor](/utility/ultravisor/)

Process supervision tool for running commands on schedule with LLM integration. Supports distributed nodes, global state, and flexible task types (shell, browser, HTTP, database).

**npm:** `ultravisor` · **Version:** 1.0.x

## All Utility Modules

| Module | Description |
|--------|-------------|
| [indoctrinate](/utility/indoctrinate/) | Documentation scaffolding with content cataloging and cross-module search |
| [manyfest](/utility/manyfest/) | JSON manifest for data description, validation, and address-based access |
| [quackage](/utility/quackage/) | Build tool for browser bundles, testing, and packaging |
| [ultravisor](/utility/ultravisor/) | Process supervision with scheduled tasks and LLM integration |
