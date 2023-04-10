#!/bin/bash
#
# This function checks the status of a repository

status_repository()
{
	echo "  --> attempting to get the status of the repository for $2 in $1"
	CWD=$(pwd)
	if [ -d "$CWD/modules/$1/$2" ]
	then
		echo "    # A $2 source directory exists in $1 -- chcking status...."
		cd "$CWD/modules/$1/$2"
		git status
		echo "    ..."
		cd "../../.."
	else
		echo "    The $2 source directory does not exist in $1 -- maybe you need to run the Checkout script?"
	fi
}