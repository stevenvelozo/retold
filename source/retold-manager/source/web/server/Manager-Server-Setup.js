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

// WebSocket pub/sub + stream bridge from ProcessRunner events → WS frames.
const libOperationBroadcaster = require('./Manager-OperationBroadcaster.js');
const libProcessStreamBridge = require('./Manager-ProcessStreamBridge.js');

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
			ProductVersion: require('../../../package.json').version,
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
			Fable:          tmpFable,
			Orator:         tmpOrator,
			ModuleCatalog:  libModuleCatalog,
			Introspector:   tmpIntrospector,
			Validator:      tmpValidator,
			ProcessRunner:  tmpProcessRunner,
			CommitComposer: libCommitComposer,
			Broadcaster:    tmpBroadcaster,
			StreamBridge:   tmpStreamBridge,
			Logger:         tmpOperationLogger,
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
					pRes.setHeader('X-Retold-Manager', require('../../../package.json').version);
					return pNext();
				});

			// ─────────────────────────────────────────────
			//  Routes
			// ─────────────────────────────────────────────

			libRoutesManifest(tmpCore);
			libRoutesManifestEdit(tmpCore);
			libRoutesOperations(tmpCore);
			libRoutesRipple(tmpCore);

			// Healthcheck for quick scripted probing
			tmpOrator.serviceServer.doGet('/api/manager/health', function (pReq, pRes, pNext)
				{
					pRes.send(
						{
							Product:       'Retold-Manager',
							Version:       require('../../../package.json').version,
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
			//   /css/*        -> css/           (shared stylesheet)
			//   /pict/*       -> web-application/ (committed build output,
			//                                     includes pict.min.js + bundle)
			let tmpSourceRoot = libPath.resolve(__dirname, '..', '..', '..');

			tmpOrator.addStaticRoute(`${tmpSourceRoot}/css/`, null, '/css/*', '/css/');
			tmpOrator.addStaticRoute(`${tmpSourceRoot}/web-application/`, null, '/pict/*', '/pict/');

			// Root → html/index.html. Registered last so the specific routes above win.
			tmpOrator.addStaticRoute(`${tmpSourceRoot}/html/`, 'index.html');

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
