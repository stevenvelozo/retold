#!/usr/bin/env bash
#
# Sync-And-Document-DataImport.sh
# -----------------------------------------------------------------------------
# Post-publish housekeeping for the data-import stack:
#
#   1. SYNC meadow-integration's release commit to the canonical repo
#      (rebase the fork's main onto upstream/main, push to upstream=fable-retold,
#       realign origin=your fork with --force-with-lease).
#
#   2. REGISTER the three new modules in the retold manifest
#      (Retold-Modules-Manifest.json -> Pict group) and regenerate the shell module
#      list (npm run rebuild-modules), then validate (npm run audit).
#
#   3. STAGE the example apps into the docs by flagging each example's package.json
#      with retold.ExampleApplication { Stage:true, ... }.
#
#   4. REBUILD the foundational docs (npm run build-docs = quack prepare-docs):
#      regenerates docs/retold-catalog.json + keyword index + version placard, and
#      builds + stages the flagged examples into docs/examples/<name>/.
#
# WHAT THIS DOES NOT DO (hand-maintained — edit yourself afterward; reminder printed):
#   - modules/Retold-Modules.md         (human module list)
#   - docs/modules/pict.md, docs/_sidebar.md, docs/_cover.md prose
#
# SAFE BY DEFAULT: DRY RUN unless you pass --apply. The dry run prints the git
# commands, the manifest entries + example flags it would add, and the doc commands
# it would run — but pushes nothing, edits no files, and runs no doc build.
#
# Usage:
#   ./Sync-And-Document-DataImport.sh                  # dry run (review first)
#   ./Sync-And-Document-DataImport.sh --apply          # do it
#   ./Sync-And-Document-DataImport.sh --apply --skip-sync   # docs/manifest only (no upstream push)
#   ./Sync-And-Document-DataImport.sh --apply --skip-docs   # only sync meadow-integration upstream
# -----------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export RETOLD_ROOT="${SCRIPT_DIR}"
MI_DIR="${RETOLD_ROOT}/modules/meadow/meadow-integration"
DATAIMPORT_DIR="${RETOLD_ROOT}/modules/pict/pict-section-dataimport"
UPLOAD_DIR="${RETOLD_ROOT}/modules/pict/pict-section-upload"
ACCORDION_DIR="${RETOLD_ROOT}/modules/pict/pict-section-accordion"

DRY_RUN=1; DO_SYNC=1; DO_DOCS=1
while [ $# -gt 0 ]; do
	case "$1" in
		--apply) DRY_RUN=0 ;;
		--skip-sync) DO_SYNC=0 ;;
		--skip-docs) DO_DOCS=0 ;;
		-h|--help) sed -n '2,40p' "${BASH_SOURCE[0]}"; exit 0 ;;
		*) echo "Unknown argument: $1" >&2; exit 1 ;;
	esac
	shift
done
export DRY="${DRY_RUN}"

echo "============================================================"
[ "${DRY_RUN}" -eq 1 ] && echo "  DRY RUN — prints planned actions; changes nothing." || echo "  *** APPLY — will push upstream + edit files + rebuild docs. ***"
echo "============================================================"

command -v node >/dev/null || { echo "node not found." >&2; exit 1; }

# =============================================================================
# 1. Sync meadow-integration's release commit to upstream (fable-retold)
# =============================================================================
if [ "${DO_SYNC}" -eq 1 ]; then
	echo
	echo ">>> 1. Sync meadow-integration release commit to upstream"
	[ -d "${MI_DIR}/.git" ] || { echo "    ! ${MI_DIR} is not a git repo." >&2; exit 1; }
	MI_BRANCH="$(git -C "${MI_DIR}" symbolic-ref --short HEAD 2>/dev/null || true)"
	[ -n "${MI_BRANCH}" ] || { echo "    ! meadow-integration is in a detached HEAD state." >&2; exit 1; }
	git -C "${MI_DIR}" remote get-url upstream >/dev/null 2>&1 || { echo "    ! no 'upstream' remote on meadow-integration." >&2; exit 1; }
	git -C "${MI_DIR}" remote get-url origin   >/dev/null 2>&1 || { echo "    ! no 'origin' remote on meadow-integration." >&2; exit 1; }

	# Sanity: the engine export should be a committed, tracked file (i.e. the release commit exists).
	if ! git -C "${MI_DIR}" ls-files --error-unmatch source/Meadow-Integration-Engine.js >/dev/null 2>&1; then
		echo "    ! source/Meadow-Integration-Engine.js is not committed in meadow-integration."
		echo "      Run the publish script first (it bumps + commits the engine export), or commit it, then re-run."
		[ "${DRY_RUN}" -eq 0 ] && exit 1
	fi

	if [ "${DRY_RUN}" -eq 1 ]; then
		echo "    [dry-run] cd ${MI_DIR}"
		echo "    [dry-run] git fetch upstream"
		echo "    [dry-run] git rebase upstream/${MI_BRANCH}"
		echo "    [dry-run] git push upstream ${MI_BRANCH}                      # land release on canonical (fable-retold)"
		echo "    [dry-run] git push --force-with-lease origin ${MI_BRANCH}     # realign your fork"
	else
		( set -e; cd "${MI_DIR}"
			[ -z "$(git status --porcelain)" ] || { echo "    ! working tree not clean — commit/stash meadow-integration changes first." >&2; exit 1; }
			git fetch upstream
			if ! git rebase "upstream/${MI_BRANCH}"; then
				git rebase --abort || true
				echo "    ! rebase onto upstream/${MI_BRANCH} hit conflicts — resolve in meadow-integration, then re-run." >&2
				exit 1
			fi
			if ! git push upstream "${MI_BRANCH}"; then
				echo "    ! push to upstream/${MI_BRANCH} failed (branch protection or perms?)." >&2
				echo "      Open a PR from ${MI_BRANCH} on your fork to fable-retold:${MI_BRANCH} instead." >&2
				exit 1
			fi
			git push --force-with-lease origin "${MI_BRANCH}"
			echo "    Synced meadow-integration ${MI_BRANCH}: upstream (fable-retold) + origin (fork) updated."
		)
	fi
else
	echo
	echo ">>> 1. Sync meadow-integration: SKIPPED (--skip-sync)"
fi

if [ "${DO_DOCS}" -eq 0 ]; then
	echo
	echo "(docs/manifest skipped via --skip-docs)"
	echo "Done."
	exit 0
fi

# =============================================================================
# 2. Register the three modules in the manifest + regenerate the shell list
# =============================================================================
echo
echo ">>> 2. Register modules in Retold-Modules-Manifest.json (Pict group)"
node <<'NODE'
const fs = require('fs');
const DRY = process.env.DRY === '1';
const ROOT = process.env.RETOLD_ROOT;
const FILE = ROOT + '/Retold-Modules-Manifest.json';
const m = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const pict = (m.Groups || []).find((g) => g.Name === 'Pict');
if (!pict) { console.error('    ! Pict group not found in the manifest.'); process.exit(1); }
const ENTRIES = [
	{ Name: 'pict-section-upload', Path: 'modules/pict/pict-section-upload',
		Description: 'Themeable dropzone file-upload control -- drag-and-drop, multi-file, per-file progress, read-in-browser or stream-to-server via a host-agnostic UploadTarget seam.',
		GitHub: 'https://github.com/fable-retold/pict-section-upload', Documentation: 'https://fable-retold.github.io/pict-section-upload/',
		RelatedModules: [ 'pict', 'pict-view', 'pict-provider' ], Type: 'library' },
	{ Name: 'pict-section-accordion', Path: 'modules/pict/pict-section-accordion',
		Description: 'Multi-step container that renders as an accordion, wizard, or stepper over one shared serializable step state, with per-step CanAdvance gating.',
		GitHub: 'https://github.com/fable-retold/pict-section-accordion', Documentation: 'https://fable-retold.github.io/pict-section-accordion/',
		RelatedModules: [ 'pict', 'pict-view', 'pict-provider' ], Type: 'library' },
	{ Name: 'pict-section-dataimport', Path: 'modules/pict/pict-section-dataimport',
		Description: 'Embeddable, configurable data-import wizard -- upload CSV/TSV/Excel/fixed-width, map columns to a Meadow or host-config schema, generate comprehensions, and push.',
		GitHub: 'https://github.com/fable-retold/pict-section-dataimport', Documentation: 'https://fable-retold.github.io/pict-section-dataimport/',
		RelatedModules: [ 'pict-section-upload', 'pict-section-accordion', 'pict-section-form', 'pict-section-recordset', 'meadow-integration' ], Type: 'library' },
];
const added = [];
for (const e of ENTRIES) {
	if (!pict.Modules.some((x) => x.Name === e.Name)) { if (!DRY) { pict.Modules.push(e); } added.push(e.Name); }
}
if (DRY) {
	console.log('    [dry-run] would add to Pict group: ' + (added.join(', ') || '(none -- already present)'));
} else {
	if (added.length > 0) { fs.writeFileSync(FILE, JSON.stringify(m, null, '\t') + '\n'); }
	console.log('    added: ' + (added.join(', ') || '(none -- already present)'));
}
NODE

echo
echo ">>> 3. Regenerate the shell module list + audit"
if [ "${DRY_RUN}" -eq 1 ]; then
	echo "    [dry-run] (cd ${RETOLD_ROOT} && npm run rebuild-modules && npm run audit)"
	echo "    [dry-run] running a read-only audit of the CURRENT state:"
	( cd "${RETOLD_ROOT}" && npm run --silent audit || true )
else
	( cd "${RETOLD_ROOT}" && npm run rebuild-modules )
	# Audit is INFORMATIONAL: this repo has pre-existing manifest-vs-disk drift for modules that
	# simply aren't cloned locally (e.g. pict-provider-graphgeometry, pict-section-comments) — that is
	# unrelated to this change, so don't let it abort the run. After --apply, the "missing from
	# manifest" count for our 3 modules should be 0.
	echo "    audit (informational; pre-existing un-cloned-module drift is expected):"
	( cd "${RETOLD_ROOT}" && npm run --silent audit ) || true
fi

# =============================================================================
# 4. Flag the example apps for doc staging (retold.ExampleApplication)
# =============================================================================
echo
echo ">>> 4. Flag example apps for staging (retold.ExampleApplication.Stage)"
node <<'NODE'
const fs = require('fs');
const DRY = process.env.DRY === '1';
const ROOT = process.env.RETOLD_ROOT;
const EX = [
	{ dir: ROOT + '/modules/pict/pict-section-upload/example_applications/upload_demo',
		block: { Stage: true, Title: 'File Upload Dropzone', Summary: 'pict-section-upload: drag-and-drop / browse, read a file in the browser, and a mock server upload with progress.', Complexity: 'Basic' } },
	{ dir: ROOT + '/modules/pict/pict-section-accordion/example_applications/accordion_demo',
		block: { Stage: true, Title: 'Accordion / Wizard / Stepper', Summary: 'pict-section-accordion: the same step set in all three render modes, with a gated wizard step + external controls.', Complexity: 'Basic' } },
	{ dir: ROOT + '/modules/pict/pict-section-dataimport/example_applications/archive_import',
		block: { Stage: true, Title: 'Archive.org Import', Summary: 'pict-section-dataimport: generate Archive.org-shaped comprehensions (item / collection / join) from a CSV -- complex non-Meadow schema in app config, no server needed.', Complexity: 'Intermediate' } },
	{ dir: ROOT + '/modules/pict/pict-section-dataimport/example_applications/books_import',
		block: { Stage: true, Title: 'Books Import (harness)', Summary: 'pict-section-dataimport: import a books CSV into the bookstore harness (Meadow schema + EntityProvider push). Runtime needs retold-harness on :8086.', Complexity: 'Intermediate' } },
];
for (const x of EX) {
	const file = x.dir + '/package.json';
	if (!fs.existsSync(file)) { console.log('    ! missing: ' + file); continue; }
	const p = JSON.parse(fs.readFileSync(file, 'utf8'));
	if (p.retold && p.retold.ExampleApplication && p.retold.ExampleApplication.Stage) { console.log('    flag present: ' + x.block.Title); continue; }
	if (DRY) { console.log('    [dry-run] would flag: ' + x.block.Title); continue; }
	p.retold = p.retold || {};
	p.retold.ExampleApplication = x.block;
	fs.writeFileSync(file, JSON.stringify(p, null, '\t') + '\n');
	console.log('    flagged: ' + x.block.Title);
}
NODE

# =============================================================================
# 5. Rebuild the foundational docs (stages the flagged examples too)
# =============================================================================
echo
echo ">>> 5. Rebuild foundational docs (npm run build-docs)"
if [ "${DRY_RUN}" -eq 1 ]; then
	echo "    [dry-run] ensure pict-section-dataimport dev symlinks (so the example builds resolve)"
	echo "    [dry-run] (cd ${RETOLD_ROOT} && npm run build-docs)"
	echo "              -> regenerates docs/retold-catalog.json + retold-keyword-index.json + _version.json,"
	echo "                 and builds + stages upload_demo / accordion_demo / archive_import / books_import into docs/examples/."
else
	# The dataimport example builds require its sibling + engine symlinks (node_modules is git-ignored,
	# so nothing here is committed or published).
	NM="${DATAIMPORT_DIR}/node_modules"; mkdir -p "${NM}"
	for pair in "pict-section-upload:${UPLOAD_DIR}" "pict-section-accordion:${ACCORDION_DIR}" "meadow-integration:${MI_DIR}"; do
		rm -rf "${NM}/${pair%%:*}"; ln -s "${pair#*:}" "${NM}/${pair%%:*}"
	done
	( cd "${RETOLD_ROOT}" && npm run build-docs )
fi

# =============================================================================
# Summary
# =============================================================================
echo
echo "============================================================"
if [ "${DRY_RUN}" -eq 1 ]; then
	echo "  DRY RUN complete. Nothing changed. Re-run with --apply."
else
	echo "  DONE."
	[ "${DO_SYNC}" -eq 1 ] && echo "    * meadow-integration release synced to upstream (fable-retold) + fork."
	echo "    * 3 modules registered in the manifest; shell list regenerated (audit run; our 3 now present)."
	echo "    * 4 examples flagged + staged into docs/examples/; docs catalog rebuilt."
	echo
	echo "  HAND-MAINTAINED FOLLOW-UPS (not automated):"
	echo "    * modules/Retold-Modules.md  — add a line for each of the 3 modules."
	echo "    * docs/modules/pict.md, docs/_sidebar.md, docs/_cover.md — add nav/prose if desired."
	echo "    * Commit: the root repo (manifest + Include-Retold-Module-List.sh + docs/), and each"
	echo "      module repo's example package.json (the new retold.ExampleApplication flag)."
	echo "    * Deploy docs: push retold/docs (GitHub Pages = fable-retold.io); purge the pict-docuserve @1 CDN if needed."
fi
echo "============================================================"
