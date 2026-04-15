#!/usr/bin/env node
/**
 * Retold Modules Manifest Audit
 *
 * Compares three sources of truth for the retold module list:
 *   1. Retold-Modules-Manifest.json  (richest; has GitHub + docs URLs)
 *   2. modules/<group>/ directories on disk
 *   3. modules/Include-Retold-Module-List.sh (shell arrays)
 *
 * Reports every mismatch so the manifest can be reconciled before the
 * retold-manager tooling starts treating it as authoritative.
 *
 * Exit code: 0 if all three agree; 1 if any drift is found.
 *
 * Usage:
 *   node bin/manifest-audit.js
 *   node bin/manifest-audit.js --json       (machine-readable report)
 *   node bin/manifest-audit.js --fix-shell  (rewrites shell list from manifest)
 */

const libFs = require('fs');
const libPath = require('path');

// ─────────────────────────────────────────────
//  Paths
// ─────────────────────────────────────────────

const REPO_ROOT = libPath.resolve(__dirname, '..', '..', '..');
const MANIFEST_PATH = libPath.join(REPO_ROOT, 'Retold-Modules-Manifest.json');
const MODULES_ROOT = libPath.join(REPO_ROOT, 'modules');
const SHELL_LIST_PATH = libPath.join(MODULES_ROOT, 'Include-Retold-Module-List.sh');

// Mapping from the shell array variable name to the manifest group name.
// Manifest group names are TitleCase; disk/shell are lowercase.
const GROUP_ALIASES =
[
	{ ManifestName: 'Fable',    DiskName: 'fable',    ShellVar: 'repositoriesFable' },
	{ ManifestName: 'Meadow',   DiskName: 'meadow',   ShellVar: 'repositoriesMeadow' },
	{ ManifestName: 'Orator',   DiskName: 'orator',   ShellVar: 'repositoriesOrator' },
	{ ManifestName: 'Pict',     DiskName: 'pict',     ShellVar: 'repositoriesPict' },
	{ ManifestName: 'Utility',  DiskName: 'utility',  ShellVar: 'repositoriesUtility' },
	{ ManifestName: 'Apps',     DiskName: 'apps',     ShellVar: 'repositoriesApps' },
];

// ─────────────────────────────────────────────
//  Sources
// ─────────────────────────────────────────────

function loadManifest()
{
	let tmpContent = libFs.readFileSync(MANIFEST_PATH, 'utf8');
	let tmpManifest = JSON.parse(tmpContent);
	let tmpResult = {};
	for (let i = 0; i < tmpManifest.Groups.length; i++)
	{
		let tmpGroup = tmpManifest.Groups[i];
		tmpResult[tmpGroup.Name] = tmpGroup.Modules.map((pModule) => pModule.Name);
	}
	return tmpResult;
}

function loadDisk()
{
	let tmpResult = {};
	for (let i = 0; i < GROUP_ALIASES.length; i++)
	{
		let tmpAlias = GROUP_ALIASES[i];
		let tmpGroupPath = libPath.join(MODULES_ROOT, tmpAlias.DiskName);
		let tmpModules = [];

		try
		{
			let tmpEntries = libFs.readdirSync(tmpGroupPath);
			for (let j = 0; j < tmpEntries.length; j++)
			{
				let tmpEntry = tmpEntries[j];
				if (tmpEntry.startsWith('.')) { continue; }

				let tmpEntryPath = libPath.join(tmpGroupPath, tmpEntry);
				let tmpStat;
				try { tmpStat = libFs.statSync(tmpEntryPath); }
				catch (pError) { continue; }

				if (!tmpStat.isDirectory()) { continue; }

				// Skip directories without package.json -- those are not modules.
				let tmpPackagePath = libPath.join(tmpEntryPath, 'package.json');
				if (!libFs.existsSync(tmpPackagePath)) { continue; }

				tmpModules.push(tmpEntry);
			}
		}
		catch (pError)
		{
			// Group directory missing entirely
			tmpModules = [];
		}

		tmpResult[tmpAlias.ManifestName] = tmpModules.sort();
	}
	return tmpResult;
}

function loadShell()
{
	let tmpContent;
	try { tmpContent = libFs.readFileSync(SHELL_LIST_PATH, 'utf8'); }
	catch (pError) { return {}; }

	let tmpResult = {};
	for (let i = 0; i < GROUP_ALIASES.length; i++)
	{
		let tmpAlias = GROUP_ALIASES[i];
		// Match:  repositoriesFable=("fable" "fable-log" ...)
		let tmpRegex = new RegExp(tmpAlias.ShellVar + '=\\(([^\\)]*)\\)');
		let tmpMatch = tmpContent.match(tmpRegex);
		if (!tmpMatch)
		{
			tmpResult[tmpAlias.ManifestName] = [];
			continue;
		}

		let tmpModules = [];
		let tmpEntries = tmpMatch[1].match(/"([^"]+)"/g) || [];
		for (let j = 0; j < tmpEntries.length; j++)
		{
			tmpModules.push(tmpEntries[j].slice(1, -1));
		}
		tmpResult[tmpAlias.ManifestName] = tmpModules;
	}
	return tmpResult;
}

// ─────────────────────────────────────────────
//  Comparison
// ─────────────────────────────────────────────

function diff(pA, pB)
{
	let tmpSetA = new Set(pA);
	let tmpSetB = new Set(pB);
	let tmpOnlyInA = pA.filter((pItem) => !tmpSetB.has(pItem));
	let tmpOnlyInB = pB.filter((pItem) => !tmpSetA.has(pItem));
	return { OnlyInA: tmpOnlyInA, OnlyInB: tmpOnlyInB };
}

function audit()
{
	let tmpManifest = loadManifest();
	let tmpDisk = loadDisk();
	let tmpShell = loadShell();

	let tmpReport =
	{
		Groups: [],
		Totals: { Manifest: 0, Disk: 0, Shell: 0 },
		Drift: { ManifestMissing: 0, ManifestOrphaned: 0, ShellMissing: 0, ShellOrphaned: 0 }
	};

	for (let i = 0; i < GROUP_ALIASES.length; i++)
	{
		let tmpGroup = GROUP_ALIASES[i].ManifestName;
		let tmpManifestList = tmpManifest[tmpGroup] || [];
		let tmpDiskList = tmpDisk[tmpGroup] || [];
		let tmpShellList = tmpShell[tmpGroup] || [];

		let tmpManifestVsDisk = diff(tmpDiskList, tmpManifestList);
		let tmpManifestVsShell = diff(tmpShellList, tmpManifestList);

		tmpReport.Groups.push(
			{
				Name: tmpGroup,
				ManifestCount: tmpManifestList.length,
				DiskCount: tmpDiskList.length,
				ShellCount: tmpShellList.length,
				// Disk has but manifest doesn't — manifest must be updated
				ManifestMissing: tmpManifestVsDisk.OnlyInA,
				// Manifest has but disk doesn't — either module not cloned or manifest stale
				ManifestOrphaned: tmpManifestVsDisk.OnlyInB,
				// Shell has but manifest doesn't — shell script is ahead
				ShellMissing: tmpManifestVsShell.OnlyInA,
				// Manifest has but shell doesn't — shell is stale
				ShellOrphaned: tmpManifestVsShell.OnlyInB,
			});

		tmpReport.Totals.Manifest += tmpManifestList.length;
		tmpReport.Totals.Disk += tmpDiskList.length;
		tmpReport.Totals.Shell += tmpShellList.length;
		tmpReport.Drift.ManifestMissing += tmpManifestVsDisk.OnlyInA.length;
		tmpReport.Drift.ManifestOrphaned += tmpManifestVsDisk.OnlyInB.length;
		tmpReport.Drift.ShellMissing += tmpManifestVsShell.OnlyInA.length;
		tmpReport.Drift.ShellOrphaned += tmpManifestVsShell.OnlyInB.length;
	}

	tmpReport.Clean = (tmpReport.Drift.ManifestMissing === 0)
		&& (tmpReport.Drift.ManifestOrphaned === 0)
		&& (tmpReport.Drift.ShellMissing === 0)
		&& (tmpReport.Drift.ShellOrphaned === 0);

	return tmpReport;
}

// ─────────────────────────────────────────────
//  Output
// ─────────────────────────────────────────────

const ANSI =
{
	reset:  '\x1b[0m',
	bold:   '\x1b[1m',
	dim:    '\x1b[2m',
	red:    '\x1b[31m',
	green:  '\x1b[32m',
	yellow: '\x1b[33m',
	cyan:   '\x1b[36m',
	gray:   '\x1b[90m',
};

function color(pColor, pText)
{
	if (!process.stdout.isTTY) { return pText; }
	return ANSI[pColor] + pText + ANSI.reset;
}

function printReport(pReport)
{
	console.log('');
	console.log(color('bold', 'Retold Modules Manifest Audit'));
	console.log(color('gray', `  Manifest: ${MANIFEST_PATH}`));
	console.log(color('gray', `  Modules:  ${MODULES_ROOT}`));
	console.log(color('gray', `  Shell:    ${SHELL_LIST_PATH}`));
	console.log('');

	for (let i = 0; i < pReport.Groups.length; i++)
	{
		let tmpGroup = pReport.Groups[i];
		let tmpClean = (tmpGroup.ManifestMissing.length === 0)
			&& (tmpGroup.ManifestOrphaned.length === 0)
			&& (tmpGroup.ShellMissing.length === 0)
			&& (tmpGroup.ShellOrphaned.length === 0);

		let tmpIcon = tmpClean ? color('green', '✓') : color('yellow', '!');
		console.log(`${tmpIcon} ${color('bold', tmpGroup.Name)}  ${color('gray', `manifest=${tmpGroup.ManifestCount} disk=${tmpGroup.DiskCount} shell=${tmpGroup.ShellCount}`)}`);

		if (tmpGroup.ManifestMissing.length > 0)
		{
			console.log(color('red', `    Missing from manifest (present on disk): ${tmpGroup.ManifestMissing.length}`));
			for (let j = 0; j < tmpGroup.ManifestMissing.length; j++)
			{
				console.log(color('red', `      + ${tmpGroup.ManifestMissing[j]}`));
			}
		}
		if (tmpGroup.ManifestOrphaned.length > 0)
		{
			console.log(color('yellow', `    In manifest but not on disk: ${tmpGroup.ManifestOrphaned.length}`));
			for (let j = 0; j < tmpGroup.ManifestOrphaned.length; j++)
			{
				console.log(color('yellow', `      - ${tmpGroup.ManifestOrphaned[j]}`));
			}
		}
		if (tmpGroup.ShellMissing.length > 0)
		{
			console.log(color('cyan', `    In shell but not in manifest: ${tmpGroup.ShellMissing.length}`));
			for (let j = 0; j < tmpGroup.ShellMissing.length; j++)
			{
				console.log(color('cyan', `      > ${tmpGroup.ShellMissing[j]}`));
			}
		}
		if (tmpGroup.ShellOrphaned.length > 0)
		{
			console.log(color('gray', `    In manifest but not in shell: ${tmpGroup.ShellOrphaned.length}`));
			for (let j = 0; j < tmpGroup.ShellOrphaned.length; j++)
			{
				console.log(color('gray', `      < ${tmpGroup.ShellOrphaned[j]}`));
			}
		}
	}

	console.log('');
	console.log(color('bold', 'Totals'));
	console.log(`  manifest: ${pReport.Totals.Manifest}`);
	console.log(`  disk:     ${pReport.Totals.Disk}`);
	console.log(`  shell:    ${pReport.Totals.Shell}`);
	console.log('');

	if (pReport.Clean)
	{
		console.log(color('green', '✓ All three sources agree.'));
	}
	else
	{
		console.log(color('yellow', '! Drift detected:'));
		console.log(color('yellow', `  ${pReport.Drift.ManifestMissing} module(s) on disk but not in manifest`));
		console.log(color('yellow', `  ${pReport.Drift.ManifestOrphaned} module(s) in manifest but not on disk`));
		console.log(color('yellow', `  ${pReport.Drift.ShellMissing} module(s) in shell list but not in manifest`));
		console.log(color('yellow', `  ${pReport.Drift.ShellOrphaned} module(s) in manifest but not in shell list`));
		console.log('');
		// Offer resolution paths keyed on which direction the drift points.
		if (pReport.Drift.ManifestMissing > 0)
		{
			console.log(color('cyan', '  → backfill manifest from disk:  npm run --prefix source/retold-manager -- backfill'));
			console.log(color('cyan', '     (or: node source/retold-manager/bin/manifest-backfill.js --write)'));
		}
		if (pReport.Drift.ShellMissing > 0 || pReport.Drift.ShellOrphaned > 0)
		{
			console.log(color('cyan', '  → rebuild Include-Retold-Module-List.sh from manifest:'));
			console.log(color('cyan', '     npm run --prefix source/retold-manager rebuild-shell'));
		}
	}
	console.log('');
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────

function main()
{
	let tmpArgs = process.argv.slice(2);
	let tmpReport = audit();

	if (tmpArgs.indexOf('--json') !== -1)
	{
		console.log(JSON.stringify(tmpReport, null, 2));
	}
	else
	{
		printReport(tmpReport);
	}

	process.exit(tmpReport.Clean ? 0 : 1);
}

main();
