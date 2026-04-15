#!/usr/bin/env node
/**
 * Retold Modules Manifest Backfill
 *
 * For every module found on disk that is missing from the manifest,
 * generate a manifest entry using:
 *   - Name:           directory name
 *   - Path:           modules/<group>/<name>
 *   - Description:    the module's package.json "description" (if any)
 *   - GitHub:         https://github.com/<org>/<name>
 *   - Documentation:  https://<org>.github.io/<name>/
 *   - RelatedModules: []  (left empty for human curation later)
 *
 * By default runs in --dry mode. Pass --write to actually modify the manifest.
 * Orphan entries (in manifest but not on disk) are NEVER removed by this tool —
 * that's a separate human decision.
 *
 * Usage:
 *   node bin/manifest-backfill.js           (dry run — prints proposed entries)
 *   node bin/manifest-backfill.js --write   (actually modifies the manifest)
 */

const libFs = require('fs');
const libPath = require('path');

const REPO_ROOT = libPath.resolve(__dirname, '..', '..', '..');
const MANIFEST_PATH = libPath.join(REPO_ROOT, 'Retold-Modules-Manifest.json');
const MODULES_ROOT = libPath.join(REPO_ROOT, 'modules');

const GROUP_ALIASES =
[
	{ ManifestName: 'Fable',    DiskName: 'fable' },
	{ ManifestName: 'Meadow',   DiskName: 'meadow' },
	{ ManifestName: 'Orator',   DiskName: 'orator' },
	{ ManifestName: 'Pict',     DiskName: 'pict' },
	{ ManifestName: 'Utility',  DiskName: 'utility' },
	{ ManifestName: 'Apps',     DiskName: 'apps' },
];

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function loadManifest()
{
	let tmpContent = libFs.readFileSync(MANIFEST_PATH, 'utf8');
	return JSON.parse(tmpContent);
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

				let tmpPackagePath = libPath.join(tmpEntryPath, 'package.json');
				if (!libFs.existsSync(tmpPackagePath)) { continue; }

				tmpModules.push(tmpEntry);
			}
		}
		catch (pError) { /* group missing */ }

		tmpResult[tmpAlias.ManifestName] = tmpModules.sort();
	}
	return tmpResult;
}

function readPackageDescription(pGroupDiskName, pModuleName)
{
	let tmpPackagePath = libPath.join(MODULES_ROOT, pGroupDiskName, pModuleName, 'package.json');
	try
	{
		let tmpContent = libFs.readFileSync(tmpPackagePath, 'utf8');
		let tmpPkg = JSON.parse(tmpContent);
		return tmpPkg.description || '';
	}
	catch (pError)
	{
		return '';
	}
}

function buildEntry(pGitHubOrg, pGroupDiskName, pModuleName)
{
	return {
		Name: pModuleName,
		Path: `modules/${pGroupDiskName}/${pModuleName}`,
		Description: readPackageDescription(pGroupDiskName, pModuleName),
		GitHub: `https://github.com/${pGitHubOrg}/${pModuleName}`,
		Documentation: `https://${pGitHubOrg}.github.io/${pModuleName}/`,
		RelatedModules: []
	};
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────

function main()
{
	let tmpArgs = process.argv.slice(2);
	let tmpWrite = (tmpArgs.indexOf('--write') !== -1);

	let tmpManifest = loadManifest();
	let tmpDisk = loadDisk();

	let tmpGitHubOrg = tmpManifest.GitHubOrg || 'stevenvelozo';

	// Build a Map<groupName, Set<moduleName>> of what's already in the manifest
	let tmpManifestModulesByGroup = {};
	let tmpGroupsByName = {};
	for (let i = 0; i < tmpManifest.Groups.length; i++)
	{
		let tmpGroup = tmpManifest.Groups[i];
		tmpGroupsByName[tmpGroup.Name] = tmpGroup;
		tmpManifestModulesByGroup[tmpGroup.Name] = new Set(tmpGroup.Modules.map((pModule) => pModule.Name));
	}

	// For each group on disk, find missing modules and build entries
	let tmpAdded = [];
	for (let i = 0; i < GROUP_ALIASES.length; i++)
	{
		let tmpAlias = GROUP_ALIASES[i];
		let tmpGroup = tmpGroupsByName[tmpAlias.ManifestName];
		if (!tmpGroup)
		{
			console.error(`Group "${tmpAlias.ManifestName}" not found in manifest — skipping.`);
			continue;
		}

		let tmpExisting = tmpManifestModulesByGroup[tmpAlias.ManifestName];
		let tmpDiskModules = tmpDisk[tmpAlias.ManifestName] || [];

		for (let j = 0; j < tmpDiskModules.length; j++)
		{
			let tmpModuleName = tmpDiskModules[j];
			if (tmpExisting.has(tmpModuleName)) { continue; }

			let tmpEntry = buildEntry(tmpGitHubOrg, tmpAlias.DiskName, tmpModuleName);
			tmpGroup.Modules.push(tmpEntry);
			tmpAdded.push({ Group: tmpAlias.ManifestName, Entry: tmpEntry });
		}

		// Sort modules within each group by Name for stable diffs
		tmpGroup.Modules.sort((pA, pB) => pA.Name.localeCompare(pB.Name));
	}

	// Print report
	if (tmpAdded.length === 0)
	{
		console.log('No new modules to backfill. Manifest already includes every disk module.');
		process.exit(0);
	}

	console.log(`Proposed backfill: ${tmpAdded.length} new manifest entries`);
	console.log('');
	let tmpGrouped = {};
	for (let i = 0; i < tmpAdded.length; i++)
	{
		if (!tmpGrouped[tmpAdded[i].Group]) { tmpGrouped[tmpAdded[i].Group] = []; }
		tmpGrouped[tmpAdded[i].Group].push(tmpAdded[i].Entry);
	}
	let tmpGroupNames = Object.keys(tmpGrouped);
	for (let i = 0; i < tmpGroupNames.length; i++)
	{
		let tmpGroupName = tmpGroupNames[i];
		console.log(`  ${tmpGroupName}:`);
		for (let j = 0; j < tmpGrouped[tmpGroupName].length; j++)
		{
			let tmpEntry = tmpGrouped[tmpGroupName][j];
			let tmpDescTrunc = tmpEntry.Description.length > 60
				? tmpEntry.Description.slice(0, 57) + '...'
				: tmpEntry.Description;
			console.log(`    + ${tmpEntry.Name}  ${tmpDescTrunc || '(no description)'}`);
		}
	}

	console.log('');

	if (!tmpWrite)
	{
		console.log('Dry run. Re-run with --write to apply.');
		process.exit(0);
	}

	// Write the updated manifest. Use tabs for indentation (matches existing file).
	let tmpJson = JSON.stringify(tmpManifest, null, '\t');
	libFs.writeFileSync(MANIFEST_PATH, tmpJson + '\n', 'utf8');
	console.log(`Wrote ${tmpAdded.length} new entries to ${MANIFEST_PATH}`);
}

main();
