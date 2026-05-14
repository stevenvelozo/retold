'use strict';

const libChildProcess = require('child_process');
const libNet          = require('net');
const libPath         = require('path');

/**
 * Retold Manager -- Docserve Supervisor (core)
 *
 * Spawns and tracks a single long-running `pict-docuserve serve <module>`
 * child process so authors can preview branding / examples / doc
 * changes locally before publishing.  Distinct from
 * `Manager-Core-ProcessRunner` which serves the "single active build /
 * test / publish operation" pattern; the docuserve dev server is meant
 * to stay up across many operations.
 *
 *   - `start(name, absolutePath)` kills any in-flight docuserve and
 *     spawns a fresh one against the given module.  Returns the new
 *     state synchronously (the process is up before the call returns,
 *     though it may take another moment to start accepting HTTP
 *     connections).
 *   - `stop()` SIGTERMs the child and clears state.
 *   - `getState()` returns a shallow clone of the current state so
 *     callers can freely mutate / serialize.
 *
 * Process exits initiated by the supervisor itself (via `stop()` or by
 * a fresh `start()`) clear the cached child ref before sending SIGTERM,
 * so the child's 'exit' handler can distinguish a self-kill from an
 * unexpected crash.  Crashes log a warning and clear state so the UI
 * chip goes away.
 *
 * Manager-process cleanup: a SIGTERM / SIGINT / 'exit' handler kills
 * any running docuserve so we don't orphan node processes when the
 * user closes the manager.
 */

const DEFAULT_PORT  = 43210;
const DOCUSERVE_CLI = libPath.resolve(__dirname, '..', '..', 'modules', 'pict', 'pict-docuserve', 'source', 'cli', 'Docuserve-CLI-Run.js');

function _emptyState()
{
	return {
		Running:    false,
		ModuleName: null,
		ModulePath: null,
		Port:       DEFAULT_PORT,
		URL:        null,
		Pid:        null,
		StartedAt:  null
	};
}

// Poll TCP connect against 127.0.0.1:<port> every 200ms until the
// listener is up or the deadline passes.  Used after spawning the
// child process to defer "the docuserve is ready" until it has
// actually bound the port, so the first click on the chip doesn't
// race the spawn and hit the browser's "could not connect" error.
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

class DocserveSupervisor
{
	constructor(pOptions)
	{
		pOptions = pOptions || {};
		this._log   = pOptions.log || console;
		this._child = null;
		this._state = _emptyState();

		// Cleanup on manager exit — avoid orphaning a docuserve child.
		// Each signal handler is registered exactly once; calling
		// `stop()` is a no-op when nothing's running.
		if (!process._docserveSupervisorCleanupRegistered)
		{
			process._docserveSupervisorCleanupRegistered = true;
			let tmpSelf = this;
			process.on('exit',   () => { tmpSelf.stop(); });
			process.on('SIGINT', () => { tmpSelf.stop(); process.exit(130); });
			process.on('SIGTERM',() => { tmpSelf.stop(); process.exit(143); });
		}
	}

	getState() { return Object.assign({}, this._state); }

	// Optional pReadyCallback(err, state): fires once the child has bound
	// the port (or 8s deadline passes).  Lets routes defer the HTTP
	// response until docuserve is actually reachable, so the first tab
	// click from the chip doesn't race the spawn.  Returns the state
	// synchronously regardless — old (sync) callers still work.
	start(pModuleName, pModulePath, pReadyCallback)
	{
		// Kill any in-flight docuserve before starting fresh.  Idempotent
		// when nothing is running.
		this.stop();

		let tmpChild;
		try
		{
			tmpChild = libChildProcess.spawn(
				'node',
				[DOCUSERVE_CLI, 'serve', pModulePath, '-p', String(DEFAULT_PORT)],
				{
					cwd:      pModulePath,
					stdio:    ['ignore', 'pipe', 'pipe'],
					detached: false
				});
		}
		catch (pError)
		{
			this._log.error('DocserveSupervisor: spawn failed — ' + pError.message);
			throw pError;
		}

		this._child = tmpChild;
		this._state =
			{
				Running:    true,
				ModuleName: pModuleName,
				ModulePath: pModulePath,
				Port:       DEFAULT_PORT,
				URL:        'http://127.0.0.1:' + DEFAULT_PORT + '/',
				Pid:        tmpChild.pid,
				StartedAt:  Date.now()
			};

		let tmpSelf = this;
		tmpChild.on('exit', (pCode) =>
		{
			// If we cleared _child first (via stop() / a fresh start()),
			// state was already reset — ignore.  Otherwise the child
			// died on its own; reset state so the chip disappears.
			if (tmpSelf._child !== tmpChild) { return; }
			tmpSelf._log.warn('DocserveSupervisor: docuserve exited unexpectedly (code ' + pCode + ')');
			tmpSelf._child = null;
			tmpSelf._state = _emptyState();
		});

		// Pipe stderr through to the manager log for debugging.  stdout
		// is the "running on port N" message — we don't need it here
		// since we already know the port.
		tmpChild.stderr.on('data', (pBuf) =>
		{
			let tmpLine = String(pBuf).replace(/\n+$/, '');
			if (tmpLine.length > 0)
			{
				tmpSelf._log.warn('[docuserve] ' + tmpLine);
			}
		});

		if (typeof pReadyCallback === 'function')
		{
			_waitForPort(DEFAULT_PORT, 8000, (pError) =>
				{
					if (pError) { tmpSelf._log.warn('DocserveSupervisor: ' + pError.message + ' (responding anyway, child may still be coming up)'); }
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
		this._child = null;  // clear first so the 'exit' handler bails
		try { tmpChild.kill('SIGTERM'); }
		catch (pError) { /* already dead */ }
		this._state = _emptyState();
	}
}

module.exports = DocserveSupervisor;
