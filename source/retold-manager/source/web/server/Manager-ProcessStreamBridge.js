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

		this._bindEvents();
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

				tmpSelf.broadcaster.broadcastComplete(pEvent.OperationId,
					{
						ExitCode: pEvent.ExitCode,
						ElapsedMs: pEvent.ElapsedMs,
						Duration: pEvent.Duration,
						LineCount: pEvent.LineCount,
					});
				tmpSelf._meta.delete(pEvent.OperationId);
			});

		this.processRunner.on('error', (pEvent) =>
			{
				tmpSelf.broadcaster.broadcastError(pEvent.OperationId, pEvent.Message || 'process error');
				tmpSelf._meta.delete(pEvent.OperationId);
			});
	}

	getMeta(pOperationId)
	{
		return this._meta.get(pOperationId) || null;
	}
}

module.exports = ProcessStreamBridge;
