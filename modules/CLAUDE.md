# Retold Modules

This directory contains all Retold module groups. Each subfolder holds individual git repos.

## Module Management

Shell scripts manage all modules collectively:

- `Fork.sh` — Fork every forkable module from its canonical owner to your GitHub account (no-op for already-forked or non-forkable modules). Requires the `gh` CLI.
- `Checkout.sh` — Clone every module: forkable modules clone from `<your-user>/<module>` (with `upstream` set to the canonical owner for PR sync); non-forkable modules clone directly from their per-module Owner.
- `Install.sh` — Run `npm install` inside every cloned module so each module is runnable on its own (tests, examples, the per-module dev workflow). Pair this with `Checkout.sh` on a fresh box; the manager's per-module action buttons (`install`, `test`, `build`, `examples`, etc.) all assume each module has its own `node_modules/`.
- `Status.sh` — Show git status across all modules
- `Sync.sh` — Fast-forward each forkable module's fork (`<your-user>/<module>`) from its canonical upstream on GitHub via `gh repo sync`. No local checkout required; follow with `Update.sh` to pull the synced state into local clones. Skips non-forkable modules and any forkable module the user has not yet forked.
- `Update.sh` — Pull with rebase across all modules
- `Include-Retold-Module-List.sh` — Central registry (generated from `Retold-Modules-Manifest.json`) defining per-group parallel arrays: `repositoriesX`, `ownersX`, `forkableX`. Sourced by the scripts above.
- `Retold-Modules.md` — Human-readable module list with hosted doc links

Most modules are hosted at `github.com/fable-retold/<module-name>` (the canonical org). A small set lives at `github.com/stevenvelozo/<module-name>` and is marked `Forkable: false` in the manifest — these clone read-only.

## Module Groups

| Group | Folder | Count | Purpose |
|-------|--------|-------|---------|
| Fable | `fable/` | 6 | Core ecosystem, DI, config, logging |
| Meadow | `meadow/` | 13 | Data access, ORM, query DSL, schema |
| Orator | `orator/` | 6 | API server, Restify, proxy, WebSocket |
| Pict | `pict/` | 15 | MVC, views, templates, forms, TUI |
| Utility | `utility/` | 10+ | Build tools, manifests, docs |
| Apps | `apps/` | 2 | Full-stack applications built on Retold |

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
