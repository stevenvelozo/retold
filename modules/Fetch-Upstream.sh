#!/bin/bash
#
# Fetch-Upstream.sh — refresh the `upstream` remote-tracking refs for every
# forkable module, WITHOUT touching working trees or the current branch.
#
# This is the fast way to bring the retold-manager's fork-vs-upstream drift
# counts up to date: the manager reads drift from refs/remotes/upstream/* and
# only fetches on demand. `git fetch` never modifies checked-out files, so this
# is safe to run anytime, even with dirty trees.
#
# Non-forkable modules (no `upstream` remote) are skipped.
#
echo "### Fetching upstream for all forkable Retold modules in: [$(pwd)/..."

. ${BASH_SOURCE%/*}/Include-Retold-Module-List.sh

FETCHED=0
SKIPPED_NONFORK=0
MISSING=0
FAILED=()

#
# Fetch one module's upstream remote.
#   $1 group path (e.g., "fable")
#   $2 module name
#   $3 forkable flag ("1" = has an upstream remote, "0" = skip)
#
fetch_upstream_repository()
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

	if git -C "$dir" fetch upstream
	then
		FETCHED=$((FETCHED + 1))
	else
		echo "     ! git fetch upstream failed for $name"
		FAILED+=("$groupPath/$name")
	fi
}

#
# Iterate one group's parallel arrays (names, forkable) and fetch each.
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
		echo "[ F ] --> #####[ $groupPath -> ${names[$i]} ]#####"
		fetch_upstream_repository "$groupPath" "${names[$i]}" "${forkable[$i]}"
	done
}

process_repository_set "fable" "Fable"
process_repository_set "meadow" "Meadow"
process_repository_set "orator" "Orator"
process_repository_set "pict" "Pict"
process_repository_set "utility" "Utility"
process_repository_set "apps" "Apps"

echo ""
echo "### Fetch-upstream summary:"
echo "    fetched:            $FETCHED"
echo "    skipped (non-fork): $SKIPPED_NONFORK"
echo "    not checked out:    $MISSING"
echo "    failed:             ${#FAILED[@]}"
for f in "${FAILED[@]}"; do echo "      - $f"; done
