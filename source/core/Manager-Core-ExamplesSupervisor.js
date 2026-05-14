'use strict';

const libChildProcess = require('child_process');
const libFs           = require('fs');
const libNet          = require('net');
const libPath         = require('path');

/**
 * Retold Manager -- Examples Supervisor (core)
 *
 * Sibling of Manager-Core-DocserveSupervisor / -ContentEditorSupervisor:
 * spawns and tracks a single long-running `quack examples` child so
 * authors can build + serve a module's `example_applications/` folder
 * from the manager UI.
 *
 * `quack examples` runs the build step then starts a long-lived HTTP
 * server with an auto-generated index page that links to each example
 * app.  Because the build can take real time on first run, the API
 * lifecycle is two-phase from the caller's perspective:
 *   1. spawn (returns immediately, state.Phase='building')
 *   2. port-readiness check (state.Phase='running' once the server
 *      binds; the ready callback fires only at this point so the UI
 *      can defer "open the URL" until the server actually responds)
 *
 * If `node_modules/` is missing we run `npm install` first; otherwise
 * we skip straight to `quack examples`.  Both steps run as child
 * processes that we tear down together when stop() / a fresh start()
 * / the manager exits.
 *
 *   - `start(name, absolutePath, ready?)` kills any in-flight examples
 *     server, optionally runs npm install, then spawns `quack examples`.
 *     Surfaces a clear error if there's no example_applications/ folder.
 *   - `stop()` SIGTERMs whichever child (install or serve) is current
 *     and clears state.
 *   - `getState()` returns a shallow clone of state.
 *
 * Fixed port 43212 (43210 = docserve, 43211 = content editor, 43212 =
 * examples) so the three chips can coexist and the URL is stable.
 */

const DEFAULT_PORT = 43212;

function _emptyState()
{
	return {
		Running:        false,
		Phase:          'idle',         // 'idle' | 'installing' | 'building' | 'running' | 'failed'
		ModuleName:     null,
		ModulePath:     null,
		ExamplesPath:   null,
		Port:           DEFAULT_PORT,
		URL:            null,
		Pid:            null,
		StartedAt:      null,
		LastError:      null
	};
}

function _waitForPort(pPort, pTimeoutMs, pCallback)
{
	let tmpStart    = Date.now();
	let tmpInterval = 250;
	let tmpDone     = false;
	let finish = (pError) =>
		{
			if (tmpDone) { return; }
			tmpDone = true;
			pCallback(pError || null);
		};
	let tryOnce = () =>
		{
			let tmpSocket = libNet.createConnection({ host: '127.0.0.1', port: pPort });
			let tmpSettled = false;
			let settle = (pError) =>
				{
					if (tmpSettled) { return; }
					tmpSettled = true;
					try { tmpSocket.destroy(); } catch (e) { /* already closed */ }
					if (!pError) { return finish(null); }
					if (Date.now() - tmpStart >= pTimeoutMs)
					{
						return finish(new Error('Port ' + pPort + ' did not open within ' + pTimeoutMs + 'ms'));
					}
					setTimeout(tryOnce, tmpInterval);
				};
			tmpSocket.once('connect', () => settle(null));
			tmpSocket.once('error',   (pError) => settle(pError));
			tmpSocket.setTimeout(500, () => settle(new Error('connect timeout')));
		};
	tryOnce();
}

class ExamplesSupervisor
{
	constructor(pOptions)
	{
		pOptions = pOptions || {};
		this._log   = pOptions.log || console;
		this._child = null;             // currently active child (install OR serve)
		this._state = _emptyState();

		if (!process._examplesSupervisorCleanupRegistered)
		{
			process._examplesSupervisorCleanupRegistered = true;
			let tmpSelf = this;
			process.on('exit',   () => { tmpSelf.stop(); });
			process.on('SIGINT', () => { tmpSelf.stop(); process.exit(130); });
			process.on('SIGTERM',() => { tmpSelf.stop(); process.exit(143); });
		}
	}

	getState() { return Object.assign({}, this._state); }

	start(pModuleName, pModulePath, pReadyCallback)
	{
		// Validate before tearing down a working session.  Same pattern
		// as the content-editor supervisor: a typo in the module name
		// shouldn't kill the running examples server.
		let tmpExamplesPath = libPath.join(pModulePath, 'example_applications');
		if (!libFs.existsSync(tmpExamplesPath))
		{
			let tmpError = new Error('Module "' + pModuleName + '" has no example_applications/ folder at ' + tmpExamplesPath);
			this._log.error('ExamplesSupervisor: ' + tmpError.message);
			throw tmpError;
		}

		this.stop();

		// Common base state — Phase advances as we move through install
		// and serve.  PID updates with each child.
		this._state =
			{
				Running:      true,
				Phase:        'building',
				ModuleName:   pModuleName,
				ModulePath:   pModulePath,
				ExamplesPath: tmpExamplesPath,
				Port:         DEFAULT_PORT,
				URL:          'http://127.0.0.1:' + DEFAULT_PORT + '/',
				Pid:          null,
				StartedAt:    Date.now(),
				LastError:    null
			};

		// If node_modules is missing, install dependencies first.  Most
		// modules in this repo have already been npm-installed but the
		// user's first attempt on a fresh checkout is the most common
		// failure mode if we skip this.
		let tmpHasNodeModules = libFs.existsSync(libPath.join(pModulePath, 'node_modules'));
		if (tmpHasNodeModules)
		{
			this._spawnExamplesServe(pReadyCallback);
		}
		else
		{
			this._state.Phase = 'installing';
			this._spawnNpmInstall((pInstallError) =>
				{
					if (pInstallError)
					{
						this._state.Phase     = 'failed';
						this._state.Running   = false;
						this._state.LastError = pInstallError.message;
						if (typeof pReadyCallback === 'function')
						{
							pReadyCallback(pInstallError, this.getState());
						}
						return;
					}
					this._spawnExamplesServe(pReadyCallback);
				});
		}

		return this.getState();
	}

	_spawnNpmInstall(pCallback)
	{
		let tmpSelf = this;
		this._log.info('ExamplesSupervisor: running npm install in ' + this._state.ModulePath);
		let tmpChild;
		try
		{
			tmpChild = libChildProcess.spawn('npm', ['install'],
				{
					cwd:      this._state.ModulePath,
					stdio:    ['ignore', 'pipe', 'pipe'],
					detached: false
				});
		}
		catch (pError)
		{
			pCallback(pError);
			return;
		}

		this._child = tmpChild;
		this._state.Pid = tmpChild.pid;

		tmpChild.stderr.on('data', (pBuf) =>
			{
				let tmpLine = String(pBuf).replace(/\n+$/, '');
				if (tmpLine.length > 0) { tmpSelf._log.warn('[examples-install] ' + tmpLine); }
			});

		tmpChild.on('exit', (pCode) =>
			{
				if (tmpSelf._child !== tmpChild) { return; }
				tmpSelf._child = null;
				if (pCode === 0)
				{
					pCallback(null);
				}
				else
				{
					pCallback(new Error('npm install exited with code ' + pCode));
				}
			});
	}

	_spawnExamplesServe(pReadyCallback)
	{
		let tmpSelf = this;
		this._state.Phase = 'building';
		this._log.info('ExamplesSupervisor: running npx quack examples in ' + this._state.ModulePath
			+ ' (port ' + DEFAULT_PORT + ')');

		let tmpChild;
		try
		{
			tmpChild = libChildProcess.spawn(
				'npx',
				['quack', 'examples', '-p', String(DEFAULT_PORT)],
				{
					cwd:      this._state.ModulePath,
					stdio:    ['ignore', 'pipe', 'pipe'],
					detached: false
				});
		}
		catch (pError)
		{
			this._state.Phase     = 'failed';
			this._state.Running   = false;
			this._state.LastError = pError.message;
			if (typeof pReadyCallback === 'function')
			{
				pReadyCallback(pError, this.getState());
			}
			return;
		}

		this._child = tmpChild;
		this._state.Pid = tmpChild.pid;

		tmpChild.on('exit', (pCode) =>
			{
				if (tmpSelf._child !== tmpChild) { return; }
				tmpSelf._log.warn('ExamplesSupervisor: quack examples exited unexpectedly (code ' + pCode + ')');
				tmpSelf._child = null;
				tmpSelf._state = _emptyState();
			});

		tmpChild.stderr.on('data', (pBuf) =>
			{
				let tmpLine = String(pBuf).replace(/\n+$/, '');
				if (tmpLine.length > 0) { tmpSelf._log.warn('[examples] ' + tmpLine); }
			});

		// The user wants to wait through the build before opening the
		// URL, so the ready-callback fires only once the port is bound.
		// Longer deadline (45s) than docserve/content-editor because
		// `quack examples` rebuilds every example app before serving.
		_waitForPort(DEFAULT_PORT, 45000, (pError) =>
			{
				if (pError)
				{
					tmpSelf._log.warn('ExamplesSupervisor: ' + pError.message
						+ ' (responding anyway; build may still be running)');
				}
				else
				{
					tmpSelf._state.Phase = 'running';
				}
				if (typeof pReadyCallback === 'function')
				{
					pReadyCallback(null, tmpSelf.getState());
				}
			});
	}

	stop()
	{
		if (!this._child)
		{
			this._state = _emptyState();
			return;
		}
		let tmpChild = this._child;
		this._child = null;
		try { tmpChild.kill('SIGTERM'); }
		catch (pError) { /* already dead */ }
		this._state = _emptyState();
	}
}

module.exports = ExamplesSupervisor;
