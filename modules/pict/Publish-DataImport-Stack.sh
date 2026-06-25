#!/usr/bin/env bash
#
# Publish-DataImport-Stack.sh
# -----------------------------------------------------------------------------
# Creates the GitHub repos (on the fable-retold org, with your stevenvelozo fork)
# and publishes the data-import module stack to npm, in DEPENDENCY ORDER:
#
#   0. meadow-integration   (existing repo) — version-bumped so the new browser-safe
#                            engine export source/Meadow-Integration-Engine.js ships;
#                            committed + pushed to origin; npm published.
#   1. pict-section-upload      (new repo)
#   2. pict-section-accordion   (new repo)
#   3. pict-section-dataimport  (new repo; peers on all the above; published last)
#
# GIT: for each NEW module it mirrors your fork convention exactly —
#   * canonical repo created at github.com/fable-retold/<name>  (remote: upstream)
#   * forked to github.com/<you>/<name>                          (remote: origin)
#   * local `main` tracks origin (the fork); code lands on both.
# So Checkout.sh / Update.sh / Sync-Upstream.sh + the manager treat them like every
# other module. (Pass --no-fork to create on fable-retold only, origin=fable-retold.)
#
# WHY meadow-integration is here: pict-section-dataimport requires
# `meadow-integration/source/Meadow-Integration-Engine.js`, which the published
# meadow-integration@1.0.42 does NOT contain — so dataimport is broken unless
# meadow-integration is republished with it and dataimport's peer range bumped to
# match. This script does both. (Pass --skip-meadow to handle it yourself, or vendor
# the engine files into dataimport instead and drop the peer dep.)
#
# SAFE BY DEFAULT: DRY RUN unless you pass --publish. The dry run runs the test
# suites + `npm publish --dry-run` and PRINTS every git/gh command it would run,
# but creates no repos, pushes nothing, publishes nothing, and edits no files.
#
# Usage:
#   ./Publish-DataImport-Stack.sh                       # dry run (do this first)
#   ./Publish-DataImport-Stack.sh --publish             # real: create repos + push + npm publish
#   ./Publish-DataImport-Stack.sh --publish --otp 123456
#   ./Publish-DataImport-Stack.sh --publish --no-fork           # fable-retold only (origin=fable-retold)
#   ./Publish-DataImport-Stack.sh --publish --no-git            # npm publish only, no git/repos
#   ./Publish-DataImport-Stack.sh --publish --skip-meadow       # leave meadow-integration to you
#   ./Publish-DataImport-Stack.sh --publish --meadow-ignore-scripts   # skip meadow-integration's prepublishOnly test
# -----------------------------------------------------------------------------
set -euo pipefail

# --- Paths (this script lives in retold/modules/pict/) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RETOLD_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PICT_DIR="${RETOLD_ROOT}/modules/pict"
MI_DIR="${RETOLD_ROOT}/modules/meadow/meadow-integration"
UPLOAD_DIR="${PICT_DIR}/pict-section-upload"
ACCORDION_DIR="${PICT_DIR}/pict-section-accordion"
DATAIMPORT_DIR="${PICT_DIR}/pict-section-dataimport"
ORG="fable-retold"

# --- Args ---
DRY_RUN=1; INCLUDE_MEADOW=1; MEADOW_IGNORE_SCRIPTS=0; OTP=""; DO_GIT=1; DO_FORK=1
while [ $# -gt 0 ]; do
	case "$1" in
		--publish) DRY_RUN=0 ;;
		--skip-meadow) INCLUDE_MEADOW=0 ;;
		--meadow-ignore-scripts) MEADOW_IGNORE_SCRIPTS=1 ;;
		--no-git) DO_GIT=0 ;;
		--no-fork) DO_FORK=0 ;;
		--otp) OTP="${2:-}"; shift ;;
		--otp=*) OTP="${1#*=}" ;;
		-h|--help) sed -n '2,52p' "${BASH_SOURCE[0]}"; exit 0 ;;
		*) echo "Unknown argument: $1" >&2; exit 1 ;;
	esac
	shift
done

NPM_PUBLISH_ARGS=(--access public)
[ -n "${OTP}" ] && NPM_PUBLISH_ARGS+=(--otp "${OTP}")

echo "============================================================"
if [ "${DRY_RUN}" -eq 1 ]; then
	echo "  DRY RUN — nothing is created, pushed, published, or edited."
	echo "  Re-run with --publish to do it for real."
else
	echo "  *** LIVE — repos WILL be created/pushed and packages published. ***"
fi
echo "============================================================"

# --- Pre-flight ---
command -v npm >/dev/null || { echo "npm not found." >&2; exit 1; }
NPM_USER="$(npm whoami 2>/dev/null || true)"
[ -n "${NPM_USER}" ] || { echo "Not logged in to npm. Run 'npm login'." >&2; exit 1; }
echo "npm user: ${NPM_USER}"

FORK_USER=""
if [ "${DO_GIT}" -eq 1 ]; then
	command -v gh >/dev/null || { echo "GitHub CLI 'gh' not found (needed for repo creation; or use --no-git)." >&2; exit 1; }
	gh auth status >/dev/null 2>&1 || { echo "gh is not authenticated. Run 'gh auth login'." >&2; exit 1; }
	FORK_USER="$(gh api user --jq .login 2>/dev/null || true)"
	[ -n "${FORK_USER}" ] || { echo "Could not resolve your GitHub login via gh." >&2; exit 1; }
	echo "GitHub user (fork owner): ${FORK_USER}  |  canonical org: ${ORG}"
	git config user.email >/dev/null 2>&1 || echo "  ! git user.email is not set — commits may fail. Run: git config --global user.email you@example.com"
fi

# --- Helpers ---
pkg_version () { node -p "require('$1/package.json').version"; }

check_npm_name () {
	local NAME="$1" PUBLISHED
	PUBLISHED="$(npm view "${NAME}" version 2>/dev/null || true)"
	if [ -n "${PUBLISHED}" ]; then
		echo "  ! ${NAME}: already on npm at ${PUBLISHED} — a 1.0.0 first publish FAILS unless you own it + bump."
	else
		echo "  ✓ ${NAME}: free on npm (clean first publish)."
	fi
}

ensure_repo_hygiene () {
	# Source-only repo: keep build output + node_modules out of git (bundles are rebuildable; npm
	# publishes from files:["source"] anyway). Add an MIT LICENSE if the module has none.
	touch .gitignore
	grep -qxF 'node_modules/' .gitignore || printf 'node_modules/\n' >> .gitignore
	grep -qxF 'dist/' .gitignore || printf 'dist/\n' >> .gitignore
	if [ ! -f LICENSE ]; then
		cat > LICENSE <<-LICENSEEOF
		MIT License

		Copyright (c) 2026 Steven Velozo

		Permission is hereby granted, free of charge, to any person obtaining a copy
		of this software and associated documentation files (the "Software"), to deal
		in the Software without restriction, including without limitation the rights
		to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
		copies of the Software, and to permit persons to whom the Software is
		furnished to do so, subject to the following conditions:

		The above copyright notice and this permission notice shall be included in all
		copies or substantial portions of the Software.

		THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
		IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
		FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
		AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
		LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
		OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
		SOFTWARE.
		LICENSEEOF
	fi
}

# Create a NEW module's repo on fable-retold (+ your fork), wiring origin=fork / upstream=fable-retold.
setup_new_repo () {
	local DIR="$1" NAME="$2"
	local VER; VER="$(pkg_version "${DIR}")"
	local UP_SLUG="${ORG}/${NAME}" FORK_SLUG="${FORK_USER}/${NAME}"
	echo
	echo ">>> git: ${NAME}  (canonical ${UP_SLUG}$([ "${DO_FORK}" -eq 1 ] && echo " + fork ${FORK_SLUG}"))"

	if [ "${DRY_RUN}" -eq 1 ]; then
		echo "    [dry-run] cd ${DIR}; ensure .gitignore(dist/,node_modules/) + LICENSE"
		echo "    [dry-run] git init -q; git add -A; git commit -m 'Initial commit: ${NAME} v${VER}'; git branch -M main"
		if [ "${DO_FORK}" -eq 1 ]; then
			echo "    [dry-run] gh repo create ${UP_SLUG} --public --source=. --remote=upstream --push   (skip if exists)"
			echo "    [dry-run] gh repo fork ${UP_SLUG} --clone=false                                     (skip if exists)"
			echo "    [dry-run] git remote add origin https://github.com/${FORK_SLUG}.git; git push -u origin main"
		else
			echo "    [dry-run] gh repo create ${UP_SLUG} --public --source=. --remote=origin --push      (skip if exists)"
		fi
		return 0
	fi

	( set -e; cd "${DIR}"
		ensure_repo_hygiene
		[ -d .git ] || git init -q
		git add -A
		if git rev-parse --verify HEAD >/dev/null 2>&1; then
			git diff --cached --quiet || git commit -q -m "Update ${NAME} for publish (v${VER})"
		else
			git commit -q -m "Initial commit: ${NAME} v${VER}"
		fi
		git branch -M main

		if [ "${DO_FORK}" -eq 1 ]; then
			# Canonical on fable-retold (remote: upstream)
			if gh repo view "${UP_SLUG}" >/dev/null 2>&1; then
				echo "    ${UP_SLUG} exists — ensuring 'upstream' + pushing"
				git remote get-url upstream >/dev/null 2>&1 && git remote set-url upstream "https://github.com/${UP_SLUG}.git" || git remote add upstream "https://github.com/${UP_SLUG}.git"
				git push upstream main
			else
				gh repo create "${UP_SLUG}" --public --source=. --remote=upstream --push
			fi
			# Your fork (remote: origin)
			if ! gh repo view "${FORK_SLUG}" >/dev/null 2>&1; then
				gh repo fork "${UP_SLUG}" --clone=false
				sleep 3   # let GitHub provision the fork before we push to it
			else
				echo "    fork ${FORK_SLUG} exists"
			fi
			git remote get-url origin >/dev/null 2>&1 && git remote set-url origin "https://github.com/${FORK_SLUG}.git" || git remote add origin "https://github.com/${FORK_SLUG}.git"
			git push -u origin main
		else
			if gh repo view "${UP_SLUG}" >/dev/null 2>&1; then
				git remote get-url origin >/dev/null 2>&1 && git remote set-url origin "https://github.com/${UP_SLUG}.git" || git remote add origin "https://github.com/${UP_SLUG}.git"
				git push -u origin main
			else
				gh repo create "${UP_SLUG}" --public --source=. --remote=origin --push
			fi
		fi
	)
}

npm_publish_dir () {
	local DIR="$1" LABEL="$2"; shift 2
	echo
	echo ">>> npm: ${LABEL}"
	( set -e; cd "${DIR}"
		npm test
		if [ "${DRY_RUN}" -eq 1 ]; then
			npm publish --dry-run "${NPM_PUBLISH_ARGS[@]}"
		else
			npm publish "${NPM_PUBLISH_ARGS[@]}"
		fi
	)
}

echo "--- npm name availability ---"
check_npm_name pict-section-upload
check_npm_name pict-section-accordion
check_npm_name pict-section-dataimport

# --- 0. meadow-integration (engine export) ---
NEW_MI_VERSION=""
if [ "${INCLUDE_MEADOW}" -eq 1 ]; then
	echo
	echo ">>> meadow-integration (browser-safe engine export)"
	[ -f "${MI_DIR}/source/Meadow-Integration-Engine.js" ] || { echo "    ! engine export file missing!" >&2; exit 1; }
	if [ "${DRY_RUN}" -eq 1 ]; then
		NEW_MI_VERSION="$(node -p "let v=require('${MI_DIR}/package.json').version.split('.'); v[2]=+v[2]+1; v.join('.')")"
		echo "    [dry-run] npm version patch --no-git-tag-version  ($(pkg_version "${MI_DIR}") -> ${NEW_MI_VERSION})"
		echo "    [dry-run] set pict-section-dataimport peer: meadow-integration >=${NEW_MI_VERSION}"
		[ "${DO_GIT}" -eq 1 ] && echo "    [dry-run] git add package.json source/Meadow-Integration-Engine.js; commit; git push origin HEAD"
		( cd "${MI_DIR}" && npm publish --dry-run "${NPM_PUBLISH_ARGS[@]}" )
	else
		( cd "${MI_DIR}" && npm version patch --no-git-tag-version >/dev/null )
		NEW_MI_VERSION="$(pkg_version "${MI_DIR}")"
		echo "    meadow-integration -> ${NEW_MI_VERSION}"
		( cd "${DATAIMPORT_DIR}" && npm pkg set "peerDependencies.meadow-integration=>=${NEW_MI_VERSION}" )
		echo "    set pict-section-dataimport peer: meadow-integration >=${NEW_MI_VERSION}"
		if [ "${DO_GIT}" -eq 1 ]; then
			( set -e; cd "${MI_DIR}"
				git add package.json source/Meadow-Integration-Engine.js
				git diff --cached --quiet || git commit -q -m "Add browser-safe Meadow-Integration-Engine export; release v${NEW_MI_VERSION}"
				git push origin HEAD
			)
			echo "    committed + pushed meadow-integration to origin (sync to upstream via your usual flow)."
		fi
		# prepublishOnly:"npm test" runs the full suite on publish; --meadow-ignore-scripts skips it.
		MI_PUB=("${NPM_PUBLISH_ARGS[@]}"); [ "${MEADOW_IGNORE_SCRIPTS}" -eq 1 ] && MI_PUB+=(--ignore-scripts)
		( cd "${MI_DIR}" && npm publish "${MI_PUB[@]}" )
	fi
else
	echo
	echo ">>> meadow-integration: SKIPPED (--skip-meadow). Note: dataimport needs a PUBLISHED"
	echo "    meadow-integration containing source/Meadow-Integration-Engine.js, and its peer range"
	echo "    ('$(node -p "require('${DATAIMPORT_DIR}/package.json').peerDependencies['meadow-integration']")') must require that version."
fi

# --- 1. pict-section-upload ---
[ "${DO_GIT}" -eq 1 ] && setup_new_repo "${UPLOAD_DIR}" "pict-section-upload"
npm_publish_dir "${UPLOAD_DIR}" "pict-section-upload"

# --- 2. pict-section-accordion ---
[ "${DO_GIT}" -eq 1 ] && setup_new_repo "${ACCORDION_DIR}" "pict-section-accordion"
npm_publish_dir "${ACCORDION_DIR}" "pict-section-accordion"

# --- 3. pict-section-dataimport (last — peers on the rest) ---
# Its tests + the engine require resolve through dev symlinks (the siblings + the local engine file
# aren't on npm at test time). node_modules is git-ignored, so none of this is committed/published.
if [ "${DRY_RUN}" -eq 0 ]; then
	NM="${DATAIMPORT_DIR}/node_modules"; mkdir -p "${NM}"
	for pair in "pict-section-upload:${UPLOAD_DIR}" "pict-section-accordion:${ACCORDION_DIR}" "meadow-integration:${MI_DIR}"; do
		rm -rf "${NM}/${pair%%:*}"; ln -s "${pair#*:}" "${NM}/${pair%%:*}"
	done
fi
[ "${DO_GIT}" -eq 1 ] && setup_new_repo "${DATAIMPORT_DIR}" "pict-section-dataimport"
npm_publish_dir "${DATAIMPORT_DIR}" "pict-section-dataimport"

# --- Summary ---
echo
echo "============================================================"
if [ "${DRY_RUN}" -eq 1 ]; then
	echo "  DRY RUN complete. Nothing changed. Re-run with --publish."
else
	echo "  DONE."
	[ "${INCLUDE_MEADOW}" -eq 1 ] && echo "    meadow-integration@${NEW_MI_VERSION}  (npm + pushed to origin)"
	echo "    pict-section-upload@$(pkg_version "${UPLOAD_DIR}")        (npm + ${ORG} + fork)"
	echo "    pict-section-accordion@$(pkg_version "${ACCORDION_DIR}")  (npm + ${ORG} + fork)"
	echo "    pict-section-dataimport@$(pkg_version "${DATAIMPORT_DIR}") (npm + ${ORG} + fork)"
	echo
	echo "  FOLLOW-UPS (not automated):"
	[ "${INCLUDE_MEADOW}" -eq 1 ] && echo "    * Sync meadow-integration's release commit to upstream (Sync-Upstream.sh / your PR flow)."
	echo "    * Register the 3 new modules in Retold-Modules-Manifest.json (forkable: true) + 'npm run rebuild-modules' + Retold-Modules.md."
fi
echo "============================================================"
