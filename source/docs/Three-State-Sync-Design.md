# Three-State Fork Tracking — Design Doc

**Status:** IMPLEMENTED (2026-06). Engine in `Manager-Core-ModuleIntrospector.js`
(`_edgeDrift` + `deriveNextAction`), state mapping in
`web/client/pict-app/Manager-Scan-State.js`, surfaced in the InfoBox chain,
the action-coded sidebar badge, and the scan-table "Next action" column.
**Author:** drafted with Claude, 2026-05
**Context:** the fork/upstream tooling currently infers everything from the *local*
checkout, which led to a string of confusing states (squash-merge "phantom drift",
stale-lease push failures, "ahead by 4 when it should be 0"). Root cause: we track
two of the three relationships that actually matter and infer the third.

---

## 1. The model

For each module (on its default branch) there are **three nodes**:

| Node | Git ref | Meaning |
|------|---------|---------|
| **Local (L)** | `HEAD` (+ working tree) | your committed state, plus uncommitted/untracked changes |
| **Fork (F)** | `refs/remotes/origin/<branch>` | your personal GitHub fork |
| **Upstream (U)** | `refs/remotes/upstream/<branch>` | the canonical org repo |

**Non-forkable modules** (no `upstream` remote — `origin` *is* canonical) collapse to
two nodes: `Local ↔ Canonical(origin)`. The UI must degrade to that cleanly.

### What we track today vs. the gap

| Edge | Question | Tracked today? |
|------|----------|----------------|
| L ↔ F | committed/pushed my work to my fork? | yes — porcelain ahead/behind + dirty |
| L ↔ U | is my checkout current with the org? | yes — "drift" (cherry-pick + identical-tree + freshness) |
| **F ↔ U** | **is my *fork* ahead/behind the org?** | **NO — inferred from L↔U, which lies** |

The missing **F↔U** edge is precisely what every confusing moment turned on:
- *Squash-merge:* F's history diverged from U while L's content matched U.
- *Stale-lease push:* F moved (you pushed) but L's view of F was stale.
- *"ahead by 4":* we showed L↔U against a stale U ref; the real question was F↔U.

---

## 2. Computing the edges

Every edge is computed **from already-fetched local refs** (no extra network; freshness
= last fetch — see §5) with the two robustness rules we already proved out:

- **`--cherry-pick`** — ignores commits that exist on the other side under a *different
  SHA* (rebase/merge-commit merges). `git rev-list --left-right --cherry-pick --count A...B`
  returns `behind<TAB>ahead`.
- **identical-tree override** — if `git diff --quiet A B` (trees equal), force `0/0`. This
  catches **squash merges** (N commits → 1) that `--cherry-pick` can't.

A single reusable helper does all three edges:

```
_edgeDrift(modulePath, refA, refB)
  → { Ahead, Behind, HasBothRefs, ContentIdentical }
```

| Edge | refA → refB (rev-list `refA...refB`) | Plus |
|------|----------------------------------------|------|
| L ↔ F | `origin/<branch>` → `HEAD` | working-tree dirty flag (porcelain) |
| L ↔ U | `upstream/<branch>` → `HEAD` | (today's drift) |
| F ↔ U | `upstream/<branch>` → `origin/<branch>` | **new** |

Cost: ~2–3 extra `git` execs per module in the scan (local, fast). Already do most of these.

---

## 3. The payoff — one derived "next action"

Given the three edges + dirty flag, derive a **single recommended action** (priority =
the most-upstream pending step in the publish flow):

| Priority | Condition | Next action | Button |
|---|---|---|---|
| 1 | working tree dirty | **commit** | commit |
| 2 | L ahead of F | **push to fork** | push |
| 3 | F behind U | **pull upstream into fork** | merge-upstream |
| 4 | F ahead of U | **open PR** | create-pr |
| 5 | F behind L (fork lags local, but pushed elsewhere) | **pull fork → local** | pull |
| 6 | otherwise | **in sync** | — |

Rationale for ordering: get your work committed → onto your fork → bring your fork current
with the org (so the PR is clean) → open the PR. A *diverged* fork (both ahead and behind U)
surfaces "pull upstream into fork" first, then "open PR" on the next pass.

> **Open question A:** when F is diverged from U, is "pull upstream into fork (merge)" the
> right first step, or do you prefer "sync (rebase)"? The merge path is gentler (no force-push)
> and is what unstuck meadow; recommend merge as the default, rebase as an explicit choice.

This derivation is the "tells you which button to press" experience. It lives in **one place**
(server-side, in the scan/getGitStatus), exported in the payload; the client only renders it —
preserving the single-source-of-truth principle (the way `Manager-Scan-Dirty.js` is shared today).

---

## 4. UI surfaces

### 4a. InfoBox (per-module) — the full chain
Replace the two separate "vs fork" / "vs org" rows with a compact three-node chain + a next-action chip:

```
  Local ─▶ Fork ─▶ Upstream            Next: open PR
   ● dirty   ↑2 unpushed   ↑1 / ↓0      (as of 3m ago)
```

### 4b. Sidebar badge — action-coded
The row badge encodes the **derived next action**, not just "dirty":
`commit` (orange) · `push` (blue) · `pull-upstream` (purple) · `PR` (green) · in-sync (none).
Tooltip = the action label. (Replaces today's dirty-state badge — richer, same single source.)

### 4c. Scan table (LogBar) — a "Next action" column
- Add a **Next action** column (sortable + filterable: "needs PR", "needs pull", "needs push").
  This is the high-value list view — scan the column, act in bulk.
- Reframe the drift columns around the model (see Open question B).

> **Open question B:** the table's `↑org/↓org` columns are **L↔U** today. PR/pull decisions
> key on **F↔U**. Options: (i) switch the "org" columns to F↔U, (ii) keep L↔U, (iii) show both
> (`↑/↓ fork`, `↑/↓ org`). Recommend showing **L↔F** and **F↔U** as the two pairs (drop the
> redundant L↔U from the table; keep it in the InfoBox), since together they fully describe the
> chain and map to actions.

---

## 5. Edge cases

- **Non-forkable** (no `upstream`): two-node model, `Local ↔ origin(canonical)`. F↔U is N/A;
  next-action limited to commit/push. UI hides the Fork/Upstream split.
- **Ref missing** (branch absent on a remote, never fetched): that edge is "unknown"
  (`HasBothRefs:false`) — same n/a treatment as today's `HasUpstreamRef:false`.
- **Detached HEAD**: degrade to "—".
- **Freshness**: F↔U and L↔U both read remote-tracking refs → the existing "as of <fetch>"
  indicator + stale styling applies. The next-action should soften "in sync" when refs are
  very stale (e.g. "in sync · as of 5d ago — refetch to confirm").
- **Squash merges**: inherited for free — the identical-tree override on F↔U reports the fork
  in-sync when its content matches the org (the meadow case).

---

## 6. Implementation plan

**Server — `Manager-Core-ModuleIntrospector.js`**
- Extract `_edgeDrift(path, refA, refB)` (generalizes the current cherry-pick + identical-tree logic).
- Compute L↔F, L↔U (existing), F↔U in `getGitStatus()` and `scanAllModulesAsync()`.
- Add a pure `deriveNextAction(state)` (heavily unit-tested across the state matrix).

**Server — scan route (`RetoldManager-Api-Manifest.js`)**
- Add `ForkUpstream{Ahead,Behind,HasRef}`, and `NextAction` to the trimmed payload (UpstreamFetchedAt already there).

**Client**
- `Manager-Scan-Dirty.js` → evolve into `Manager-Scan-State.js`: map server `NextAction` → badge color + label (single source).
- `PictView-Manager-ModuleWorkspace.js`: three-node InfoBox chain + next-action chip.
- `PictView-Manager-Sidebar.js`: action-coded badge (via the shared mapper).
- `PictView-Manager-LogBar.js`: Next-action column + filter; reframe drift columns per Open question B.

**Tests** (`source/test/`)
- `_edgeDrift` across: in-sync, ahead-only, behind-only, diverged, squash-merged (identical tree), missing ref.
- `deriveNextAction` across the full state matrix incl. dirty, non-forkable, diverged.

**Build/run**
- Server-side changes → restart the manager; client changes → `npx quack build` + refresh.

---

## 7. Decisions — RESOLVED (2026-06)

- **A. Diverged fork → REBASE.** "Sharp edges are okay." The upstream-reconciliation
  next-action is `sync from upstream (rebase + force-push)`. (The gentle `merge-upstream`
  op stays available as a manual alternative, but the *derived* action is rebase.)
- **B. Scan table shows L↔F and F↔U as separate pairs** (drop L↔U from the table; keep it
  in the InfoBox only). **Non-forkable modules collapse to a single `Local ↔ Remote (L↔R)`
  pair** — no Fork column, no PR / pull-upstream actions.
- **C. Replace the dirty badge with the action-coded badge.**
- **D. Everything goes through the fork-mediated flow.** No standalone "rebase Local
  directly onto Upstream" that bypasses the fork. Reconciliation is always
  `Fork ↔ Upstream` (rebase-sync, which rebases Local and force-pushes the fork) then
  `Local ↔ Fork`. L↔U becomes purely informational. (For non-forkable / L↔R, "the fork" is
  the remote, so it's just pull/rebase from the remote.)
- **E. `NextAction` is computed SERVER-SIDE** (in the scan + getGitStatus) as the single
  source of truth; the client only renders it.

### Consequences for the model
- Two **action-bearing** edges: **L↔F** and **F↔U**. The chain is `Local → Fork → Upstream`.
- L↔U is derived/informational (InfoBox only), never an action target.
- Non-forkable: one edge **L↔R**; actions limited to commit / push / pull.
- `deriveNextAction` priority (rebase + fork-mediated):
  1. dirty → **commit**
  2. L ahead of F → **push to fork**
  3. F behind (or diverged from) U → **sync from upstream (rebase + force-push)**
  4. F ahead of U → **open PR**
  5. F behind L → **pull fork → local**
  6. else → **in sync**
  (Non-forkable: dirty→commit, L ahead of R→push, R ahead of L→pull, else in-sync.)
```
