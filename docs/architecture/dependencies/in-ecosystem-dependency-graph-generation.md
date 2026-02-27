# Generating the In-Ecosystem Dependency Graph

Two Node.js scripts in this folder produce the dependency graph artifacts. They have no dependencies beyond Node.js itself and must be run from the **retold repository root**.

## Prerequisites

- Node.js (v16+)
- All module repositories cloned into `modules/` (the scripts scan `package.json` files via `find`)

## Scripts

| Script | Input | Output |
|---|---|---|
| `_generate-graph.js` | All `package.json` files in the repo | `in-ecosystem-dependency-graph.json` |
| `_generate-svg.js` | `in-ecosystem-dependency-graph.json` | `in-ecosystem-dependency-graph.svg` |

The JSON must be generated before the SVG, since the SVG script reads from it.

## Usage

From the retold root directory:

```bash
# Step 1: Generate the JSON graph from all package.json files
node docs/architecture/dependencies/_generate-graph.js

# Step 2: Generate the SVG from the JSON
node docs/architecture/dependencies/_generate-svg.js
```

Or as a single command:

```bash
node docs/architecture/dependencies/_generate-graph.js && node docs/architecture/dependencies/_generate-svg.js
```

Both scripts print summary statistics to stdout on completion.

## What Each Script Does

### _generate-graph.js

1. Finds every `package.json` under the repo root (max depth 4, excluding `node_modules` and `.git`)
2. Collects all package names to build the set of ecosystem packages
3. For each package, extracts `dependencies` and `devDependencies` that reference other ecosystem packages
4. Classifies each package by group (`fable`, `meadow`, `orator`, `pict`, `utility`, `apps`, `root`) and category (`module`, `example`, `root`, `internal`)
5. Computes graph analytics: in-degree, out-degree, leaf nodes, root nodes, most-depended-upon ranking
6. Writes the result to `in-ecosystem-dependency-graph.json`

### _generate-svg.js

1. Reads `in-ecosystem-dependency-graph.json`
2. Filters to module-category and root-category nodes (excludes examples and internal packages)
3. Lays out groups in a 2-column grid following the architectural layer order:
   - Row 0: Fable (Core) | Utility (Build/Ops)
   - Row 1: Meadow (Data) — full width
   - Row 2: Orator (API) | Apps (Full Stack)
   - Row 3: Pict (MVC/UI) — full width
   - Row 4: Root — full width
4. Draws edges as cubic bezier curves (solid for production, dashed for development)
5. Highlights core modules (10+ dependents) with filled backgrounds
6. Writes the result to `in-ecosystem-dependency-graph.svg`

## Output Files

| File | Format | Purpose |
|---|---|---|
| `in-ecosystem-dependency-graph.json` | JSON | Machine-readable graph for scripting and automation |
| `in-ecosystem-dependency-graph.svg` | SVG | Visual dependency graph for documentation |
| `in-ecosystem-dependency-graph.md` | Markdown | Human-readable analysis with topological layers and update order |

The markdown file (`in-ecosystem-dependency-graph.md`) is maintained manually and references the JSON and SVG. After regenerating the data files, review the markdown to see if any statistics or tables need updating.

## When to Regenerate

Run the scripts again after any of the following:

- A new module is added to the ecosystem
- A module's `dependencies` or `devDependencies` change
- A module is moved between groups
- Module versions are bumped

## JSON Schema

The JSON file has this structure:

```
{
  "metadata": { generated, description, totalModules, totalEcosystemPackages, groups },
  "nodes": [{ name, group, category, version, description, path, ecosystemProductionDependencyCount, ... }],
  "edges": [{ from, to, version, type }],
  "groups": { "fable": ["fable", "fable-log", ...], ... },
  "analytics": { leafNodes, rootNodes, mostDependedUpon, totalProductionEdges, totalDevelopmentEdges }
}
```

Edge `type` is either `"production"` or `"development"`. Node `category` is one of `"module"`, `"example"`, `"root"`, or `"internal"`.
