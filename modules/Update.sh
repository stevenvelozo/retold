#!/bin/bash
echo "Checking out Retold modules into: [$(pwd)/..."

. ${BASH_SOURCE%/*}/Include-Retold-Module-List.sh

#
# This function attempts to update a repository from github relative to the current script folder
update_repository()
{
#	echo "    ###--> attempting to update the repository for $2 in $1"
	CWD=$(pwd)
	if [ -d "$CWD/$1/$2" ]
	then
#		echo "       # A $2 source directory exists in $1 -- updating with rebase...."
		cd "$CWD/$1/$2"
		git pull --rebase
#		echo "       ..."
		cd "../.."
	else
		echo "       # The $2 source directory does not exist in $1 -- maybe you need to run the Checkout script?"
	fi
	echo "      <-- update attempt complete for repository $2 in $1"
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
		echo ""
		echo "[ U ] --> #####[ $repositorySetName -> $repositoryAddress ]#####"
		update_repository $repositorySetName $repositoryAddress
	done
}

process_repository_set "fable" "${repositoriesFable[@]}"
process_repository_set "meadow" "${repositoriesMeadow[@]}"
process_repository_set "orator" "${repositoriesOrator[@]}"
process_repository_set "pict" "${repositoriesPict[@]}"
process_repository_set "utility" "${repositoriesUtility[@]}"
