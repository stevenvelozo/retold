#!/usr/bin/env node
/**
 * Sync each forkable module's package.json dependency ranges with the
 * umbrella retold repo's versions, then regenerate the module's docs
 * catalog/index via quack.  Leaves all changes uncommitted so a human
 * can review before any commit/push.
 *
 *   node bin/sync-deps-and-regen-docs.js          # run; report summary
 *   node bin/sync-deps-and-regen-docs.js --limit 3
 *
 * Use `--limit N` for a partial run during smoke tests.  The companion
 * commit step lives in a separate script the human invokes explicitly
 * (so this tool can never push by accident).
 */

const libFs = require('fs');
const libPath = require('path');
const libChildProcess = require('child_process');

const REPO_ROOT = libPath.resolve(__dirname, '..', '..');
const MANIFEST_PATH = libPath.join(REPO_ROOT, 'Retold-Modules-Manifest.json');
const UMBRELLA_PKG_PATH = libPath.join(REPO_ROOT, 'package.json');
const MODULES_ROOT = libPath.join(REPO_ROOT, 'modules');
const QUACK_BIN = libPath.join(REPO_ROOT, 'node_modules', '.bin', 'quack');

const GROUP_TO_DIR =
{
	Fable:   'fable',
	Meadow:  'meadow',
	Orator:  'orator',
	Pict:    'pict',
	Utility: 'utility',
	Apps:    'apps'
};

function loadForkableModules()
{
	let tmpManifest = JSON.parse(libFs.readFileSync(MANIFEST_PATH, 'utf8'));
	let tmpDefault = tmpManifest.GitHubOrg || 'fable-retold';
	let tmpResult = [];
	for (let i = 0; i < tmpManifest.Groups.length; i++)
	{
		let tmpGroup = tmpManifest.Groups[i];
		let tmpDir = GROUP_TO_DIR[tmpGroup.Name];
		if (!tmpDir) continue;
		for (let j = 0; j < tmpGroup.Modules.length; j++)
		{
			let tmpModule = tmpGroup.Modules[j];
			let tmpOwner = tmpModule.Owner || tmpDefault;
			let tmpForkable = tmpModule.Forkable !== false;
			if (!tmpForkable || tmpOwner !== 'fable-retold') continue;
			tmpResult.push({
				Name:     tmpModule.Name,
				GroupDir: tmpDir,
				FullPath: libPath.join(MODULES_ROOT, tmpDir, tmpModule.Name)
			});
		}
	}
	return tmpResult;
}

//
// Build a map of dep-name -> version-range from the umbrella package.json.
// Merges dependencies + devDependencies; later sections win on overlap (so
// devDeps is what we end up syncing if a name appears in both, matching
// how npm itself resolves).  This is the set of versions every forkable
// module's matching deps should be updated to.
//
function readUmbrellaDepVersions()
{
	let tmpPkg = JSON.parse(libFs.readFileSync(UMBRELLA_PKG_PATH, 'utf8'));
	let tmpMap = {};
	let tmpDeps    = tmpPkg.dependencies    || {};
	let tmpDevDeps = tmpPkg.devDependencies || {};
	for (let tmpName in tmpDeps)    { tmpMap[tmpName] = tmpDeps[tmpName]; }
	for (let tmpName in tmpDevDeps) { tmpMap[tmpName] = tmpDevDeps[tmpName]; }
	return tmpMap;
}

//
// Update a module's package.json in-place. Only touches deps whose names
// appear in pVersionMap (the umbrella's set). Returns the list of changes.
// Preserves indentation (tabs vs N spaces) so the diff stays minimal.
//
function updateModulePackageJson(pModulePath, pVersionMap)
{
	let tmpPkgPath = libPath.join(pModulePath, 'package.json');
	if (!libFs.existsSync(tmpPkgPath))
	{
		return { Updates: [], Reason: 'no package.json' };
	}
	let tmpRaw = libFs.readFileSync(tmpPkgPath, 'utf8');
	let tmpIndent = '\t';
	let tmpIndentMatch = tmpRaw.match(/\n([\t ]+)"/);
	if (tmpIndentMatch) { tmpIndent = tmpIndentMatch[1]; }

	let tmpPkg = JSON.parse(tmpRaw);
	let tmpUpdates = [];

	function syncSection(pSectionName)
	{
		let tmpSection = tmpPkg[pSectionName];
		if (!tmpSection) return;
		for (let tmpDep in tmpSection)
		{
			if (!pVersionMap[tmpDep]) continue;
			let tmpFrom = tmpSection[tmpDep];
			let tmpTo   = pVersionMap[tmpDep];
			if (tmpFrom === tmpTo) continue;
			tmpSection[tmpDep] = tmpTo;
			tmpUpdates.push({ Section: pSectionName, Dep: tmpDep, From: tmpFrom, To: tmpTo });
		}
	}

	syncSection('dependencies');
	syncSection('devDependencies');

	if (tmpUpdates.length > 0)
	{
		let tmpOut = JSON.stringify(tmpPkg, null, tmpIndent) + '\n';
		libFs.writeFileSync(tmpPkgPath, tmpOut);
	}

	return { Updates: tmpUpdates };
}

//
// Regenerate docs/retold-catalog.json + docs/retold-keyword-index.json for
// a single module by invoking the umbrella's quack binary.  Passes -g
// fable-retold explicitly so older node_modules/quackage installs still
// produce fable-retold URLs.  Returns { Ok } / { Failed, Stderr }.
//
function regenDocs(pModulePath)
{
	if (!libFs.existsSync(libPath.join(pModulePath, 'docs')))
	{
		return { Ok: false, Skipped: true, Reason: 'no docs/' };
	}
	let tmpResult = libChildProcess.spawnSync(QUACK_BIN, ['prepare-docs', './docs', '-g', 'fable-retold'],
		{ cwd: pModulePath, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
	if (tmpResult.status !== 0)
	{
		let tmpStderr = (tmpResult.stderr || '').split('\n').slice(-3).join(' / ').slice(0, 200);
		return { Ok: false, Failed: true, Stderr: tmpStderr };
	}
	return { Ok: true };
}

function main()
{
	let tmpArgs = process.argv.slice(2);
	let tmpLimitIdx = tmpArgs.indexOf('--limit');
	let tmpLimit = (tmpLimitIdx !== -1 && tmpArgs[tmpLimitIdx + 1]) ? parseInt(tmpArgs[tmpLimitIdx + 1], 10) : Infinity;

	if (!libFs.existsSync(QUACK_BIN))
	{
		console.error('quack binary not found at ' + QUACK_BIN + '. Run npm install in the retold/ root first.');
		process.exit(1);
	}

	let tmpVersionMap = readUmbrellaDepVersions();
	let tmpModules = loadForkableModules();

	console.log('Umbrella deps tracked:    ' + Object.keys(tmpVersionMap).length);
	console.log('Forkable modules in scope: ' + tmpModules.length);
	if (tmpLimit < tmpModules.length) console.log('Limited to first ' + tmpLimit);
	console.log('');

	let tmpStats =
	{
		Visited:       0,
		Skipped:       0,
		DepsTouched:   0,
		TotalDepBumps: 0,
		DocsOk:        0,
		DocsSkipped:   0,
		DocsFailed:    0
	};

	for (let i = 0; i < tmpModules.length && i < tmpLimit; i++)
	{
		let tmpModule = tmpModules[i];
		tmpStats.Visited++;

		if (!libFs.existsSync(tmpModule.FullPath))
		{
			console.log('[' + (i+1) + '] ' + tmpModule.Name + '  SKIP (not on disk)');
			tmpStats.Skipped++;
			continue;
		}

		// Phase 1: deps
		let tmpDepRes = updateModulePackageJson(tmpModule.FullPath, tmpVersionMap);
		let tmpDepCount = (tmpDepRes.Updates || []).length;
		if (tmpDepCount > 0)
		{
			tmpStats.DepsTouched++;
			tmpStats.TotalDepBumps += tmpDepCount;
		}

		// Phase 2: docs
		let tmpDocRes = regenDocs(tmpModule.FullPath);
		let tmpDocLabel;
		if (tmpDocRes.Skipped)
		{
			tmpStats.DocsSkipped++;
			tmpDocLabel = 'docs=skip(' + tmpDocRes.Reason + ')';
		}
		else if (tmpDocRes.Failed)
		{
			tmpStats.DocsFailed++;
			tmpDocLabel = 'docs=FAIL(' + tmpDocRes.Stderr + ')';
		}
		else
		{
			tmpStats.DocsOk++;
			tmpDocLabel = 'docs=ok';
		}

		console.log('[' + String(i+1).padStart(3) + '/' + Math.min(tmpModules.length, tmpLimit) + '] '
			+ tmpModule.Name.padEnd(45)
			+ '  deps=' + String(tmpDepCount).padStart(2)
			+ '  ' + tmpDocLabel);
	}

	console.log('');
	console.log('=== Summary ===');
	console.log('Visited:             ' + tmpStats.Visited);
	console.log('Skipped:             ' + tmpStats.Skipped);
	console.log('Modules w/ dep bumps: ' + tmpStats.DepsTouched);
	console.log('Total dep bumps:      ' + tmpStats.TotalDepBumps);
	console.log('Docs regen ok:        ' + tmpStats.DocsOk);
	console.log('Docs skipped:         ' + tmpStats.DocsSkipped);
	console.log('Docs failed:          ' + tmpStats.DocsFailed);
	console.log('');
	console.log('All changes left uncommitted. Sanity-check, then commit/push.');
}

main();
