/**
 * Retold Manager -- GitHub PR Helpers
 *
 * Shared, transport-agnostic helpers for the fork → upstream pull-request
 * workflow. Originally lived inline in the ripple sequencer
 * (web/server/RetoldManager-Api-Ripple.js); extracted here so both the ripple
 * executor (create/approve/merge PR actions) and the per-module Git-section
 * "Create PR" route can resolve the same fork/upstream context and look up
 * existing PRs identically.
 *
 * All synchronous (spawnSync) — they shell out to `git` and the `gh` CLI. The
 * `gh`-backed lookups hit the network, so callers use them on-demand (a single
 * button press / one ripple action), never inside the parallel local scan.
 */

const libChildProcess = require('child_process');

//
// Convert a git remote URL into { Owner, Repo }. Handles both
//   https://github.com/owner/repo[.git]   and   git@github.com:owner/repo[.git]
// Returns null for empty / unrecognized input.
//
function parseGithubUrl(pUrl)
{
	if (!pUrl) return null;
	let tmpMatch = pUrl.match(/^(?:https?:\/\/github\.com\/|git@github\.com:)([^/]+)\/([^/.]+?)(?:\.git)?$/);
	if (!tmpMatch) return null;
	return { Owner: tmpMatch[1], Repo: tmpMatch[2] };
}

function gitCapture(pArgs, pCwd)
{
	let tmpResult = libChildProcess.spawnSync('git', pArgs, { cwd: pCwd, encoding: 'utf8' });
	return { Status: tmpResult.status, Stdout: (tmpResult.stdout || '').trim(), Stderr: (tmpResult.stderr || '').trim() };
}

function ghCapture(pArgs, pCwd)
{
	let tmpResult = libChildProcess.spawnSync('gh', pArgs, { cwd: pCwd, encoding: 'utf8' });
	if (tmpResult.status !== 0)
	{
		let tmpErr = (tmpResult.stderr || '').trim() || ('exit ' + tmpResult.status);
		let tmpHead = pArgs.slice(0, 3).join(' ');
		throw new Error('gh ' + tmpHead + ' failed: ' + tmpErr);
	}
	return (tmpResult.stdout || '').trim();
}

//
// Resolve the GitHub PR context for a module clone:
//   - Fork:     the origin remote, parsed { Owner, Repo }
//   - Upstream: the upstream remote, parsed { Owner, Repo }
//   - Branch:   the current local branch
//
function resolveModulePrContext(pModulePath)
{
	let tmpOriginUrl = gitCapture(['remote', 'get-url', 'origin'], pModulePath).Stdout;
	let tmpUpstreamUrl = gitCapture(['remote', 'get-url', 'upstream'], pModulePath).Stdout;
	if (!tmpUpstreamUrl)
	{
		throw new Error('no "upstream" remote configured; cannot determine canonical repo for PR');
	}
	let tmpFork = parseGithubUrl(tmpOriginUrl);
	let tmpUpstream = parseGithubUrl(tmpUpstreamUrl);
	if (!tmpFork)
	{
		throw new Error('could not parse origin remote URL: ' + tmpOriginUrl);
	}
	if (!tmpUpstream)
	{
		throw new Error('could not parse upstream remote URL: ' + tmpUpstreamUrl);
	}
	let tmpBranch = gitCapture(['branch', '--show-current'], pModulePath).Stdout;
	if (!tmpBranch)
	{
		throw new Error('detached HEAD or unknown branch; cannot create PR');
	}
	return { Fork: tmpFork, Upstream: tmpUpstream, Branch: tmpBranch };
}

//
// Look up an existing PR for <fork>:<branch> -> <upstream>. Returns the most
// relevant one (prefers OPEN, then any MERGED, then CLOSED). Null if none.
// The shape includes { number, state, url, author: { login } } so callers
// can do same-user pre-checks (e.g. approve-pr's self-PR guard).
//
// Implementation note: this hits the REST API directly rather than going
// through `gh pr list --head <user:branch>` because the latter silently
// returns [] when the head argument includes a user prefix.  `gh pr list
// --head` only accepts a branch name, even though the underlying REST
// endpoint documents and supports the `user:ref-name` form.  Using the
// REST API gives us a reliable filter that also survives forks whose
// branch name matches a branch in the canonical repo (a common case when
// PRs are master->master / main->main).
//
function findExistingPr(pCtx, pModulePath)
{
	let tmpRepo = pCtx.Upstream.Owner + '/' + pCtx.Upstream.Repo;
	let tmpHead = pCtx.Fork.Owner + ':' + pCtx.Branch;
	let tmpJson;
	try
	{
		tmpJson = ghCapture(['api', '/repos/' + tmpRepo + '/pulls?head=' + encodeURIComponent(tmpHead) + '&state=all&per_page=10'], pModulePath);
	}
	catch (pError) { return null; }
	let tmpPrs;
	try { tmpPrs = JSON.parse(tmpJson || '[]'); }
	catch (pError) { return null; }
	if (!Array.isArray(tmpPrs) || tmpPrs.length === 0) return null;

	// Normalise REST shape (lowercase state, html_url, user.login) to the
	// shape callers expect (matches what `gh pr list --json` used to emit).
	let tmpNormalised = tmpPrs.map(function (pP)
	{
		let tmpState = (pP.state || '').toUpperCase();
		if (tmpState === 'CLOSED' && pP.merged_at) tmpState = 'MERGED';
		return {
			number: pP.number,
			state:  tmpState,
			url:    pP.html_url || pP.url,
			author: pP.user ? { login: pP.user.login } : null
		};
	});

	let tmpOpen = tmpNormalised.find(function (pP) { return pP.state === 'OPEN'; });
	if (tmpOpen) return tmpOpen;
	let tmpMerged = tmpNormalised.find(function (pP) { return pP.state === 'MERGED'; });
	if (tmpMerged) return tmpMerged;
	return tmpNormalised[0];
}

//
// Return the current gh-authenticated user's login. Cached in a module-level
// variable because it doesn't change between actions in a single ripple.
//
let _cachedCurrentGhUser = null;
function getCurrentGhUser(pCwd)
{
	if (_cachedCurrentGhUser) return _cachedCurrentGhUser;
	try
	{
		_cachedCurrentGhUser = ghCapture(['api', 'user', '--jq', '.login'], pCwd) || null;
	}
	catch (pError) { _cachedCurrentGhUser = null; }
	return _cachedCurrentGhUser;
}

function getLatestCommitMessage(pModulePath)
{
	let tmpSubject = gitCapture(['log', '-1', '--format=%s'], pModulePath).Stdout;
	let tmpBody    = gitCapture(['log', '-1', '--format=%b'], pModulePath).Stdout;
	return { Subject: tmpSubject, Body: tmpBody };
}

function getUpstreamDefaultBranch(pCtx, pModulePath)
{
	try
	{
		let tmpRepo = pCtx.Upstream.Owner + '/' + pCtx.Upstream.Repo;
		let tmpName = ghCapture(['repo', 'view', tmpRepo, '--json', 'defaultBranchRef', '-q', '.defaultBranchRef.name'], pModulePath);
		return tmpName || 'master';
	}
	catch (pError) { return 'master'; }
}

module.exports =
	{
		parseGithubUrl,
		gitCapture,
		ghCapture,
		resolveModulePrContext,
		findExistingPr,
		getCurrentGhUser,
		getLatestCommitMessage,
		getUpstreamDefaultBranch,
	};
