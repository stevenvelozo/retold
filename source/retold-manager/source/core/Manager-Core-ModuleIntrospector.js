/**
 * Retold Manager -- Module Introspector
 *
 * Read-only queries about a single module: package.json, the currently
 * published npm version, git status/diff/log, and a combined ecosystem
 * dependency freshness check. Pulls the inline data-gathering that
 * Retold-Manager-App.js was doing synchronously in `_runPublish` into
 * a reusable service so the TUI, the upcoming web API, and the ripple
 * sequencer can share it.
 *
 * Both synchronous and Promise-returning variants are exposed where it
 * matters. Synchronous forms preserve today's TUI behavior (where
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

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

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
 *   ^X.Y.Z   — major-locked, allows minor/patch above
 *   ~X.Y.Z   — minor-locked, allows patch above
 *   X.Y.Z    — exact match only
 *   file:... — always considered "local link", covers everything
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
		// 0.0.x — ^ is exact match per semver rules
		return (tmpLatestParts[0] === 0) && (tmpLatestParts[1] === 0) && (tmpLatestParts[2] === tmpRangeParts[2]);
	}

	// ~ allows patch-level changes within the same minor
	return (tmpLatestParts[0] === tmpRangeParts[0])
		&& (tmpLatestParts[1] === tmpRangeParts[1])
		&& (tmpLatestParts[2] >= tmpRangeParts[2]);
}

/**
 * Parse the output of `git status --porcelain -b` into the same shape
 * getGitStatus uses. Kept as a module-level helper so the async scan path
 * can share it without going through the sync execGit.
 */
function parsePorcelain(pRaw)
{
	let tmpResult = { Branch: '', Ahead: 0, Behind: 0, Files: [], Dirty: false };
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
			let tmpStatusCode = tmpLine.slice(0, 2);
			let tmpFile = tmpLine.slice(3);
			tmpResult.Files.push({ Status: tmpStatusCode, Path: tmpFile });
		}
	}
	tmpResult.Dirty = tmpResult.Files.length > 0;
	return tmpResult;
}

// ─────────────────────────────────────────────
//  Introspector
// ─────────────────────────────────────────────

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

		// name -> { Version, FetchedAt }        — dist-tags.latest only
		this._npmVersionCache = new Map();
		// name -> { Versions: string[], FetchedAt } — FULL published list
		this._npmVersionsCache = new Map();
	}

	// ─────────────────────────────────────────────
	//  Path resolution
	// ─────────────────────────────────────────────

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

	// ─────────────────────────────────────────────
	//  package.json
	// ─────────────────────────────────────────────

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

	// ─────────────────────────────────────────────
	//  npm view
	// ─────────────────────────────────────────────

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
	 * regardless of range — useful for informative messages when Matched
	 * is null ("^4.0.15 → highest published is 4.0.14").
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

	// ─────────────────────────────────────────────
	//  Ecosystem dependency freshness
	// ─────────────────────────────────────────────

	/**
	 * For a given module, list every dependency whose name is in the
	 * retold ecosystem, with its local range and the currently-published
	 * npm version, and whether the range covers latest.
	 *
	 * Synchronous — queries npm view serially. Preserves today's TUI
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
			// `dist-tags.latest` entry — so parallel major lines (e.g.
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
	 * Async variant — parallelizes npm view calls. Dramatically faster for
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

	// ─────────────────────────────────────────────
	//  git helpers (all synchronous, TUI-era parity)
	// ─────────────────────────────────────────────

	_execGitSync(pArgs, pCwd, pTimeout)
	{
		let tmpTimeout = pTimeout || 10000;
		try
		{
			// stdio: ['ignore', 'pipe', 'pipe'] — we capture stdout/stderr
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
			// on pError.stdout — return them so the caller gets *something*.
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

		return parsePorcelain(tmpPorcelain);
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

		let tmpNames = typeof tmpSelf.manifest.getAllModuleNames === 'function'
			? tmpSelf.manifest.getAllModuleNames()
			: Array.from(tmpSelf.manifest.ecosystemNames || []);

		let tmpResult = {};
		let tmpQueue = tmpNames.slice();

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
					let tmpOpts = { encoding: 'utf8', cwd: tmpEntry.AbsolutePath, timeout: tmpTimeout, maxBuffer: 4 * 1024 * 1024 };
					libChildProcess.exec('git status --porcelain -b', tmpOpts,
						function (pError, pStdout)
						{
							if (pError)
							{
								tmpResult[pName] = { Error: pError.message || 'git failed' };
								return pResolve();
							}
							let tmpParsed = parsePorcelain(pStdout);
							tmpResult[pName] = tmpParsed;
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

		return Promise.all(tmpWorkers).then(function () { return tmpResult; });
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
