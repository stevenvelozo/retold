#!/bin/bash
#
# This function attempts to checkout a repository from github relative to the current script folder

check_out_repository()
{
	echo "  --> attempting to check out the repository for $2 in $1"
	CWD=$(pwd)
	if [ -d "$CWD/modules/$1/$2" ] 
	then
		echo "    > A $2 source directory already exists in $1.... skipping checkout."
	elif [ -f "$CWD/modules/$1/$2" ]; then
		echo "    > A $2 file already exists in $1... skipping checkout."
	else
		git clone https://github.com/stevenvelozo/$2 ./modules/$1/$2
	fi
}