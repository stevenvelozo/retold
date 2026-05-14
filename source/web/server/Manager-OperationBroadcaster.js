/**
 * Retold Manager -- Operation Broadcaster (WebSocket pub/sub)
 *
 * Lifted from retold-remote's OperationBroadcaster with two additions:
 *   - `broadcastStdout(opId, channel, text)` — emits `Type: 'stdout'` frames
 *     for live child_process output, which isn't part of retold-remote's
 *     progress-only vocabulary.
 *   - WS_PATH is `/ws/manager/operations` instead of `/ws/operations` so the
 *     two products don't clash if ever hosted side-by-side.
 *
 * Protocol (JSON, one message per frame):
 *   Server -> Client:
 *     { Type: 'hello',      ServerTime }
 *     { Type: 'start',      OperationId, CommandString, Cwd, Label?, StartedAt }
 *     { Type: 'stdout',     OperationId, Channel: 'stdout'|'stderr', Text }
 *     { Type: 'progress',   OperationId, Phase?, Current?, Total?, Message?, Cancelable? }
 *     { Type: 'complete',   OperationId, ExitCode?, ElapsedMs?, Duration? }
 *     { Type: 'error',      OperationId, Error }
 *     { Type: 'cancelled',  OperationId }
 *     { Type: 'pong' }
 *   Client -> Server:
 *     { Type: 'cancel', OperationId }
 *     { Type: 'ping' }
 */

const libFableServiceProviderBase = require('fable-serviceproviderbase');
const libWs = require('ws');

const WS_PATH = '/ws/manager/operations';
const CANCELLED_TTL_MS = 5 * 60 * 1000;

class ManagerOperationBroadcaster extends libFableServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this.serviceType = 'ManagerOperationBroadcaster';

		this._wss = new libWs.WebSocketServer({ noServer: true });
		this._clients = new Set();
		this._cancelled = new Map();
		this._upgradeHandler = null;

		this._cleanupInterval = setInterval(
			() => { this._cleanupCancelled(); },
			60 * 1000);
		if (this._cleanupInterval && typeof this._cleanupInterval.unref === 'function')
		{
			this._cleanupInterval.unref();
		}

		this._wss.on('connection', (pSocket, pRequest) =>
			{
				this._onConnection(pSocket, pRequest);
			});

		this.fable.log.info('Operation Broadcaster initialized (WebSocket path: ' + WS_PATH + ')');
	}

	// ─────────────────────────────────────────────
	//  Lifecycle
	// ─────────────────────────────────────────────

	attachTo(pHttpServer)
	{
		if (!pHttpServer || typeof pHttpServer.on !== 'function')
		{
			this.fable.log.warn('OperationBroadcaster.attachTo: invalid http server, skipping');
			return false;
		}

		let tmpSelf = this;
		this._upgradeHandler = function (pRequest, pSocket, pHead)
		{
			let tmpUrl = pRequest.url || '';
			let tmpPath = tmpUrl.split('?')[0];
			if (tmpPath !== WS_PATH) { return; }

			tmpSelf._wss.handleUpgrade(pRequest, pSocket, pHead, (pWs) =>
				{
					tmpSelf._wss.emit('connection', pWs, pRequest);
				});
		};
		pHttpServer.on('upgrade', this._upgradeHandler);
		this.fable.log.info('Operation Broadcaster attached to HTTP server at ' + WS_PATH);
		return true;
	}

	shutdown()
	{
		if (this._cleanupInterval)
		{
			clearInterval(this._cleanupInterval);
			this._cleanupInterval = null;
		}
		for (let tmpSocket of this._clients)
		{
			try { tmpSocket.close(); }
			catch (pError) { /* ignore */ }
		}
		this._clients.clear();
	}

	// ─────────────────────────────────────────────
	//  Connection handling
	// ─────────────────────────────────────────────

	_onConnection(pSocket, pRequest)
	{
		this._clients.add(pSocket);
		this.fable.log.info('[OpBroadcast] client connected (' + this._clients.size + ' total)');

		let tmpSelf = this;

		pSocket.on('message', (pData) =>
			{
				let tmpMessage;
				try { tmpMessage = JSON.parse(pData.toString()); }
				catch (pError) { return; }

				if (!tmpMessage || typeof tmpMessage.Type !== 'string') { return; }

				if (tmpMessage.Type === 'ping')
				{
					tmpSelf._send(pSocket, { Type: 'pong' });
					return;
				}
				if (tmpMessage.Type === 'cancel' && typeof tmpMessage.OperationId === 'string')
				{
					tmpSelf.fable.log.info('[OpBroadcast] client requested cancel of ' + tmpMessage.OperationId);
					tmpSelf.markCancelled(tmpMessage.OperationId);
					tmpSelf.broadcastCancelled(tmpMessage.OperationId);
					return;
				}
			});

		pSocket.on('close', () =>
			{
				tmpSelf._clients.delete(pSocket);
				tmpSelf.fable.log.info('[OpBroadcast] client disconnected (' + tmpSelf._clients.size + ' total)');
			});

		pSocket.on('error', (pError) =>
			{
				tmpSelf.fable.log.warn('[OpBroadcast] client socket error: ' + pError.message);
				tmpSelf._clients.delete(pSocket);
			});

		this._send(pSocket, { Type: 'hello', ServerTime: new Date().toISOString() });
	}

	_send(pSocket, pMessage)
	{
		try
		{
			if (pSocket.readyState === libWs.OPEN)
			{
				pSocket.send(JSON.stringify(pMessage));
			}
		}
		catch (pError) { /* socket likely closed */ }
	}

	_broadcast(pMessage)
	{
		if (this._clients.size === 0) { return; }
		let tmpBody = JSON.stringify(pMessage);
		for (let tmpSocket of this._clients)
		{
			try
			{
				if (tmpSocket.readyState === libWs.OPEN)
				{
					tmpSocket.send(tmpBody);
				}
			}
			catch (pError) { /* ignore individual errors */ }
		}
	}

	// ─────────────────────────────────────────────
	//  Broadcast helpers
	// ─────────────────────────────────────────────

	broadcastStart(pOperationId, pPayload)
	{
		if (!pOperationId) { return; }
		this._broadcast(Object.assign({}, pPayload || {},
			{
				Type: 'start',
				OperationId: pOperationId,
			}));
	}

	broadcastStdout(pOperationId, pChannel, pText)
	{
		if (!pOperationId) { return; }
		this._broadcast(
			{
				Type: 'stdout',
				OperationId: pOperationId,
				Channel: pChannel || 'stdout',
				Text: pText || '',
			});
	}

	broadcastProgress(pOperationId, pPayload)
	{
		if (!pOperationId) { return; }
		this._broadcast(Object.assign({}, pPayload || {},
			{
				Type: 'progress',
				OperationId: pOperationId,
			}));
	}

	broadcastComplete(pOperationId, pResult)
	{
		if (!pOperationId) { return; }
		let tmpMessage = { Type: 'complete', OperationId: pOperationId };
		if (pResult)
		{
			if (typeof pResult.ExitCode === 'number') { tmpMessage.ExitCode = pResult.ExitCode; }
			if (typeof pResult.ElapsedMs === 'number') { tmpMessage.ElapsedMs = pResult.ElapsedMs; }
			if (typeof pResult.Duration === 'string') { tmpMessage.Duration = pResult.Duration; }
			if (typeof pResult.LineCount === 'number') { tmpMessage.LineCount = pResult.LineCount; }
		}
		this._broadcast(tmpMessage);
		this._cancelled.delete(pOperationId);
	}

	broadcastError(pOperationId, pError)
	{
		if (!pOperationId) { return; }
		let tmpErrorText = pError
			? (typeof pError === 'string' ? pError : (pError.message || pError.Message || 'Unknown error'))
			: 'Unknown error';
		this._broadcast({ Type: 'error', OperationId: pOperationId, Error: tmpErrorText });
		this._cancelled.delete(pOperationId);
	}

	broadcastCancelled(pOperationId)
	{
		if (!pOperationId) { return; }
		this._broadcast({ Type: 'cancelled', OperationId: pOperationId });
	}

	// ─────────────────────────────────────────────
	//  Cancellation registry
	// ─────────────────────────────────────────────

	markCancelled(pOperationId)
	{
		if (!pOperationId) { return; }
		this._cancelled.set(pOperationId, Date.now());
	}

	isCancelled(pOperationId)
	{
		if (!pOperationId) { return false; }
		return this._cancelled.has(pOperationId);
	}

	_cleanupCancelled()
	{
		let tmpNow = Date.now();
		for (let tmpEntry of this._cancelled)
		{
			if (tmpNow - tmpEntry[1] > CANCELLED_TTL_MS)
			{
				this._cancelled.delete(tmpEntry[0]);
			}
		}
	}
}

module.exports = ManagerOperationBroadcaster;
module.exports.WS_PATH = WS_PATH;
