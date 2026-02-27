#!/bin/bash
echo "Checking diffs of Retold modules in: [$(pwd)/..."

. ${BASH_SOURCE%/*}/Include-Retold-Module-List.sh

TOTAL_REPOS=0
CHANGED_REPOS=0
MISSING_REPOS=0
CHANGED_FILES=0

#
# This function shows the diff of a repository, only showing output if there are uncommitted changes
diff_repository()
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
			# Count changed files
			FILE_COUNT=$(git status --porcelain | wc -l | tr -d ' ')
			CHANGED_FILES=$((CHANGED_FILES + FILE_COUNT))
			echo ""
			echo "================================================================"
			echo "#####[ $1 -> $2 ]##### ($FILE_COUNT files changed)"
			echo "================================================================"
			# Show staged diff
			STAGED=$(git diff --cached --stat)
			if [ -n "$STAGED" ]
			then
				echo "--- Staged changes ---"
				git diff --cached
			fi
			# Show unstaged diff
			UNSTAGED=$(git diff --stat)
			if [ -n "$UNSTAGED" ]
			then
				echo "--- Unstaged changes ---"
				git diff
			fi
			# Show untracked files
			UNTRACKED=$(git ls-files --others --exclude-standard)
			if [ -n "$UNTRACKED" ]
			then
				echo "--- Untracked files ---"
				echo "$UNTRACKED"
			fi
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
	# Enumerate all repository addresses and diff them
	for repositoryAddress in ${repositorySetRepositories[@]}; do
		diff_repository $repositorySetName $repositoryAddress
	done
}

process_repository_set "fable" "${repositoriesFable[@]}"
process_repository_set "meadow" "${repositoriesMeadow[@]}"
process_repository_set "orator" "${repositoriesOrator[@]}"
process_repository_set "pict" "${repositoriesPict[@]}"
process_repository_set "utility" "${repositoriesUtility[@]}"
process_repository_set "apps" "${repositoriesApps[@]}"

echo ""
echo "===== Diff Summary ====="
echo "$TOTAL_REPOS modules checked, $CHANGED_REPOS with uncommitted changes ($CHANGED_FILES files total), $((TOTAL_REPOS - CHANGED_REPOS - MISSING_REPOS)) clean"
if [ $MISSING_REPOS -gt 0 ]
then
	echo "$MISSING_REPOS modules not checked out (run Checkout.sh)"
fi
