#!/bin/bash
echo "### Forking forkable Retold modules to your GitHub account..."

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
echo "### Forking as: $ME (canonical org: $canonicalOrg)"

OK_COUNT=0
SKIP_COUNT=0
FAIL_COUNT=0

#
# Fork one repository (forkable=1) if the user doesn't already own it.
#   $1 module name
#   $2 canonical owner
#   $3 forkable flag ("1" or "0")
#
fork_repository()
{
	if [ "$3" != "1" ]
	then
		echo "     - $1: not forkable (owned by $2, read-only). Skipping."
		SKIP_COUNT=$((SKIP_COUNT+1))
		return
	fi

	local actualOwner
	actualOwner=$(gh api "repos/$ME/$1" --jq '.owner.login' 2>/dev/null || echo "")
	if [ "$actualOwner" = "$ME" ]
	then
		echo "     - $1: already forked at $ME/$1."
		SKIP_COUNT=$((SKIP_COUNT+1))
		return
	fi

	# gh repo fork prints the created repo URL on stdout; parse it to detect the rare
	# case where GitHub appends a "-N" suffix (typically because a stale redirect
	# blocks the desired name).  When that happens, try a rename to recover.
	local forkUrl
	forkUrl=$(gh repo fork "$2/$1" --clone=false 2>&1 | grep -E "^https://github.com/" | head -1)
	if [ -z "$forkUrl" ]
	then
		echo "     ! FAIL to fork: $2/$1"
		FAIL_COUNT=$((FAIL_COUNT+1))
		return
	fi
	local forkName=${forkUrl##*/}
	if [ "$forkName" = "$1" ]
	then
		echo "     + forked: $2/$1 -> $ME/$1"
		OK_COUNT=$((OK_COUNT+1))
		return
	fi
	# GitHub appended a -N suffix. Try to rename to the bare name.
	if gh api -X PATCH "repos/$ME/$forkName" -f name="$1" --silent 2>/dev/null
	then
		echo "     + forked: $2/$1 -> $ME/$1 (renamed from $forkName)"
		OK_COUNT=$((OK_COUNT+1))
	else
		echo "     ! forked as $ME/$forkName (rename to $1 failed; bare name may be taken)"
		FAIL_COUNT=$((FAIL_COUNT+1))
	fi
}

#
# Iterate one group's parallel arrays (names, owners, forkable) and fork each.
#   $1 shell variable suffix (e.g., "Fable")
#
process_fork_set()
{
	local groupSuffix="$1"
	eval "local names=(\"\${repositories${groupSuffix}[@]}\")"
	eval "local owners=(\"\${owners${groupSuffix}[@]}\")"
	eval "local forkable=(\"\${forkable${groupSuffix}[@]}\")"

	echo ""
	echo "#####[ $groupSuffix ]#####"
	for i in "${!names[@]}"
	do
		fork_repository "${names[$i]}" "${owners[$i]}" "${forkable[$i]}"
	done
}

process_fork_set "Fable"
process_fork_set "Meadow"
process_fork_set "Orator"
process_fork_set "Pict"
process_fork_set "Utility"
process_fork_set "Apps"

echo ""
echo "### Summary"
echo "###   Forked:  $OK_COUNT"
echo "###   Skipped: $SKIP_COUNT  (already-forked + non-forkable)"
echo "###   Failed:  $FAIL_COUNT"
echo ""
if [ "$FAIL_COUNT" -gt 0 ]
then
	echo "### Some forks failed.  Re-run after fixing."
	exit 1
fi
echo "### Next: run ./Checkout.sh to clone your forks."
