/**
 * Retold Manager -- Process Runner (core)
 *
 * Transport-agnostic wrapper around child_process.spawn. Streams each
 * stdout/stderr line as a structured event; buffers the full output for
 * later replay or search; supports serial command sequences and kill.
 *
 * Consumers (renderers) subscribe to events and translate them into their
 * own output medium — blessed widgets for the TUI, WebSocket frames for
 * the web transport.
 *
 * Events emitted:
 *
 *   'start'           { OperationId, StartedAt, CommandString, Runnable, Cwd,
 *                       Label?, StepIndex, TotalSteps, IsFirstStep }
 *     -- Fires when a command begins. For runSequence(), fires once per step.
 *
 *   'line'            { OperationId, Channel: 'stdout' | 'stderr', Text }
 *     -- One line of output. ANSI codes stripped. No markup. Fires for
 *        *every* captured line so the web transport and operation logger
 *        get a complete transcript. Heavy renderers (the blessed TUI)
 *        watch for 'buffer-start' as the signal to stop appending to
 *        their widget and wait for 'buffer-flush' at the end.
 *
 *   'buffer-start'    { OperationId, LineCount }
 *     -- Fires once when cumulative output crosses HEAD_LINE_LIMIT. A
 *        hint to UI renderers that further live updates will be costly;
 *        they may switch to a status-only view until 'buffer-flush'.
 *
 *   'buffer-tick'     { OperationId, LineCount }
 *     -- Throttled progress counter once buffering mode is active.
 *
 *   'end'             { OperationId, StepIndex, TotalSteps, ExitCode,
 *                       ElapsedMs, Duration, LineCount, IsLastStep }
 *     -- Fires when each step completes. IsLastStep true means the whole
 *        run() / runSequence() operation is over; the renderer should
 *        emit its final summary.
 *
 *   'error'           { OperationId, StepIndex, TotalSteps, Message, Error,
 *                       ElapsedMs, Duration, IsLastStep }
 *     -- A spawn error or process 'error' event.
 *
 *   'buffer-flush'    { OperationId }
 *     -- Emitted once at end if buffering was engaged, so the renderer can
 *        pull getBuffer() and replace its display with the full log.
 *
 * Single-active semantics: only one operation runs at a time. Starting a
 * new one (run or runSequence) kills the current one first. This mirrors
 * today's behavior. OperationId is optional; the runner generates one if
 * not supplied.
 */

const libChildProcess = require('child_process');
const libEventEmitter = require('events').EventEmitter;

// Regex to strip ANSI escape codes (covers standard, 256-color, and truecolor)
const ANSI_REGEX = /\x1B(?:\[[0-9;]*[a-zA-Z]|\].*?(?:\x07|\x1B\\)|\([B0])/g;

// Lines to emit live at the start of a run before switching to buffer-only
const HEAD_LINE_LIMIT = 80;

// Minimum ms between 'buffer-tick' events while buffering
const BUFFER_TICK_MS = 250;

// Simple op-id generator
let _nextOpId = 0;
function newOpId()
{
	_nextOpId++;
	return 'op_' + Date.now().toString(36) + '_' + _nextOpId.toString(36);
}

// ─────────────────────────────────────────────
//  Duration helper
// ─────────────────────────────────────────────

function formatDuration(pMilliseconds)
{
	let tmpSeconds = Math.floor(pMilliseconds / 1000);
	let tmpMs = pMilliseconds % 1000;

	if (tmpSeconds < 60)
	{
		return `${tmpSeconds}.${String(tmpMs).padStart(3, '0').slice(0, 1)}s`;
	}

	let tmpMinutes = Math.floor(tmpSeconds / 60);
	tmpSeconds = tmpSeconds % 60;

	if (tmpMinutes < 60)
	{
		return `${tmpMinutes}m ${tmpSeconds}s`;
	}

	let tmpHours = Math.floor(tmpMinutes / 60);
	tmpMinutes = tmpMinutes % 60;
	return `${tmpHours}h ${tmpMinutes}m ${tmpSeconds}s`;
}

// ─────────────────────────────────────────────
//  Runner
// ─────────────────────────────────────────────

class ProcessRunner extends libEventEmitter
{
	/**
	 * @param {object} [pOptions]
	 * @param {object} [pOptions.log] - Optional fable-log instance for activity logging.
	 */
	constructor(pOptions)
	{
		super();
		let tmpOptions = pOptions || {};
		this.log = tmpOptions.log || null;

		// Active process state
		this.activeProcess = null;
		this.activeOperationId = null;

		// Per-operation buffers. Each entry: { Lines: [{Channel, Text}], StartedAt, LineCount }
		// Kept as a Map so the web transport can serve /operations/:id/output.
		this._buffers = new Map();

		// Head-vs-buffering state for the active op
		this._headLineCount = 0;
		this._buffering = false;
		this._bufferTickTimer = null;

		// Step tracking for runSequence
		this._stepIndex = 0;
		this._totalSteps = 1;
		this._sequenceStartTime = null;

		// Timer for the individual step
		this._stepStartTime = null;
	}

	// ─────────────────────────────────────────────
	//  Public API
	// ─────────────────────────────────────────────

	/**
	 * Run a single command in the given working directory.
	 * Kills any currently running operation first.
	 *
	 * @param {object} pOptions
	 * @param {string}   [pOptions.OperationId]  Pre-assigned id; generated if omitted.
	 * @param {string}   pOptions.Command        e.g. 'npm'
	 * @param {string[]} pOptions.Args           e.g. ['test']
	 * @param {string}   pOptions.Cwd            Working directory.
	 * @param {object}   [pOptions.Env]          Extra env vars merged on top of process.env + NO_COLOR defaults.
	 * @param {string}   [pOptions.Label]        Human label; passed through in events.
	 * @returns {string} The OperationId.
	 */
	run(pOptions)
	{
		let tmpOptions = pOptions || {};
		let tmpOpId = tmpOptions.OperationId || newOpId();

		this.kill();
		this._beginOperation(tmpOpId);
		this._totalSteps = 1;
		this._stepIndex = 0;
		this._sequenceStartTime = Date.now();

		this._runOneCommand(
			{
				OperationId: tmpOpId,
				Command: tmpOptions.Command,
				Args: tmpOptions.Args || [],
				Cwd: tmpOptions.Cwd,
				Env: tmpOptions.Env,
				Label: tmpOptions.Label,
			},
			0,
			1,
			(pResult) =>
			{
				this._finishOperation(tmpOpId);
			}
		);

		return tmpOpId;
	}

	/**
	 * Run a sequence of commands serially in the same working directory.
	 *
	 * @param {object} pOptions
	 * @param {string} [pOptions.OperationId]
	 * @param {string} pOptions.Cwd
	 * @param {Array}  pOptions.Steps  Array of { Command, Args, Label? } (or legacy {command, args, label}).
	 * @returns {string} The OperationId.
	 */
	runSequence(pOptions)
	{
		let tmpOptions = pOptions || {};
		let tmpOpId = tmpOptions.OperationId || newOpId();
		let tmpSteps = this._normalizeSteps(tmpOptions.Steps || []);

		this.kill();
		this._beginOperation(tmpOpId);
		this._totalSteps = tmpSteps.length;
		this._stepIndex = 0;
		this._sequenceStartTime = Date.now();

		let tmpSelf = this;
		let fRunNext = function ()
		{
			if (tmpSelf.activeOperationId !== tmpOpId)
			{
				// A newer operation has taken over — stop this chain.
				return;
			}
			if (tmpSelf._stepIndex >= tmpSteps.length)
			{
				tmpSelf._finishOperation(tmpOpId);
				return;
			}

			let tmpStep = tmpSteps[tmpSelf._stepIndex];
			tmpSelf._runOneCommand(
				{
					OperationId: tmpOpId,
					Command: tmpStep.Command,
					Args: tmpStep.Args,
					Cwd: tmpOptions.Cwd,
					Env: tmpOptions.Env,
					Label: tmpStep.Label,
				},
				tmpSelf._stepIndex,
				tmpSteps.length,
				function ()
				{
					tmpSelf._stepIndex++;
					fRunNext();
				}
			);
		};

		fRunNext();
		return tmpOpId;
	}

	/**
	 * Kill the active process, if any. Optionally scoped to a specific opId;
	 * if the scope doesn't match the active op, this is a no-op.
	 */
	kill(pOperationId)
	{
		if (this._bufferTickTimer)
		{
			clearTimeout(this._bufferTickTimer);
			this._bufferTickTimer = null;
		}

		if (!this.activeProcess) { return; }
		if (pOperationId && pOperationId !== this.activeOperationId) { return; }

		try { this.activeProcess.kill('SIGTERM'); }
		catch (pError) { /* already dead */ }

		this.activeProcess = null;
	}

	isRunning(pOperationId)
	{
		if (pOperationId) { return this.activeOperationId === pOperationId && this.activeProcess !== null; }
		return this.activeProcess !== null;
	}

	getActiveOperationId()
	{
		return this.activeOperationId;
	}

	/**
	 * Returns the raw buffer for an operation. Each entry is {Channel, Text}.
	 * Channel is 'stdout' or 'stderr'. Available after any line has been
	 * captured, including mid-run.
	 */
	getBuffer(pOperationId)
	{
		let tmpOp = this._buffers.get(pOperationId);
		return tmpOp ? tmpOp.Lines : [];
	}

	hasBuffer(pOperationId)
	{
		let tmpId = pOperationId || this.activeOperationId;
		if (!tmpId) { return false; }
		let tmpOp = this._buffers.get(tmpId);
		return tmpOp ? tmpOp.Lines.length > 0 : false;
	}

	/**
	 * Search a buffered operation's output. Returns plain data; renderers
	 * format. Case-insensitive substring match.
	 *
	 * @returns {{Query, Matches:[{Index, Text, Channel}], Total}}
	 */
	search(pOperationId, pQuery)
	{
		let tmpOp = this._buffers.get(pOperationId);
		if (!tmpOp || !pQuery)
		{
			return { Query: pQuery || '', Matches: [], Total: 0 };
		}

		let tmpQueryLower = pQuery.toLowerCase();
		let tmpMatches = [];
		for (let i = 0; i < tmpOp.Lines.length; i++)
		{
			if (tmpOp.Lines[i].Text.toLowerCase().indexOf(tmpQueryLower) !== -1)
			{
				tmpMatches.push({ Index: i, Text: tmpOp.Lines[i].Text, Channel: tmpOp.Lines[i].Channel });
			}
		}
		return { Query: pQuery, Matches: tmpMatches, Total: tmpOp.Lines.length };
	}

	/**
	 * Drop an operation's buffer (e.g., to free memory when done).
	 */
	clearBuffer(pOperationId)
	{
		this._buffers.delete(pOperationId);
	}

	/**
	 * Expose the duration formatter so renderers can format 'end' events
	 * consistently without duplicating the helper.
	 */
	formatDuration(pMs)
	{
		return formatDuration(pMs);
	}

	// ─────────────────────────────────────────────
	//  Internal
	// ─────────────────────────────────────────────

	_normalizeSteps(pSteps)
	{
		let tmpResult = [];
		for (let i = 0; i < pSteps.length; i++)
		{
			let tmpStep = pSteps[i];
			tmpResult.push(
				{
					Command: tmpStep.Command || tmpStep.command,
					Args:    tmpStep.Args    || tmpStep.args || [],
					Label:   tmpStep.Label   || tmpStep.label,
				});
		}
		return tmpResult;
	}

	_beginOperation(pOpId)
	{
		this.activeOperationId = pOpId;
		this._headLineCount = 0;
		this._buffering = false;

		this._buffers.set(pOpId,
			{
				Lines: [],
				StartedAt: Date.now(),
				LineCount: 0,
			});
	}

	_finishOperation(pOpId)
	{
		if (this._bufferTickTimer)
		{
			clearTimeout(this._bufferTickTimer);
			this._bufferTickTimer = null;
		}
		if (this._buffering)
		{
			// Tell the renderer "here's the full transcript now" so it can
			// swap its streamed view for the complete buffer if it wants.
			this.emit('buffer-flush', { OperationId: pOpId });
		}
		// Active process has already been nulled by the close handler.
		this.activeProcess = null;
		this.activeOperationId = null;
	}

	_appendLine(pOpId, pChannel, pText)
	{
		let tmpOp = this._buffers.get(pOpId);
		if (!tmpOp) { return; }

		let tmpEntry = { Channel: pChannel, Text: pText };
		tmpOp.Lines.push(tmpEntry);
		tmpOp.LineCount = tmpOp.Lines.length;

		// Emit every line so the operation logger and web transport capture
		// the complete transcript. The blessed TUI is responsible for
		// throttling itself via the 'buffer-start' / 'buffer-flush' signals.
		this.emit('line', { OperationId: pOpId, Channel: pChannel, Text: pText });

		if (!this._buffering)
		{
			this._headLineCount++;
			if (this._headLineCount >= HEAD_LINE_LIMIT)
			{
				this._buffering = true;
				this.emit('buffer-start', { OperationId: pOpId, LineCount: tmpOp.LineCount });
			}
		}
		else
		{
			// Buffering mode — throttle ticks so renderers can update a
			// "(N lines)" indicator without re-rendering on every line.
			if (!this._bufferTickTimer)
			{
				let tmpSelf = this;
				this._bufferTickTimer = setTimeout(function ()
					{
						tmpSelf._bufferTickTimer = null;
						let tmpBuffered = tmpSelf._buffers.get(pOpId);
						if (tmpBuffered)
						{
							tmpSelf.emit('buffer-tick', { OperationId: pOpId, LineCount: tmpBuffered.LineCount });
						}
					}, BUFFER_TICK_MS);
			}
		}
	}

	_runOneCommand(pStep, pStepIndex, pTotalSteps, pAfter)
	{
		let tmpCommandString = pStep.Command + ' ' + pStep.Args.join(' ');
		let tmpRunnable = `cd ${pStep.Cwd} && ${tmpCommandString}`;
		this._stepStartTime = Date.now();

		if (this.log) { this.log.info(`START  ${tmpRunnable}`); }

		this.emit('start',
			{
				OperationId: pStep.OperationId,
				StartedAt: this._stepStartTime,
				CommandString: tmpCommandString,
				Runnable: tmpRunnable,
				Cwd: pStep.Cwd,
				Label: pStep.Label || null,
				StepIndex: pStepIndex,
				TotalSteps: pTotalSteps,
				IsFirstStep: (pStepIndex === 0),
			});

		let tmpProcess;
		try
		{
			tmpProcess = libChildProcess.spawn(pStep.Command, pStep.Args,
				{
					cwd: pStep.Cwd,
					shell: true,
					env: Object.assign({}, process.env, { NO_COLOR: '1', FORCE_COLOR: '0' }, pStep.Env || {})
				});
		}
		catch (pError)
		{
			let tmpElapsed = Date.now() - this._stepStartTime;
			this.emit('error',
				{
					OperationId: pStep.OperationId,
					StepIndex: pStepIndex,
					TotalSteps: pTotalSteps,
					Message: pError.message,
					Error: pError,
					ElapsedMs: tmpElapsed,
					Duration: formatDuration(tmpElapsed),
					IsLastStep: (pStepIndex === pTotalSteps - 1),
				});
			if (pAfter) { pAfter({ Error: pError }); }
			return;
		}

		this.activeProcess = tmpProcess;

		let tmpSelf = this;
		let fHandleChunk = function (pChannel)
		{
			return function (pData)
			{
				let tmpLines = pData.toString().split('\n');
				for (let i = 0; i < tmpLines.length; i++)
				{
					if (tmpLines[i].length > 0)
					{
						let tmpLine = tmpLines[i].replace(ANSI_REGEX, '');
						tmpSelf._appendLine(pStep.OperationId, pChannel, tmpLine);
					}
				}
			};
		};

		tmpProcess.stdout.on('data', fHandleChunk('stdout'));
		tmpProcess.stderr.on('data', fHandleChunk('stderr'));

		tmpProcess.on('close', (pCode) =>
		{
			tmpSelf.activeProcess = null;
			let tmpElapsed = Date.now() - tmpSelf._stepStartTime;
			let tmpDuration = formatDuration(tmpElapsed);

			if (tmpSelf.log)
			{
				let tmpState = (pCode === 0) ? 'OK' : `FAIL(${pCode})`;
				tmpSelf.log.logTimeDeltaRelativeHuman(tmpSelf._stepStartTime, `${tmpState}  ${tmpRunnable}`);
			}

			let tmpBuffer = tmpSelf._buffers.get(pStep.OperationId);
			tmpSelf.emit('end',
				{
					OperationId: pStep.OperationId,
					StepIndex: pStepIndex,
					TotalSteps: pTotalSteps,
					ExitCode: pCode,
					ElapsedMs: tmpElapsed,
					Duration: tmpDuration,
					LineCount: tmpBuffer ? tmpBuffer.LineCount : 0,
					IsLastStep: (pStepIndex === pTotalSteps - 1),
				});

			if (pAfter) { pAfter({ ExitCode: pCode, ElapsedMs: tmpElapsed }); }
		});

		tmpProcess.on('error', (pError) =>
		{
			tmpSelf.activeProcess = null;
			let tmpElapsed = Date.now() - tmpSelf._stepStartTime;
			let tmpDuration = formatDuration(tmpElapsed);

			if (tmpSelf.log)
			{
				tmpSelf.log.logTimeDeltaRelativeHuman(tmpSelf._stepStartTime, `ERROR  ${tmpRunnable}  ${pError.message}`);
			}

			tmpSelf.emit('error',
				{
					OperationId: pStep.OperationId,
					StepIndex: pStepIndex,
					TotalSteps: pTotalSteps,
					Message: pError.message,
					Error: pError,
					ElapsedMs: tmpElapsed,
					Duration: tmpDuration,
					IsLastStep: (pStepIndex === pTotalSteps - 1),
				});

			if (pAfter) { pAfter({ Error: pError, ElapsedMs: tmpElapsed }); }
		});
	}
}

module.exports = ProcessRunner;
module.exports.formatDuration = formatDuration;
module.exports.HEAD_LINE_LIMIT = HEAD_LINE_LIMIT;
