#!/usr/bin/env node
/**
 * Rewrite stevenvelozo URLs to fable-retold URLs across all forkable modules.
 *
 *   node bin/manifest-rewrite-urls.js              # dry-run, prints proposed diffs
 *   node bin/manifest-rewrite-urls.js --apply      # rewrite + commit + push to upstream and origin
 *   node bin/manifest-rewrite-urls.js --apply --limit 3   # only the first 3 forkable modules
 *
 * Reads Retold-Modules-Manifest.json to find which modules are forkable (live at
 * fable-retold). For each forkable module checked out under modules/<group>/<name>:
 *
 *   1. Run regex replacements on .md, .json, .yml, .yaml, .js, .html, .txt files
 *      (skips node_modules, .git, *-lock.json, *.lock).
 *   2. If any file changed, in --apply mode: `git add -A && git commit && git push
 *      upstream master && git push origin master`.
 *
 * Patterns rewritten (only when <name> is a forkable module in the manifest):
 *   https://github.com/stevenvelozo/<name>       -> https://github.com/fable-retold/<name>
 *   git+https://github.com/stevenvelozo/<name>   -> git+https://github.com/fable-retold/<name>
 *   git://github.com/stevenvelozo/<name>         -> git://github.com/fable-retold/<name>
 *   git@github.com:stevenvelozo/<name>           -> git@github.com:fable-retold/<name>
 *   https://stevenvelozo.github.io/<name>        -> https://fable-retold.github.io/<name>
 *
 * Preserved (never rewritten):
 *   - The literal name "Steven Velozo"
 *   - steven@velozo.com
 *   - Anything where the URL points to a non-forkable module (ultravisor*, retold-remote*, etc.)
 *   - Existing git history / commit messages
 *   - node_modules, lock files, binaries
 */

const libFs = require('fs');
const libPath = require('path');
const libChildProcess = require('child_process');

const REPO_ROOT = libPath.resolve(__dirname, '..', '..');
const MANIFEST_PATH = libPath.join(REPO_ROOT, 'Retold-Modules-Manifest.json');
const MODULES_ROOT = libPath.join(REPO_ROOT, 'modules');

// Map manifest group name -> directory name under modules/.
const GROUP_TO_DIR =
{
	Fable: 'fable',
	Meadow: 'meadow',
	Orator: 'orator',
	Pict: 'pict',
	Utility: 'utility',
	Apps: 'apps'
};

const REWRITE_EXTENSIONS = ['.md', '.json', '.yml', '.yaml', '.js', '.html', '.htm', '.txt'];
const SKIP_DIRS = new Set(['.git', 'node_modules', 'web-application', 'dist', 'build', 'coverage']);
const SKIP_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);

const COMMIT_SUBJECT = 'Update repository and docs URLs to fable-retold';
const COMMIT_BODY =
	'Mechanical rewrite from stevenvelozo to fable-retold for the modules\n' +
	'that migrated to the fable-retold org. Old URLs still 301-redirect, so\n' +
	'no functional change, but this corrects package.json repository fields\n' +
	'and README badges/links.';

// ─────────────────────────────────────────────
//  Manifest discovery
// ─────────────────────────────────────────────

function loadForkableModules()
{
	let tmpRaw = libFs.readFileSync(MANIFEST_PATH, 'utf8');
	let tmpManifest = JSON.parse(tmpRaw);
	let tmpDefaultOwner = tmpManifest.GitHubOrg || 'fable-retold';
	let tmpResult = [];
	for (let i = 0; i < tmpManifest.Groups.length; i++)
	{
		let tmpGroup = tmpManifest.Groups[i];
		let tmpDir = GROUP_TO_DIR[tmpGroup.Name];
		if (!tmpDir) continue;
		for (let j = 0; j < tmpGroup.Modules.length; j++)
		{
			let tmpModule = tmpGroup.Modules[j];
			let tmpOwner = tmpModule.Owner || tmpDefaultOwner;
			let tmpForkable = tmpModule.Forkable !== false;
			if (!tmpForkable) continue;
			if (tmpOwner !== 'fable-retold') continue;
			tmpResult.push({
				Name: tmpModule.Name,
				GroupDir: tmpDir,
				FullPath: libPath.join(MODULES_ROOT, tmpDir, tmpModule.Name)
			});
		}
	}
	return tmpResult;
}

// ─────────────────────────────────────────────
//  Rewriter
// ─────────────────────────────────────────────

function buildRewritesForName(pName)
{
	// Order matters: longer/more-specific patterns first so we don't double-rewrite.
	return [
		{ Find: 'git+https://github.com/stevenvelozo/' + pName, Replace: 'git+https://github.com/fable-retold/' + pName },
		{ Find: 'git+ssh://git@github.com/stevenvelozo/' + pName, Replace: 'git+ssh://git@github.com/fable-retold/' + pName },
		{ Find: 'https://github.com/stevenvelozo/' + pName, Replace: 'https://github.com/fable-retold/' + pName },
		{ Find: 'git://github.com/stevenvelozo/' + pName, Replace: 'git://github.com/fable-retold/' + pName },
		{ Find: 'git@github.com:stevenvelozo/' + pName, Replace: 'git@github.com:fable-retold/' + pName },
		{ Find: 'https://stevenvelozo.github.io/' + pName, Replace: 'https://fable-retold.github.io/' + pName },
		{ Find: 'http://stevenvelozo.github.io/' + pName, Replace: 'http://fable-retold.github.io/' + pName }
	];
}

function rewriteContent(pContent, pRewrites)
{
	let tmpContent = pContent;
	let tmpChanged = false;
	for (let i = 0; i < pRewrites.length; i++)
	{
		let tmpRewrite = pRewrites[i];
		let tmpParts = tmpContent.split(tmpRewrite.Find);
		if (tmpParts.length > 1)
		{
			tmpContent = tmpParts.join(tmpRewrite.Replace);
			tmpChanged = true;
		}
	}
	return { Content: tmpContent, Changed: tmpChanged };
}

function walkFiles(pDir, pCallback)
{
	let tmpEntries;
	try { tmpEntries = libFs.readdirSync(pDir, { withFileTypes: true }); }
	catch (pError) { return; }
	for (let i = 0; i < tmpEntries.length; i++)
	{
		let tmpEntry = tmpEntries[i];
		if (tmpEntry.isDirectory())
		{
			if (SKIP_DIRS.has(tmpEntry.name)) continue;
			walkFiles(libPath.join(pDir, tmpEntry.name), pCallback);
			continue;
		}
		if (!tmpEntry.isFile()) continue;
		if (SKIP_FILES.has(tmpEntry.name)) continue;
		let tmpExt = libPath.extname(tmpEntry.name).toLowerCase();
		if (REWRITE_EXTENSIONS.indexOf(tmpExt) === -1) continue;
		pCallback(libPath.join(pDir, tmpEntry.name));
	}
}

// ─────────────────────────────────────────────
//  Git helpers
// ─────────────────────────────────────────────

function gitCheck(pCwd, pArgs)
{
	let tmpResult = libChildProcess.spawnSync('git', pArgs, { cwd: pCwd, encoding: 'utf8' });
	return { Status: tmpResult.status, Stdout: (tmpResult.stdout || '').trim(), Stderr: (tmpResult.stderr || '').trim() };
}

function verifyCleanAndRemotes(pModule)
{
	let tmpStatus = gitCheck(pModule.FullPath, ['status', '--porcelain']);
	if (tmpStatus.Status !== 0) return { OK: false, Reason: 'git status failed: ' + tmpStatus.Stderr };
	if (tmpStatus.Stdout.length > 0) return { OK: false, Reason: 'working tree dirty before rewrite' };

	let tmpUpstream = gitCheck(pModule.FullPath, ['remote', 'get-url', 'upstream']);
	if (tmpUpstream.Status !== 0) return { OK: false, Reason: 'no upstream remote' };
	let tmpExpectedUpstream = 'https://github.com/fable-retold/' + pModule.Name + '.git';
	if (tmpUpstream.Stdout !== tmpExpectedUpstream) return { OK: false, Reason: 'upstream is ' + tmpUpstream.Stdout + ', expected ' + tmpExpectedUpstream };

	let tmpOrigin = gitCheck(pModule.FullPath, ['remote', 'get-url', 'origin']);
	if (tmpOrigin.Status !== 0) return { OK: false, Reason: 'no origin remote' };

	let tmpBranch = gitCheck(pModule.FullPath, ['branch', '--show-current']);
	if (tmpBranch.Stdout !== 'master' && tmpBranch.Stdout !== 'main') return { OK: false, Reason: 'on branch ' + tmpBranch.Stdout + ', not master/main' };

	return { OK: true, DefaultBranch: tmpBranch.Stdout };
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────

function main()
{
	let tmpArgs = process.argv.slice(2);
	let tmpApply = tmpArgs.indexOf('--apply') !== -1;
	let tmpLimitIdx = tmpArgs.indexOf('--limit');
	let tmpLimit = (tmpLimitIdx !== -1 && tmpArgs[tmpLimitIdx + 1]) ? parseInt(tmpArgs[tmpLimitIdx + 1], 10) : Infinity;

	let tmpModules = loadForkableModules();
	console.log('Discovered ' + tmpModules.length + ' forkable modules in manifest.');
	if (tmpLimit < tmpModules.length) console.log('Limiting to first ' + tmpLimit + ' for this run.');
	console.log('Mode: ' + (tmpApply ? 'APPLY (will commit + push)' : 'DRY-RUN (no writes)'));
	console.log('');

	let tmpStats = { Visited: 0, Skipped: 0, Touched: 0, Pushed: 0, FailedPush: 0, FilesModified: 0 };

	for (let i = 0; i < tmpModules.length && i < tmpLimit; i++)
	{
		let tmpModule = tmpModules[i];
		tmpStats.Visited++;

		if (!libFs.existsSync(tmpModule.FullPath))
		{
			console.log('[' + (i+1) + '/' + Math.min(tmpModules.length, tmpLimit) + '] ' + tmpModule.GroupDir + '/' + tmpModule.Name + '  SKIP (not on disk)');
			tmpStats.Skipped++;
			continue;
		}

		// In apply mode, verify remotes and pick a branch.  We tolerate a dirty
		// working tree (e.g. WIP package-lock.json from a recent npm install) and
		// stage only the files this script touches.
		let tmpBranch = 'master';
		if (tmpApply)
		{
			let tmpUpstream = gitCheck(tmpModule.FullPath, ['remote', 'get-url', 'upstream']);
			let tmpExpectedUpstream = 'https://github.com/fable-retold/' + tmpModule.Name + '.git';
			if (tmpUpstream.Status !== 0 || tmpUpstream.Stdout !== tmpExpectedUpstream)
			{
				console.log('[' + (i+1) + '/' + Math.min(tmpModules.length, tmpLimit) + '] ' + tmpModule.GroupDir + '/' + tmpModule.Name + '  ! SKIP (upstream remote missing or wrong)');
				tmpStats.Skipped++;
				continue;
			}
			let tmpBranchResult = gitCheck(tmpModule.FullPath, ['branch', '--show-current']);
			if (tmpBranchResult.Stdout === 'master' || tmpBranchResult.Stdout === 'main')
			{
				tmpBranch = tmpBranchResult.Stdout;
			}
			else
			{
				console.log('[' + (i+1) + '/' + Math.min(tmpModules.length, tmpLimit) + '] ' + tmpModule.GroupDir + '/' + tmpModule.Name + '  ! SKIP (on branch ' + tmpBranchResult.Stdout + ', not master/main)');
				tmpStats.Skipped++;
				continue;
			}
		}

		let tmpRewrites = buildRewritesForName(tmpModule.Name);
		// Also rewrite references to sibling forkable modules.
		let tmpAllForkable = tmpModules.map(function (pM) { return pM.Name; });
		for (let j = 0; j < tmpAllForkable.length; j++)
		{
			if (tmpAllForkable[j] === tmpModule.Name) continue;
			Array.prototype.push.apply(tmpRewrites, buildRewritesForName(tmpAllForkable[j]));
		}

		let tmpFilesChanged = [];
		walkFiles(tmpModule.FullPath, function (pFilePath)
		{
			let tmpContent;
			try { tmpContent = libFs.readFileSync(pFilePath, 'utf8'); }
			catch (pError) { return; }
			let tmpResult = rewriteContent(tmpContent, tmpRewrites);
			if (!tmpResult.Changed) return;
			tmpFilesChanged.push(pFilePath);
			if (tmpApply) libFs.writeFileSync(pFilePath, tmpResult.Content);
		});

		if (tmpFilesChanged.length === 0)
		{
			console.log('[' + (i+1) + '/' + Math.min(tmpModules.length, tmpLimit) + '] ' + tmpModule.GroupDir + '/' + tmpModule.Name + '  clean (no URLs to rewrite)');
			continue;
		}

		tmpStats.Touched++;
		tmpStats.FilesModified += tmpFilesChanged.length;
		console.log('[' + (i+1) + '/' + Math.min(tmpModules.length, tmpLimit) + '] ' + tmpModule.GroupDir + '/' + tmpModule.Name + '  ' + tmpFilesChanged.length + ' file(s) ' + (tmpApply ? 'rewritten' : 'would change'));
		if (!tmpApply && tmpFilesChanged.length > 0)
		{
			console.log('    sample: ' + libPath.relative(tmpModule.FullPath, tmpFilesChanged[0]));
		}

		if (!tmpApply) continue;

		// Commit + push — stage ONLY the files we modified (don't sweep in unrelated WIP).
		let tmpAddArgs = ['add', '--'];
		for (let k = 0; k < tmpFilesChanged.length; k++)
		{
			tmpAddArgs.push(libPath.relative(tmpModule.FullPath, tmpFilesChanged[k]));
		}
		let tmpAdd = gitCheck(tmpModule.FullPath, tmpAddArgs);
		if (tmpAdd.Status !== 0)
		{
			console.log('    ! git add failed: ' + tmpAdd.Stderr);
			tmpStats.FailedPush++;
			continue;
		}
		// `git add` above staged only our files; `git commit` commits exactly the staging area.
		let tmpCommit = gitCheck(tmpModule.FullPath, ['commit', '-m', COMMIT_SUBJECT, '-m', COMMIT_BODY]);
		if (tmpCommit.Status !== 0)
		{
			console.log('    ! git commit failed: ' + tmpCommit.Stderr);
			tmpStats.FailedPush++;
			continue;
		}
		let tmpPushUpstream = gitCheck(tmpModule.FullPath, ['push', 'upstream', tmpBranch]);
		if (tmpPushUpstream.Status !== 0)
		{
			console.log('    ! push to upstream failed: ' + tmpPushUpstream.Stderr.split('\n')[0]);
			tmpStats.FailedPush++;
			continue;
		}
		let tmpPushOrigin = gitCheck(tmpModule.FullPath, ['push', 'origin', tmpBranch]);
		if (tmpPushOrigin.Status !== 0)
		{
			console.log('    ~ push to origin failed (fork out of sync): ' + tmpPushOrigin.Stderr.split('\n')[0]);
		}
		console.log('    + pushed to upstream + origin');
		tmpStats.Pushed++;
	}

	console.log('');
	console.log('=== Summary ===');
	console.log('Visited:        ' + tmpStats.Visited);
	console.log('Skipped:        ' + tmpStats.Skipped + ' (not on disk)');
	console.log('Touched:        ' + tmpStats.Touched + ' modules');
	console.log('Files modified: ' + tmpStats.FilesModified);
	if (tmpApply)
	{
		console.log('Pushed:         ' + tmpStats.Pushed);
		console.log('Failed pushes:  ' + tmpStats.FailedPush);
	}
	else
	{
		console.log('');
		console.log('Re-run with --apply to actually rewrite, commit, and push.');
	}
}

main();
