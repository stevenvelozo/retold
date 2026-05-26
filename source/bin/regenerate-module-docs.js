#!/usr/bin/env node
/**
 * Regenerate per-module docs (catalog + keyword index) for every forkable module,
 * then commit + push directly to upstream (fable-retold/<module>) and origin.
 *
 *   node bin/regenerate-module-docs.js              # dry-run: report would-change modules
 *   node bin/regenerate-module-docs.js --apply      # regenerate, commit, push
 *   node bin/regenerate-module-docs.js --apply --limit 3
 *
 * Uses the umbrella retold/'s quack binary via spawn (so behavior is consistent
 * regardless of whether each module has its own quackage installed locally).
 * Passes `-g fable-retold` explicitly so older quackage versions still produce
 * fable-retold URLs.
 *
 * Skips non-forkable modules (Ultravisor*, Retold-Remote*, Retold-Facto,
 * Elucidator, Ultravisor-Beacon[-Capability]) — those keep their stevenvelozo
 * refs since they still live there.
 */

const libFs = require('fs');
const libPath = require('path');
const libChildProcess = require('child_process');

const REPO_ROOT = libPath.resolve(__dirname, '..', '..');
const MANIFEST_PATH = libPath.join(REPO_ROOT, 'Retold-Modules-Manifest.json');
const MODULES_ROOT = libPath.join(REPO_ROOT, 'modules');
const QUACK_BIN = libPath.join(REPO_ROOT, 'node_modules', '.bin', 'quack');

const GROUP_TO_DIR =
{
	Fable: 'fable',
	Meadow: 'meadow',
	Orator: 'orator',
	Pict: 'pict',
	Utility: 'utility',
	Apps: 'apps'
};

const COMMIT_SUBJECT = 'Regenerate docs (catalog + keyword index) for fable-retold org';
const COMMIT_BODY =
	'Mechanical regen via quack prepare-docs with --github-org fable-retold,\n' +
	'flushing any tokenized stevenvelozo references in docs/retold-catalog.json\n' +
	'and docs/retold-keyword-index.json that pre-dated the migration.';

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
				Name: tmpModule.Name,
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
	return { Status: tmpResult.status, Stdout: (tmpResult.stdout || '').trim(), Stderr: (tmpResult.stderr || '').trim() };
}

function runQuack(pCwd)
{
	// Run umbrella's quack against this module's docs/ with explicit -g fable-retold.
	// The cwd is the module so package.json detection works ("module" mode).
	let tmpResult = libChildProcess.spawnSync(QUACK_BIN, ['prepare-docs', './docs', '-g', 'fable-retold'], { cwd: pCwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
	return { Status: tmpResult.status, Stdout: tmpResult.stdout || '', Stderr: tmpResult.stderr || '' };
}

function getDirtyDocsFiles(pCwd)
{
	let tmpStatus = gitCheck(pCwd, ['status', '--porcelain', '--', 'docs/']);
	if (tmpStatus.Status !== 0) return [];
	if (!tmpStatus.Stdout) return [];
	return tmpStatus.Stdout.split('\n').map(function (pLine) { return pLine.trim().replace(/^[A-Z?!]+\s+/, ''); }).filter(function (pF) { return pF.length > 0; });
}

function main()
{
	let tmpArgs = process.argv.slice(2);
	let tmpApply = tmpArgs.indexOf('--apply') !== -1;
	let tmpLimitIdx = tmpArgs.indexOf('--limit');
	let tmpLimit = (tmpLimitIdx !== -1 && tmpArgs[tmpLimitIdx + 1]) ? parseInt(tmpArgs[tmpLimitIdx + 1], 10) : Infinity;

	if (!libFs.existsSync(QUACK_BIN))
	{
		console.error('quack binary not found at ' + QUACK_BIN + '. Run npm install in the retold/ root first.');
		process.exit(1);
	}

	let tmpModules = loadForkableModules();
	console.log('Discovered ' + tmpModules.length + ' forkable modules.');
	console.log('Mode: ' + (tmpApply ? 'APPLY (regen + commit + push)' : 'DRY-RUN'));
	console.log('');

	let tmpStats = { Visited: 0, NoChange: 0, Skipped: 0, Touched: 0, Pushed: 0, FailedPush: 0 };

	for (let i = 0; i < tmpModules.length && i < tmpLimit; i++)
	{
		let tmpModule = tmpModules[i];
		tmpStats.Visited++;
		let tmpTag = '[' + (i+1) + '/' + Math.min(tmpModules.length, tmpLimit) + '] ' + tmpModule.GroupDir + '/' + tmpModule.Name;

		if (!libFs.existsSync(tmpModule.FullPath))
		{
			console.log(tmpTag + '  SKIP (not on disk)');
			tmpStats.Skipped++;
			continue;
		}
		if (!libFs.existsSync(libPath.join(tmpModule.FullPath, 'docs')))
		{
			console.log(tmpTag + '  SKIP (no docs/ directory)');
			tmpStats.Skipped++;
			continue;
		}

		// Capture docs/ state before regen so we can diff
		let tmpBeforeStatus = getDirtyDocsFiles(tmpModule.FullPath);

		// Regen via umbrella's quack
		let tmpQuack = runQuack(tmpModule.FullPath);
		if (tmpQuack.Status !== 0)
		{
			console.log(tmpTag + '  ! quack failed: ' + tmpQuack.Stderr.split('\n').slice(-2).join(' / ').slice(0, 150));
			tmpStats.Skipped++;
			continue;
		}

		// Check what changed in docs/ as a result of regen
		let tmpAfterStatus = getDirtyDocsFiles(tmpModule.FullPath);
		let tmpNewlyDirty = tmpAfterStatus.filter(function (pF) { return tmpBeforeStatus.indexOf(pF) === -1; });
		if (tmpNewlyDirty.length === 0)
		{
			console.log(tmpTag + '  unchanged');
			tmpStats.NoChange++;
			continue;
		}

		tmpStats.Touched++;
		console.log(tmpTag + '  ' + tmpNewlyDirty.length + ' file(s) ' + (tmpApply ? 'regenerated' : 'would change'));

		if (!tmpApply) continue;

		// Verify upstream remote exists and we're on a sensible branch
		let tmpUpstream = gitCheck(tmpModule.FullPath, ['remote', 'get-url', 'upstream']);
		let tmpExpectedUpstream = 'https://github.com/fable-retold/' + tmpModule.Name + '.git';
		if (tmpUpstream.Status !== 0 || tmpUpstream.Stdout !== tmpExpectedUpstream)
		{
			console.log('    ! upstream remote missing or wrong (' + tmpUpstream.Stdout + '), reverting docs');
			gitCheck(tmpModule.FullPath, ['checkout', '--', 'docs']);
			tmpStats.FailedPush++;
			continue;
		}
		let tmpBranchResult = gitCheck(tmpModule.FullPath, ['branch', '--show-current']);
		let tmpBranch = tmpBranchResult.Stdout;
		if (tmpBranch !== 'master' && tmpBranch !== 'main')
		{
			console.log('    ! not on master/main (on ' + tmpBranch + '), reverting docs');
			gitCheck(tmpModule.FullPath, ['checkout', '--', 'docs']);
			tmpStats.FailedPush++;
			continue;
		}

		// Stage only the newly-dirty docs files
		let tmpAddArgs = ['add', '--'];
		for (let k = 0; k < tmpNewlyDirty.length; k++) tmpAddArgs.push(tmpNewlyDirty[k]);
		let tmpAdd = gitCheck(tmpModule.FullPath, tmpAddArgs);
		if (tmpAdd.Status !== 0)
		{
			console.log('    ! git add failed: ' + tmpAdd.Stderr.split('\n')[0]);
			tmpStats.FailedPush++;
			continue;
		}
		let tmpCommit = gitCheck(tmpModule.FullPath, ['commit', '-m', COMMIT_SUBJECT, '-m', COMMIT_BODY]);
		if (tmpCommit.Status !== 0)
		{
			console.log('    ! git commit failed: ' + tmpCommit.Stderr.split('\n')[0]);
			tmpStats.FailedPush++;
			continue;
		}
		let tmpPushUp = gitCheck(tmpModule.FullPath, ['push', 'upstream', tmpBranch]);
		if (tmpPushUp.Status !== 0)
		{
			console.log('    ! push to upstream failed: ' + tmpPushUp.Stderr.split('\n')[0]);
			tmpStats.FailedPush++;
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
	console.log('Visited:     ' + tmpStats.Visited);
	console.log('Unchanged:   ' + tmpStats.NoChange);
	console.log('Touched:     ' + tmpStats.Touched);
	console.log('Skipped:     ' + tmpStats.Skipped);
	if (tmpApply)
	{
		console.log('Pushed:      ' + tmpStats.Pushed);
		console.log('Failed:      ' + tmpStats.FailedPush);
	}
	else
	{
		console.log('');
		console.log('Re-run with --apply to commit + push.');
	}
}

main();
