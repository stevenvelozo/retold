/**
 * Retold Manager -- Manifest REST Routes
 *
 * Read-only routes over the module catalog. Phase 1 base surface:
 *
 *   GET /api/manager/manifest
 *     The raw manifest JSON (everything ManifestLoader knows about).
 *
 *   GET /api/manager/modules
 *     Flat list — one entry per module with group membership folded in.
 *
 *   GET /api/manager/modules/:name
 *     Single-module detail: manifest entry + on-disk package.json + git status
 *     + ecosystem dep ranges (without npm freshness lookups — those come from
 *     /publish/preview).
 *
 *   GET /api/manager/groups
 *     Group metadata only (for sidebar rendering).
 */

const libPath = require('path');
const libFs = require('fs');

/**
 * Read repository URL from an installed dependency's package.json. Returns
 * null if the dep isn't installed or doesn't declare a repository. Normalizes
 * common forms (string, { url }, "github:user/repo", "git+https://...") to
 * a browser-friendly https URL.
 */
function readDepRepositoryUrl(pHostModulePath, pDepName)
{
	if (!pHostModulePath) { return null; }
	let tmpDepPkgPath = libPath.join(pHostModulePath, 'node_modules', pDepName, 'package.json');
	let tmpRaw;
	try { tmpRaw = libFs.readFileSync(tmpDepPkgPath, 'utf8'); }
	catch (e) { return null; }
	let tmpPkg;
	try { tmpPkg = JSON.parse(tmpRaw); }
	catch (e) { return null; }
	let tmpRepo = tmpPkg.repository;
	if (!tmpRepo) { return null; }
	let tmpUrl = (typeof tmpRepo === 'string') ? tmpRepo : tmpRepo.url;
	if (!tmpUrl || typeof tmpUrl !== 'string') { return null; }
	// "github:user/repo" shorthand
	let tmpShort = tmpUrl.match(/^github:([^/]+)\/(.+)$/);
	if (tmpShort) { return 'https://github.com/' + tmpShort[1] + '/' + tmpShort[2].replace(/\.git$/, ''); }
	// strip "git+" prefix
	tmpUrl = tmpUrl.replace(/^git\+/, '');
	// "git://", "git@github.com:user/repo.git" → https
	let tmpSsh = tmpUrl.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
	if (tmpSsh) { return 'https://' + tmpSsh[1] + '/' + tmpSsh[2]; }
	tmpUrl = tmpUrl.replace(/^git:\/\//, 'https://');
	tmpUrl = tmpUrl.replace(/\.git$/, '');
	if (tmpUrl.startsWith('http://') || tmpUrl.startsWith('https://')) { return tmpUrl; }
	return null;
}

/**
 * Split a package's deps/devDeps into four buckets: retold deps, external
 * deps, retold devDeps, external devDeps. Each entry has Name, Range, Npm
 * link, and (for retold) GitHub + Docs links from the manifest. External
 * deps also get a Repository URL when one can be read from the installed
 * package.json.
 */
function categorizeDeps(pPkg, pEcosystem, pCatalog, pHostModulePath)
{
	function buildList(pDepsObj, pSection)
	{
		let tmpRetold = [];
		let tmpExternal = [];
		let tmpNames = Object.keys(pDepsObj || {}).sort();
		for (let i = 0; i < tmpNames.length; i++)
		{
			let tmpName = tmpNames[i];
			let tmpRange = pDepsObj[tmpName];
			let tmpBase = { Name: tmpName, Range: tmpRange, Npm: 'https://www.npmjs.com/package/' + tmpName };

			if (pEcosystem.has(tmpName))
			{
				let tmpEntry = pCatalog.getModule(tmpName);
				tmpBase.GitHub = tmpEntry ? tmpEntry.GitHub : null;
				tmpBase.Documentation = tmpEntry ? tmpEntry.Documentation : null;
				tmpBase.Retold = true;
				tmpRetold.push(tmpBase);
			}
			else
			{
				tmpBase.Retold = false;
				tmpBase.Repository = readDepRepositoryUrl(pHostModulePath, tmpName);
				tmpExternal.push(tmpBase);
			}
		}
		return { Retold: tmpRetold, External: tmpExternal };
	}

	let tmpDeps = buildList(pPkg.dependencies, 'dependencies');
	let tmpDevDeps = buildList(pPkg.devDependencies, 'devDependencies');

	return {
		RetoldDeps:      tmpDeps.Retold,
		ExternalDeps:    tmpDeps.External,
		RetoldDevDeps:   tmpDevDeps.Retold,
		ExternalDevDeps: tmpDevDeps.External,
	};
}

module.exports = function registerManifestRoutes(pCore)
{
	let tmpOrator = pCore.Orator;
	let tmpCatalog = pCore.ModuleCatalog;
	let tmpIntrospector = pCore.Introspector;

	// ─────────────────────────────────────────────
	//  GET /api/manager/manifest
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doGet('/api/manager/manifest', function (pReq, pRes, pNext)
		{
			pRes.send(tmpCatalog.manifest.raw);
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  GET /api/manager/groups
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doGet('/api/manager/groups', function (pReq, pRes, pNext)
		{
			let tmpGroups = tmpCatalog.manifest.getGroups();
			let tmpResult = tmpGroups.map(function (pGroup)
				{
					return {
						Name: pGroup.Name,
						Description: pGroup.Description,
						Path: pGroup.Path,
						ModuleCount: pGroup.Modules.length,
					};
				});
			pRes.send(tmpResult);
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  GET /api/manager/modules
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doGet('/api/manager/modules', function (pReq, pRes, pNext)
		{
			let tmpAll = tmpCatalog.getAllModules();
			let tmpResult = tmpAll.map(function (pEntry)
				{
					return {
						Name:           pEntry.Name,
						Group:          pEntry.GroupName,
						GroupDiskName:  pEntry.GroupDiskName,
						Path:           pEntry.Path,
						Description:    pEntry.Description,
						GitHub:         pEntry.GitHub,
						Documentation:  pEntry.Documentation,
						RelatedModules: pEntry.RelatedModules || [],
						// 'library' (real publishable module), 'webapp' (full
						// application — also a publishable module), or
						// 'example' (a nested demo app that lives inside a
						// library's example_applications/ directory and is
						// NOT a module the user thinks of as "their module").
						Type:           pEntry.Type || 'library',
					};
				});
			pRes.send(tmpResult);
			return pNext();
		});

	// ─────────────────────────────────────────────
	//  GET /api/manager/modules/scan
	//  Parallel git-status sweep across every module in the manifest.
	//  Returns a summary map (no per-file lists — keep the payload small).
	//  Used by the sidebar Scan button; client caches into localStorage.
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doGet('/api/manager/modules/scan',
		function (pReq, pRes, pNext)
		{
			let tmpStart = Date.now();
			// Restify here doesn't register queryParser, so pReq.query is
			// unreliable — parse the raw URL (matches /published-versions).
			let tmpFetch = false;
			let tmpUrlQuery = (pReq.url || '').split('?')[1] || '';
			if (tmpUrlQuery)
			{
				let tmpFetchParam = new URLSearchParams(tmpUrlQuery).get('fetch');
				tmpFetch = (tmpFetchParam === '1' || tmpFetchParam === 'true');
			}
			// A live `git fetch upstream` per module is network-bound: drop
			// concurrency and give each module far longer than the local-only
			// 10s default. Without fetch, drift reads from already-fetched refs.
			let tmpScanOptions = tmpFetch
				? { Concurrency: 6, Timeout: 60000, Fetch: true }
				: { Concurrency: 12 };
			tmpIntrospector.scanAllModulesAsync(tmpScanOptions).then(
				function (pResults)
				{
					// Trim Files off each result — just need the summary +
					// the categorized line-count rollup + local version.
					// Published version is intentionally absent here; the
					// client makes a second call to /published-versions so
					// an offline registry doesn't block the local scan.
					let tmpTrimmed = {};
					let tmpNames = Object.keys(pResults);
					for (let i = 0; i < tmpNames.length; i++)
					{
						let tmpR = pResults[tmpNames[i]];
						if (tmpR.Error)
						{
							let tmpEntryForErr = tmpCatalog.getModule(tmpNames[i]);
							tmpTrimmed[tmpNames[i]] = {
								Error: tmpR.Error,
								Type:  (tmpEntryForErr && tmpEntryForErr.Type) || 'library',
							};
						}
						else
						{
							let tmpEntryForType = tmpCatalog.getModule(tmpNames[i]);
							tmpTrimmed[tmpNames[i]] =
								{
									Dirty: tmpR.Dirty,
									HasStaged: !!tmpR.HasStaged,
									HasUnstaged: !!tmpR.HasUnstaged,
									FileCount: tmpR.Files.length,
									Branch: tmpR.Branch,
									Ahead: tmpR.Ahead,
									Behind: tmpR.Behind,
									HasUpstreamRef: !!tmpR.HasUpstreamRef,
									UpstreamBranch: tmpR.UpstreamBranch || null,
									AheadUpstream:  (tmpR.AheadUpstream  === undefined ? null : tmpR.AheadUpstream),
									BehindUpstream: (tmpR.BehindUpstream === undefined ? null : tmpR.BehindUpstream),
									UpstreamFetchedAt: tmpR.UpstreamFetchedAt || null,
									ForkAheadUpstream:  (tmpR.ForkAheadUpstream  === undefined ? null : tmpR.ForkAheadUpstream),
									ForkBehindUpstream: (tmpR.ForkBehindUpstream === undefined ? null : tmpR.ForkBehindUpstream),
									HasForkUpstreamRefs: !!tmpR.HasForkUpstreamRefs,
									NextAction: tmpR.NextAction || null,
									LocalVersion:     tmpR.LocalVersion     || null,
									PackageName:      tmpR.PackageName      || null,
									PublishedVersion: tmpR.PublishedVersion || null,
									VersionState:     tmpR.VersionState     || 'unknown',
									Changes:          tmpR.Changes          || null,
									Type:             (tmpEntryForType && tmpEntryForType.Type) || 'library',
									// Drives fork-aware vs neutral wording on the pull/push next-action
									// label (a non-fork clones its canonical repo directly as origin).
									Forkable:         (tmpEntryForType ? (tmpEntryForType.Forkable !== false) : true),
								};
						}
					}
					pRes.send(
						{
							ScannedAt: new Date().toISOString(),
							ElapsedMs: Date.now() - tmpStart,
							ModuleCount: tmpNames.length,
							FetchedRemotes: tmpFetch,
							Results: tmpTrimmed,
						});
					return pNext();
				},
				function (pError)
				{
					pRes.statusCode = 500;
					pRes.send({ Error: 'ScanFailed', Message: pError.message });
					return pNext();
				});
		});

	// ─────────────────────────────────────────────
	//  GET /api/manager/modules/published-versions
	//  Decoration pass after a local scan: parallel `npm view` calls
	//  with a short per-package timeout so an offline registry can't
	//  block the UI for "aeons".  Returns a map keyed by MODULE NAME
	//  (not package name) for direct merge into the client's scan
	//  results.  Caller can scope to a subset with `?names=a,b,c`.
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doGet('/api/manager/modules/published-versions',
		function (pReq, pRes, pNext)
		{
			// Restify in this server doesn't register queryParser, so
			// pReq.query is unreliable.  Parse the raw URL ourselves.
			let tmpFilter = null;
			let tmpUrlQuery = (pReq.url || '').split('?')[1] || '';
			if (tmpUrlQuery)
			{
				let tmpParams = new URLSearchParams(tmpUrlQuery);
				let tmpNames = tmpParams.get('names');
				if (tmpNames)
				{
					tmpFilter = tmpNames.split(',').map((n) => n.trim()).filter((n) => n);
				}
			}

			let tmpAllNames = tmpCatalog.getAllModuleNames();
			let tmpScopedNames = tmpFilter
				? tmpAllNames.filter((n) => tmpFilter.indexOf(n) >= 0)
				: tmpAllNames;

			// Map module-name → package-name for the parallel lookup;
			// modules without a readable package.json are reported as
			// `null` published-version.
			let tmpPkgByName = {};
			let tmpPkgNames  = [];
			for (let i = 0; i < tmpScopedNames.length; i++)
			{
				let tmpModule = tmpScopedNames[i];
				let tmpPkg = tmpIntrospector.readPackageJson(tmpModule);
				if (tmpPkg && tmpPkg.name)
				{
					tmpPkgByName[tmpModule] = tmpPkg.name;
					if (tmpPkgNames.indexOf(tmpPkg.name) < 0) { tmpPkgNames.push(tmpPkg.name); }
				}
			}

			let tmpStart = Date.now();
			tmpIntrospector.fetchPublishedInfoParallel(tmpPkgNames, { Concurrency: 16, Timeout: 3000 }).then(
				function (pInfoByPkg)
				{
					let tmpOut = {};
					for (let i = 0; i < tmpScopedNames.length; i++)
					{
						let tmpModule = tmpScopedNames[i];
						let tmpPkg    = tmpPkgByName[tmpModule] || null;
						let tmpInfo   = tmpPkg ? (pInfoByPkg[tmpPkg] || null) : null;
						tmpOut[tmpModule] =
							{
								PackageName:      tmpPkg,
								PublishedVersion: tmpInfo ? (tmpInfo.Version    || null) : null,
								PublishedAt:      tmpInfo ? (tmpInfo.ModifiedAt || null) : null
							};
					}
					pRes.send(
						{
							FetchedAt: new Date().toISOString(),
							ElapsedMs: Date.now() - tmpStart,
							Results:   tmpOut
						});
					return pNext();
				},
				function (pError)
				{
					pRes.statusCode = 500;
					pRes.send({ Error: 'PublishedVersionsFailed', Message: pError.message });
					return pNext();
				});
		});

	// ─────────────────────────────────────────────
	//  GET /api/manager/modules/:name
	// ─────────────────────────────────────────────
	tmpOrator.serviceServer.doGet('/api/manager/modules/:name', function (pReq, pRes, pNext)
		{
			let tmpName = pReq.params.name;
			let tmpEntry = tmpCatalog.getModule(tmpName);

			if (!tmpEntry)
			{
				pRes.statusCode = 404;
				pRes.send({ Error: 'UnknownModule', Name: tmpName });
				return pNext();
			}

			// ?fetch=1 → live-fetch this module's remotes first so the drift /
			// three-state reflects GitHub *now* (the focused workspace uses this;
			// the bulk scan stays local-only for speed). Restify here doesn't
			// register queryParser, so parse the raw URL.
			let tmpFetch = false;
			let tmpUrlQuery = (pReq.url || '').split('?')[1] || '';
			if (tmpUrlQuery)
			{
				let tmpFetchParam = new URLSearchParams(tmpUrlQuery).get('fetch');
				tmpFetch = (tmpFetchParam === '1' || tmpFetchParam === 'true');
			}

			let fBuildAndSend = function ()
			{
			let tmpPkg = tmpIntrospector.readPackageJson(tmpName);
			let tmpGitStatus = tmpIntrospector.getGitStatus(tmpName);

			// Build categorized dependency view: retold vs external, deps vs devDeps.
			let tmpCategorized = null;
			if (tmpPkg)
			{
				let tmpEcosystem = new Set(tmpCatalog.getAllModuleNames());
				tmpCategorized = categorizeDeps(tmpPkg, tmpEcosystem, tmpCatalog, tmpEntry.AbsolutePath);
			}

			// Fetch the currently published npm version so the client can offer
			// pre-emptive checks (e.g. warn before a second bump that would skip
			// a version). Wrapped so any npm hiccup degrades gracefully.
			let tmpPublishedVersion = null;
			if (tmpPkg && tmpPkg.name)
			{
				try
				{
					tmpPublishedVersion = tmpIntrospector.fetchPublishedVersionSync(tmpPkg.name,
						{ Cwd: tmpEntry.AbsolutePath, Timeout: 5000 });
				}
				catch (pError) { tmpPublishedVersion = null; }
			}

			pRes.send(
				{
					Manifest:
						{
							Name:           tmpEntry.Name,
							Group:          tmpEntry.GroupName,
							GroupDiskName:  tmpEntry.GroupDiskName,
							Path:           tmpEntry.Path,
							AbsolutePath:   tmpEntry.AbsolutePath,
							Description:    tmpEntry.Description,
							GitHub:         tmpEntry.GitHub,
							Documentation:  tmpEntry.Documentation,
							RelatedModules: tmpEntry.RelatedModules || [],
						},
					Package: tmpPkg ? {
						Name:             tmpPkg.name,
						Version:          tmpPkg.version,
						PublishedVersion: tmpPublishedVersion,
						Description:      tmpPkg.description,
						Dependencies:     tmpPkg.dependencies || {},
						DevDependencies:  tmpPkg.devDependencies || {},
						Scripts:          tmpPkg.scripts || {},
					} : null,
					GitStatus: tmpGitStatus,
					CategorizedDeps: tmpCategorized,
				});
			return pNext();
			};

			if (tmpFetch)
			{
				tmpIntrospector.fetchModuleRemotesAsync(tmpName).then(fBuildAndSend, fBuildAndSend);
			}
			else
			{
				fBuildAndSend();
			}
		});
};
