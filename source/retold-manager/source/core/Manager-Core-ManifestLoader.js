/**
 * Retold Manager -- Manifest Loader
 *
 * Reads Retold-Modules-Manifest.json from the repo root and builds the indexes
 * the rest of retold-manager uses:
 *   - `raw`             -- the parsed manifest object (as-shipped)
 *   - `groups`          -- array matching `raw.Groups`
 *   - `moduleByName`    -- Map<string, manifestModuleEntry>, augmented with:
 *                            - GroupName          (the manifest's TitleCase group)
 *                            - GroupDiskName      (lowercase disk dir name)
 *                            - AbsolutePath       (absolute filesystem path)
 *   - `ecosystemNames`  -- Set<string> of every module name
 *   - `groupByName`     -- Map<string, group>
 *
 * Plain module (not a Fable service). The TUI's existing ModuleCatalog.js
 * consumed a plain object; this preserves the require-and-go ergonomic.
 */

const libFs = require('fs');
const libPath = require('path');

// ─────────────────────────────────────────────
//  Paths
// ─────────────────────────────────────────────

// retold/source/retold-manager/source/core -> retold/ is three levels up
const DEFAULT_REPO_ROOT = libPath.resolve(__dirname, '..', '..', '..', '..');
const DEFAULT_MANIFEST_NAME = 'Retold-Modules-Manifest.json';
const DEFAULT_MODULES_DIR = 'modules';

// Mapping TitleCase manifest group names to the lowercase directory names on
// disk. The manifest itself also stores `Path: 'modules/<lowercase>'`, but a
// static alias table is easier to work with than parsing the manifest's
// Path for every group.
const GROUP_DISK_NAMES =
{
	'Fable':   'fable',
	'Meadow':  'meadow',
	'Orator':  'orator',
	'Pict':    'pict',
	'Utility': 'utility',
	'Apps':    'apps',
};

// ─────────────────────────────────────────────
//  Loader
// ─────────────────────────────────────────────

class ManifestLoader
{
	/**
	 * @param {object} [pOptions]
	 * @param {string} [pOptions.RepoRoot]      - Absolute path to the retold repo root.
	 *                                            Defaults to four levels up from this file.
	 * @param {string} [pOptions.ManifestPath]  - Absolute path to the manifest JSON.
	 *                                            Defaults to <RepoRoot>/Retold-Modules-Manifest.json.
	 */
	constructor(pOptions)
	{
		let tmpOptions = pOptions || {};
		this.repoRoot = tmpOptions.RepoRoot || DEFAULT_REPO_ROOT;
		this.manifestPath = tmpOptions.ManifestPath
			|| libPath.join(this.repoRoot, DEFAULT_MANIFEST_NAME);
		this.modulesPath = libPath.join(this.repoRoot, DEFAULT_MODULES_DIR);

		this.raw = null;
		this.groups = null;
		this.moduleByName = null;
		this.groupByName = null;
		this.ecosystemNames = null;
	}

	/**
	 * Load (or reload) the manifest from disk. Safe to call repeatedly.
	 * @returns {ManifestLoader} this (for chaining)
	 */
	load()
	{
		let tmpContent = libFs.readFileSync(this.manifestPath, 'utf8');
		this.raw = JSON.parse(tmpContent);

		if (!this.raw || !Array.isArray(this.raw.Groups))
		{
			throw new Error(`Manifest at ${this.manifestPath} has no Groups array`);
		}

		this.groups = this.raw.Groups;
		this.moduleByName = new Map();
		this.groupByName = new Map();
		this.ecosystemNames = new Set();

		for (let i = 0; i < this.groups.length; i++)
		{
			let tmpGroup = this.groups[i];
			this.groupByName.set(tmpGroup.Name, tmpGroup);

			let tmpDiskName = GROUP_DISK_NAMES[tmpGroup.Name]
				|| (tmpGroup.Path ? libPath.basename(tmpGroup.Path) : tmpGroup.Name.toLowerCase());

			let tmpModules = Array.isArray(tmpGroup.Modules) ? tmpGroup.Modules : [];
			for (let j = 0; j < tmpModules.length; j++)
			{
				let tmpModule = tmpModules[j];
				let tmpEntry = Object.assign({}, tmpModule,
					{
						GroupName: tmpGroup.Name,
						GroupDiskName: tmpDiskName,
						AbsolutePath: libPath.join(this.modulesPath, tmpDiskName, tmpModule.Name),
					});
				this.moduleByName.set(tmpModule.Name, tmpEntry);
				this.ecosystemNames.add(tmpModule.Name);
			}
		}

		return this;
	}

	/**
	 * Ensure the manifest is loaded; load on first access.
	 */
	ensureLoaded()
	{
		if (!this.raw) { this.load(); }
		return this;
	}

	// ─────────────────────────────────────────────
	//  Queries
	// ─────────────────────────────────────────────

	getModule(pName)
	{
		this.ensureLoaded();
		return this.moduleByName.get(pName) || null;
	}

	getGroup(pName)
	{
		this.ensureLoaded();
		return this.groupByName.get(pName) || null;
	}

	getAllModules()
	{
		this.ensureLoaded();
		return Array.from(this.moduleByName.values());
	}

	getAllModuleNames()
	{
		this.ensureLoaded();
		return Array.from(this.ecosystemNames);
	}

	getGroups()
	{
		this.ensureLoaded();
		return this.groups.slice();
	}

	getModulesPath()
	{
		return this.modulesPath;
	}

	getRepoRoot()
	{
		return this.repoRoot;
	}

	/**
	 * Return the manifest shape the legacy ModuleCatalog.js exported:
	 *   { BasePath, Groups: [{ Name (lowercase), Label, Description, Modules: [name, ...] }] }
	 * This lets the existing TUI keep consuming the same structure while we
	 * migrate call sites to the richer API.
	 */
	toLegacyCatalog()
	{
		this.ensureLoaded();
		let tmpGroups = [];
		for (let i = 0; i < this.groups.length; i++)
		{
			let tmpGroup = this.groups[i];
			let tmpDiskName = GROUP_DISK_NAMES[tmpGroup.Name] || tmpGroup.Name.toLowerCase();
			let tmpModuleNames = [];
			for (let j = 0; j < tmpGroup.Modules.length; j++)
			{
				tmpModuleNames.push(tmpGroup.Modules[j].Name);
			}
			tmpGroups.push(
				{
					Name: tmpDiskName,
					Label: tmpGroup.Name,
					Description: tmpGroup.Description,
					Modules: tmpModuleNames,
				});
		}

		return {
			BasePath: this.modulesPath,
			Groups: tmpGroups,
		};
	}
}

module.exports = ManifestLoader;
module.exports.GROUP_DISK_NAMES = GROUP_DISK_NAMES;
module.exports.DEFAULT_REPO_ROOT = DEFAULT_REPO_ROOT;
