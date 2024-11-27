#!/bin/bash
echo "### Checking out Retold modules into: [$(pwd)/..."

. ${BASH_SOURCE%/*}/Include-Retold-Module-List.sh

#
# This function attempts to checkout a repository from github relative to the current script folder
check_out_repository()
{
#	echo "###--> attempting to check out the repository for $2 in $1"
	CWD=$(pwd)
	if [ -d "$CWD/$1/$2" ] 
	then
		echo "     > A $2 source directory already exists in $1.... skipping checkout."
	elif [ -f "$CWD/$1/$2" ]; then
		echo "     > A $2 file already exists in $1... skipping checkout."
	else
		git clone https://github.com/stevenvelozo/$2 ./$1/$2
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
		echo ""
		echo "#####[ $repositorySetName -> $repositoryAddress ]#####"
		check_out_repository $repositorySetName $repositoryAddress
	done
}

process_repository_set "fable" "${repositoriesFable[@]}"
process_repository_set "meadow" "${repositoriesMeadow[@]}"
process_repository_set "orator" "${repositoriesOrator[@]}"
process_repository_set "pict" "${repositoriesPict[@]}"
process_repository_set "utility" "${repositoriesUtility[@]}"
