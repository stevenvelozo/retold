/**
 * Retold Manager -- Module Catalog (manifest-backed)
 *
 * Replaces the hand-maintained source/Retold-Manager-ModuleCatalog.js with
 * a manifest-driven equivalent. Preserves the exact shape the legacy catalog
 * exposed ({ BasePath, Groups:[{ Name, Label, Description, Modules:[name,...] }] })
 * so existing call sites in the TUI don't need to change when they import
 * through the old file path (which now re-exports this module).
 *
 * Also exposes the richer manifest data for new code:
 *   module.exports.manifest       -- the singleton ManifestLoader (lazy-loaded)
 *   module.exports.getModule(name)
 *   module.exports.getAllModules()
 *   module.exports.getAllModuleNames()
 *   module.exports.reload()       -- force-reload from disk
 */

const libManifestLoader = require('./Manager-Core-ManifestLoader.js');

// One singleton loader per process. Retold-manager lives in a single
// working copy of the repo, so a shared instance is appropriate.
let _loader = new libManifestLoader();

// Build the legacy-shape catalog once at first property access.
// Re-using Object.defineProperty lets us keep the `module.exports.BasePath`
// and `module.exports.Groups` accessors lazy while still appearing as
// static properties to consumers doing `libModuleCatalog.Groups[0]`.
let _cachedLegacy = null;
function getLegacy()
{
	if (!_cachedLegacy) { _cachedLegacy = _loader.toLegacyCatalog(); }
	return _cachedLegacy;
}

// ─────────────────────────────────────────────
//  Legacy surface (BasePath, Groups)
// ─────────────────────────────────────────────

Object.defineProperty(module.exports, 'BasePath',
	{
		enumerable: true,
		get: function () { return getLegacy().BasePath; }
	});

Object.defineProperty(module.exports, 'Groups',
	{
		enumerable: true,
		get: function () { return getLegacy().Groups; }
	});

// ─────────────────────────────────────────────
//  Extended surface
// ─────────────────────────────────────────────

module.exports.manifest = _loader;

module.exports.getModule = function (pName)
{
	return _loader.getModule(pName);
};

module.exports.getAllModules = function ()
{
	return _loader.getAllModules();
};

module.exports.getAllModuleNames = function ()
{
	return _loader.getAllModuleNames();
};

module.exports.getModulesPath = function ()
{
	return _loader.getModulesPath();
};

module.exports.reload = function ()
{
	_loader.load();
	_cachedLegacy = null;
	return module.exports;
};
