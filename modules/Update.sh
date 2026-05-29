#!/bin/bash
#
# Update.sh — pull every module in the manifest.  Defaults to --rebase so fork-flow
# work-in-progress on local branches is preserved cleanly.  Pass a different
# pull strategy as the first argument to override:
#   ./Update.sh                # --rebase  (default)
#   ./Update.sh --merge        # merge commits
#   ./Update.sh --ff-only      # fail if non-fast-forward
#   ./Update.sh --no-rebase    # use git's configured default
#
# The pull is always from each branch's tracking remote (origin) — for forks
# that's your personal fork, NOT the org.  After pulling, any module that has an
# `upstream` remote also gets a fetch-only `git fetch upstream`, so the manager's
# fork-vs-upstream drift counts refresh.  This never merges or rebases the org's
# commits into your working tree — pulling the org down stays behind the explicit
# Sync-Upstream.sh action.
#
PULL_STRATEGY="${1:---rebase}"
echo "Checking out Retold modules into: [$(pwd)/...   (pull strategy: $PULL_STRATEGY)"

. ${BASH_SOURCE%/*}/Include-Retold-Module-List.sh

#
# This function attempts to update a repository from github relative to the current script folder
update_repository()
{
#	echo "    ###--> attempting to update the repository for $2 in $1"
	CWD=$(pwd)
	if [ -d "$CWD/$1/$2" ]
	then
#		echo "       # A $2 source directory exists in $1 -- updating with $PULL_STRATEGY...."
		cd "$CWD/$1/$2"
		git pull "$PULL_STRATEGY"
		# Refresh the upstream (org) remote-tracking refs too, so the manager's
		# fork-vs-upstream drift counts are current after an Update. Fetch-only —
		# this never merges/rebases org changes into the working tree (pulling
		# the org down stays behind the explicit Sync-Upstream action).
		if git remote get-url upstream >/dev/null 2>&1
		then
			echo "       # fetching upstream (org) refs for drift…"
			git fetch upstream
		fi
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
process_repository_set "apps" "${repositoriesApps[@]}"
