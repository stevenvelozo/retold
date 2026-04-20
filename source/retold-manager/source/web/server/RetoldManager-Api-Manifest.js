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

/**
 * Split a package's deps/devDeps into four buckets: retold deps, external
 * deps, retold devDeps, external devDeps. Each entry has Name, Range, Npm
 * link, and (for retold) GitHub + Docs links from the manifest.
 */
function categorizeDeps(pPkg, pEcosystem, pCatalog)
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
			tmpIntrospector.scanAllModulesAsync({ Concurrency: 12 }).then(
				function (pResults)
				{
					// Trim Files off each result — just need the summary
					let tmpTrimmed = {};
					let tmpNames = Object.keys(pResults);
					for (let i = 0; i < tmpNames.length; i++)
					{
						let tmpR = pResults[tmpNames[i]];
						if (tmpR.Error)
						{
							tmpTrimmed[tmpNames[i]] = { Error: tmpR.Error };
						}
						else
						{
							tmpTrimmed[tmpNames[i]] =
								{
									Dirty: tmpR.Dirty,
									FileCount: tmpR.Files.length,
									Branch: tmpR.Branch,
									Ahead: tmpR.Ahead,
									Behind: tmpR.Behind,
								};
						}
					}
					pRes.send(
						{
							ScannedAt: new Date().toISOString(),
							ElapsedMs: Date.now() - tmpStart,
							ModuleCount: tmpNames.length,
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

			let tmpPkg = tmpIntrospector.readPackageJson(tmpName);
			let tmpGitStatus = tmpIntrospector.getGitStatus(tmpName);

			// Build categorized dependency view: retold vs external, deps vs devDeps.
			let tmpCategorized = null;
			if (tmpPkg)
			{
				let tmpEcosystem = new Set(tmpCatalog.getAllModuleNames());
				tmpCategorized = categorizeDeps(tmpPkg, tmpEcosystem, tmpCatalog);
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
						Name:            tmpPkg.name,
						Version:         tmpPkg.version,
						Description:     tmpPkg.description,
						Dependencies:    tmpPkg.dependencies || {},
						DevDependencies: tmpPkg.devDependencies || {},
						Scripts:         tmpPkg.scripts || {},
					} : null,
					GitStatus: tmpGitStatus,
					CategorizedDeps: tmpCategorized,
				});
			return pNext();
		});
};
