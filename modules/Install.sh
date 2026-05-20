#!/bin/bash
echo "Installing Retold module dependencies into: [$(pwd)/...]"

. ${BASH_SOURCE%/*}/Include-Retold-Module-List.sh

#
# Run `npm install` inside a single cloned module repo. Skips folders
# that haven't been checked out yet (run Checkout.sh first) and skips
# folders that don't have a package.json (defensive — a module might
# legitimately not be a node package).
install_repository()
{
	CWD=$(pwd)
	if [ ! -d "$CWD/$1/$2" ]
	then
		echo "       # The $2 source directory does not exist in $1 — run Checkout.sh first."
		return
	fi
	if [ ! -f "$CWD/$1/$2/package.json" ]
	then
		echo "       # No package.json in $1/$2 — skipping."
		return
	fi
	cd "$CWD/$1/$2"
	# --no-audit / --no-fund: keep the per-module log output focused on
	# what actually got installed (and what failed). Audit/fund summaries
	# are dozens of lines per module and drown out real errors.
	npm install --no-audit --no-fund
	cd "../.."
	echo "      <-- install attempt complete for repository $2 in $1"
}

process_repository_set()
{
	local repositorySetName="$1"
	shift
	local repositorySetRepositories=("$@")
	for repositoryAddress in ${repositorySetRepositories[@]}; do
		echo ""
		echo "[ I ] --> #####[ $repositorySetName -> $repositoryAddress ]#####"
		install_repository $repositorySetName $repositoryAddress
	done
}

process_repository_set "fable"   "${repositoriesFable[@]}"
process_repository_set "meadow"  "${repositoriesMeadow[@]}"
process_repository_set "orator"  "${repositoriesOrator[@]}"
process_repository_set "pict"    "${repositoriesPict[@]}"
process_repository_set "utility" "${repositoriesUtility[@]}"
process_repository_set "apps"    "${repositoriesApps[@]}"
