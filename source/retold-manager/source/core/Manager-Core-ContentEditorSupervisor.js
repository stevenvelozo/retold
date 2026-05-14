'use strict';

const libChildProcess = require('child_process');
const libFs           = require('fs');
const libNet          = require('net');
const libPath         = require('path');

/**
 * Retold Manager -- Content Editor Supervisor (core)
 *
 * Parallel to Manager-Core-DocserveSupervisor, but spawns a local
 * retold-content-system server pointed at a module's `docs/` folder so
 * authors can edit markdown content (with the CMS's WYSIWYG / save-back
 * workflow) right from the manager UI.  The supervisor pair is split
 * because the two surfaces are read vs. write: docuserve is the
 * preview / reader; content-system is the editor.  Running both
 * simultaneously is supported — different fixed ports.
 *
 *   - `start(name, modulePath)` kills any in-flight content editor and
 *     spawns retold-content-system serving `<modulePath>/docs` on the
 *     fixed port.  If the docs folder doesn't exist, surfaces a clear
 *     error rather than spawning against a missing path.
 *   - `stop()` SIGTERMs the child and clears state.
 *   - `getState()` returns a shallow clone of the current state.
 *
 * The shape of the supervisor — single-active lifecycle, exit-handler
 * cleanup, child ref clear-before-kill — is intentionally identical to
 * the docserve supervisor so the front-end can drive both with the
 * same dropdown + chip pattern.
 */

const DEFAULT_PORT  = 43211;
const CONTENT_CLI   = libPath.resolve(__dirname, '..', '..', '..', '..', 'modules', 'apps', 'retold-content-system', 'source', 'cli', 'ContentSystem-CLI-Run.js');

function _emptyState()
{
	return {
		Running:     false,
		ModuleName:  null,
		ModulePath:  null,
		ContentPath: null,
		Port:        DEFAULT_PORT,
		URL:         null,
		Pid:         null,
		StartedAt:   null
	};
}

// Poll TCP connect against 127.0.0.1:<port> every 200ms until the
// listener is up (success) or the deadline passes (timeout).  Used
// after spawning a child process to defer "the child is ready" until
// it has actually bound the port — without this, the very first open
// of pState.URL races the child's HTTP-server boot and shows the
// browser's "could not connect" error page.
function _waitForPort(pPort, pTimeoutMs, pCallback)
{
	let tmpStart    = Date.now();
	let tmpInterval = 200;
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

class ContentEditorSupervisor
{
	constructor(pOptions)
	{
		pOptions = pOptions || {};
		this._log   = pOptions.log || console;
		this._child = null;
		this._state = _emptyState();

		if (!process._contentEditorSupervisorCleanupRegistered)
		{
			process._contentEditorSupervisorCleanupRegistered = true;
			let tmpSelf = this;
			process.on('exit',   () => { tmpSelf.stop(); });
			process.on('SIGINT', () => { tmpSelf.stop(); process.exit(130); });
			process.on('SIGTERM',() => { tmpSelf.stop(); process.exit(143); });
		}
	}

	getState() { return Object.assign({}, this._state); }

	// Optional pReadyCallback(err, state): fires once the child has bound
	// the port (or 8s deadline passes).  Lets routes defer the HTTP
	// response until the editor is actually reachable, so the first tab
	// click from the chip doesn't race the spawn.  Returns the state
	// synchronously regardless — old (sync) callers still work.
	start(pModuleName, pModulePath, pReadyCallback)
	{
		// Validate before tearing down the in-flight editor — a failed
		// start request should not silently kill a working session.
		let tmpContentPath = libPath.join(pModulePath, 'docs');
		if (!libFs.existsSync(tmpContentPath))
		{
			let tmpError = new Error('Module "' + pModuleName + '" has no docs/ folder at ' + tmpContentPath);
			this._log.error('ContentEditorSupervisor: ' + tmpError.message);
			throw tmpError;
		}

		this.stop();

		let tmpChild;
		try
		{
			tmpChild = libChildProcess.spawn(
				'node',
				[CONTENT_CLI, 'serve', tmpContentPath, '-p', String(DEFAULT_PORT)],
				{
					cwd:      pModulePath,
					stdio:    ['ignore', 'pipe', 'pipe'],
					detached: false
				});
		}
		catch (pError)
		{
			this._log.error('ContentEditorSupervisor: spawn failed — ' + pError.message);
			throw pError;
		}

		this._child = tmpChild;
		this._state =
			{
				Running:     true,
				ModuleName:  pModuleName,
				ModulePath:  pModulePath,
				ContentPath: tmpContentPath,
				Port:        DEFAULT_PORT,
				URL:         'http://127.0.0.1:' + DEFAULT_PORT + '/',
				Pid:         tmpChild.pid,
				StartedAt:   Date.now()
			};

		let tmpSelf = this;
		tmpChild.on('exit', (pCode) =>
		{
			if (tmpSelf._child !== tmpChild) { return; }
			tmpSelf._log.warn('ContentEditorSupervisor: retold-content-system exited unexpectedly (code ' + pCode + ')');
			tmpSelf._child = null;
			tmpSelf._state = _emptyState();
		});

		tmpChild.stderr.on('data', (pBuf) =>
		{
			let tmpLine = String(pBuf).replace(/\n+$/, '');
			if (tmpLine.length > 0)
			{
				tmpSelf._log.warn('[content-editor] ' + tmpLine);
			}
		});

		if (typeof pReadyCallback === 'function')
		{
			_waitForPort(DEFAULT_PORT, 8000, (pError) =>
				{
					if (pError) { tmpSelf._log.warn('ContentEditorSupervisor: ' + pError.message + ' (responding anyway, child may still be coming up)'); }
					pReadyCallback(null, tmpSelf.getState());
				});
		}

		return this.getState();
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

module.exports = ContentEditorSupervisor;
