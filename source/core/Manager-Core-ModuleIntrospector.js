/**
 * Retold Manager -- Module Introspector
 *
 * Read-only queries about a single module: package.json, the currently
 * published npm version, git status/diff/log, and a combined ecosystem
 * dependency freshness check. A reusable service shared by the web
 * REST routes and the ripple sequencer.
 *
 * Both synchronous and Promise-returning variants are exposed where it
 * matters. Synchronous forms preserve the original blocking semantics
 * call sites were written against (where
 * `_runPublish` blocks on `npm view`); Promise forms let the web server
 * parallelize and respect a caller-supplied timeout without blocking
 * the event loop.
 *
 * Results are cached in-memory with a short TTL so rapid-fire calls
 * (switching between modules, re-rendering a preview) don't hammer
 * `npm view` for the same package.
 */

const libFs = require('fs');
const libPath = require('path');
const libChildProcess = require('child_process');

// Defaults
const DEFAULT_NPM_TIMEOUT_MS = 15000;
const NPM_VERSION_CACHE_TTL_MS = 60 * 1000;

// âââââââââââââââââââââââââââââââââââââââââââââ
//  Helpers
// âââââââââââââââââââââââââââââââââââââââââââââ

function parseJsonSafely(pContent)
{
	try { return JSON.parse(pContent); }
	catch (pError) { return null; }
}

function collectDeps(pPkg)
{
	// Returns { name -> { Range, Section } } combining dependencies + devDependencies.
	let tmpResult = {};
	let tmpSections = ['dependencies', 'devDependencies'];
	for (let i = 0; i < tmpSections.length; i++)
	{
		let tmpSection = tmpSections[i];
		if (!pPkg[tmpSection]) { continue; }
		let tmpNames = Object.keys(pPkg[tmpSection]);
		for (let j = 0; j < tmpNames.length; j++)
		{
			tmpResult[tmpNames[j]] =
				{
					Range: pPkg[tmpSection][tmpNames[j]],
					Section: tmpSection,
				};
		}
	}
	return tmpResult;
}

/**
 * Does the semver range `pRange` admit `pLatest` as a valid upgrade?
 * Works for the narrow set of ranges used in retold's ecosystem:
 *   ^X.Y.Z   â major-locked, allows minor/patch above
 *   ~X.Y.Z   â minor-locked, allows patch above
 *   X.Y.Z    â exact match only
 *   file:... â always considered "local link", covers everything
 * Not a full semver implementation; good enough for the health check.
 */
function rangeCoversVersion(pRange, pLatest)
{
	if (!pRange || !pLatest) { return false; }
	if (pRange.startsWith('file:')) { return true; }

	let tmpPrefix = pRange.match(/^[\^~]/);
	let tmpBase = pRange.replace(/^[\^~>=<]*/, '');

	if (tmpBase === pLatest) { return true; }

	let tmpRangeParts = tmpBase.split('.').map(Number);
	let tmpLatestParts = pLatest.split('.').map(Number);

	if (!tmpPrefix) { return false; }

	if (tmpPrefix[0] === '^')
	{
		// ^ allows changes that don't modify the left-most non-zero digit.
		if (tmpRangeParts[0] > 0)
		{
			return (tmpLatestParts[0] === tmpRangeParts[0])
				&& ((tmpLatestParts[1] > tmpRangeParts[1])
					|| (tmpLatestParts[1] === tmpRangeParts[1] && tmpLatestParts[2] >= tmpRangeParts[2]));
		}
		if (tmpRangeParts[1] > 0)
		{
			return (tmpLatestParts[0] === 0)
				&& (tmpLatestParts[1] === tmpRangeParts[1])
				&& (tmpLatestParts[2] >= tmpRangeParts[2]);
		}
		// 0.0.x â ^ is exact match per semver rules
		return (tmpLatestParts[0] === 0) && (tmpLatestParts[1] === 0) && (tmpLatestParts[2] === tmpRangeParts[2]);
	}

	// ~ allows patch-level changes within the same minor
	return (tmpLatestParts[0] === tmpRangeParts[0])
		&& (tmpLatestParts[1] === tmpRangeParts[1])
		&& (tmpLatestParts[2] >= tmpRangeParts[2]);
}

/**
 * Categorize a repo-relative path into one of the four scan categories:
 *
 *   Source         â source/**
 *   Tests          â test/**
 *   Documentation  â docs/**
 *   Tooling        â everything else (build configs, package.json, etc.)
 *
 * Path-prefix only; we don't try to be clever about extensions.  This
 * is a coarse summary so the user can tell at a glance whether a
 * dirty repo is "100 lines of doc churn" or "300 lines of new code"
 * before bundling commits into a ripple.
 */
function _scanCategoryForPath(pPath)
{
	if (!pPath) { return 'Tooling'; }
	if (pPath === 'source' || pPath.startsWith('source/')) { return 'Source'; }
	if (pPath === 'test'   || pPath.startsWith('test/'))   { return 'Tests'; }
	if (pPath === 'docs'   || pPath.startsWith('docs/'))   { return 'Documentation'; }
	return 'Tooling';
}

function _emptyChangeBucket()
{
	return { Files: 0, Added: 0, Removed: 0 };
}

function _emptyChangeReport()
{
	return {
		Source:        _emptyChangeBucket(),
		Tests:         _emptyChangeBucket(),
		Documentation: _emptyChangeBucket(),
		Tooling:       _emptyChangeBucket(),
		Total:         _emptyChangeBucket()
	};
}

function _addToBucket(pReport, pCategory, pFiles, pAdded, pRemoved)
{
	pReport[pCategory].Files   += pFiles;
	pReport[pCategory].Added   += pAdded;
	pReport[pCategory].Removed += pRemoved;
	pReport.Total.Files        += pFiles;
	pReport.Total.Added        += pAdded;
	pReport.Total.Removed      += pRemoved;
}

/**
 * Parse the output of `git status --porcelain -b` into the same shape
 * getGitStatus uses. Kept as a module-level helper so the async scan path
 * can share it without going through the sync execGit.
 */
function parsePorcelain(pRaw)
{
	let tmpResult =
		{
			Branch: '', Ahead: 0, Behind: 0, Files: [],
			Dirty: false,
			HasStaged: false,    // index-side change (something is `git add`-ed)
			HasUnstaged: false,  // working-tree-side change or untracked file
		};
	if (!pRaw) { return tmpResult; }

	let tmpLines = pRaw.split('\n');
	for (let i = 0; i < tmpLines.length; i++)
	{
		let tmpLine = tmpLines[i];
		if (!tmpLine) { continue; }
		if (tmpLine.startsWith('##'))
		{
			let tmpInfo = tmpLine.slice(3);
			let tmpBranchMatch = tmpInfo.match(/^([^.\s]+)/);
			if (tmpBranchMatch) { tmpResult.Branch = tmpBranchMatch[1]; }

			let tmpAhead = tmpInfo.match(/ahead (\d+)/);
			let tmpBehind = tmpInfo.match(/behind (\d+)/);
			if (tmpAhead) { tmpResult.Ahead = parseInt(tmpAhead[1], 10); }
			if (tmpBehind) { tmpResult.Behind = parseInt(tmpBehind[1], 10); }
		}
		else
		{
			// Two-char porcelain code: XY where X = index, Y = working tree.
			// Untracked files come through as "??". Anything other than space
			// (or '?') in the index slot means staged; anything other than
			// space in the worktree slot â or the whole "??" â means unstaged.
			let tmpStatusCode = tmpLine.slice(0, 2);
			let tmpFile = tmpLine.slice(3);
			tmpResult.Files.push({ Status: tmpStatusCode, Path: tmpFile });

			let tmpIndexCh = tmpStatusCode.charAt(0);
			let tmpTreeCh  = tmpStatusCode.charAt(1);
			if (tmpStatusCode === '??')
			{
				tmpResult.HasUnstaged = true;
			}
			else
			{
				if (tmpIndexCh !== ' ' && tmpIndexCh !== '?') { tmpResult.HasStaged = true; }
				if (tmpTreeCh  !== ' ' && tmpTreeCh  !== '?') { tmpResult.HasUnstaged = true; }
			}
		}
	}
	tmpResult.Dirty = tmpResult.Files.length > 0;
	return tmpResult;
}

/**
 * Parse the output of `git rev-list --left-right --count <upstream>...HEAD`,
 * which is a single "<left>\t<right>" line. With the upstream ref on the LEFT
 * of the `...` range, left = commits the upstream has that HEAD doesn't
 * (= behind), right = commits HEAD has that upstream doesn't (= ahead).
 * Returns { Behind, Ahead } â both 0 for empty / malformed input.
 */
function parseLeftRightCount(pRaw)
{
	let tmpResult = { Behind: 0, Ahead: 0 };
	if (!pRaw) { return tmpResult; }
	// Counts are whitespace-separated (a tab in practice). Split on any run of
	// whitespace and take the first two integers.
	let tmpParts = String(pRaw).trim().split(/\s+/);
	if (tmpParts.length < 2) { return tmpResult; }
	let tmpBehind = parseInt(tmpParts[0], 10);
	let tmpAhead  = parseInt(tmpParts[1], 10);
	tmpResult.Behind = Number.isFinite(tmpBehind) ? tmpBehind : 0;
	tmpResult.Ahead  = Number.isFinite(tmpAhead)  ? tmpAhead  : 0;
	return tmpResult;
}

/**
 * Map a module's three-edge state to the single recommended next action.
 * This is the SERVER-SIDE single source of truth; the client renders the code.
 *
 * Edges:  Local â Fork  and  Fork â Upstream  (for a non-forkable module, "Fork"
 * is just its single canonical remote â i.e. Local â Remote).
 *
 * pState (all optional, default 0/false):
 *   Forkable           â has a real upstream/fork relationship
 *   Dirty              â uncommitted / untracked working-tree changes
 *   LocalAheadFork     â committed commits not on the fork (â push)
 *   LocalBehindFork    â fork has commits local lacks (â pull-fork)
 *   ForkAheadUpstream  â fork has commits the org lacks (â open PR)
 *   ForkBehindUpstream â org has commits the fork lacks (â sync/rebase)
 *   HasForkUpstream    â the ForkâUpstream comparison is known (both refs present)
 *
 * Priority (most-upstream pending step first; rebase + fork-mediated, per design
 * doc Â§7): commit â pull-fork â push â sync-upstream â create-pr â in-sync.
 * Non-forkable modules only ever see commit / pull-fork / push / in-sync.
 */
function deriveNextAction(pState)
{
	let tmpS = pState || {};
	if (tmpS.Dirty) { return 'commit'; }
	if ((tmpS.LocalBehindFork || 0) > 0) { return 'pull-fork'; }
	if ((tmpS.LocalAheadFork  || 0) > 0) { return 'push'; }
	if (tmpS.Forkable && tmpS.HasForkUpstream)
	{
		if ((tmpS.ForkBehindUpstream || 0) > 0) { return 'sync-upstream'; }
		if ((tmpS.ForkAheadUpstream  || 0) > 0) { return 'create-pr'; }
	}
	return 'in-sync';
}

// âââââââââââââââââââââââââââââââââââââââââââââ
//  Introspector
// âââââââââââââââââââââââââââââââââââââââââââââ

class ModuleIntrospector
{
	/**
	 * @param {object} pOptions
	 * @param {object} pOptions.manifest  Manager-Core-ModuleCatalog (or ManifestLoader) instance.
	 * @param {object} [pOptions.log]     Fable-log (optional).
	 */
	constructor(pOptions)
	{
		let tmpOptions = pOptions || {};
		this.manifest = tmpOptions.manifest;
		this.log = tmpOptions.log || null;

		if (!this.manifest)
		{
			throw new Error('ModuleIntrospector requires { manifest } (ModuleCatalog or ManifestLoader instance)');
		}

		// name -> { Version, FetchedAt }        â dist-tags.latest only
		this._npmVersionCache = new Map();
		// name -> { Versions: string[], FetchedAt } â FULL published list
		this._npmVersionsCache = new Map();
	}

	// âââââââââââââââââââââââââââââââââââââââââââââ
	//  Path resolution
	// âââââââââââââââââââââââââââââââââââââââââââââ

	/**
	 * Resolve a module name to its absolute path using the manifest. Returns
	 * null if the name is not in the manifest. Call sites should prefer this
	 * over constructing paths by hand.
	 */
	getModulePath(pName)
	{
		if (typeof this.manifest.getModule === 'function')
		{
			let tmpEntry = this.manifest.getModule(pName);
			return tmpEntry ? tmpEntry.AbsolutePath : null;
		}
		return null;
	}

	// âââââââââââââââââââââââââââââââââââââââââââââ
	//  package.json
	// âââââââââââââââââââââââââââââââââââââââââââââ

	readPackageJson(pName)
	{
		let tmpPath = this.getModulePath(pName);
		if (!tmpPath) { return null; }
		return this.readPackageJsonFromPath(tmpPath);
	}

	readPackageJsonFromPath(pModulePath)
	{
		let tmpPkgPath = libPath.join(pModulePath, 'package.json');
		try
		{
			let tmpContent = libFs.readFileSync(tmpPkgPath, 'utf8');
			let tmpPkg = parseJsonSafely(tmpContent);
			if (!tmpPkg) { return null; }
			tmpPkg._path = tmpPkgPath;
			tmpPkg._modulePath = pModulePath;
			return tmpPkg;
		}
		catch (pError) { return null; }
	}

	// âââââââââââââââââââââââââââââââââââââââââââââ
	//  npm view
	// âââââââââââââââââââââââââââââââââââââââââââââ

	/**
	 * Synchronously fetch the currently published version on npm. Returns
	 * null if not published (404) or if the call timed out.
	 */
	fetchPublishedVersionSync(pPackageName, pOptions)
	{
		let tmpOptions = pOptions || {};
		let tmpTimeout = tmpOptions.Timeout || DEFAULT_NPM_TIMEOUT_MS;
		let tmpCwd = tmpOptions.Cwd;

		// Cache hit
		let tmpCached = this._npmVersionCache.get(pPackageName);
		if (tmpCached && (Date.now() - tmpCached.FetchedAt) < NPM_VERSION_CACHE_TTL_MS)
		{
			return tmpCached.Version;
		}

		let tmpExecOptions = { encoding: 'utf8', timeout: tmpTimeout };
		if (tmpCwd) { tmpExecOptions.cwd = tmpCwd; }

		let tmpVersion = null;
		try
		{
			tmpVersion = libChildProcess.execSync(`npm view ${pPackageName} version`, tmpExecOptions).trim();
		}
		catch (pError) { tmpVersion = null; }

		this._npmVersionCache.set(pPackageName, { Version: tmpVersion, FetchedAt: Date.now() });
		return tmpVersion;
	}

	/**
	 * Promise-returning variant so the web server can fire many lookups in
	 * parallel. Uses child_process.exec (async) under the hood.
	 */
	fetchPublishedVersion(pPackageName, pOptions)
	{
		let tmpOptions = pOptions || {};
		let tmpTimeout = tmpOptions.Timeout || DEFAULT_NPM_TIMEOUT_MS;
		let tmpCwd = tmpOptions.Cwd;

		// Cache hit
		let tmpCached = this._npmVersionCache.get(pPackageName);
		if (tmpCached && (Date.now() - tmpCached.FetchedAt) < NPM_VERSION_CACHE_TTL_MS)
		{
			return Promise.resolve(tmpCached.Version);
		}

		let tmpSelf = this;
		return new Promise(function (pResolve)
			{
				let tmpExecOptions = { encoding: 'utf8', timeout: tmpTimeout };
				if (tmpCwd) { tmpExecOptions.cwd = tmpCwd; }

				libChildProcess.exec(`npm view ${pPackageName} version`, tmpExecOptions,
					function (pError, pStdout)
					{
						let tmpVersion = pError ? null : pStdout.trim();
						tmpSelf._npmVersionCache.set(pPackageName, { Version: tmpVersion, FetchedAt: Date.now() });
						pResolve(tmpVersion);
					});
			});
	}

	clearNpmVersionCache()
	{
		this._npmVersionCache.clear();
		this._npmVersionsCache.clear();
	}

	/**
	 * Fetch the FULL list of published versions for a package, not just
	 * `dist-tags.latest`. Needed because Steven publishes parallel major
	 * lines (e.g. meadow-endpoints has 2.0.23 on `latest` while 4.0.15 is
	 * also published but not on the `latest` tag). The ecosystem dep check
	 * should consider a range satisfied if ANY published version fits it,
	 * not just `latest`.
	 *
	 * Returns a Promise resolving to a string[] (empty if package is not
	 * published, or if the call failed).
	 */
	fetchPublishedVersions(pPackageName, pOptions)
	{
		let tmpOptions = pOptions || {};
		let tmpTimeout = tmpOptions.Timeout || DEFAULT_NPM_TIMEOUT_MS;
		let tmpCwd = tmpOptions.Cwd;

		let tmpCached = this._npmVersionsCache.get(pPackageName);
		if (tmpCached && (Date.now() - tmpCached.FetchedAt) < NPM_VERSION_CACHE_TTL_MS)
		{
			return Promise.resolve(tmpCached.Versions);
		}

		let tmpSelf = this;
		return new Promise(function (pResolve)
			{
				let tmpExecOptions = { encoding: 'utf8', timeout: tmpTimeout, maxBuffer: 5 * 1024 * 1024 };
				if (tmpCwd) { tmpExecOptions.cwd = tmpCwd; }

				libChildProcess.exec(`npm view ${pPackageName} versions --json`, tmpExecOptions,
					function (pError, pStdout)
					{
						let tmpVersions = [];
						if (!pError)
						{
							try
							{
								let tmpParsed = JSON.parse(pStdout);
								if (Array.isArray(tmpParsed)) { tmpVersions = tmpParsed; }
								else if (typeof tmpParsed === 'string') { tmpVersions = [tmpParsed]; }
							}
							catch (pParseError) { tmpVersions = []; }
						}
						tmpSelf._npmVersionsCache.set(pPackageName, { Versions: tmpVersions, FetchedAt: Date.now() });
						pResolve(tmpVersions);
					});
			});
	}

	fetchPublishedVersionsSync(pPackageName, pOptions)
	{
		let tmpOptions = pOptions || {};
		let tmpTimeout = tmpOptions.Timeout || DEFAULT_NPM_TIMEOUT_MS;
		let tmpCwd = tmpOptions.Cwd;

		let tmpCached = this._npmVersionsCache.get(pPackageName);
		if (tmpCached && (Date.now() - tmpCached.FetchedAt) < NPM_VERSION_CACHE_TTL_MS)
		{
			return tmpCached.Versions;
		}

		let tmpExecOptions = { encoding: 'utf8', timeout: tmpTimeout, maxBuffer: 5 * 1024 * 1024 };
		if (tmpCwd) { tmpExecOptions.cwd = tmpCwd; }

		let tmpVersions = [];
		try
		{
			let tmpRaw = libChildProcess.execSync(`npm view ${pPackageName} versions --json`, tmpExecOptions).trim();
			let tmpParsed = JSON.parse(tmpRaw);
			if (Array.isArray(tmpParsed)) { tmpVersions = tmpParsed; }
			else if (typeof tmpParsed === 'string') { tmpVersions = [tmpParsed]; }
		}
		catch (pError) { tmpVersions = []; }

		this._npmVersionsCache.set(pPackageName, { Versions: tmpVersions, FetchedAt: Date.now() });
		return tmpVersions;
	}

	/**
	 * Given a range and a list of published versions, classify what we
	 * found. Returns:
	 *   { Matched: string|null, HighestOverall: string|null }
	 *
	 * Matched is the highest version that actually satisfies the range
	 * (null if none do). HighestOverall is the highest published version
	 * regardless of range â useful for informative messages when Matched
	 * is null ("^4.0.15 â highest published is 4.0.14").
	 */
	pickHighestSatisfyingVersion(pRange, pVersions)
	{
		if (!pVersions || pVersions.length === 0)
		{
			return { Matched: null, HighestOverall: null };
		}

		// Descending semver-ish sort on x.y.z numeric tuple
		let tmpSorted = pVersions.slice().sort(function (pA, pB)
			{
				let tmpA = pA.split('.').map(Number);
				let tmpB = pB.split('.').map(Number);
				for (let i = 0; i < 3; i++)
				{
					let tmpDA = tmpA[i] || 0;
					let tmpDB = tmpB[i] || 0;
					if (tmpDA !== tmpDB) { return tmpDB - tmpDA; }
				}
				return 0;
			});

		let tmpMatched = null;
		for (let i = 0; i < tmpSorted.length; i++)
		{
			if (rangeCoversVersion(pRange, tmpSorted[i])) { tmpMatched = tmpSorted[i]; break; }
		}

		return { Matched: tmpMatched, HighestOverall: tmpSorted[0] };
	}

	// âââââââââââââââââââââââââââââââââââââââââââââ
	//  Ecosystem dependency freshness
	// âââââââââââââââââââââââââââââââââââââââââââââ

	/**
	 * For a given module, list every dependency whose name is in the
	 * retold ecosystem, with its local range and the currently-published
	 * npm version, and whether the range covers latest.
	 *
	 * Synchronous â queries npm view serially. Preserves today's TUI
	 * behavior. Call the async form below for parallelism.
	 *
	 * @returns {Array<{ Name, Range, Section, LatestOnNpm: string|null, CoversLatest: boolean, LocalLink: boolean, Error?: string }>}
	 */
	getEcosystemDepsSync(pName, pOptions)
	{
		let tmpPkg = this.readPackageJson(pName);
		if (!tmpPkg) { return []; }

		let tmpAllDeps = collectDeps(tmpPkg);
		let tmpEcosystemNames = this._getEcosystemNameSet();

		let tmpResult = [];
		let tmpDepNames = Object.keys(tmpAllDeps).sort();
		for (let i = 0; i < tmpDepNames.length; i++)
		{
			let tmpDepName = tmpDepNames[i];
			if (!tmpEcosystemNames.has(tmpDepName)) { continue; }

			let tmpDep = tmpAllDeps[tmpDepName];
			let tmpEntry =
				{
					Name: tmpDepName,
					Range: tmpDep.Range,
					Section: tmpDep.Section,
					LatestOnNpm: null,
					CoversLatest: false,
					LocalLink: tmpDep.Range.startsWith('file:'),
				};

			if (tmpEntry.LocalLink)
			{
				tmpEntry.CoversLatest = true;
				tmpResult.push(tmpEntry);
				continue;
			}

			let tmpModulePath = this.getModulePath(pName);
			let tmpVersions = this.fetchPublishedVersionsSync(tmpDepName,
				{ Cwd: tmpModulePath, Timeout: (pOptions && pOptions.Timeout) });

			if (!tmpVersions || tmpVersions.length === 0)
			{
				tmpEntry.Error = 'could not fetch from npm';
				tmpResult.push(tmpEntry);
				continue;
			}

			// Highest published version that actually satisfies the local
			// range. Considers the FULL versions list, not just the
			// `dist-tags.latest` entry â so parallel major lines (e.g.
			// meadow-endpoints has 2.0.23 on latest and 4.0.15 also
			// published) don't block valid ranges.
			let tmpPick = this.pickHighestSatisfyingVersion(tmpDep.Range, tmpVersions);
			tmpEntry.LatestOnNpm = tmpPick.Matched || tmpPick.HighestOverall;
			tmpEntry.CoversLatest = !!tmpPick.Matched;
			tmpEntry.HighestOnNpm = tmpPick.HighestOverall;

			tmpResult.push(tmpEntry);
		}
		return tmpResult;
	}

	/**
	 * Async variant â parallelizes npm view calls. Dramatically faster for
	 * modules with many ecosystem deps (meadow-endpoints, etc).
	 */
	async getEcosystemDeps(pName, pOptions)
	{
		let tmpPkg = this.readPackageJson(pName);
		if (!tmpPkg) { return []; }

		let tmpAllDeps = collectDeps(tmpPkg);
		let tmpEcosystemNames = this._getEcosystemNameSet();
		let tmpModulePath = this.getModulePath(pName);

		let tmpDepNames = Object.keys(tmpAllDeps).sort();
		let tmpEcosystemDeps = tmpDepNames.filter((pDepName) => tmpEcosystemNames.has(pDepName));

		let tmpSelf = this;
		let tmpEntries = tmpEcosystemDeps.map((pDepName) =>
			{
				let tmpDep = tmpAllDeps[pDepName];
				if (tmpDep.Range.startsWith('file:'))
				{
					return Promise.resolve(
						{
							Name: pDepName,
							Range: tmpDep.Range,
							Section: tmpDep.Section,
							LatestOnNpm: null,
							CoversLatest: true,
							LocalLink: true,
						});
				}

				return tmpSelf.fetchPublishedVersions(pDepName,
					{
						Cwd: tmpModulePath,
						Timeout: (pOptions && pOptions.Timeout)
					})
					.then((pVersions) =>
						{
							if (!pVersions || pVersions.length === 0)
							{
								return {
									Name: pDepName,
									Range: tmpDep.Range,
									Section: tmpDep.Section,
									LatestOnNpm: null,
									CoversLatest: false,
									LocalLink: false,
									Error: 'could not fetch from npm',
								};
							}
							let tmpPick = tmpSelf.pickHighestSatisfyingVersion(tmpDep.Range, pVersions);
							return {
								Name: pDepName,
								Range: tmpDep.Range,
								Section: tmpDep.Section,
								LatestOnNpm: tmpPick.Matched || tmpPick.HighestOverall,
								HighestOnNpm: tmpPick.HighestOverall,
								CoversLatest: !!tmpPick.Matched,
								LocalLink: false,
							};
						});
			});

		return Promise.all(tmpEntries);
	}

	_getEcosystemNameSet()
	{
		// Prefer ManifestLoader's Set; fall back to building from catalog.
		if (this.manifest.ecosystemNames instanceof Set)
		{
			return this.manifest.ecosystemNames;
		}
		if (typeof this.manifest.getAllModuleNames === 'function')
		{
			return new Set(this.manifest.getAllModuleNames());
		}
		let tmpSet = new Set();
		if (Array.isArray(this.manifest.Groups))
		{
			for (let i = 0; i < this.manifest.Groups.length; i++)
			{
				let tmpGroup = this.manifest.Groups[i];
				for (let j = 0; j < tmpGroup.Modules.length; j++)
				{
					tmpSet.add(tmpGroup.Modules[j]);
				}
			}
		}
		return tmpSet;
	}

	// âââââââââââââââââââââââââââââââââââââââââââââ
	//  git helpers (all synchronous, TUI-era parity)
	// âââââââââââââââââââââââââââââââââââââââââââââ

	_execGitSync(pArgs, pCwd, pTimeout)
	{
		let tmpTimeout = pTimeout || 10000;
		try
		{
			// stdio: ['ignore', 'pipe', 'pipe'] â we capture stdout/stderr
			// so a non-fatal git error (e.g. "unknown revision") doesn't leak
			// stderr into the parent process (which, under blessed, would
			// corrupt the screen, and under the web server, would dump into
			// server logs for every 404 tag lookup).
			//
			// maxBuffer bumped to 64MB so large diffs don't trip ENOBUFS
			// (Node's 1MB default silently killed git mid-run and we'd see
			// the dropped output as "No changes").
			let tmpOutput = libChildProcess.execSync(`git ${pArgs}`,
				{
					cwd: pCwd,
					encoding: 'utf8',
					timeout: tmpTimeout,
					maxBuffer: 64 * 1024 * 1024,
					stdio: ['ignore', 'pipe', 'pipe'],
				});
			return tmpOutput.toString();
		}
		catch (pError)
		{
			// ENOBUFS still possible on truly enormous diffs. Log to fable
			// so the problem is visible rather than silently empty.
			if (this.log && pError.code !== undefined)
			{
				this.log.warn('git ' + pArgs + ' failed in ' + pCwd
					+ ' (' + pError.code + (pError.signal ? ' / ' + pError.signal : '') + '): ' + pError.message);
			}
			// If git partially wrote before the kill, the captured bytes are
			// on pError.stdout â return them so the caller gets *something*.
			if (pError && pError.stdout)
			{
				let tmpPartial = typeof pError.stdout === 'string' ? pError.stdout : pError.stdout.toString('utf8');
				if (tmpPartial.length > 0) { return tmpPartial; }
			}
			return null;
		}
	}

	/**
	 * Quick summary of the working tree.
	 */
	getGitStatus(pName)
	{
		let tmpPath = this.getModulePath(pName);
		if (!tmpPath) { return null; }

		let tmpPorcelain = this._execGitSync('status --porcelain -b', tmpPath);
		if (tmpPorcelain === null) { return null; }

		let tmpStatus = parsePorcelain(tmpPorcelain);

		// Resolve the origin (typically the user's fork) and upstream (the
		// canonical org repo) remote URLs so the UI can show "your fork" +
		// "org" links separately. Either or both may be missing â e.g. a
		// non-forkable module's local clone has only origin pointing at its
		// canonical owner, no upstream.
		let tmpOrigin = this._execGitSync('remote get-url origin', tmpPath);
		let tmpUpstream = this._execGitSync('remote get-url upstream', tmpPath);
		tmpStatus.OriginUrl   = (tmpOrigin   || '').trim() || null;
		tmpStatus.UpstreamUrl = (tmpUpstream || '').trim() || null;

		// Drift vs the canonical upstream (org) repo â distinct from the
		// porcelain Ahead/Behind above (which is local-vs-origin). Local-ref
		// only, no network.
		let tmpDrift = this.getUpstreamDrift(tmpPath, tmpStatus.Branch);
		tmpStatus.HasUpstreamRef = tmpDrift.HasUpstreamRef;
		tmpStatus.UpstreamBranch = tmpDrift.UpstreamBranch;
		tmpStatus.AheadUpstream  = tmpDrift.AheadUpstream;
		tmpStatus.BehindUpstream = tmpDrift.BehindUpstream;

		// Fork â Upstream â is the FORK (origin), independent of local edits,
		// ahead/behind the org? Drives the PR / pull-upstream decisions.
		let tmpFUBranch = tmpStatus.UpstreamBranch || tmpStatus.Branch || 'master';
		let tmpForkUp = this._edgeDrift(tmpPath,
			'refs/remotes/upstream/' + tmpFUBranch, 'refs/remotes/origin/' + tmpFUBranch);
		tmpStatus.ForkAheadUpstream    = tmpForkUp.Ahead;
		tmpStatus.ForkBehindUpstream   = tmpForkUp.Behind;
		tmpStatus.HasForkUpstreamRefs  = tmpForkUp.HasBothRefs;

		// Single recommended next action (server-side source of truth). LocalâFork
		// is the porcelain Ahead/Behind (local vs its origin tracking ref).
		tmpStatus.NextAction = deriveNextAction(
			{
				Forkable:           !!tmpStatus.UpstreamUrl,
				Dirty:              tmpStatus.Dirty,
				LocalAheadFork:     tmpStatus.Ahead,
				LocalBehindFork:    tmpStatus.Behind,
				ForkAheadUpstream:  tmpForkUp.Ahead,
				ForkBehindUpstream: tmpForkUp.Behind,
				HasForkUpstream:    tmpForkUp.HasBothRefs,
			});

		// How fresh the drift numbers are â they're only as current as the last
		// fetch (a merge on GitHub is invisible until then). Surfaced so the UI
		// can show "as of <age>" and nudge a refresh.
		tmpStatus.UpstreamFetchedAt = this.getUpstreamFetchTime(tmpPath);

		return tmpStatus;
	}

	/**
	 * Best-effort "when were this clone's remotes last fetched" timestamp, used
	 * only as a freshness hint for the drift counts (which are computed from the
	 * already-fetched upstream ref). Reads the mtime of `.git/FETCH_HEAD`, which
	 * git rewrites on every `git fetch`. Returns an ISO string, or null when the
	 * repo has never been fetched.
	 *
	 * Fast path: `<path>/.git` is a normal directory (every module under
	 * `modules/` is its own repo root). Fallback: when it isn't — retold-manager's
	 * path is `source/` but the repo root (and `.git`) is one level up, and
	 * worktrees use a `.git` *file* pointing elsewhere — ask git where FETCH_HEAD
	 * actually lives. The fallback costs one exec, but only for those rare repos.
	 */
	getUpstreamFetchTime(pModulePath)
	{
		if (!pModulePath) { return null; }
		try
		{
			let tmpFetchHeadPath = null;
			let tmpGitPath = libPath.join(pModulePath, '.git');
			let tmpGitStat = null;
			try { tmpGitStat = libFs.statSync(tmpGitPath); }
			catch (pStatError) { tmpGitStat = null; }

			if (tmpGitStat && tmpGitStat.isDirectory())
			{
				// Fast path — standard module checkout.
				tmpFetchHeadPath = libPath.join(tmpGitPath, 'FETCH_HEAD');
			}
			else
			{
				// `<path>/.git` is absent or a gitdir-file — resolve the real one.
				let tmpResolved = this._execGitSync('rev-parse --git-path FETCH_HEAD', pModulePath);
				if (!tmpResolved) { return null; }
				tmpResolved = tmpResolved.trim();
				if (!tmpResolved) { return null; }
				tmpFetchHeadPath = libPath.isAbsolute(tmpResolved) ? tmpResolved : libPath.join(pModulePath, tmpResolved);
			}

			let tmpFetchHead = libFs.statSync(tmpFetchHeadPath);
			return tmpFetchHead.mtime.toISOString();
		}
		catch (pError) { return null; }
	}

	/**
	 * Quietly fetch a single module's `upstream` + `origin` remotes (network) so
	 * a follow-up getGitStatus reflects the LIVE remote state rather than the
	 * last local fetch. Best-effort: ignores errors (missing remote, offline).
	 * Backs the module-detail route's `?fetch=1` — the focused workspace view
	 * auto-refreshes its drift so a server-side merge can't read stale.
	 */
	fetchModuleRemotesAsync(pName)
	{
		let tmpPath = this.getModulePath(pName);
		if (!tmpPath) { return Promise.resolve(); }
		let fFetch = function (pRemote)
		{
			return new Promise(function (pResolve)
				{
					libChildProcess.exec('git fetch ' + pRemote,
						{ cwd: tmpPath, timeout: 20000, encoding: 'utf8' },
						function () { pResolve(); }); // best-effort — ignore errors
				});
		};
		return Promise.all([ fFetch('upstream'), fFetch('origin') ]);
	}

	/**
	 * Drift between two refs, robust to merge style. Answers "how does refB
	 * relate to refA":
	 *   Ahead  â commits on refB not on refA (what a push / PR would carry)
	 *   Behind â commits on refA not on refB (what a pull would bring down)
	 *
	 * `--cherry-pick` drops commits already present on the other side under a
	 * DIFFERENT SHA (rebase / merge-commit merges). If the two trees are
	 * identical (squash merge, or simply content-equal) the counts are forced to
	 * 0/0 â there is nothing to push or pull regardless of commit history. Both
	 * refs must resolve: HasBothRefs:false (counts null) when either is missing
	 * or never fetched. Local-ref only, no network.
	 *
	 * This is the shared engine behind all three tracked edges (LocalâFork,
	 * LocalâUpstream, ForkâUpstream).
	 */
	_edgeDrift(pModulePath, pRefA, pRefB)
	{
		if (!pModulePath || !pRefA || !pRefB)
		{
			return { Ahead: null, Behind: null, HasBothRefs: false, ContentIdentical: false };
		}
		let tmpRaw = this._execGitSync('rev-list --left-right --cherry-pick --count '
			+ pRefA + '...' + pRefB, pModulePath);
		if (tmpRaw === null)
		{
			return { Ahead: null, Behind: null, HasBothRefs: false, ContentIdentical: false };
		}
		// parseLeftRightCount returns { Behind: refA-only (left), Ahead: refB-only (right) }.
		let tmpCounts = parseLeftRightCount(tmpRaw);
		let tmpAhead = tmpCounts.Ahead;
		let tmpBehind = tmpCounts.Behind;
		let tmpIdentical = false;
		if (tmpAhead > 0 || tmpBehind > 0)
		{
			// `git diff --quiet A B` exits 0 (â '' non-null) when the trees are
			// identical, 1 (â null) when they differ.
			let tmpSame = this._execGitSync('diff --quiet ' + pRefA + ' ' + pRefB, pModulePath);
			if (tmpSame !== null) { tmpIdentical = true; tmpAhead = 0; tmpBehind = 0; }
		}
		return { Ahead: tmpAhead, Behind: tmpBehind, HasBothRefs: true, ContentIdentical: tmpIdentical };
	}

	/**
	 * Compute how far the local branch has drifted from the *upstream* (the
	 * canonical org repo), as opposed to its own `origin` tracking remote.
	 * This is the fork-vs-target relationship the porcelain Ahead/Behind does
	 * NOT capture (that one is local-vs-origin).
	 *
	 *   AheadUpstream  â local commits not yet on the org (what a PR contains).
	 *   BehindUpstream â org commits not yet in the fork (what a sync brings).
	 *
	 * Computed from the already-fetched `refs/remotes/upstream/<branch>` ref â
	 * NO network. When that ref is missing (no `upstream` remote, never
	 * fetched, or the current branch doesn't exist upstream) the counts come
	 * back null with HasUpstreamRef:false â the "n/a until you fetch" signal.
	 * Counts are only as fresh as the last `git fetch upstream`.
	 *
	 * Uses `--cherry-pick` so commits already present upstream under a DIFFERENT
	 * SHA don't count as drift. That's the common squash/rebase-merge case: a PR
	 * is merged into the org as a new commit ("â¦(#12)"), leaving the fork's
	 * original commit patch-equivalent but distinct â raw counting would call
	 * that "1 ahead / 1 behind" forever even though it's effectively in sync.
	 */
	getUpstreamDrift(pModulePath, pBranch)
	{
		if (!pModulePath)
		{
			return { HasUpstreamRef: false, UpstreamBranch: null, AheadUpstream: null, BehindUpstream: null };
		}

		// Prefer the branch the caller already parsed from porcelain; fall back
		// to whatever upstream/HEAD points at, then master.
		let tmpBranch = (pBranch && String(pBranch).trim()) || null;
		if (!tmpBranch)
		{
			let tmpHead = this._execGitSync('rev-parse --abbrev-ref upstream/HEAD', pModulePath);
			tmpBranch = (tmpHead ? tmpHead.trim().replace(/^upstream\//, '') : '') || 'master';
		}

		// Local â Upstream, via the shared edge engine (cherry-pick + identical-tree).
		let tmpEdge = this._edgeDrift(pModulePath, 'refs/remotes/upstream/' + tmpBranch, 'HEAD');
		return {
			HasUpstreamRef: tmpEdge.HasBothRefs,
			UpstreamBranch: tmpBranch,
			AheadUpstream:  tmpEdge.Ahead,
			BehindUpstream: tmpEdge.Behind,
		};
	}

	/**
	 * Return the unified diff text for the module. `pOptions.Path` limits
	 * to a single path; `pOptions.Staged` uses `--staged`; by default
	 * excludes the `dist/` tree (matching the TUI's `_runDiff` behavior).
	 */
	getGitDiff(pName, pOptions)
	{
		let tmpPath = this.getModulePath(pName);
		if (!tmpPath) { return ''; }

		let tmpOptions = pOptions || {};
		let tmpArgs = ['diff'];
		if (tmpOptions.Staged) { tmpArgs.push('--staged'); }
		if (tmpOptions.Stat) { tmpArgs.push('--stat'); }
		tmpArgs.push('--');
		if (tmpOptions.Path)
		{
			tmpArgs.push(tmpOptions.Path);
		}
		else
		{
			tmpArgs.push('.');
			if (tmpOptions.IncludeDist !== true)
			{
				tmpArgs.push(':!dist');
			}
		}
		let tmpOutput = this._execGitSync(tmpArgs.join(' '), tmpPath, tmpOptions.Timeout || 20000);
		return tmpOutput || '';
	}

	/**
	 * Commit log since a given tag / ref. Falls back to `-20` most recent
	 * if the ref doesn't exist or the log is empty. Mirrors what the TUI's
	 * publish step does.
	 *
	 * @returns {Array<{ Hash, Subject }>}
	 */
	/**
	 * Run `git status --porcelain -b` against every module in the manifest
	 * in parallel (capped concurrency to avoid fork-bombing). Returns a
	 * map keyed by module name:
	 *   { Dirty, FileCount, Branch, Ahead, Behind, Error? }
	 *
	 * Used by the sidebar "Scan" button; takes ~1s for 100 modules.
	 */
	scanAllModulesAsync(pOptions)
	{
		let tmpSelf = this;
		let tmpOptions = pOptions || {};
		let tmpConcurrency = tmpOptions.Concurrency || 12;
		let tmpTimeout = tmpOptions.Timeout || 10000;
		// When set, refresh each fork's upstream ref with a live `git fetch
		// upstream` before computing drift (network â the caller raises the
		// timeout / lowers concurrency to match). Otherwise drift is read from
		// the already-fetched ref (instant, possibly stale).
		let tmpFetch = !!tmpOptions.Fetch;

		let tmpNames = typeof tmpSelf.manifest.getAllModuleNames === 'function'
			? tmpSelf.manifest.getAllModuleNames()
			: Array.from(tmpSelf.manifest.ecosystemNames || []);

		let tmpResult = {};
		let tmpQueue = tmpNames.slice();

		function execAt(pCmd, pCwd)
		{
			return new Promise(function (pResolve)
				{
					let tmpOpts = { encoding: 'utf8', cwd: pCwd, timeout: tmpTimeout, maxBuffer: 4 * 1024 * 1024 };
					libChildProcess.exec(pCmd, tmpOpts,
						function (pError, pStdout)
						{
							pResolve({ Error: pError, Stdout: pError ? '' : (pStdout || '') });
						});
				});
		}

		// Categorized line-count rollup: tracked changes from
		// `git diff --numstat HEAD` give +Added/-Removed per file;
		// untracked files from `git ls-files --others --exclude-standard`
		// don't have a baseline so we count their lines as Added (the
		// user's "300 new lines of javascript" case in a new file looks
		// the same to them as a 300-line addition to an existing file).
		function gatherChanges(pCwd)
		{
			let tmpReport = _emptyChangeReport();
			return execAt('git diff --numstat HEAD', pCwd).then(function (pNumstat)
				{
					if (!pNumstat.Error && pNumstat.Stdout)
					{
						let tmpLines = pNumstat.Stdout.split('\n');
						for (let i = 0; i < tmpLines.length; i++)
						{
							let tmpLine = tmpLines[i];
							if (!tmpLine) { continue; }
							// "ADDED\tREMOVED\tPATH" â binary files use "-" for both.
							let tmpParts = tmpLine.split('\t');
							if (tmpParts.length < 3) { continue; }
							let tmpAdded   = (tmpParts[0] === '-') ? 0 : parseInt(tmpParts[0], 10) || 0;
							let tmpRemoved = (tmpParts[1] === '-') ? 0 : parseInt(tmpParts[1], 10) || 0;
							let tmpPath    = tmpParts.slice(2).join('\t');
							let tmpCat     = _scanCategoryForPath(tmpPath);
							_addToBucket(tmpReport, tmpCat, 1, tmpAdded, tmpRemoved);
						}
					}
					return execAt('git ls-files --others --exclude-standard', pCwd);
				})
				.then(function (pUntracked)
				{
					if (pUntracked.Error || !pUntracked.Stdout) { return tmpReport; }
					let tmpUntrackedPaths = pUntracked.Stdout.split('\n').filter((p) => p);
					if (tmpUntrackedPaths.length === 0) { return tmpReport; }

					// Sum each untracked file's newline count.  wc -l on a
					// list of files is one shell-out per module (not per
					// file), so cost stays at one extra process even for
					// dozens of new files.
					let tmpPathsArg = tmpUntrackedPaths.map((p) => '"' + p.replace(/"/g, '\\"') + '"').join(' ');
					return execAt('wc -l ' + tmpPathsArg, pCwd).then(function (pWc)
						{
							let tmpLineByPath = {};
							if (!pWc.Error && pWc.Stdout)
							{
								let tmpRows = pWc.Stdout.split('\n');
								for (let i = 0; i < tmpRows.length; i++)
								{
									let tmpRow = tmpRows[i].trim();
									if (!tmpRow) { continue; }
									// "  123 path/to/file"   or   " 456 total"
									let tmpMatch = tmpRow.match(/^(\d+)\s+(.*)$/);
									if (!tmpMatch) { continue; }
									if (tmpMatch[2] === 'total') { continue; }
									tmpLineByPath[tmpMatch[2]] = parseInt(tmpMatch[1], 10) || 0;
								}
							}
							for (let i = 0; i < tmpUntrackedPaths.length; i++)
							{
								let tmpPath = tmpUntrackedPaths[i];
								let tmpLines = tmpLineByPath[tmpPath] || 0;
								_addToBucket(tmpReport, _scanCategoryForPath(tmpPath), 1, tmpLines, 0);
							}
							return tmpReport;
						});
				});
		}

		// Drift vs the canonical *upstream* (org) repo â distinct from the
		// porcelain Ahead/Behind (which is local-vs-origin). Read from the
		// already-fetched upstream ref (no network) unless Fetch was asked for,
		// in which case we refresh the ref first. Missing ref â n/a.
		// Generic async edge drift (Ahead/Behind of refB vs refA) with
		// cherry-pick + identical-tree, mirroring _edgeDrift for the scan path.
		function gatherEdge(pCwd, pRefA, pRefB)
		{
			return execAt('git rev-list --left-right --cherry-pick --count ' + pRefA + '...' + pRefB, pCwd)
				.then(function (pEdge)
				{
					if (pEdge.Error || !pEdge.Stdout)
					{
						return { Ahead: null, Behind: null, HasBothRefs: false };
					}
					let tmpC = parseLeftRightCount(pEdge.Stdout);
					if (tmpC.Ahead > 0 || tmpC.Behind > 0)
					{
						return execAt('git diff --quiet ' + pRefA + ' ' + pRefB, pCwd).then(function (pSame)
							{
								return { Ahead: pSame.Error ? tmpC.Ahead : 0, Behind: pSame.Error ? tmpC.Behind : 0, HasBothRefs: true };
							});
					}
					return { Ahead: tmpC.Ahead, Behind: tmpC.Behind, HasBothRefs: true };
				});
		}

		function gatherUpstreamDrift(pCwd, pBranch)
		{
			let tmpBranch = (pBranch && String(pBranch).trim()) || 'master';
			let tmpPre = tmpFetch
				? execAt('git fetch upstream', pCwd)
				: Promise.resolve({ Error: null, Stdout: '' });
			return tmpPre.then(function ()
				{
					// --cherry-pick drops commits already upstream under a
					// different SHA (squash/rebase-merged PRs), so a merged
					// change doesn't read as perpetual "1 ahead / 1 behind".
					return execAt('git rev-list --left-right --cherry-pick --count refs/remotes/upstream/'
						+ tmpBranch + '...HEAD', pCwd);
				})
				.then(function (pDrift)
				{
					if (pDrift.Error || !pDrift.Stdout)
					{
						return { HasUpstreamRef: false, UpstreamBranch: tmpBranch, AheadUpstream: null, BehindUpstream: null };
					}
					let tmpCounts = parseLeftRightCount(pDrift.Stdout);
					// Squash/rebase merges can leave the fork "ahead" by commit count
					// while its CONTENT already matches upstream; identical trees mean
					// nothing to push or pull -> report in-sync.
					if (tmpCounts.Ahead > 0 || tmpCounts.Behind > 0)
					{
						return execAt('git diff --quiet HEAD refs/remotes/upstream/' + tmpBranch, pCwd)
							.then(function (pSame)
							{
								return { HasUpstreamRef: true, UpstreamBranch: tmpBranch, AheadUpstream: pSame.Error ? tmpCounts.Ahead : 0, BehindUpstream: pSame.Error ? tmpCounts.Behind : 0 };
							});
					}
					return { HasUpstreamRef: true, UpstreamBranch: tmpBranch, AheadUpstream: tmpCounts.Ahead, BehindUpstream: tmpCounts.Behind };
				});
		}

		function runOne(pName)
		{
			return new Promise(function (pResolve)
				{
					let tmpEntry = typeof tmpSelf.manifest.getModule === 'function'
						? tmpSelf.manifest.getModule(pName) : null;
					if (!tmpEntry)
					{
						tmpResult[pName] = { Error: 'not-in-manifest' };
						return pResolve();
					}

					// Local version: synchronous package.json read in the
					// same worker â no extra round-trip, no network.
					let tmpPkg = tmpSelf.readPackageJsonFromPath(tmpEntry.AbsolutePath);
					let tmpLocalVersion = tmpPkg && tmpPkg.version ? tmpPkg.version : null;
					let tmpPackageName  = tmpPkg && tmpPkg.name    ? tmpPkg.name    : null;

					execAt('git status --porcelain -b', tmpEntry.AbsolutePath).then(function (pStatus)
						{
							if (pStatus.Error)
							{
								tmpResult[pName] = { Error: pStatus.Error.message || 'git failed' };
								return pResolve();
							}
							let tmpParsed = parsePorcelain(pStatus.Stdout);
							tmpParsed.LocalVersion = tmpLocalVersion;
							tmpParsed.PackageName  = tmpPackageName;
							// PublishedVersion + VersionState filled in later
							// by the published-versions decoration pass.
							tmpParsed.PublishedVersion = null;
							tmpParsed.VersionState     = 'unknown';
							gatherUpstreamDrift(tmpEntry.AbsolutePath, tmpParsed.Branch).then(function (pDrift)
								{
									tmpParsed.HasUpstreamRef = pDrift.HasUpstreamRef;
									tmpParsed.UpstreamBranch = pDrift.UpstreamBranch;
									tmpParsed.AheadUpstream  = pDrift.AheadUpstream;
									tmpParsed.BehindUpstream = pDrift.BehindUpstream;
									tmpParsed.UpstreamFetchedAt = tmpSelf.getUpstreamFetchTime(tmpEntry.AbsolutePath);
									// Fork ↔ Upstream (the fork vs the org, independent of local edits).
									let tmpFUBranch = tmpParsed.UpstreamBranch || tmpParsed.Branch || 'master';
									return gatherEdge(tmpEntry.AbsolutePath, 'refs/remotes/upstream/' + tmpFUBranch, 'refs/remotes/origin/' + tmpFUBranch);
								})
								.then(function (pForkUp)
								{
									tmpParsed.ForkAheadUpstream   = pForkUp.Ahead;
									tmpParsed.ForkBehindUpstream  = pForkUp.Behind;
									tmpParsed.HasForkUpstreamRefs = pForkUp.HasBothRefs;
									tmpParsed.NextAction = deriveNextAction(
										{
											Forkable:           (tmpEntry.Forkable !== false),
											Dirty:              tmpParsed.Dirty,
											LocalAheadFork:     tmpParsed.Ahead,
											LocalBehindFork:    tmpParsed.Behind,
											ForkAheadUpstream:  pForkUp.Ahead,
											ForkBehindUpstream: pForkUp.Behind,
											HasForkUpstream:    pForkUp.HasBothRefs,
										});
									return gatherChanges(tmpEntry.AbsolutePath);
								})
								.then(function (pChanges)
								{
									tmpParsed.Changes = pChanges;
									tmpResult[pName] = tmpParsed;
									pResolve();
								});
						});
				});
		}

		function pumpWorker()
		{
			let tmpNext = tmpQueue.shift();
			if (!tmpNext) { return Promise.resolve(); }
			return runOne(tmpNext).then(pumpWorker);
		}

		let tmpWorkers = [];
		for (let i = 0; i < tmpConcurrency; i++) { tmpWorkers.push(pumpWorker()); }

		return Promise.all(tmpWorkers).then(function () { return tmpResult; });
	}

	/**
	 * Fetch published npm versions for a list of package names in
	 * parallel, with a short per-package timeout so a couple of slow
	 * registries don't drag the whole sweep out.  Returns a map
	 * `{ packageName -> version|null }`.  Used by the scan flow as a
	 * non-blocking decoration pass after the local scan returns.
	 */
	fetchPublishedVersionsParallel(pPackageNames, pOptions)
	{
		let tmpSelf = this;
		let tmpOptions = pOptions || {};
		let tmpConcurrency = tmpOptions.Concurrency || 16;
		let tmpTimeout     = tmpOptions.Timeout     || 3000;

		let tmpNames = pPackageNames.slice();
		let tmpQueue = tmpNames.slice();
		let tmpOut   = {};

		function runOne(pName)
		{
			return tmpSelf.fetchPublishedVersion(pName, { Timeout: tmpTimeout })
				.then(function (pVersion) { tmpOut[pName] = pVersion; });
		}

		function pumpWorker()
		{
			let tmpNext = tmpQueue.shift();
			if (!tmpNext) { return Promise.resolve(); }
			return runOne(tmpNext).then(pumpWorker);
		}

		let tmpWorkers = [];
		for (let i = 0; i < tmpConcurrency; i++) { tmpWorkers.push(pumpWorker()); }

		return Promise.all(tmpWorkers).then(function () { return tmpOut; });
	}

	/**
	 * Like fetchPublishedVersionsParallel but also pulls `time.modified`
	 * so the UI can show "published N days ago".  Same one-shot npm call
	 * gives us both via `npm view <pkg> version time.modified --json`
	 * (npm returns a JSON object with literal `version` and `time.modified`
	 * keys for multi-field views).  Returns a map
	 * `{ packageName -> { Version, ModifiedAt } }`.
	 *
	 * Cache key is shared with fetchPublishedVersion via a small wrapper
	 * so a later "just the version" call inside the same TTL doesn't
	 * trigger a refetch.
	 */
	fetchPublishedInfoParallel(pPackageNames, pOptions)
	{
		let tmpSelf = this;
		let tmpOptions = pOptions || {};
		let tmpConcurrency = tmpOptions.Concurrency || 16;
		let tmpTimeout     = tmpOptions.Timeout     || 3000;

		let tmpQueue = pPackageNames.slice();
		let tmpOut   = {};

		function runOne(pName)
		{
			return new Promise(function (pResolve)
				{
					let tmpExecOptions = { encoding: 'utf8', timeout: tmpTimeout };
					libChildProcess.exec(
						`npm view ${pName} version time.modified --json`,
						tmpExecOptions,
						function (pError, pStdout)
						{
							let tmpInfo = { Version: null, ModifiedAt: null };
							if (!pError && pStdout)
							{
								try
								{
									let tmpParsed = JSON.parse(pStdout);
									if (typeof tmpParsed === 'object' && tmpParsed)
									{
										tmpInfo.Version    = tmpParsed['version']        || null;
										tmpInfo.ModifiedAt = tmpParsed['time.modified']  || null;
									}
								}
								catch (pParseError) { /* leave nulls */ }
							}
							// Seed the version cache so a follow-up
							// fetchPublishedVersion call doesn't re-shell.
							tmpSelf._npmVersionCache.set(pName,
								{ Version: tmpInfo.Version, FetchedAt: Date.now() });
							tmpOut[pName] = tmpInfo;
							pResolve();
						});
				});
		}

		function pumpWorker()
		{
			let tmpNext = tmpQueue.shift();
			if (!tmpNext) { return Promise.resolve(); }
			return runOne(tmpNext).then(pumpWorker);
		}

		let tmpWorkers = [];
		for (let i = 0; i < tmpConcurrency; i++) { tmpWorkers.push(pumpWorker()); }

		return Promise.all(tmpWorkers).then(function () { return tmpOut; });
	}

	getCommitLogSince(pName, pRef, pOptions)
	{
		let tmpPath = this.getModulePath(pName);
		if (!tmpPath) { return []; }

		let tmpOptions = pOptions || {};
		let tmpLimit = tmpOptions.Limit || 20;

		let tmpRaw = '';
		if (pRef)
		{
			// Try a few tag patterns (v3.1.0 / 3.1.0)
			let tmpPatterns = [`v${pRef}`, pRef];
			for (let i = 0; i < tmpPatterns.length; i++)
			{
				let tmpOutput = this._execGitSync(`log ${tmpPatterns[i]}..HEAD --oneline`, tmpPath);
				if (tmpOutput) { tmpRaw = tmpOutput.trim(); break; }
			}
		}
		if (!tmpRaw)
		{
			tmpRaw = (this._execGitSync(`log --oneline -${tmpLimit}`, tmpPath) || '').trim();
		}
		if (!tmpRaw) { return []; }

		let tmpLines = tmpRaw.split('\n');
		let tmpCommits = [];
		for (let i = 0; i < tmpLines.length; i++)
		{
			let tmpSpace = tmpLines[i].indexOf(' ');
			if (tmpSpace > 0)
			{
				tmpCommits.push(
					{
						Hash: tmpLines[i].slice(0, tmpSpace),
						Subject: tmpLines[i].slice(tmpSpace + 1),
					});
			}
			else
			{
				tmpCommits.push({ Hash: tmpLines[i], Subject: '' });
			}
		}
		return tmpCommits;
	}
}

module.exports = ModuleIntrospector;
module.exports.rangeCoversVersion = rangeCoversVersion;
module.exports.collectDeps = collectDeps;
module.exports.parseLeftRightCount = parseLeftRightCount;
module.exports.deriveNextAction = deriveNextAction;
