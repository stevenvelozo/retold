/**
* Unit + integration tests for the fork → upstream drift / PR tooling.
*
*   - parseLeftRightCount        (pure parser)
*   - Manager-Core-GitHubPr      (URL parsing + PR-context guard)
*   - ModuleIntrospector.getUpstreamDrift  (real temp git repos)
*
* @license MIT
*/

const Chai = require('chai');
const Expect = Chai.expect;

const libFs = require('fs');
const libOs = require('os');
const libPath = require('path');
const libChildProcess = require('child_process');

const libIntrospector = require('../core/Manager-Core-ModuleIntrospector.js');
const parseLeftRightCount = libIntrospector.parseLeftRightCount;
const libGitHubPr = require('../core/Manager-Core-GitHubPr.js');

// Minimal manifest stub — getUpstreamDrift takes a path directly and never
// touches the manifest, but the constructor requires one to be present.
const _ManifestStub = { getModule: () => null, getAllModuleNames: () => [], ecosystemNames: new Set() };

function git(pArgs, pCwd)
{
	libChildProcess.execSync('git ' + pArgs,
		{ cwd: pCwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
}

function configRepo(pCwd)
{
	git('config user.email "test@retold.local"', pCwd);
	git('config user.name "Retold Test"', pCwd);
	git('config commit.gpgsign false', pCwd);
}

function commitFile(pCwd, pFile, pContents)
{
	libFs.writeFileSync(libPath.join(pCwd, pFile), pContents);
	git('add -A', pCwd);
	git('commit -m "' + pFile + '"', pCwd);
}

suite
(
	'Fork → Upstream Drift Tooling',
	() =>
	{
		suite
		(
			'parseLeftRightCount',
			() =>
			{
				test('parses "<behind>\\t<ahead>" with the upstream-on-left convention', () =>
					{
						let tmpResult = parseLeftRightCount('2\t3');
						Expect(tmpResult.Behind).to.equal(2);
						Expect(tmpResult.Ahead).to.equal(3);
					});
				test('handles zero / zero', () =>
					{
						let tmpResult = parseLeftRightCount('0\t0');
						Expect(tmpResult.Behind).to.equal(0);
						Expect(tmpResult.Ahead).to.equal(0);
					});
				test('tolerates arbitrary whitespace between the counts', () =>
					{
						let tmpResult = parseLeftRightCount('  5   7  ');
						Expect(tmpResult.Behind).to.equal(5);
						Expect(tmpResult.Ahead).to.equal(7);
					});
				test('returns zeros for empty / null / malformed input', () =>
					{
						Expect(parseLeftRightCount('')).to.deep.equal({ Behind: 0, Ahead: 0 });
						Expect(parseLeftRightCount(null)).to.deep.equal({ Behind: 0, Ahead: 0 });
						Expect(parseLeftRightCount('garbage')).to.deep.equal({ Behind: 0, Ahead: 0 });
					});
			});

		suite
		(
			'Manager-Core-GitHubPr.parseGithubUrl',
			() =>
			{
				test('parses https URLs (with and without .git)', () =>
					{
						Expect(libGitHubPr.parseGithubUrl('https://github.com/fable-retold/fable.git'))
							.to.deep.equal({ Owner: 'fable-retold', Repo: 'fable' });
						Expect(libGitHubPr.parseGithubUrl('https://github.com/stevenvelozo/pict'))
							.to.deep.equal({ Owner: 'stevenvelozo', Repo: 'pict' });
					});
				test('parses ssh (git@) URLs', () =>
					{
						Expect(libGitHubPr.parseGithubUrl('git@github.com:fable-retold/meadow.git'))
							.to.deep.equal({ Owner: 'fable-retold', Repo: 'meadow' });
					});
				test('returns null for empty / non-github input', () =>
					{
						Expect(libGitHubPr.parseGithubUrl('')).to.equal(null);
						Expect(libGitHubPr.parseGithubUrl('https://gitlab.com/x/y')).to.equal(null);
					});
			});

		suite
		(
			'Manager-Core-GitHubPr.resolveModulePrContext',
			() =>
			{
				test('throws cleanly when there is no upstream remote', () =>
					{
						// A non-git temp dir has no remotes at all → the "no upstream"
						// guard fires (parity with a forkless / read-only clone).
						let tmpDir = libFs.mkdtempSync(libPath.join(libOs.tmpdir(), 'retold-noup-'));
						Expect(() => libGitHubPr.resolveModulePrContext(tmpDir))
							.to.throw(/upstream/i);
					});
			});

		suite
		(
			'ModuleIntrospector.getUpstreamDrift',
			() =>
			{
				let tmpRoot;
				let tmpOrg;
				let tmpWork;
				let tmpIntrospector;

				setup(() =>
					{
						tmpIntrospector = new libIntrospector({ manifest: _ManifestStub });

						tmpRoot = libFs.mkdtempSync(libPath.join(libOs.tmpdir(), 'retold-drift-'));
						tmpOrg  = libPath.join(tmpRoot, 'org');
						tmpWork = libPath.join(tmpRoot, 'work');

						// "org" = the canonical upstream repo with one commit.
						libFs.mkdirSync(tmpOrg);
						git('init -b master', tmpOrg);
						configRepo(tmpOrg);
						commitFile(tmpOrg, 'README.md', 'v1\n');

						// "work" = a local fork clone; rename origin → upstream so it
						// matches retold's fork convention (origin=fork, upstream=org).
						git('clone "' + tmpOrg + '" "' + tmpWork + '"', tmpRoot);
						configRepo(tmpWork);
						git('remote rename origin upstream', tmpWork);
					});

				teardown(() =>
					{
						if (tmpRoot) { libFs.rmSync(tmpRoot, { recursive: true, force: true }); }
					});

				test('reports 0 / 0 for a fresh clone in sync with upstream', () =>
					{
						let tmpDrift = tmpIntrospector.getUpstreamDrift(tmpWork, 'master');
						Expect(tmpDrift.HasUpstreamRef).to.equal(true);
						Expect(tmpDrift.AheadUpstream).to.equal(0);
						Expect(tmpDrift.BehindUpstream).to.equal(0);
					});

				test('counts local-only commits as ahead of upstream', () =>
					{
						commitFile(tmpWork, 'feature.js', 'local work\n');
						let tmpDrift = tmpIntrospector.getUpstreamDrift(tmpWork, 'master');
						Expect(tmpDrift.AheadUpstream).to.equal(1);
						Expect(tmpDrift.BehindUpstream).to.equal(0);
					});

				test('counts org commits as behind after a fetch (and tracks divergence)', () =>
					{
						// Diverge: a local commit on the fork, a separate commit on org.
						commitFile(tmpWork, 'feature.js', 'local work\n');
						commitFile(tmpOrg, 'CHANGELOG.md', 'org moved on\n');
						git('fetch upstream', tmpWork);

						let tmpDrift = tmpIntrospector.getUpstreamDrift(tmpWork, 'master');
						Expect(tmpDrift.AheadUpstream).to.equal(1);
						Expect(tmpDrift.BehindUpstream).to.equal(1);
					});

				test('flags HasUpstreamRef:false when there is no upstream remote', () =>
					{
						let tmpSolo = libPath.join(tmpRoot, 'solo');
						libFs.mkdirSync(tmpSolo);
						git('init -b master', tmpSolo);
						configRepo(tmpSolo);
						commitFile(tmpSolo, 'a.txt', 'x\n');

						let tmpDrift = tmpIntrospector.getUpstreamDrift(tmpSolo, 'master');
						Expect(tmpDrift.HasUpstreamRef).to.equal(false);
						Expect(tmpDrift.AheadUpstream).to.equal(null);
						Expect(tmpDrift.BehindUpstream).to.equal(null);
					});
			});
	});
