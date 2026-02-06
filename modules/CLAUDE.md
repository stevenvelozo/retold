# Retold Modules

This directory contains all Retold module groups. Each subfolder holds individual git repos.

## Module Management

Shell scripts manage all modules collectively:

- `Checkout.sh` — Clone all module repos from GitHub
- `Status.sh` — Show git status across all modules
- `Update.sh` — Pull with rebase across all modules
- `Include-Retold-Module-List.sh` — Central registry defining module arrays per group (sourced by the scripts above)
- `Retold-Modules.md` — Human-readable module list with hosted doc links

All modules are hosted at `github.com/stevenvelozo/<module-name>`.

## Module Groups

| Group | Folder | Count | Purpose |
|-------|--------|-------|---------|
| Fable | `fable/` | 6 | Core framework, DI, config, logging |
| Meadow | `meadow/` | 13 | Data access, ORM, query DSL, schema |
| Orator | `orator/` | 6 | API server, Restify, proxy, WebSocket |
| Pict | `pict/` | 15 | MVC, views, templates, forms, TUI |
| Utility | `utility/` | 10+ | Build tools, manifests, docs |

## Working in a Module

Each module has its own `package.json`, tests, and README.

**Testing:**
```bash
npm test                        # Mocha TDD: npx mocha -u tdd -R spec
npm run coverage                # nyc coverage report
```

**Building:**
```bash
npx quack build                 # Most modules use Quackage
```

Some modules (e.g., Pict, Fable) also use Gulp + Browserify for browser bundles.

## Code Style

- Tabs for indentation, never spaces
- Plain JavaScript only — no TypeScript
- Opening braces on new lines (Allman style)
- Variable naming:
  - `pVariable` — function parameters
  - `tmpVariable` — scoped/temporary variables
  - `VARIABLE` — globals and constants
  - `libSomeLibrary` — imported/required libraries
- Match existing patterns in whichever module you are editing

## Adding a New Module

1. Add the repo name to the appropriate array in `Include-Retold-Module-List.sh`
2. Update `Retold-Modules.md`
3. The module should follow the same structure: `package.json`, `source/`, `test/`, Mocha TDD tests
