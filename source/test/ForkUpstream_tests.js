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

				test('ignores a commit already merged upstream under a different SHA (the PR-merge case)', () =>
					{
						// The fork commits a change; the org ends up with the SAME
						// patch as a DIFFERENT commit — exactly what a squash/rebase
						// PR merge produces ("…(#1)"). Raw counting would call this
						// 1 ahead / 1 behind forever; --cherry-pick must report 0 / 0.
						commitFile(tmpWork, 'shared.txt', 'identical change\n');
						git('remote add fork "' + tmpWork + '"', tmpOrg);
						git('fetch fork', tmpOrg);
						git('cherry-pick fork/master', tmpOrg);
						// Rewrite the message (like a squash/rebase merge appending
						// "…(#1)") so the SHA differs while the patch stays identical.
						git('commit --amend -m "shared.txt (#1)"', tmpOrg);
						git('fetch upstream', tmpWork);

						// Sanity: the two tips really are different commits…
						let tmpHead = libChildProcess.execSync('git rev-parse HEAD', { cwd: tmpWork, encoding: 'utf8' }).trim();
						let tmpUp   = libChildProcess.execSync('git rev-parse refs/remotes/upstream/master', { cwd: tmpWork, encoding: 'utf8' }).trim();
						Expect(tmpHead).to.not.equal(tmpUp);

						// …yet drift is 0/0 because the patch is already upstream.
						let tmpDrift = tmpIntrospector.getUpstreamDrift(tmpWork, 'master');
						Expect(tmpDrift.HasUpstreamRef).to.equal(true);
						Expect(tmpDrift.AheadUpstream).to.equal(0);
						Expect(tmpDrift.BehindUpstream).to.equal(0);
					});

				test('reports in-sync when content matches upstream despite divergent history (squash-merge)', () =>
					{
						// Fork makes TWO commits; the org ends up with the same net
						// content as a SINGLE squashed commit (what GitHub's "Squash
						// and merge" does). --cherry-pick can't match 2 commits to 1,
						// so it would still call the fork ahead — but the trees are
						// identical, so drift must report 0/0.
						commitFile(tmpWork, 'a.txt', 'AAA\n');
						commitFile(tmpWork, 'b.txt', 'BBB\n');

						libFs.writeFileSync(libPath.join(tmpOrg, 'a.txt'), 'AAA\n');
						libFs.writeFileSync(libPath.join(tmpOrg, 'b.txt'), 'BBB\n');
						git('add -A', tmpOrg);
						git('commit -m "squashed a + b (#9)"', tmpOrg);
						git('fetch upstream', tmpWork);

						// Sanity: identical content, but different commit history.
						let tmpIdentical = true;
						try { libChildProcess.execSync('git diff --quiet HEAD refs/remotes/upstream/master', { cwd: tmpWork }); }
						catch (pE) { tmpIdentical = false; }
						Expect(tmpIdentical).to.equal(true);

						let tmpDrift = tmpIntrospector.getUpstreamDrift(tmpWork, 'master');
						Expect(tmpDrift.AheadUpstream).to.equal(0);
						Expect(tmpDrift.BehindUpstream).to.equal(0);
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
		suite
		(
			'deriveNextAction (server-side next-action source of truth)',
			() =>
			{
				let NA = libIntrospector.deriveNextAction;
				test('all-clear -> in-sync', () => { Expect(NA({ Forkable: true, HasForkUpstream: true })).to.equal('in-sync'); });
				test('dirty beats everything -> commit', () => { Expect(NA({ Dirty: true, LocalAheadFork: 5, ForkAheadUpstream: 5, Forkable: true, HasForkUpstream: true })).to.equal('commit'); });
				test('local ahead of fork -> push', () => { Expect(NA({ LocalAheadFork: 2, Forkable: true, HasForkUpstream: true })).to.equal('push'); });
				test('local behind fork -> pull-fork (beats push)', () => { Expect(NA({ LocalBehindFork: 1, LocalAheadFork: 1, Forkable: true, HasForkUpstream: true })).to.equal('pull-fork'); });
				test('fork behind upstream -> sync-upstream', () => { Expect(NA({ Forkable: true, HasForkUpstream: true, ForkBehindUpstream: 1 })).to.equal('sync-upstream'); });
				test('fork ahead of upstream -> create-pr', () => { Expect(NA({ Forkable: true, HasForkUpstream: true, ForkAheadUpstream: 3 })).to.equal('create-pr'); });
				test('diverged fork -> sync-upstream first (rebase, design A)', () => { Expect(NA({ Forkable: true, HasForkUpstream: true, ForkAheadUpstream: 2, ForkBehindUpstream: 1 })).to.equal('sync-upstream'); });
				test('push beats PR (save local work first)', () => { Expect(NA({ LocalAheadFork: 1, Forkable: true, HasForkUpstream: true, ForkAheadUpstream: 1 })).to.equal('push'); });
				test('non-forkable -> only commit/push/pull (Local<->Remote)', () =>
					{
						Expect(NA({ Forkable: false, ForkAheadUpstream: 9, ForkBehindUpstream: 9, HasForkUpstream: true })).to.equal('in-sync');
						Expect(NA({ Forkable: false, LocalAheadFork: 1 })).to.equal('push');
						Expect(NA({ Forkable: false, LocalBehindFork: 1 })).to.equal('pull-fork');
					});
				test('forkable but Fork<->Upstream unknown -> no sync/PR', () => { Expect(NA({ Forkable: true, HasForkUpstream: false, ForkAheadUpstream: 5 })).to.equal('in-sync'); });
			}
		);

	});
