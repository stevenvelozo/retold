#!/bin/bash
echo "### Syncing forkable Retold modules from upstream..."

. ${BASH_SOURCE%/*}/Include-Retold-Module-List.sh

if ! command -v gh >/dev/null 2>&1
then
	echo "ERROR: GitHub CLI (gh) is required.  Install: https://cli.github.com"
	exit 1
fi

ME=$(gh api user --jq '.login' 2>/dev/null)
if [ -z "$ME" ]
then
	echo "ERROR: cannot determine your GitHub user.  Run 'gh auth login' first."
	exit 1
fi
echo "### Syncing as: $ME (canonical org: $canonicalOrg)"

OK_COUNT=0
SKIP_COUNT=0
FAIL_COUNT=0

#
# Sync one forkable repository's default branch on GitHub from its canonical
# upstream ($2/<name> -> $ME/<name>) using `gh repo sync`.  No local checkout
# required; pair with Update.sh afterwards to pull the synced state into the
# local clones.
#   $1 module name
#   $2 canonical owner
#   $3 forkable flag ("1" or "0")
#
sync_repository()
{
	if [ "$3" != "1" ]
	then
		echo "     - $1: not forkable (owned by $2, read-only). Skipping."
		SKIP_COUNT=$((SKIP_COUNT+1))
		return
	fi

	local actualOwner
	actualOwner=$(gh api "repos/$ME/$1" --jq '.owner.login' 2>/dev/null || echo "")
	if [ "$actualOwner" != "$ME" ]
	then
		echo "     - $1: not yet forked at $ME/$1.  (Run ./Fork.sh first.)"
		SKIP_COUNT=$((SKIP_COUNT+1))
		return
	fi

	local syncOutput
	if syncOutput=$(gh repo sync "$ME/$1" --source "$2/$1" 2>&1)
	then
		echo "     + synced: $2/$1 -> $ME/$1"
		OK_COUNT=$((OK_COUNT+1))
	else
		echo "     ! FAIL to sync: $2/$1 -> $ME/$1"
		echo "       $syncOutput"
		echo "       (If the fork has diverged, resolve on GitHub or re-run with --force on gh repo sync.)"
		FAIL_COUNT=$((FAIL_COUNT+1))
	fi
}

#
# Iterate one group's parallel arrays (names, owners, forkable) and sync each.
#   $1 shell variable suffix (e.g., "Fable")
#
process_sync_set()
{
	local groupSuffix="$1"
	eval "local names=(\"\${repositories${groupSuffix}[@]}\")"
	eval "local owners=(\"\${owners${groupSuffix}[@]}\")"
	eval "local forkable=(\"\${forkable${groupSuffix}[@]}\")"

	echo ""
	echo "#####[ $groupSuffix ]#####"
	for i in "${!names[@]}"
	do
		sync_repository "${names[$i]}" "${owners[$i]}" "${forkable[$i]}"
	done
}

process_sync_set "Fable"
process_sync_set "Meadow"
process_sync_set "Orator"
process_sync_set "Pict"
process_sync_set "Utility"
process_sync_set "Apps"

echo ""
echo "### Summary"
echo "###   Synced:  $OK_COUNT"
echo "###   Skipped: $SKIP_COUNT  (not yet forked + non-forkable)"
echo "###   Failed:  $FAIL_COUNT"
echo ""
if [ "$FAIL_COUNT" -gt 0 ]
then
	echo "### Some syncs failed.  Re-run after fixing."
	exit 1
fi
echo "### Next: run ./Update.sh to pull synced changes into your local clones."
