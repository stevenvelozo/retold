/**
 * Retold Manager -- Process Runner
 *
 * Wraps child_process.spawn to run commands in a module directory and
 * stream output to a blessed log widget.
 */

const libChildProcess = require('child_process');

// Regex to strip ANSI escape codes (covers standard, 256-color, and truecolor sequences)
const ANSI_REGEX = /\x1B(?:\[[0-9;]*[a-zA-Z]|\].*?(?:\x07|\x1B\\)|\([B0])/g;

// Lines to show live at the start of a run before switching to buffer-only mode
const HEAD_LINE_LIMIT = 80;

// Minimum milliseconds between screen renders during streaming output
const RENDER_THROTTLE_MS = 50;

// Minimum milliseconds between status-bar updates while buffering
const STATUS_THROTTLE_MS = 250;

class ProcessRunner
{
	/**
	 * @param {object} pLogWidget - A blessed.log widget instance.
	 * @param {object} pScreen - The blessed screen instance.
	 * @param {function} pStatusCallback - Called with (pState, pMessage) for status updates.
	 * @param {object} pLog - A fable-log instance for activity logging.
	 */
	constructor(pLogWidget, pScreen, pStatusCallback, pLog)
	{
		this.logWidget = pLogWidget;
		this.screen = pScreen;
		this.statusCallback = pStatusCallback || function () {};
		this.log = pLog || null;
		this.activeProcess = null;

		// Render throttle state
		this._renderTimer = null;
		this._renderPending = false;

		// Output buffering: all lines go into _outputBuffer.
		// The first HEAD_LINE_LIMIT lines are also sent live to the widget.
		// After that, lines accumulate in the buffer only.
		// On completion, the full buffer is loaded into the widget for scrolling.
		this._outputBuffer = [];
		this._headLineCount = 0;
		this._buffering = false;

		// Throttle for status-bar line-count updates while buffering
		this._statusTimer = null;

		// Timer for measuring operation duration
		this._operationStartTime = null;
		this._operationCommand = '';
	}

	/**
	 * Format elapsed milliseconds into a human-readable duration string.
	 * Examples: "1.2s", "1m 23s", "2h 5m 12s"
	 *
	 * @param {number} pMilliseconds - Elapsed time in milliseconds.
	 * @returns {string} Formatted duration.
	 */
	_formatDuration(pMilliseconds)
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

	/**
	 * Schedule a screen render, throttled to avoid hammering blessed
	 * on fast-streaming output.
	 */
	_scheduleRender()
	{
		if (this._renderTimer)
		{
			this._renderPending = true;
			return;
		}

		this.screen.render();

		this._renderTimer = setTimeout(() =>
		{
			this._renderTimer = null;
			if (this._renderPending)
			{
				this._renderPending = false;
				this.screen.render();
			}
		}, RENDER_THROTTLE_MS);
	}

	/**
	 * Buffer a line and, if we are still in the head phase, also send it
	 * to the widget for live display.  Once HEAD_LINE_LIMIT is reached
	 * we switch to buffer-only mode and periodically update the status bar
	 * with the running line count.
	 *
	 * @param {string} pLine - The already-escaped line to log.
	 */
	_logLine(pLine)
	{
		this._outputBuffer.push(pLine);

		if (!this._buffering)
		{
			// Still in the live-output head phase
			this._headLineCount++;
			this.logWidget.log(pLine);
			this._scheduleRender();

			if (this._headLineCount >= HEAD_LINE_LIMIT)
			{
				this._buffering = true;
				this.logWidget.log('');
				this.logWidget.log('{yellow-fg}{bold}... buffering remaining output (scrollable when complete){/bold}{/yellow-fg}');
				this._scheduleRender();
			}
		}
		else
		{
			// Buffer-only mode -- no widget writes, no screen renders.
			// Just update the status bar periodically so the user sees progress.
			if (!this._statusTimer)
			{
				this._statusTimer = setTimeout(() =>
				{
					this._statusTimer = null;
					this.statusCallback('running', `${this._operationCommand}  (${this._outputBuffer.length} lines)`);
				}, STATUS_THROTTLE_MS);
			}
		}
	}

	/**
	 * After the process exits, load the full output buffer into the widget
	 * so the user can scroll through everything.  Uses a single setContent()
	 * call to avoid per-line rendering overhead.
	 */
	_flushBuffer()
	{
		if (!this._buffering)
		{
			// Everything was already displayed live -- nothing to flush
			return;
		}

		// Build the full content as one string and set it in a single call
		this.logWidget.setContent(this._outputBuffer.join('\n'));

		// Scroll to the bottom so the user sees the tail / completion block
		this.logWidget.setScrollPerc(100);
	}

	/**
	 * Run a command in the given working directory.
	 * Kills any currently running process first.
	 *
	 * Output strategy: the first HEAD_LINE_LIMIT lines are displayed live.
	 * After that, lines buffer in memory (no widget pressure).  When the
	 * process exits the full buffer is loaded into the widget for scrolling.
	 *
	 * @param {string} pCommand - The command to run (e.g. 'npm', 'git').
	 * @param {Array} pArgs - Arguments array (e.g. ['test']).
	 * @param {string} pCwd - Working directory for the command.
	 * @param {number} pLineLimit - (ignored, kept for API compat).
	 * @param {object} pOptions - Optional settings: { append: true } to keep existing widget content.
	 */
	run(pCommand, pArgs, pCwd, pLineLimit, pOptions)
	{
		// Kill any running process first
		this.kill();

		// Reset buffer state for this run
		this._outputBuffer = [];
		this._headLineCount = 0;
		this._buffering = false;
		if (this._statusTimer)
		{
			clearTimeout(this._statusTimer);
			this._statusTimer = null;
		}

		// Clear any active search state so the new output is not filtered
		this._searchQuery = '';
		this._searchMatches = null;
		this._searchMatchIndex = -1;
		this._searchResultLines = null;

		// Clear the log widget unless caller asked to append
		if (!pOptions || !pOptions.append)
		{
			this.logWidget.setContent('');
		}

		let tmpCommandString = pCommand + ' ' + pArgs.join(' ');
		let tmpRunnable = `cd ${pCwd} && ${tmpCommandString}`;

		this.logWidget.log(`{bold}{cyan-fg}$ ${tmpCommandString}{/cyan-fg}{/bold}`);
		this.logWidget.log(`{gray-fg}  cwd: ${pCwd}{/gray-fg}`);
		this.logWidget.log(`{gray-fg}  run: ${tmpRunnable}{/gray-fg}`);
		this.logWidget.log('');

		this.statusCallback('running', tmpCommandString);

		// Activity log: record the start time
		this._operationCommand = tmpCommandString;
		this._operationCwd = pCwd;
		this._operationStartTime = this.log ? this.log.getTimeStamp() : Date.now();
		if (this.log)
		{
			this.log.info(`START  ${tmpRunnable}`);
		}

		let tmpProcess;

		try
		{
			tmpProcess = libChildProcess.spawn(pCommand, pArgs,
				{
					cwd: pCwd,
					shell: true,
					env: Object.assign({}, process.env, { NO_COLOR: '1', FORCE_COLOR: '0' })
				});
		}
		catch (pError)
		{
			this.logWidget.log(`{red-fg}{bold}Failed to start process: ${pError.message}{/red-fg}{/bold}`);
			this.statusCallback('error', pError.message);
			this.screen.render();
			return;
		}

		this.activeProcess = tmpProcess;

		tmpProcess.stdout.on('data', (pData) =>
		{
			let tmpLines = pData.toString().split('\n');
			for (let i = 0; i < tmpLines.length; i++)
			{
				if (tmpLines[i].length > 0)
				{
					// Strip ANSI codes then escape curly braces so blessed
					// doesn't try to parse them as markup tags
					let tmpLine = tmpLines[i].replace(ANSI_REGEX, '').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
					this._logLine(tmpLine);
				}
			}
		});

		tmpProcess.stderr.on('data', (pData) =>
		{
			let tmpLines = pData.toString().split('\n');
			for (let i = 0; i < tmpLines.length; i++)
			{
				if (tmpLines[i].length > 0)
				{
					let tmpLine = tmpLines[i].replace(ANSI_REGEX, '').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
					this._logLine(`{red-fg}${tmpLine}{/red-fg}`);
				}
			}
		});

		tmpProcess.on('close', (pCode) =>
		{
			this.activeProcess = null;

			// Compute elapsed time
			let tmpElapsed = this._operationStartTime ? (Date.now() - this._operationStartTime) : 0;
			let tmpDuration = this._formatDuration(tmpElapsed);

			// Activity log: record the result and duration
			if (this.log && this._operationStartTime)
			{
				let tmpState = (pCode === 0) ? 'OK' : `FAIL(${pCode})`;
				this.log.logTimeDeltaRelativeHuman(this._operationStartTime, `${tmpState}  ${tmpRunnable}`);
				this._operationStartTime = null;
			}

			// Flush the full buffer into the widget so the user can scroll
			this._flushBuffer();

			// Consistent completion block
			this.logWidget.log('');
			this.logWidget.log('{bold}────────────────────────────────────────{/bold}');
			let tmpLineNote = this._outputBuffer.length > HEAD_LINE_LIMIT
				? `  {gray-fg}(${this._outputBuffer.length} lines){/gray-fg}`
				: '';
			if (pCode === 0)
			{
				this.logWidget.log(`{green-fg}{bold}✓ Done{/bold}  ${tmpCommandString}  ({bold}${tmpDuration}{/bold}){/green-fg}${tmpLineNote}`);
				this.statusCallback('success', `${tmpCommandString} -- ${tmpDuration}`);
			}
			else
			{
				this.logWidget.log(`{red-fg}{bold}✗ Failed (exit ${pCode}){/bold}  ${tmpCommandString}  ({bold}${tmpDuration}{/bold}){/red-fg}${tmpLineNote}`);
				this.statusCallback('error', `${tmpCommandString} -- exit ${pCode} (${tmpDuration})`);
			}
			this.logWidget.setScrollPerc(100);
			this.screen.render();
		});

		tmpProcess.on('error', (pError) =>
		{
			this.activeProcess = null;
			let tmpElapsed = this._operationStartTime ? (Date.now() - this._operationStartTime) : 0;
			let tmpDuration = this._formatDuration(tmpElapsed);
			if (this.log && this._operationStartTime)
			{
				this.log.logTimeDeltaRelativeHuman(this._operationStartTime, `ERROR  ${tmpRunnable}  ${pError.message}`);
				this._operationStartTime = null;
			}
			this.logWidget.log('');
			this.logWidget.log('{bold}────────────────────────────────────────{/bold}');
			this.logWidget.log(`{red-fg}{bold}✗ Error{/bold}  ${pError.message}  ({bold}${tmpDuration}{/bold}){/red-fg}`);
			this.statusCallback('error', `${pError.message} (${tmpDuration})`);
			this.screen.render();
		});
	}

	/**
	 * Run a sequence of commands in order, appending output from each
	 * into the same log widget with separator headers between them.
	 *
	 * @param {Array} pCommands - Array of { command, args, label } objects.
	 * @param {string} pCwd - Working directory for all commands.
	 */
	runSequence(pCommands, pCwd)
	{
		// Kill any running process first
		this.kill();

		// Reset buffer state for this sequence
		this._outputBuffer = [];
		this._headLineCount = 0;
		this._buffering = false;
		if (this._statusTimer)
		{
			clearTimeout(this._statusTimer);
			this._statusTimer = null;
		}

		// Clear any active search state so the new output is not filtered
		this._searchQuery = '';
		this._searchMatches = null;
		this._searchMatchIndex = -1;
		this._searchResultLines = null;

		// Clear the log widget
		this.logWidget.setContent('');

		this.statusCallback('running', pCommands[0].label || (pCommands[0].command + ' ' + pCommands[0].args.join(' ')));

		let tmpRunIndex = 0;
		let tmpSelf = this;
		let tmpSequenceStartTime = Date.now();

		let fRunNext = function ()
		{
			if (tmpRunIndex >= pCommands.length)
			{
				let tmpTotalElapsed = Date.now() - tmpSequenceStartTime;
				let tmpTotalDuration = tmpSelf._formatDuration(tmpTotalElapsed);
				tmpSelf.logWidget.log('');
				tmpSelf.logWidget.log('{bold}────────────────────────────────────────{/bold}');
				tmpSelf.logWidget.log(`{green-fg}{bold}✓ Done{/bold}  ${pCommands.length} commands  ({bold}${tmpTotalDuration}{/bold}){/green-fg}`);
				tmpSelf.statusCallback('success', `Sequence complete -- ${tmpTotalDuration}`);
				tmpSelf.screen.render();
				return;
			}

			let tmpCmd = pCommands[tmpRunIndex];
			let tmpCommandString = tmpCmd.command + ' ' + tmpCmd.args.join(' ');
			let tmpRunnable = `cd ${pCwd} && ${tmpCommandString}`;

			if (tmpRunIndex > 0)
			{
				tmpSelf.logWidget.log('');
				tmpSelf.logWidget.log('{bold}{blue-fg}────────────────────────────────────────{/blue-fg}{/bold}');
				tmpSelf.logWidget.log('');
			}

			if (tmpCmd.label)
			{
				tmpSelf.logWidget.log(`{bold}{yellow-fg}${tmpCmd.label}{/yellow-fg}{/bold}`);
			}
			tmpSelf.logWidget.log(`{bold}{cyan-fg}$ ${tmpCommandString}{/cyan-fg}{/bold}`);
			tmpSelf.logWidget.log(`{gray-fg}  cwd: ${pCwd}{/gray-fg}`);
			tmpSelf.logWidget.log(`{gray-fg}  run: ${tmpRunnable}{/gray-fg}`);
			tmpSelf.logWidget.log('');
			tmpSelf.screen.render();

			// Activity log: record the step start time
			let tmpStepStartTime = tmpSelf.log ? tmpSelf.log.getTimeStamp() : Date.now();
			if (tmpSelf.log)
			{
				tmpSelf.log.info(`START  ${tmpRunnable}`);
			}

			let tmpProcess;

			try
			{
				tmpProcess = libChildProcess.spawn(tmpCmd.command, tmpCmd.args,
					{
						cwd: pCwd,
						shell: true,
						env: Object.assign({}, process.env, { NO_COLOR: '1', FORCE_COLOR: '0' })
					});
			}
			catch (pError)
			{
				tmpSelf.logWidget.log(`{red-fg}{bold}Failed to start: ${pError.message}{/red-fg}{/bold}`);
				tmpSelf.statusCallback('error', pError.message);
				tmpSelf.screen.render();
				return;
			}

			tmpSelf.activeProcess = tmpProcess;

			tmpProcess.stdout.on('data', (pData) =>
			{
				let tmpLines = pData.toString().split('\n');
				for (let i = 0; i < tmpLines.length; i++)
				{
					if (tmpLines[i].length > 0)
					{
						let tmpLine = tmpLines[i].replace(ANSI_REGEX, '').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
						tmpSelf._logLine(tmpLine);
					}
				}
			});

			tmpProcess.stderr.on('data', (pData) =>
			{
				let tmpLines = pData.toString().split('\n');
				for (let i = 0; i < tmpLines.length; i++)
				{
					if (tmpLines[i].length > 0)
					{
						let tmpLine = tmpLines[i].replace(ANSI_REGEX, '').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
						tmpSelf._logLine(`{red-fg}${tmpLine}{/red-fg}`);
					}
				}
			});

			tmpProcess.on('close', (pCode) =>
			{
				tmpSelf.activeProcess = null;

				// Compute step elapsed time
				let tmpStepElapsed = tmpStepStartTime ? (Date.now() - tmpStepStartTime) : 0;
				let tmpStepDuration = tmpSelf._formatDuration(tmpStepElapsed);

				if (tmpSelf.log && tmpStepStartTime)
				{
					let tmpState = (pCode === 0) ? 'OK' : `FAIL(${pCode})`;
					tmpSelf.log.logTimeDeltaRelativeHuman(tmpStepStartTime, `${tmpState}  ${tmpRunnable}`);
				}

				// Per-step completion line
				if (pCode === 0)
				{
					tmpSelf.logWidget.log(`{green-fg}  ✓ ${tmpCommandString} ({bold}${tmpStepDuration}{/bold}){/green-fg}`);
				}
				else
				{
					tmpSelf.logWidget.log(`{red-fg}  ✗ ${tmpCommandString} exit ${pCode} ({bold}${tmpStepDuration}{/bold}){/red-fg}`);
				}

				tmpRunIndex++;
				fRunNext();
			});

			tmpProcess.on('error', (pError) =>
			{
				tmpSelf.activeProcess = null;
				if (tmpSelf.log && tmpStepStartTime)
				{
					tmpSelf.log.logTimeDeltaRelativeHuman(tmpStepStartTime, `ERROR  ${tmpRunnable}  ${pError.message}`);
				}
				tmpSelf.logWidget.log(`{red-fg}{bold}Failed: ${pError.message}{/red-fg}{/bold}`);
				tmpSelf.statusCallback('error', pError.message);
				tmpSelf.screen.render();
			});
		};

		fRunNext();
	}

	/**
	 * Kill the currently running process, if any.
	 */
	kill()
	{
		if (this._statusTimer)
		{
			clearTimeout(this._statusTimer);
			this._statusTimer = null;
		}
		if (this.activeProcess)
		{
			this.activeProcess.kill('SIGTERM');
			this.activeProcess = null;
		}
	}

	/**
	 * @returns {boolean} Whether a process is currently running.
	 */
	isRunning()
	{
		return this.activeProcess !== null;
	}

	/**
	 * Search the output buffer for lines matching a query string.
	 * Replaces the widget content with matching lines (with line numbers)
	 * and stores match indices for next/prev navigation.
	 *
	 * @param {string} pQuery - Case-insensitive search string.
	 */
	search(pQuery)
	{
		if (!pQuery)
		{
			return;
		}

		if (this._outputBuffer.length === 0)
		{
			this.logWidget.setContent('{yellow-fg}{bold}No output to search.{/bold}{/yellow-fg}\n\nRun a command first, then search with [/].');
			this.screen.render();
			return;
		}

		this._searchQuery = pQuery;
		this._searchMatches = [];
		// Store individual result lines for navigation rebuilds
		this._searchResultLines = [];

		let tmpQueryLower = pQuery.toLowerCase();

		// Build a regex to highlight matches (escape special regex chars in query)
		let tmpEscaped = pQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		let tmpHighlightRegex = new RegExp(`(${tmpEscaped})`, 'gi');

		for (let i = 0; i < this._outputBuffer.length; i++)
		{
			// Strip blessed markup tags for matching purposes
			let tmpPlain = this._outputBuffer[i].replace(/\{[^}]*\}/g, '');
			if (tmpPlain.toLowerCase().indexOf(tmpQueryLower) !== -1)
			{
				this._searchMatches.push(i);
				let tmpLineNum = String(i + 1).padStart(5, ' ');
				// Highlight the matching text in the display line
				let tmpHighlighted = this._outputBuffer[i].replace(tmpHighlightRegex, '{yellow-fg}{bold}$1{/bold}{/yellow-fg}');
				this._searchResultLines.push(`{gray-fg}${tmpLineNum}:{/gray-fg} ${tmpHighlighted}`);
			}
		}

		this._searchMatchIndex = -1;
		this._renderSearchResults();
	}

	/**
	 * Rebuild and display the search results view.
	 * When a match is selected (via navigation), that line gets a marker.
	 */
	_renderSearchResults()
	{
		let tmpLines = [];

		tmpLines.push(`{bold}Search: "${this._searchQuery}"{/bold}  in ${this._outputBuffer.length} buffered lines`);
		tmpLines.push('');

		for (let i = 0; i < this._searchResultLines.length; i++)
		{
			if (i === this._searchMatchIndex)
			{
				// Current match: cyan background marker
				tmpLines.push(`{cyan-fg}{bold}>>>{/bold}{/cyan-fg} ${this._searchResultLines[i]}`);
			}
			else
			{
				tmpLines.push(`    ${this._searchResultLines[i]}`);
			}
		}

		tmpLines.push('');
		if (this._searchMatches.length === 0)
		{
			tmpLines.push(`{yellow-fg}{bold}No matches found{/bold}{/yellow-fg} for "${this._searchQuery}" in ${this._outputBuffer.length} lines`);
		}
		else
		{
			tmpLines.push(`{bold}${this._searchMatches.length} matches{/bold}  ] next  [ prev`);
		}
		tmpLines.push('[/] search again  [Esc] back to full output');

		this.logWidget.setContent(tmpLines.join('\n'));

		// Scroll so the current match is visible
		if (this._searchMatchIndex >= 0 && this._searchMatches.length > 0)
		{
			// +2 accounts for header lines before the result lines
			let tmpTargetLine = this._searchMatchIndex + 2;
			let tmpTotalLines = tmpLines.length;
			let tmpScrollPerc = Math.max(0, Math.floor((tmpTargetLine / tmpTotalLines) * 100));
			this.logWidget.setScrollPerc(tmpScrollPerc);

			let tmpBufferLineIndex = this._searchMatches[this._searchMatchIndex];
			this.statusCallback('search',
				`Match ${this._searchMatchIndex + 1}/${this._searchMatches.length}  line ${tmpBufferLineIndex + 1}  ] next  [ prev  [/] search  [Esc] done`);
		}
		else
		{
			this.logWidget.setScrollPerc(0);
		}

		this.screen.render();
	}

	/**
	 * Move to the next or previous search match within the results view.
	 *
	 * @param {number} pDirection - 1 for next, -1 for previous.
	 */
	searchNavigate(pDirection)
	{
		if (!this._searchMatches || this._searchMatches.length === 0)
		{
			return;
		}

		this._searchMatchIndex += pDirection;

		// Wrap around
		if (this._searchMatchIndex >= this._searchMatches.length)
		{
			this._searchMatchIndex = 0;
		}
		else if (this._searchMatchIndex < 0)
		{
			this._searchMatchIndex = this._searchMatches.length - 1;
		}

		this._renderSearchResults();
	}

	/**
	 * Exit search mode and restore the full output buffer.
	 */
	searchClear()
	{
		this._searchQuery = '';
		this._searchMatches = null;
		this._searchMatchIndex = -1;
		this._searchResultLines = null;

		if (this._outputBuffer.length > 0)
		{
			this.logWidget.setContent(this._outputBuffer.join('\n'));
			this.logWidget.setScrollPerc(100);
			this.screen.render();
		}
	}

	/**
	 * @returns {boolean} Whether there is a buffer available to search.
	 */
	hasBuffer()
	{
		return this._outputBuffer.length > 0;
	}

	/**
	 * @returns {boolean} Whether we are in search-results mode.
	 */
	isSearchActive()
	{
		return this._searchMatches !== null && this._searchMatches !== undefined && this._searchMatches.length >= 0;
	}
}

module.exports = ProcessRunner;
