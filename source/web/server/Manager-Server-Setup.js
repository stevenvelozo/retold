/**
 * Retold Manager -- Orator Server Setup
 *
 * Composes the web transport: Fable → Orator (restify under the hood) →
 * REST routes → WebSocket operation broadcaster → static files. Mirrors
 * retold-remote's server setup shape but trimmed for retold-manager's
 * single-purpose concern.
 *
 * Call signature:
 *
 *     serverSetup({ Port, Host, DistPath }, fCallback);
 *
 *   fCallback(pError, pServerInfo) where pServerInfo is
 *     { Fable, Orator, Port, Host, ModuleCount, Core: {...} }
 *
 * Binds explicitly to the supplied host (default 127.0.0.1) so the
 * server is not reachable from the local network unless the user asks
 * for it via `--host`.
 */

const libPath = require('path');
const libFS = require('fs');

// ─────────────────────────────────────────────
//  Dependency preflight
//
//  retold-manager's deps live in the umbrella retold/package.json, not
//  here in source/. Node's module resolution walks up from this file
//  and finds them at retold/node_modules/ — but only if `npm install`
//  has been run at the retold root. If it hasn't (fresh clone) or the
//  install is stale (older orator shadowing the newly-listed version),
//  the rest of this file blows up several frames deep with a cryptic
//  `TypeError: addStaticRouteWithFallbacks is not a function` style
//  error. Fail fast here with a message that names the actual fix
//  instead of leaving the user to decode a stack trace.
// ─────────────────────────────────────────────
(function preflightDeps()
{
	let tmpHowToFix =
		'  From the retold repo root, run:\n'
		+ '\n'
		+ '    npm install\n'
		+ '\n'
		+ '  Then re-run `npx manager`. If the install at the repo root is\n'
		+ '  stale, blow away the cached install first:\n'
		+ '\n'
		+ '    rm -rf node_modules package-lock.json && npm install';

	function tmpDie(pMessage)
	{
		process.stderr.write('\n[retold-manager] ' + pMessage + '\n\n' + tmpHowToFix + '\n\n');
		process.exit(1);
	}

	// Each check: try to load the module, then (optionally) probe for a
	// signature method that was added in the minimum-required version.
	// FeatureMethod-less entries only catch the MODULE_NOT_FOUND case.
	let tmpChecks =
	[
		{ Name: 'orator', FeatureMethod: 'addStaticRouteWithFallbacks', FeatureNote: '(added in orator@6.1)' },
		{ Name: 'orator-serviceserver-restify' },
		{ Name: 'fable' },
		{ Name: 'pict' }
	];

	for (let i = 0; i < tmpChecks.length; i++)
	{
		let tmpCheck = tmpChecks[i];
		let tmpModule;
		try
		{
			tmpModule = require(tmpCheck.Name);
		}
		catch (pError)
		{
			if (pError && pError.code === 'MODULE_NOT_FOUND')
			{
				tmpDie('required dependency `' + tmpCheck.Name + '` is not installed — '
					+ 'retold-manager\'s deps live in the umbrella `retold/package.json`.');
			}
			throw pError;
		}
		if (tmpCheck.FeatureMethod)
		{
			let tmpProto = tmpModule && tmpModule.prototype;
			if (!tmpProto || typeof tmpProto[tmpCheck.FeatureMethod] !== 'function')
			{
				tmpDie('`' + tmpCheck.Name + '` is installed but missing the `' + tmpCheck.FeatureMethod
					+ '` method ' + (tmpCheck.FeatureNote ? tmpCheck.FeatureNote + ' ' : '')
					+ '— a stale older copy is probably shadowing the newer version listed in `retold/package.json`.');
			}
		}
	}
})();

const libFable = require('fable');
const libOrator = require('orator');
const libOratorServiceServerRestify = require('orator-serviceserver-restify');

// Core services (transport-agnostic). Same instances the TUI uses.
const libModuleCatalog = require('../../Retold-Manager-ModuleCatalog.js');
const libCoreProcessRunner = require('../../core/Manager-Core-ProcessRunner.js');
const libCommitComposer = require('../../core/Manager-Core-CommitComposer.js');
const libModuleIntrospector = require('../../core/Manager-Core-ModuleIntrospector.js');
const libPrePublishValidator = require('../../core/Manager-Core-PrePublishValidator.js');
const libOperationLogger = require('../../core/Manager-Core-OperationLogger.js');

// Route registrars (each attaches a bundle of routes to Orator).
const libRoutesManifest = require('./RetoldManager-Api-Manifest.js');
const libRoutesManifestEdit = require('./RetoldManager-Api-ManifestEdit.js');
const libRoutesOperations = require('./RetoldManager-Api-Operations.js');
const libRoutesRipple = require('./RetoldManager-Api-Ripple.js');
const libRoutesDocserve = require('./RetoldManager-Api-Docserve.js');
const libRoutesContentEditor = require('./RetoldManager-Api-ContentEditor.js');
const libRoutesExamples = require('./RetoldManager-Api-Examples.js');
const libRoutesFiles = require('./RetoldManager-Api-Files.js');

// Docserve supervisor — owns the long-running pict-docuserve child
// process spawned via the manager UI's "serve local docs" action.
const libDocserveSupervisor = require('../../core/Manager-Core-DocserveSupervisor.js');

// Content editor supervisor — sibling of docserve; spawns
// retold-content-system pointed at a module's docs/ folder so authors
// can edit markdown right from the manager UI.  Distinct port (43211)
// so the two supervisors can run side by side: view in docuserve, edit
// in content-system, simultaneously.
const libContentEditorSupervisor = require('../../core/Manager-Core-ContentEditorSupervisor.js');

// Examples supervisor — sibling of docserve / content-editor;  runs
// `npm install` + `npx quack examples` to build and serve a module's
// example_applications/ folder.  Fixed port 43212 so all three local
// servers can coexist.
const libExamplesSupervisor = require('../../core/Manager-Core-ExamplesSupervisor.js');

// WebSocket pub/sub + stream bridge from ProcessRunner events → WS frames.
const libOperationBroadcaster = require('./Manager-OperationBroadcaster.js');
const libProcessStreamBridge = require('./Manager-ProcessStreamBridge.js');

// ─────────────────────────────────────────────
//  Runtime asset CDN fallback map
//
//  Filename (under /pict/) → CDN URL. Unversioned URLs resolve to the
//  package's latest published version; fine for a dev tool where getting
//  pict fixes automatically is preferable to pinning.
// ─────────────────────────────────────────────

function unpkgUrl(pPackage, pRelPath)
{
	return 'https://unpkg.com/' + pPackage + '/' + pRelPath;
}

function buildRuntimeCDNFallbackMap()
{
	// Add new entries as additional runtime assets are referenced from index.html.
	return {
		'pict.min.js': unpkgUrl('pict', 'dist/pict.min.js'),
	};
}

function setupRetoldManagerServer(pOptions, fCallback)
{
	let tmpPort = pOptions.Port || 55555;
	let tmpHost = pOptions.Host || '127.0.0.1';
	let tmpDistPath = pOptions.DistPath;

	// ─────────────────────────────────────────────
	//  Fable
	// ─────────────────────────────────────────────

	let tmpFable = new libFable(
		{
			Product: 'Retold-Manager',
			ProductVersion: require('../../package.json').version,
			APIServerPort: tmpPort,
			LogStreams:
			[
				{
					loggertype: 'console',
					streamtype: 'console',
					level: 'info',
				}
			],
		});

	// ─────────────────────────────────────────────
	//  Orator (restify under the hood)
	// ─────────────────────────────────────────────

	tmpFable.serviceManager.addServiceType('OratorServiceServer', libOratorServiceServerRestify);
	tmpFable.serviceManager.instantiateServiceProvider('OratorServiceServer');
	tmpFable.serviceManager.addServiceType('Orator', libOrator);
	let tmpOrator = tmpFable.serviceManager.instantiateServiceProvider('Orator');

	// ─────────────────────────────────────────────
	//  Core services (shared between TUI and web)
	// ─────────────────────────────────────────────

	let tmpIntrospector = new libModuleIntrospector(
		{
			manifest: libModuleCatalog,
			log: tmpFable.log,
		});
	let tmpValidator = new libPrePublishValidator(
		{
			introspector: tmpIntrospector,
			log: tmpFable.log,
		});
	let tmpProcessRunner = new libCoreProcessRunner({ log: tmpFable.log });
	let tmpDocserveSupervisor = new libDocserveSupervisor({ log: tmpFable.log });
	let tmpContentEditorSupervisor = new libContentEditorSupervisor({ log: tmpFable.log });
	let tmpExamplesSupervisor = new libExamplesSupervisor({ log: tmpFable.log });

	// Durable on-disk log of every operation + ripple event. Rolls daily.
	let tmpOperationLogger = new libOperationLogger(
		{
			RepoRoot: libModuleCatalog.manifest.getRepoRoot(),
			ProcessRunner: tmpProcessRunner,
			Log: tmpFable.log,
		});
	tmpFable.log.info('Operation log file: ' + tmpOperationLogger.getLogPath());

	// WebSocket broadcaster (instantiated as a Fable service so it has `this.fable.log`).
	tmpFable.serviceManager.addServiceType('ManagerOperationBroadcaster', libOperationBroadcaster);
	let tmpBroadcaster = tmpFable.serviceManager.instantiateServiceProvider('ManagerOperationBroadcaster');

	// Bridge ProcessRunner events to WebSocket frames.
	let tmpStreamBridge = new libProcessStreamBridge(tmpProcessRunner, tmpBroadcaster);

	// Give route modules a single Core bag so they don't need 5 imports each.
	let tmpCore =
		{
			Fable:                   tmpFable,
			Orator:                  tmpOrator,
			ModuleCatalog:           libModuleCatalog,
			Introspector:            tmpIntrospector,
			Validator:               tmpValidator,
			ProcessRunner:           tmpProcessRunner,
			DocserveSupervisor:      tmpDocserveSupervisor,
			ContentEditorSupervisor: tmpContentEditorSupervisor,
			ExamplesSupervisor:      tmpExamplesSupervisor,
			CommitComposer:          libCommitComposer,
			Broadcaster:             tmpBroadcaster,
			StreamBridge:            tmpStreamBridge,
			Logger:                  tmpOperationLogger,
		};

	// ─────────────────────────────────────────────
	//  Initialize Orator (wires restify up but does NOT listen yet)
	// ─────────────────────────────────────────────

	tmpOrator.initialize(
		function (pInitError)
		{
			if (pInitError) { return fCallback(pInitError); }

			// ─────────────────────────────────────────────
			//  Middleware: JSON body parser + small identity header.
			//  Bind directly to the underlying restify server — orator's
			//  wrapped use() rejects arrays, but bodyParser() returns one.
			// ─────────────────────────────────────────────

			tmpOrator.serviceServer.server.use(tmpOrator.serviceServer.bodyParser());
			tmpOrator.serviceServer.server.use(function (pReq, pRes, pNext)
				{
					pRes.setHeader('X-Retold-Manager', require('../../package.json').version);
					return pNext();
				});

			// ─────────────────────────────────────────────
			//  Routes
			// ─────────────────────────────────────────────

			libRoutesManifest(tmpCore);
			libRoutesManifestEdit(tmpCore);
			libRoutesOperations(tmpCore);
			libRoutesRipple(tmpCore);
			libRoutesDocserve(tmpCore);
			libRoutesContentEditor(tmpCore);
			libRoutesExamples(tmpCore);
			libRoutesFiles(tmpCore);

			// Healthcheck for quick scripted probing
			tmpOrator.serviceServer.doGet('/api/manager/health', function (pReq, pRes, pNext)
				{
					pRes.send(
						{
							Product:       'Retold-Manager',
							Version:       require('../../package.json').version,
							ModuleCount:   libModuleCatalog.getAllModuleNames().length,
							ServerTime:    new Date().toISOString(),
						});
					return pNext();
				});

			// Static file serving.
			//
			// addStaticRoute(pFilePath, pDefaultFile, pRoute='/*', pRouteStrip='/', ...)
			//
			// Layout:
			//   /             -> html/index.html (pict shell)
			//   /css/*        -> css/ (shared stylesheet)
			//   /app/*        -> web-application/ (committed build output) with
			//                    CDN fallback for runtime assets not tracked
			//                    locally (e.g. pict.min.js)
			let tmpSourceRoot = libPath.resolve(__dirname, '..', '..');

			tmpOrator.addStaticRoute(`${tmpSourceRoot}/css/`, null, '/css/*', '/css/');

			tmpOrator.addStaticRouteWithFallbacks(
				`${tmpSourceRoot}/web-application/`,
				null,
				'/app/*',
				'/app/',
				null,
				buildRuntimeCDNFallbackMap());

			// Root → html/index.html, served via a dynamic handler that
			// rewrites every <script src="app/*.js"> and <link href="css/*.css">
			// to append a `?v=<mtime>` cache-buster. Without this browsers can
			// keep serving a stale bundle for hours after a rebuild — we
			// publish a new bundle on every iteration during development, so
			// stale caches are how "I changed the code but nothing changed
			// in the browser" happens.
			let tmpIndexPath = libPath.join(`${tmpSourceRoot}/html/`, 'index.html');
			let tmpAppRoot   = `${tmpSourceRoot}/web-application/`;
			let tmpCssRoot   = `${tmpSourceRoot}/css/`;
			let tmpFingerprint = function (pAbsPath)
				{
					try { return Math.floor(libFS.statSync(pAbsPath).mtimeMs); }
					catch (pErr) { return Date.now(); }
				};
			tmpOrator.serviceServer.doGet('/', function (pReq, pRes, pNext)
				{
					libFS.readFile(tmpIndexPath, 'utf8', function (pReadErr, pHTML)
					{
						if (pReadErr)
						{
							pRes.send(500, { Message: 'Failed to read index.html' });
							return pNext();
						}
						let tmpRewritten = pHTML
							.replace(/(src=["'])app\/([^"']+\.js)(["'])/g, function (pMatch, pPre, pFile, pPost)
								{
									let tmpV = tmpFingerprint(libPath.join(tmpAppRoot, pFile));
									return pPre + 'app/' + pFile + '?v=' + tmpV + pPost;
								})
							.replace(/(href=["'])css\/([^"']+\.css)(["'])/g, function (pMatch, pPre, pFile, pPost)
								{
									let tmpV = tmpFingerprint(libPath.join(tmpCssRoot, pFile));
									return pPre + 'css/' + pFile + '?v=' + tmpV + pPost;
								});
						pRes.setHeader('Content-Type', 'text/html; charset=utf-8');
						pRes.setHeader('Cache-Control', 'no-cache, must-revalidate');
						pRes.write(tmpRewritten);
						pRes.end();
						return pNext();
					});
				});

			// ─────────────────────────────────────────────
			//  Listen — bypass orator.startService() so we can pass a host.
			//  restify's server.listen signature: (port, host, callback)
			// ─────────────────────────────────────────────

			tmpOrator.serviceServer.server.listen(tmpPort, tmpHost,
				function (pListenError)
				{
					if (pListenError) { return fCallback(pListenError); }

					tmpOrator.serviceServer.Active = true;
					tmpOrator.serviceServer.Port = tmpPort;

					// Attach the WebSocket broadcaster to the underlying
					// http.Server so upgrades on /ws/manager/operations reach
					// the pub/sub hub.
					try
					{
						let tmpHttpServer = tmpOrator.serviceServer.server
							? tmpOrator.serviceServer.server.server
							: null;
						if (tmpHttpServer)
						{
							tmpBroadcaster.attachTo(tmpHttpServer);
						}
						else
						{
							tmpFable.log.warn('OperationBroadcaster: could not find underlying http.Server; WebSocket status unavailable');
						}
					}
					catch (pAttachError)
					{
						tmpFable.log.warn('OperationBroadcaster attach failed: ' + pAttachError.message);
					}

					return fCallback(null,
						{
							Fable:        tmpFable,
							Orator:       tmpOrator,
							Broadcaster:  tmpBroadcaster,
							Port:         tmpPort,
							Host:         tmpHost,
							ModuleCount:  libModuleCatalog.getAllModuleNames().length,
							Core:         tmpCore,
						});
				});
		});
}

module.exports = setupRetoldManagerServer;
