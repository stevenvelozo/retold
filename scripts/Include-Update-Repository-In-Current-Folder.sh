#!/bin/bash
#
# This function attempts to update a repository from github relative to the current script folder

update_repository()
{
	echo "  --> attempting to update the repository for $2 in $1"
	CWD=$(pwd)
	if [ -d "$CWD/modules/$1/$2" ]
	then
		echo "    # A $2 source directory exists in $1 -- updating with rebase...."
		cd "$CWD/modules/$1/$2"
		git pull --rebase
		echo "    ..."
		cd "../../.."
	else
		echo "    The $2 source directory does not exist in $1 -- maybe you need to run the Checkout script?"
	fi
}