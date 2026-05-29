#!/bin/bash
#
# Sync-Upstream.sh — pull upstream (org) changes down into every forkable fork:
# fetch upstream, rebase the current branch onto upstream/<branch>, then
# force-push (with lease) so the fork mirrors the rebased history.
#
# Safety rails:
#   - Non-forkable modules (no `upstream` remote) are skipped.
#   - Any module with a dirty working tree is SKIPPED (never rebase over
#     uncommitted work) and reported at the end.
#   - A rebase that conflicts is aborted (`git rebase --abort`) so the repo is
#     left exactly as it was, and the module is reported as failed — the chain
#     never force-pushes a half-rebased or conflicted state.
#
echo "### Syncing all forkable Retold modules from upstream in: [$(pwd)/..."

. ${BASH_SOURCE%/*}/Include-Retold-Module-List.sh

SYNCED=0
SKIPPED_NONFORK=0
MISSING=0
SKIPPED_DIRTY=()
FAILED=()

#
# Sync one module: fetch upstream, rebase, force-push to the fork.
#   $1 group path (e.g., "fable")
#   $2 module name
#   $3 forkable flag ("1" = has an upstream remote, "0" = skip)
#
sync_upstream_repository()
{
	local groupPath="$1"
	local name="$2"
	local forkable="$3"
	local dir="$(pwd)/$groupPath/$name"

	if [ "$forkable" != "1" ]
	then
		SKIPPED_NONFORK=$((SKIPPED_NONFORK + 1))
		return
	fi
	if [ ! -d "$dir" ]
	then
		echo "     > $name not checked out in $groupPath -- skipping (run ./Checkout.sh?)"
		MISSING=$((MISSING + 1))
		return
	fi
	if ! git -C "$dir" remote get-url upstream >/dev/null 2>&1
	then
		echo "     > $name has no 'upstream' remote -- skipping."
		SKIPPED_NONFORK=$((SKIPPED_NONFORK + 1))
		return
	fi

	# Refuse on a dirty working tree — never rebase over uncommitted work.
	if [ -n "$(git -C "$dir" status --porcelain)" ]
	then
		echo "     > $name has uncommitted changes -- skipping (commit or stash first)."
		SKIPPED_DIRTY+=("$groupPath/$name")
		return
	fi

	local branch
	branch="$(git -C "$dir" branch --show-current)"
	if [ -z "$branch" ]
	then
		echo "     > $name is in detached HEAD -- skipping."
		FAILED+=("$groupPath/$name (detached HEAD)")
		return
	fi

	if ! git -C "$dir" fetch upstream
	then
		echo "     ! git fetch upstream failed for $name"
		FAILED+=("$groupPath/$name (fetch failed)")
		return
	fi

	if ! git -C "$dir" rebase "upstream/$branch"
	then
		echo "     ! rebase onto upstream/$branch failed in $name -- aborting rebase, leaving it untouched."
		git -C "$dir" rebase --abort >/dev/null 2>&1
		FAILED+=("$groupPath/$name (rebase conflict)")
		return
	fi

	if ! git -C "$dir" push --force-with-lease origin "$branch"
	then
		echo "     ! force-push to origin/$branch failed for $name (rebased locally, but fork not updated)."
		FAILED+=("$groupPath/$name (push failed)")
		return
	fi

	echo "     + synced $name ($branch) from upstream and pushed to fork."
	SYNCED=$((SYNCED + 1))
}

#
# Iterate one group's parallel arrays (names, forkable) and sync each.
#   $1 group path on disk (e.g., "fable")
#   $2 shell variable suffix (e.g., "Fable" for repositoriesFable/forkableFable)
#
process_repository_set()
{
	local groupPath="$1"
	local groupSuffix="$2"
	eval "local names=(\"\${repositories${groupSuffix}[@]}\")"
	eval "local forkable=(\"\${forkable${groupSuffix}[@]}\")"

	for i in "${!names[@]}"
	do
		echo ""
		echo "[ S ] --> #####[ $groupPath -> ${names[$i]} ]#####"
		sync_upstream_repository "$groupPath" "${names[$i]}" "${forkable[$i]}"
	done
}

process_repository_set "fable" "Fable"
process_repository_set "meadow" "Meadow"
process_repository_set "orator" "Orator"
process_repository_set "pict" "Pict"
process_repository_set "utility" "Utility"
process_repository_set "apps" "Apps"

echo ""
echo "### Sync-upstream summary:"
echo "    synced:             $SYNCED"
echo "    skipped (dirty):    ${#SKIPPED_DIRTY[@]}"
for d in "${SKIPPED_DIRTY[@]}"; do echo "      - $d"; done
echo "    skipped (non-fork): $SKIPPED_NONFORK"
echo "    not checked out:    $MISSING"
echo "    failed:             ${#FAILED[@]}"
for f in "${FAILED[@]}"; do echo "      - $f"; done
