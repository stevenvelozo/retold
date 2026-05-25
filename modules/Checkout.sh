#!/bin/bash
echo "### Checking out Retold modules into: [$(pwd)/..."

. ${BASH_SOURCE%/*}/Include-Retold-Module-List.sh

#
# Identify the current GitHub user. Forkable modules will clone from $ME/<repo>;
# read-only modules clone from their per-module Owner.
#
ME=$(gh api user --jq '.login' 2>/dev/null)
if [ -z "$ME" ]
then
	echo "ERROR: cannot determine your GitHub user. Run 'gh auth login' first."
	exit 1
fi
echo "### Cloning as: $ME (canonical org: $canonicalOrg)"

#
# Clone one repository if not already on disk.
#   $1 group path (e.g., "fable")
#   $2 module name
#   $3 canonical owner (org or personal)
#   $4 forkable flag ("1" = clone $ME's fork, "0" = clone owner directly)
#
check_out_repository()
{
	CWD=$(pwd)
	if [ -d "$CWD/$1/$2" ]
	then
		echo "     > A $2 source directory already exists in $1.... skipping checkout."
		return
	elif [ -f "$CWD/$1/$2" ]
	then
		echo "     > A $2 file already exists in $1... skipping checkout."
		return
	fi

	local cloneOwner
	if [ "$4" = "1" ]
	then
		cloneOwner="$ME"
	else
		cloneOwner="$3"
	fi

	if ! git clone https://github.com/${cloneOwner}/${2}.git ./$1/$2
	then
		echo "     ! Failed to clone ${cloneOwner}/${2}.  (If forkable, run ./Fork.sh first.)"
		return
	fi

	# For forkable modules, point upstream at the canonical owner for PR sync.
	if [ "$4" = "1" ]
	then
		(cd "./$1/$2" && git remote add upstream https://github.com/${3}/${2}.git)
		echo "     + added upstream remote: ${3}/${2}"
	fi
}

#
# Iterate one group's parallel arrays (names, owners, forkable) and check each out.
#   $1 group path on disk (e.g., "fable")
#   $2 shell variable suffix (e.g., "Fable" for repositoriesFable/ownersFable/forkableFable)
#
process_repository_set()
{
	local groupPath="$1"
	local groupSuffix="$2"
	eval "local names=(\"\${repositories${groupSuffix}[@]}\")"
	eval "local owners=(\"\${owners${groupSuffix}[@]}\")"
	eval "local forkable=(\"\${forkable${groupSuffix}[@]}\")"

	for i in "${!names[@]}"
	do
		echo ""
		echo "#####[ $groupPath -> ${names[$i]} ]#####"
		check_out_repository "$groupPath" "${names[$i]}" "${owners[$i]}" "${forkable[$i]}"
	done
}

process_repository_set "fable" "Fable"
process_repository_set "meadow" "Meadow"
process_repository_set "orator" "Orator"
process_repository_set "pict" "Pict"
process_repository_set "utility" "Utility"
process_repository_set "apps" "Apps"
