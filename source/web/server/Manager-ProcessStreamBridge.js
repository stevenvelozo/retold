/**
 * Retold Manager -- Process Stream Bridge
 *
 * Subscribes to a core ProcessRunner's EventEmitter events and re-emits
 * each one as a WebSocket frame via Manager-OperationBroadcaster. The
 * TUI has a BlessedRenderer that does the same job for blessed widgets;
 * this is the web-transport analogue.
 *
 * One bridge per ProcessRunner — lives for the lifetime of the server.
 */

class ProcessStreamBridge
{
	/**
	 * @param {ProcessRunner} pProcessRunner  Core EventEmitter runner
	 * @param {ManagerOperationBroadcaster} pBroadcaster
	 * @param {object} [pOptions]
	 */
	constructor(pProcessRunner, pBroadcaster, pOptions)
	{
		this.processRunner = pProcessRunner;
		this.broadcaster = pBroadcaster;
		this.options = pOptions || {};

		// Track per-operation metadata for the `complete` frame payload
		this._meta = new Map();

		// Cache of recently-completed operations keyed by OperationId, so a
		// client that missed the lifecycle frame (WS hiccup, throttled tab,
		// late reconnect) can poll `GET /operations/:id` and learn the final
		// state. Kept for ~5 minutes after completion; older entries are
		// pruned lazily on insert.
		this._recentResults = new Map();
		this._recentResultsTtlMs = 5 * 60 * 1000;

		this._bindEvents();
	}

	/**
	 * Returns the recorded result for an operation if it completed within
	 * the recent-results window; null otherwise. Used by the operation
	 * status endpoint to surface terminal state to clients that missed
	 * the lifecycle frame.
	 */
	getRecentResult(pOperationId)
	{
		let tmpEntry = this._recentResults.get(pOperationId);
		if (!tmpEntry) { return null; }
		if (Date.now() - tmpEntry.StoredAt > this._recentResultsTtlMs)
		{
			this._recentResults.delete(pOperationId);
			return null;
		}
		return tmpEntry.Result;
	}

	_rememberResult(pOperationId, pResult)
	{
		this._recentResults.set(pOperationId, { StoredAt: Date.now(), Result: pResult });
		// Lazy prune: keep the map bounded even if no one ever reads it.
		if (this._recentResults.size > 64)
		{
			let tmpNow = Date.now();
			for (let tmpEntry of this._recentResults)
			{
				if (tmpNow - tmpEntry[1].StoredAt > this._recentResultsTtlMs)
				{
					this._recentResults.delete(tmpEntry[0]);
				}
			}
		}
	}

	_bindEvents()
	{
		let tmpSelf = this;

		this.processRunner.on('start', (pEvent) =>
			{
				tmpSelf._meta.set(pEvent.OperationId,
					{
						CommandString: pEvent.CommandString,
						Cwd: pEvent.Cwd,
						Label: pEvent.Label,
						StepIndex: pEvent.StepIndex,
						TotalSteps: pEvent.TotalSteps,
					});

				tmpSelf.broadcaster.broadcastStart(pEvent.OperationId,
					{
						CommandString: pEvent.CommandString,
						Cwd: pEvent.Cwd,
						Label: pEvent.Label || null,
						StartedAt: pEvent.StartedAt,
						StepIndex: pEvent.StepIndex,
						TotalSteps: pEvent.TotalSteps,
						IsFirstStep: pEvent.IsFirstStep,
					});
			});

		this.processRunner.on('line', (pEvent) =>
			{
				tmpSelf.broadcaster.broadcastStdout(pEvent.OperationId, pEvent.Channel, pEvent.Text);
			});

		this.processRunner.on('buffer-start', (pEvent) =>
			{
				tmpSelf.broadcaster.broadcastProgress(pEvent.OperationId,
					{
						Phase: 'buffering',
						Message: 'buffering remaining output (' + pEvent.LineCount + ' lines so far)',
					});
			});

		this.processRunner.on('buffer-tick', (pEvent) =>
			{
				tmpSelf.broadcaster.broadcastProgress(pEvent.OperationId,
					{
						Phase: 'buffering',
						Current: pEvent.LineCount,
						Message: pEvent.LineCount + ' lines buffered',
					});
			});

		this.processRunner.on('buffer-flush', (pEvent) =>
			{
				// No-op over WS — the browser already received every line via
				// `stdout` frames. The TUI uses this to swap its widget to the
				// complete buffer; irrelevant to the web transport.
			});

		this.processRunner.on('end', (pEvent) =>
			{
				// For multi-step sequences, emit a progress frame between steps,
				// and only broadcast `complete` when the last step finishes.
				if (!pEvent.IsLastStep)
				{
					tmpSelf.broadcaster.broadcastProgress(pEvent.OperationId,
						{
							Phase: 'step-complete',
							Current: pEvent.StepIndex + 1,
							Total: pEvent.TotalSteps,
							Message: 'step ' + (pEvent.StepIndex + 1) + ' / ' + pEvent.TotalSteps
								+ ' (' + pEvent.Duration + ', exit ' + pEvent.ExitCode + ')',
						});
					return;
				}

				let tmpCompletePayload =
					{
						ExitCode: pEvent.ExitCode,
						ElapsedMs: pEvent.ElapsedMs,
						Duration: pEvent.Duration,
						LineCount: pEvent.LineCount,
					};
				tmpSelf.broadcaster.broadcastComplete(pEvent.OperationId, tmpCompletePayload);
				tmpSelf._rememberResult(pEvent.OperationId,
					{
						Kind:      'complete',
						ExitCode:  pEvent.ExitCode,
						ElapsedMs: pEvent.ElapsedMs,
						Duration:  pEvent.Duration,
						LineCount: pEvent.LineCount,
						EndedAt:   new Date().toISOString(),
					});
				tmpSelf._meta.delete(pEvent.OperationId);
			});

		this.processRunner.on('error', (pEvent) =>
			{
				let tmpMessage = pEvent.Message || 'process error';
				tmpSelf.broadcaster.broadcastError(pEvent.OperationId, tmpMessage);
				tmpSelf._rememberResult(pEvent.OperationId,
					{
						Kind:    'error',
						Error:   tmpMessage,
						EndedAt: new Date().toISOString(),
					});
				tmpSelf._meta.delete(pEvent.OperationId);
			});
	}

	getMeta(pOperationId)
	{
		return this._meta.get(pOperationId) || null;
	}
}

module.exports = ProcessStreamBridge;
