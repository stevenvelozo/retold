/**
 * Retold Manager -- Manifest CRUD Routes
 *
 * Write operations on Retold-Modules-Manifest.json. Every mutation goes
 * through an atomic tmp-file rename so a crash mid-write can't corrupt
 * the canonical manifest.
 *
 *   POST   /api/manager/manifest/modules           { Group, Name, Path?, Description?, GitHub?, Documentation?, RelatedModules? }
 *   PATCH  /api/manager/manifest/modules/:name     partial update — any field in the module entry
 *   DELETE /api/manager/manifest/modules/:name
 *   PUT    /api/manager/manifest/groups/:name      { Description? }
 *   GET    /api/manager/manifest/audit             run the audit (same logic as bin/manifest-audit.js)
 *   POST   /api/manager/manifest/reload            force a reload from disk
 *
 * The authoritative manifest file lives at <repoRoot>/Retold-Modules-Manifest.json.
 * After every successful mutation the in-memory ManifestLoader is reloaded so
 * subsequent reads reflect the change.
 */

const libFs = require('fs');
const libPath = require('path');

const GROUP_DISK_NAMES =
{
	'Fable': 'fable',
	'Meadow': 'meadow',
	'Orator': 'orator',
	'Pict': 'pict',
	'Utility': 'utility',
	'Apps': 'apps',
};

// Fields the PATCH / POST endpoints allow on a module entry.
const ALLOWED_MODULE_FIELDS = ['Name', 'Path', 'Description', 'GitHub', 'Documentation', 'RelatedModules'];

function respondError(pRes, pStatus, pCode, pMessage)
{
	pRes.statusCode = pStatus;
	pRes.send({ Error: pCode, Message: pMessage });
}

function sortModules(pGroup)
{
	pGroup.Modules.sort(function (pA, pB) { return pA.Name.localeCompare(pB.Name); });
}

/**
 * Atomic manifest write: serialise with tabs (matches the repo's style),
 * write to a sibling .tmp, fsync, then rename. Rename on the same
 * filesystem is atomic on POSIX.
 */
function writeManifestAtomic(pManifestPath, pManifest)
{
	let tmpTmp = pManifestPath + '.tmp-' + process.pid + '-' + Date.now();
	let tmpContent = JSON.stringify(pManifest, null, '\t') + '\n';
	let tmpFd = libFs.openSync(tmpTmp, 'w');
	try
	{
		libFs.writeSync(tmpFd, tmpContent, 0, 'utf8');
		libFs.fsyncSync(tmpFd);
	}
	finally
	{
		libFs.closeSync(tmpFd);
	}
	libFs.renameSync(tmpTmp, pManifestPath);
}

/**
 * Rebuild the raw manifest from the live ManifestLoader's groups.
 * We keep a thin pass-through so operations that mutated group.Modules
 * directly are persisted verbatim.
 */
function mutateAndSave(pCatalog)
{
	let tmpLoader = pCatalog.manifest;
	let tmpPath = tmpLoader.manifestPath;
	writeManifestAtomic(tmpPath, tmpLoader.raw);
	// Re-read from disk so indexes (moduleByName, ecosystemNames, AbsolutePath)
	// are all fresh. pCatalog.reload() does both the disk load and the cached-
	// legacy-shape invalidation.
	pCatalog.reload();
}

// ─────────────────────────────────────────────
//  Audit (in-memory, doesn't spawn bin/manifest-audit.js)
// ─────────────────────────────────────────────

function computeAudit(pLoader)
{
	let tmpModulesRoot = pLoader.getModulesPath();
	let tmpReport =
		{
			Groups: [],
			Totals: { Manifest: 0, Disk: 0 },
			Drift: { ManifestMissing: 0, ManifestOrphaned: 0 },
		};

	for (let tmpGroupName in GROUP_DISK_NAMES)
	{
		if (!GROUP_DISK_NAMES.hasOwnProperty(tmpGroupName)) { continue; }

		let tmpDiskName = GROUP_DISK_NAMES[tmpGroupName];
		let tmpGroup = pLoader.getGroup(tmpGroupName);
		let tmpManifestNames = tmpGroup ? tmpGroup.Modules.map(function (pM) { return pM.Name; }) : [];
		let tmpDiskNames = [];

		try
		{
			let tmpEntries = libFs.readdirSync(libPath.join(tmpModulesRoot, tmpDiskName));
			for (let i = 0; i < tmpEntries.length; i++)
			{
				let tmpEntry = tmpEntries[i];
				if (tmpEntry.startsWith('.')) { continue; }
				let tmpPkgPath = libPath.join(tmpModulesRoot, tmpDiskName, tmpEntry, 'package.json');
				if (!libFs.existsSync(tmpPkgPath)) { continue; }
				tmpDiskNames.push(tmpEntry);
			}
		}
		catch (pError) { /* group dir missing */ }

		tmpDiskNames.sort();

		let tmpManifestSet = new Set(tmpManifestNames);
		let tmpDiskSet = new Set(tmpDiskNames);
		let tmpMissing = tmpDiskNames.filter(function (pN) { return !tmpManifestSet.has(pN); });
		let tmpOrphaned = tmpManifestNames.filter(function (pN) { return !tmpDiskSet.has(pN); });

		tmpReport.Groups.push(
			{
				Name: tmpGroupName,
				ManifestCount: tmpManifestNames.length,
				DiskCount: tmpDiskNames.length,
				ManifestMissing: tmpMissing,
				ManifestOrphaned: tmpOrphaned,
			});

		tmpReport.Totals.Manifest += tmpManifestNames.length;
		tmpReport.Totals.Disk += tmpDiskNames.length;
		tmpReport.Drift.ManifestMissing += tmpMissing.length;
		tmpReport.Drift.ManifestOrphaned += tmpOrphaned.length;
	}

	tmpReport.Clean = (tmpReport.Drift.ManifestMissing === 0)
		&& (tmpReport.Drift.ManifestOrphaned === 0);
	return tmpReport;
}

// ─────────────────────────────────────────────
//  Route registrar
// ─────────────────────────────────────────────

module.exports = function registerManifestEditRoutes(pCore)
{
	let tmpOrator = pCore.Orator;
	let tmpCatalog = pCore.ModuleCatalog;

	// ── GET /api/manager/manifest/audit ──
	tmpOrator.serviceServer.doGet('/api/manager/manifest/audit',
		function (pReq, pRes, pNext)
		{
			pRes.send(computeAudit(tmpCatalog.manifest));
			return pNext();
		});

	// ── POST /api/manager/manifest/reload ──
	tmpOrator.serviceServer.doPost('/api/manager/manifest/reload',
		function (pReq, pRes, pNext)
		{
			tmpCatalog.reload();
			pRes.send({ Reloaded: true, ModuleCount: tmpCatalog.getAllModuleNames().length });
			return pNext();
		});

	// ── POST /api/manager/manifest/modules ──
	tmpOrator.serviceServer.doPost('/api/manager/manifest/modules',
		function (pReq, pRes, pNext)
		{
			let tmpBody = pReq.body || {};
			if (!tmpBody.Group || !tmpBody.Name)
			{
				respondError(pRes, 400, 'BadRequest', 'Group and Name are required.');
				return pNext();
			}

			let tmpGroup = tmpCatalog.manifest.getGroup(tmpBody.Group);
			if (!tmpGroup)
			{
				respondError(pRes, 404, 'UnknownGroup', 'No group named "' + tmpBody.Group + '".');
				return pNext();
			}

			if (tmpCatalog.getModule(tmpBody.Name))
			{
				respondError(pRes, 409, 'DuplicateModule', 'A module named "' + tmpBody.Name + '" already exists.');
				return pNext();
			}

			let tmpDiskName = GROUP_DISK_NAMES[tmpBody.Group] || tmpBody.Group.toLowerCase();
			let tmpEntry =
				{
					Name:          tmpBody.Name,
					Path:          tmpBody.Path          || ('modules/' + tmpDiskName + '/' + tmpBody.Name),
					Description:   tmpBody.Description   || '',
					GitHub:        tmpBody.GitHub        || ('https://github.com/stevenvelozo/' + tmpBody.Name),
					Documentation: tmpBody.Documentation || ('https://stevenvelozo.github.io/' + tmpBody.Name + '/'),
					RelatedModules: Array.isArray(tmpBody.RelatedModules) ? tmpBody.RelatedModules : [],
				};

			tmpGroup.Modules.push(tmpEntry);
			sortModules(tmpGroup);

			try { mutateAndSave(tmpCatalog); }
			catch (pError)
			{
				respondError(pRes, 500, 'WriteFailed', pError.message);
				return pNext();
			}

			pRes.statusCode = 201;
			pRes.send(tmpCatalog.getModule(tmpBody.Name));
			return pNext();
		});

	// ── PATCH /api/manager/manifest/modules/:name ──
	tmpOrator.serviceServer.doPatch('/api/manager/manifest/modules/:name',
		function (pReq, pRes, pNext)
		{
			let tmpName = pReq.params.name;
			let tmpBody = pReq.body || {};

			let tmpEntry = tmpCatalog.getModule(tmpName);
			if (!tmpEntry)
			{
				respondError(pRes, 404, 'UnknownModule', 'No module "' + tmpName + '".');
				return pNext();
			}

			// Find the raw entry (the getModule result is a copy enriched with AbsolutePath, etc.)
			let tmpGroup = tmpCatalog.manifest.getGroup(tmpEntry.GroupName);
			let tmpRaw = null;
			let tmpIndex = -1;
			for (let i = 0; i < tmpGroup.Modules.length; i++)
			{
				if (tmpGroup.Modules[i].Name === tmpName)
				{
					tmpRaw = tmpGroup.Modules[i];
					tmpIndex = i;
					break;
				}
			}
			if (!tmpRaw)
			{
				respondError(pRes, 500, 'Inconsistent', 'Catalog and manifest disagree on module "' + tmpName + '".');
				return pNext();
			}

			// Renaming is permitted — but must not collide
			if (tmpBody.Name && tmpBody.Name !== tmpRaw.Name)
			{
				if (tmpCatalog.getModule(tmpBody.Name))
				{
					respondError(pRes, 409, 'DuplicateModule',
						'Cannot rename to "' + tmpBody.Name + '": already exists.');
					return pNext();
				}
			}

			for (let i = 0; i < ALLOWED_MODULE_FIELDS.length; i++)
			{
				let tmpField = ALLOWED_MODULE_FIELDS[i];
				if (tmpBody.hasOwnProperty(tmpField))
				{
					tmpRaw[tmpField] = tmpBody[tmpField];
				}
			}

			sortModules(tmpGroup);

			try { mutateAndSave(tmpCatalog); }
			catch (pError)
			{
				respondError(pRes, 500, 'WriteFailed', pError.message);
				return pNext();
			}

			pRes.send(tmpCatalog.getModule(tmpRaw.Name));
			return pNext();
		});

	// ── DELETE /api/manager/manifest/modules/:name ──
	tmpOrator.serviceServer.doDel('/api/manager/manifest/modules/:name',
		function (pReq, pRes, pNext)
		{
			let tmpName = pReq.params.name;

			let tmpEntry = tmpCatalog.getModule(tmpName);
			if (!tmpEntry)
			{
				respondError(pRes, 404, 'UnknownModule', 'No module "' + tmpName + '".');
				return pNext();
			}

			let tmpGroup = tmpCatalog.manifest.getGroup(tmpEntry.GroupName);
			for (let i = 0; i < tmpGroup.Modules.length; i++)
			{
				if (tmpGroup.Modules[i].Name === tmpName)
				{
					tmpGroup.Modules.splice(i, 1);
					break;
				}
			}

			try { mutateAndSave(tmpCatalog); }
			catch (pError)
			{
				respondError(pRes, 500, 'WriteFailed', pError.message);
				return pNext();
			}

			pRes.send({ Deleted: tmpName });
			return pNext();
		});

	// ── PUT /api/manager/manifest/groups/:name (group description only) ──
	tmpOrator.serviceServer.doPut('/api/manager/manifest/groups/:name',
		function (pReq, pRes, pNext)
		{
			let tmpName = pReq.params.name;
			let tmpBody = pReq.body || {};

			let tmpGroup = tmpCatalog.manifest.getGroup(tmpName);
			if (!tmpGroup)
			{
				respondError(pRes, 404, 'UnknownGroup', 'No group "' + tmpName + '".');
				return pNext();
			}

			if (typeof tmpBody.Description === 'string')
			{
				tmpGroup.Description = tmpBody.Description;
			}

			try { mutateAndSave(tmpCatalog); }
			catch (pError)
			{
				respondError(pRes, 500, 'WriteFailed', pError.message);
				return pNext();
			}

			pRes.send({ Name: tmpGroup.Name, Description: tmpGroup.Description });
			return pNext();
		});
};
