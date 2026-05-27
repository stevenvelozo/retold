# Setting up a Development Environment

Retold is a **pseudo-monorepo** — the umbrella `retold` repository tracks module organization, while each of the 100+ modules lives in its own git repository under `modules/<group>/<module>/`. Most modules are hosted at `github.com/fable-retold/<module-name>` (the canonical org); a small set lives at `github.com/stevenvelozo/<module-name>` and is read-only.

This guide walks through the one-time setup so you can clone everything, install dependencies, and start working with the [`retold-manager`](#the-retold-manager-web-ui) web UI. If you only want to *use* Retold (install modules from npm and build an application), jump to [Getting Started](getting-started.md) instead — this page is for contributors working inside the monorepo itself.

## Prerequisites

You will need:

- **Git** (any modern version)
- **Node.js 18+** and **npm**
- **GitHub CLI** (`gh`), authenticated to your account — install instructions at <https://cli.github.com>

Authenticate `gh` before running any setup scripts:

```bash
gh auth login
```

All five module-management scripts read your GitHub user from `gh api user` and fail fast with a clear error if you're not logged in.

## Step 1: Fork and clone the umbrella

The umbrella `fable-retold/retold` repository is itself a fork target. Forking gives you a stable workspace and somewhere to push PR-bound changes that touch ecosystem-wide files (the module manifest, the docs you're reading right now, the manager itself).

```bash
# Fork the umbrella to your GitHub account
gh repo fork fable-retold/retold --clone=false

# Clone YOUR fork into ~/Code/retold (or wherever you prefer)
mkdir -p ~/Code && cd ~/Code
git clone https://github.com/<your-github-user>/retold.git
cd retold
```

The clone places you in the umbrella repo. The `modules/<group>/` subdirectories are empty at this point — the per-module repos haven't been cloned yet.

Install the umbrella's dependencies (the `retold-manager` web app's runtime + build deps live here):

```bash
npm install
```

Per-module `node_modules/` directories don't exist yet — that's [Step 4](#step-4-install-per-module-dependencies).

## Step 2: Fork the per-module repositories

`modules/Fork.sh` reads the module manifest (`Retold-Modules-Manifest.json`) and forks every **forkable** module from its canonical owner (`fable-retold`) to your GitHub account. Modules marked `Forkable: false` are skipped — those will be cloned read-only from their canonical owner in Step 3.

```bash
cd modules
./Fork.sh
```

Output looks like:

```
### Forking forkable Retold modules to your GitHub account...
### Forking as: <your-github-user> (canonical org: fable-retold)

#####[ Fable ]#####
     + forked: fable-retold/fable -> <your-github-user>/fable
     + forked: fable-retold/fable-log -> <your-github-user>/fable-log
     - ultravisor-beacon: not forkable (owned by stevenvelozo, read-only). Skipping.
...

### Summary
###   Forked:  87
###   Skipped: 14  (already-forked + non-forkable)
###   Failed:  0
```

The script is **idempotent**. If you re-run it after manually forking a few modules, it detects existing forks under your account and reports them as `already forked`.

## Step 3: Check out every module

`modules/Checkout.sh` clones each module into its group subdirectory. Forkable modules clone from your fork (`origin`) with an `upstream` remote pointing at the canonical owner — that's the wiring the PR sync flow expects. Non-forkable modules clone directly from their canonical owner.

```bash
./Checkout.sh
```

Each clone produces an entry like:

```
#####[ pict -> pict-section-content ]#####
Cloning into './pict/pict-section-content'...
     + added upstream remote: fable-retold/pict-section-content
```

After this completes you'll have ~100 module repos checked out under `modules/`. Each one is a normal git repo — `cd` into any of them and use ordinary git commands.

## Step 4: Install per-module dependencies

Each module ships with its own tests, examples, and build scripts. To run them you need that module's own `node_modules/`. The umbrella `npm install` in Step 1 only covers the manager; this step gives every module its own install.

```bash
./Install.sh
```

The script runs `npm install --no-audit --no-fund` inside every checked-out module, suppressing the audit/fund summaries so real install errors aren't drowned out.

This takes a while — roughly 10–20 minutes on a fresh clone depending on network speed and CPU.

## Daily workflow

### `Status.sh` — see which modules have uncommitted changes

```bash
cd modules
./Status.sh
```

Prints a per-module `git status` **only for repos that have changes**. Clean repos are silent. The summary at the bottom counts changed vs clean vs missing:

```
===== Summary =====
102 modules checked, 3 with changes, 99 clean
```

If you see `N modules not checked out (run Checkout.sh)` you have entries in the manifest with no local clone — usually means a new module was added to the manifest and you haven't re-run `Checkout.sh` since.

### `Update.sh` — pull every module

```bash
./Update.sh                # --rebase  (default)
./Update.sh --merge        # merge commits
./Update.sh --ff-only      # fail if non-fast-forward
./Update.sh --no-rebase    # use git's configured default
```

The default `--rebase` preserves clean linear history on local feature branches when you've been working in parallel with upstream.

## The `retold-manager` web UI

The umbrella repo ships an internal web tool — **retold-manager** — that drives the pseudo-monorepo. It surfaces per-module git status, dependency graphs, PR ripple operations, ripple publishing, and more.

It exposes a single command:

```bash
npx manager
```

`npx manager` works **from anywhere in the monorepo** thanks to the umbrella `package.json`'s bin block:

```json
"bin": { "manager": "./source/retold-manager-web.js" }
```

`npx` walks up the directory tree looking for a `package.json` that owns `manager`, finds the umbrella, and runs its entry point. So whether you're at `retold/`, `retold/modules/`, or deep inside a module like `retold/modules/pict/pict-docuserve/`, the command is identical.

### Options

```bash
npx manager                  # Bind 127.0.0.1:44444, auto-open browser
npx manager --port 8765      # Custom port
npx manager --host 0.0.0.0   # Bind all interfaces (LAN access)
npx manager --no-open        # Don't auto-open browser (useful in tmux / SSH)
npx manager --help           # Print all flags
```

The UI is at <http://127.0.0.1:44444/> by default.

### What the manager does

| Surface | What it shows |
|---|---|
| **Workspace** | Per-module git status, current branch, fork + canonical links, install / test / build / examples buttons |
| **Bulk ops** | Filterable module checkbox list with ripple actions: install, test, build, status, dependency update, publish, PR create / approve / merge |
| **Dependency graph** | The full in-ecosystem dependency graph, queryable by module |
| **Docs** | Per-module docs served via embedded `pict-docuserve` |

The bulk PR ripple in particular replaces the "click through GitHub web UI seventeen times" pattern when you need to land a coordinated change across many modules.

## Reference: the module-management scripts

All five live in `modules/` and share a generated module list (`Include-Retold-Module-List.sh`, regenerated from `Retold-Modules-Manifest.json` whenever the manifest changes).

| Script | What it does |
|---|---|
| [`Fork.sh`](#step-2-fork-the-per-module-repositories) | Forks every `Forkable: true` module from its canonical owner to your GitHub account (no-op for already-forked or non-forkable modules). Requires `gh` CLI. |
| [`Checkout.sh`](#step-3-check-out-every-module) | Clones every module: forkable modules clone from `<your-user>/<module>` with `upstream` set to the canonical owner for PR sync; non-forkable modules clone from their canonical owner directly. |
| [`Install.sh`](#step-4-install-per-module-dependencies) | Runs `npm install --no-audit --no-fund` inside every cloned module. Skips modules that aren't checked out yet or don't have a `package.json`. |
| [`Status.sh`](#statussh--see-which-modules-have-uncommitted-changes) | Shows `git status` across all modules, printing only the ones with changes. |
| [`Update.sh`](#updatesh--pull-every-module) | `git pull` across all modules. Default strategy is `--rebase`; pass `--merge`, `--ff-only`, or `--no-rebase` to override. |

## Where to go next

- [Getting Started](getting-started.md) — build a Retold application layer by layer
- [Architecture](architecture/architecture.md) — the five-layer model and how modules compose
- [Contributing](contributing.md) — code style, PR expectations, test coverage requirements
