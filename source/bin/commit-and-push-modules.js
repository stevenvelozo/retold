#!/usr/bin/env node
/**
 * Commit + push the dep/docs sync changes that sync-deps-and-regen-docs.js
 * left in each forkable module's working tree, directly to fable-retold's
 * master (upstream) and stevenvelozo's fork (origin).
 *
 *   node bin/commit-and-push-modules.js              # dry-run, list what would push
 *   node bin/commit-and-push-modules.js --apply      # actually commit + push
 *   node bin/commit-and-push-modules.js --apply --limit 3
 *
 * Stages ONLY package.json + docs/* — explicitly NOT dist/ (build artifacts
 * regenerated on demand) and NOT package-lock.json (npm-install churn that
 * doesn't reflect human intent).
 */

const libFs = require('fs');
const libPath = require('path');
const libChildProcess = require('child_process');

const REPO_ROOT = libPath.resolve(__dirname, '..', '..');
const MANIFEST_PATH = libPath.join(REPO_ROOT, 'Retold-Modules-Manifest.json');
const MODULES_ROOT = libPath.join(REPO_ROOT, 'modules');

const GROUP_TO_DIR =
{
	Fable:   'fable',
	Meadow:  'meadow',
	Orator:  'orator',
	Pict:    'pict',
	Utility: 'utility',
	Apps:    'apps'
};

const COMMIT_SUBJECT = 'Sync ecosystem deps + regenerate docs catalog/index';
const COMMIT_BODY =
	'Mechanical bump of ecosystem dependency ranges to match the umbrella\n' +
	'retold repo (post npm-check-updates), plus a fresh quack prepare-docs\n' +
	'run so docs/retold-catalog.json and docs/retold-keyword-index.json\n' +
	'reflect the new versions and the fable-retold canonical org.';

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

function gitCheck(pCwd, pArgs)
{
	let tmpResult = libChildProcess.spawnSync('git', pArgs, { cwd: pCwd, encoding: 'utf8' });
	// NOTE: we deliberately do NOT trim Stdout/Stderr here — the caller needs to
	// see the raw bytes for parsers that rely on column positions.  In particular
	// `git status --porcelain` lines begin with " X" (space + status code), and
	// trimming the whole buffer eats the leading space of the *first* line,
	// which shifts slice() offsets and silently drops the alphabetically-first
	// dirty file (e.g. `_version.json` because `_` sorts before letters).
	return { Status: tmpResult.status, Stdout: tmpResult.stdout || '', Stderr: tmpResult.stderr || '' };
}

//
// Return the list of files in the module's working tree that we WANT to
// commit (package.json + everything under docs/), filtered to those that
// actually changed.  Explicitly excludes dist/*, node_modules, lockfiles.
//
function pickStageables(pModulePath)
{
	let tmpStatus = gitCheck(pModulePath, ['status', '--porcelain']);
	if (tmpStatus.Status !== 0) return { Err: (tmpStatus.Stderr || '').trim() };
	if (!tmpStatus.Stdout) return { Files: [] };
	let tmpFiles = [];
	let tmpLines = tmpStatus.Stdout.split('\n');
	for (let i = 0; i < tmpLines.length; i++)
	{
		let tmpLine = tmpLines[i];
		if (!tmpLine) continue;
		// Status format:  XY filename  (XY = 2-char status)
		let tmpFile = tmpLine.slice(3).trim();
		// Untracked files come through with "?? filename" — keep them only
		// if they live under docs/ (occasionally a new asset).  Modified
		// (" M ...") and added ("A  ...") files use the same slice.
		if (tmpFile.startsWith('docs/'))    { tmpFiles.push(tmpFile); }
		else if (tmpFile === 'package.json') { tmpFiles.push(tmpFile); }
		// Everything else (dist/, package-lock.json, etc.) intentionally skipped.
	}
	return { Files: tmpFiles };
}

function main()
{
	let tmpArgs = process.argv.slice(2);
	let tmpApply = tmpArgs.indexOf('--apply') !== -1;
	let tmpLimitIdx = tmpArgs.indexOf('--limit');
	let tmpLimit = (tmpLimitIdx !== -1 && tmpArgs[tmpLimitIdx + 1]) ? parseInt(tmpArgs[tmpLimitIdx + 1], 10) : Infinity;

	let tmpModules = loadForkableModules();
	console.log('Forkable modules in scope: ' + tmpModules.length);
	console.log('Mode: ' + (tmpApply ? 'APPLY (commit + push)' : 'DRY-RUN'));
	console.log('');

	let tmpStats =
	{
		Visited: 0,
		Clean:   0,
		Touched: 0,
		Pushed:  0,
		Failed:  0
	};

	for (let i = 0; i < tmpModules.length && i < tmpLimit; i++)
	{
		let tmpModule = tmpModules[i];
		tmpStats.Visited++;
		let tmpTag = '[' + String(i+1).padStart(3) + '/' + Math.min(tmpModules.length, tmpLimit) + '] ' + tmpModule.Name.padEnd(45);

		if (!libFs.existsSync(tmpModule.FullPath))
		{
			console.log(tmpTag + '  SKIP (not on disk)');
			continue;
		}

		let tmpPick = pickStageables(tmpModule.FullPath);
		if (tmpPick.Err)
		{
			console.log(tmpTag + '  ! git status failed: ' + tmpPick.Err);
			tmpStats.Failed++;
			continue;
		}
		if (tmpPick.Files.length === 0)
		{
			console.log(tmpTag + '  clean (nothing to commit)');
			tmpStats.Clean++;
			continue;
		}

		tmpStats.Touched++;
		// Verbose: list every file we picked up, so it's obvious from the log
		// whether _version.json + similar build-output files are being staged.
		console.log(tmpTag + '  ' + tmpPick.Files.length + ' file(s) ' + (tmpApply ? 'committing' : 'would commit')
			+ ': ' + tmpPick.Files.join(', '));
		if (!tmpApply) continue;

		// Verify remotes + branch.  Single-line stdout from git needs .trim() at
		// the call site now that gitCheck() preserves raw output (see comment in
		// gitCheck about why the global .trim was removed).
		let tmpUpstream = gitCheck(tmpModule.FullPath, ['remote', 'get-url', 'upstream']);
		let tmpUpstreamUrl = (tmpUpstream.Stdout || '').trim();
		let tmpExpectedUpstream = 'https://github.com/fable-retold/' + tmpModule.Name + '.git';
		if (tmpUpstream.Status !== 0 || tmpUpstreamUrl !== tmpExpectedUpstream)
		{
			console.log('    ! upstream remote missing or wrong (' + tmpUpstreamUrl + '), skipping');
			tmpStats.Failed++;
			continue;
		}
		let tmpBranchResult = gitCheck(tmpModule.FullPath, ['branch', '--show-current']);
		let tmpBranch = (tmpBranchResult.Stdout || '').trim();
		if (tmpBranch !== 'master' && tmpBranch !== 'main')
		{
			console.log('    ! not on master/main (on ' + tmpBranch + '), skipping');
			tmpStats.Failed++;
			continue;
		}

		// Stage only our files.
		let tmpAdd = gitCheck(tmpModule.FullPath, ['add', '--'].concat(tmpPick.Files));
		if (tmpAdd.Status !== 0)
		{
			console.log('    ! git add failed: ' + tmpAdd.Stderr.split('\n')[0]);
			tmpStats.Failed++;
			continue;
		}
		let tmpCommit = gitCheck(tmpModule.FullPath, ['commit', '-m', COMMIT_SUBJECT, '-m', COMMIT_BODY]);
		if (tmpCommit.Status !== 0)
		{
			console.log('    ! git commit failed: ' + tmpCommit.Stderr.split('\n')[0]);
			tmpStats.Failed++;
			continue;
		}
		let tmpPushUp = gitCheck(tmpModule.FullPath, ['push', 'upstream', tmpBranch]);
		if (tmpPushUp.Status !== 0)
		{
			console.log('    ! push to upstream failed: ' + tmpPushUp.Stderr.split('\n')[0]);
			tmpStats.Failed++;
			continue;
		}
		let tmpPushOrigin = gitCheck(tmpModule.FullPath, ['push', 'origin', tmpBranch]);
		if (tmpPushOrigin.Status !== 0)
		{
			console.log('    ~ push to origin failed: ' + tmpPushOrigin.Stderr.split('\n')[0]);
		}
		console.log('    + pushed to upstream + origin');
		tmpStats.Pushed++;
	}

	console.log('');
	console.log('=== Summary ===');
	console.log('Visited:           ' + tmpStats.Visited);
	console.log('Clean (no-op):     ' + tmpStats.Clean);
	console.log('Touched:           ' + tmpStats.Touched);
	if (tmpApply)
	{
		console.log('Pushed:            ' + tmpStats.Pushed);
		console.log('Failed:            ' + tmpStats.Failed);
	}
	else
	{
		console.log('');
		console.log('Re-run with --apply to commit + push.');
	}
}

main();
