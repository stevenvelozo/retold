#!/bin/bash
echo "Checking status of Retold modules in: [$(pwd)/..."

. ${BASH_SOURCE%/*}/Include-Retold-Module-List.sh

TOTAL_REPOS=0
CHANGED_REPOS=0
MISSING_REPOS=0

#
# This function checks the status of a repository, only showing output if there are changes
status_repository()
{
	CWD=$(pwd)
	TOTAL_REPOS=$((TOTAL_REPOS + 1))
	if [ -d "$CWD/$1/$2" ]
	then
		cd "$CWD/$1/$2"
		# Check if there are any changes (staged, unstaged, or untracked)
		if [ -n "$(git status --porcelain)" ]
		then
			CHANGED_REPOS=$((CHANGED_REPOS + 1))
			echo ""
			echo "#####[ $1 -> $2 ]#####"
			git status
		fi
		cd "$CWD"
	else
		MISSING_REPOS=$((MISSING_REPOS + 1))
	fi
}

process_repository_set()
{
	# Save first argument in a variable
	local repositorySetName="$1"
	# Shift all arguments to the left (original $1 gets lost)
	shift
	# Collapse all remaining arguments into an array
	local repositorySetRepositories=("$@") # Rebuild the array with rest of arguments
	# Enumerate all repository addresses and check them out
	for repositoryAddress in ${repositorySetRepositories[@]}; do
		status_repository $repositorySetName $repositoryAddress
	done
}

process_repository_set "fable" "${repositoriesFable[@]}"
process_repository_set "meadow" "${repositoriesMeadow[@]}"
process_repository_set "orator" "${repositoriesOrator[@]}"
process_repository_set "pict" "${repositoriesPict[@]}"
process_repository_set "utility" "${repositoriesUtility[@]}"

echo ""
echo "===== Summary ====="
echo "$TOTAL_REPOS modules checked, $CHANGED_REPOS with changes, $((TOTAL_REPOS - CHANGED_REPOS - MISSING_REPOS)) clean"
if [ $MISSING_REPOS -gt 0 ]
then
	echo "$MISSING_REPOS modules not checked out (run Checkout.sh)"
fi
