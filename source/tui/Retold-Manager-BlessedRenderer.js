/**
 * Retold Manager -- Blessed Renderer
 *
 * Subscribes to a core ProcessRunner's events and reproduces the TUI
 * behavior that the old single-file ProcessRunner used to do inline:
 *   - Escape curly braces so blessed doesn't parse them as markup
 *   - Wrap stderr lines in {red-fg}...{/red-fg}
 *   - Stream the first HEAD_LINE_LIMIT lines live; then display a
 *     "buffering…" notice and show a line-count in the status bar
 *   - On completion, load the full buffer into the widget for scrolling
 *   - Draw the cyan/green/red completion blocks with duration
 *   - Drive the status bar via the supplied callback
 *
 * Also hosts the TUI-side search UX (widget content replacement with
 * highlighted matches, next/prev navigation, clear). Search *data* lives
 * in the core; this class just renders it.
 */

// Minimum ms between blessed screen.render() calls during streaming
const RENDER_THROTTLE_MS = 50;
// Minimum ms between status-bar line-count updates while buffering
const STATUS_THROTTLE_MS = 250;

class BlessedRenderer
{
	/**
	 * @param {ProcessRunner} pProcessRunner  Core EventEmitter-based runner.
	 * @param {object} pLogWidget            blessed.log widget instance.
	 * @param {object} pScreen               blessed.screen instance.
	 * @param {function} [pStatusCallback]   Called with (pState, pMessage) for status updates.
	 */
	constructor(pProcessRunner, pLogWidget, pScreen, pStatusCallback)
	{
		this.processRunner = pProcessRunner;
		this.logWidget = pLogWidget;
		this.screen = pScreen;
		this.statusCallback = pStatusCallback || function () {};

		this._renderTimer = null;
		this._renderPending = false;

		// Mirror the op-id most recently reported by the runner so we know
		// whose buffer to pull on flush / completion.
		this._currentOperationId = null;
		this._currentCommandString = '';

		// Once the runner emits 'buffer-start' for the active op we stop
		// appending live lines to the widget (the core still emits them
		// for the web transport and log file). 'buffer-flush' at the end
		// swaps in the full transcript so the user can scroll.
		this._isBuffering = false;

		// Status-bar throttle for "(N lines)" updates while buffering
		this._statusThrottleTimer = null;

		// TUI-side search state (widget presentation only; data lives in core)
		this._searchQuery = '';
		this._searchMatches = null;
		this._searchMatchIndex = -1;
		this._searchResultLines = null;
		this._searchOperationId = null;

		this._bindEvents();
	}

	// ─────────────────────────────────────────────
	//  Event wiring
	// ─────────────────────────────────────────────

	_bindEvents()
	{
		let tmpSelf = this;

		this.processRunner.on('start', (pEvent) => { tmpSelf._onStart(pEvent); });
		this.processRunner.on('line', (pEvent) => { tmpSelf._onLine(pEvent); });
		this.processRunner.on('buffer-start', (pEvent) => { tmpSelf._onBufferStart(pEvent); });
		this.processRunner.on('buffer-tick', (pEvent) => { tmpSelf._onBufferTick(pEvent); });
		this.processRunner.on('buffer-flush', (pEvent) => { tmpSelf._onBufferFlush(pEvent); });
		this.processRunner.on('end', (pEvent) => { tmpSelf._onEnd(pEvent); });
		this.processRunner.on('error', (pEvent) => { tmpSelf._onError(pEvent); });
	}

	// ─────────────────────────────────────────────
	//  Formatting helpers
	// ─────────────────────────────────────────────

	_escape(pText)
	{
		// Escape blessed markup characters. Same trick the original ProcessRunner used.
		return pText.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
	}

	_formatLine(pChannel, pText)
	{
		let tmpEscaped = this._escape(pText);
		if (pChannel === 'stderr')
		{
			return `{red-fg}${tmpEscaped}{/red-fg}`;
		}
		return tmpEscaped;
	}

	_scheduleRender()
	{
		if (this._renderTimer)
		{
			this._renderPending = true;
			return;
		}
		this.screen.render();

		let tmpSelf = this;
		this._renderTimer = setTimeout(function ()
			{
				tmpSelf._renderTimer = null;
				if (tmpSelf._renderPending)
				{
					tmpSelf._renderPending = false;
					tmpSelf.screen.render();
				}
			}, RENDER_THROTTLE_MS);
	}

	// ─────────────────────────────────────────────
	//  Event handlers
	// ─────────────────────────────────────────────

	_onStart(pEvent)
	{
		// At the first step of an operation, clear the widget (unless the
		// caller explicitly asked for append mode — see appendNextRun()).
		if (pEvent.IsFirstStep && !this._appendNextRun)
		{
			this.logWidget.setContent('');
		}
		this._appendNextRun = false;

		this._currentOperationId = pEvent.OperationId;
		this._currentCommandString = pEvent.CommandString;
		this._isBuffering = false;

		// Cancel any prior search so fresh output is not filtered
		this._resetSearch();

		// Sequence-step divider
		if (!pEvent.IsFirstStep)
		{
			this.logWidget.log('');
			this.logWidget.log('{bold}{blue-fg}────────────────────────────────────────{/blue-fg}{/bold}');
			this.logWidget.log('');
		}

		if (pEvent.Label)
		{
			this.logWidget.log(`{bold}{yellow-fg}${pEvent.Label}{/yellow-fg}{/bold}`);
		}

		this.logWidget.log(`{bold}{cyan-fg}$ ${pEvent.CommandString}{/cyan-fg}{/bold}`);
		this.logWidget.log(`{gray-fg}  cwd: ${pEvent.Cwd}{/gray-fg}`);
		this.logWidget.log(`{gray-fg}  run: ${pEvent.Runnable}{/gray-fg}`);
		this.logWidget.log('');

		this.statusCallback('running', pEvent.CommandString);
		this._scheduleRender();
	}

	_onLine(pEvent)
	{
		// While buffering, the widget stays static; 'buffer-flush' will
		// swap in the complete transcript once the op finishes.
		if (this._isBuffering) { return; }
		this.logWidget.log(this._formatLine(pEvent.Channel, pEvent.Text));
		this._scheduleRender();
	}

	_onBufferStart(pEvent)
	{
		this._isBuffering = true;
		this.logWidget.log('');
		this.logWidget.log('{yellow-fg}{bold}... buffering remaining output (scrollable when complete){/bold}{/yellow-fg}');
		this._scheduleRender();
	}

	_onBufferTick(pEvent)
	{
		// Throttled status-bar progress update
		if (this._statusThrottleTimer) { return; }
		let tmpSelf = this;
		this._statusThrottleTimer = setTimeout(function ()
			{
				tmpSelf._statusThrottleTimer = null;
				tmpSelf.statusCallback('running', `${tmpSelf._currentCommandString}  (${pEvent.LineCount} lines)`);
			}, STATUS_THROTTLE_MS);
	}

	_onBufferFlush(pEvent)
	{
		this._isBuffering = false;
		// Replace the live view with the full transcript so the user can scroll.
		let tmpLines = this.processRunner.getBuffer(pEvent.OperationId);
		let tmpRendered = [];
		for (let i = 0; i < tmpLines.length; i++)
		{
			tmpRendered.push(this._formatLine(tmpLines[i].Channel, tmpLines[i].Text));
		}
		this.logWidget.setContent(tmpRendered.join('\n'));
		this.logWidget.setScrollPerc(100);
	}

	_onEnd(pEvent)
	{
		let tmpNote = pEvent.LineCount > 0
			? `  {gray-fg}(${pEvent.LineCount} lines){/gray-fg}`
			: '';

		if (!pEvent.IsLastStep)
		{
			// Mid-sequence step — emit a one-liner, then let the next 'start' event print the divider.
			if (pEvent.ExitCode === 0)
			{
				this.logWidget.log(`{green-fg}  ✓ ${this._currentCommandString} ({bold}${pEvent.Duration}{/bold}){/green-fg}`);
			}
			else
			{
				this.logWidget.log(`{red-fg}  ✗ ${this._currentCommandString} exit ${pEvent.ExitCode} ({bold}${pEvent.Duration}{/bold}){/red-fg}`);
			}
			this._scheduleRender();
			return;
		}

		// Final step of the operation: emit the full completion block.
		if (this._statusThrottleTimer)
		{
			clearTimeout(this._statusThrottleTimer);
			this._statusThrottleTimer = null;
		}

		this.logWidget.log('');
		this.logWidget.log('{bold}────────────────────────────────────────{/bold}');

		if (pEvent.TotalSteps > 1)
		{
			// Sequence completion block
			if (pEvent.ExitCode === 0)
			{
				this.logWidget.log(`{green-fg}{bold}✓ Done{/bold}  ${pEvent.TotalSteps} commands  ({bold}${pEvent.Duration}{/bold}){/green-fg}`);
				this.statusCallback('success', `Sequence complete -- ${pEvent.Duration}`);
			}
			else
			{
				this.logWidget.log(`{red-fg}{bold}✗ Failed (exit ${pEvent.ExitCode}){/bold}  ${pEvent.TotalSteps} commands  ({bold}${pEvent.Duration}{/bold}){/red-fg}`);
				this.statusCallback('error', `Sequence failed -- exit ${pEvent.ExitCode} (${pEvent.Duration})`);
			}
		}
		else
		{
			// Single-command completion block
			if (pEvent.ExitCode === 0)
			{
				this.logWidget.log(`{green-fg}{bold}✓ Done{/bold}  ${this._currentCommandString}  ({bold}${pEvent.Duration}{/bold}){/green-fg}${tmpNote}`);
				this.statusCallback('success', `${this._currentCommandString} -- ${pEvent.Duration}`);
			}
			else
			{
				this.logWidget.log(`{red-fg}{bold}✗ Failed (exit ${pEvent.ExitCode}){/bold}  ${this._currentCommandString}  ({bold}${pEvent.Duration}{/bold}){/red-fg}${tmpNote}`);
				this.statusCallback('error', `${this._currentCommandString} -- exit ${pEvent.ExitCode} (${pEvent.Duration})`);
			}
		}

		this.logWidget.setScrollPerc(100);
		this.screen.render();
	}

	_onError(pEvent)
	{
		this.logWidget.log('');
		this.logWidget.log('{bold}────────────────────────────────────────{/bold}');
		this.logWidget.log(`{red-fg}{bold}✗ Error{/bold}  ${pEvent.Message}  ({bold}${pEvent.Duration}{/bold}){/red-fg}`);
		this.statusCallback('error', `${pEvent.Message} (${pEvent.Duration})`);
		this.screen.render();
	}

	// ─────────────────────────────────────────────
	//  Convenience: pass-through run() API matching the old ProcessRunner
	// ─────────────────────────────────────────────

	/**
	 * Run a single command, mimicking the old ProcessRunner.run() signature.
	 * Accepts an optional options object with { append: true } to retain
	 * the current widget content.
	 */
	run(pCommand, pArgs, pCwd, pLineLimit, pOptions)
	{
		if (pOptions && pOptions.append) { this._appendNextRun = true; }
		return this.processRunner.run(
			{
				Command: pCommand,
				Args: pArgs,
				Cwd: pCwd,
			});
	}

	runSequence(pCommands, pCwd)
	{
		return this.processRunner.runSequence(
			{
				Cwd: pCwd,
				Steps: pCommands,  // normalizer in core accepts legacy { command, args, label }
			});
	}

	kill()
	{
		this.processRunner.kill();
	}

	isRunning()
	{
		return this.processRunner.isRunning();
	}

	// ─────────────────────────────────────────────
	//  Search (TUI-side presentation)
	// ─────────────────────────────────────────────

	hasBuffer()
	{
		// Prefer the most recently completed op if one exists; otherwise whatever is active.
		let tmpId = this._currentOperationId;
		return this.processRunner.hasBuffer(tmpId);
	}

	isSearchActive()
	{
		return this._searchMatches !== null && this._searchMatches !== undefined;
	}

	search(pQuery)
	{
		if (!pQuery) { return; }

		let tmpOpId = this._currentOperationId;
		if (!tmpOpId || !this.processRunner.hasBuffer(tmpOpId))
		{
			this.logWidget.setContent('{yellow-fg}{bold}No output to search.{/bold}{/yellow-fg}\n\nRun a command first, then search with [/].');
			this.screen.render();
			return;
		}

		let tmpResult = this.processRunner.search(tmpOpId, pQuery);
		this._searchQuery = tmpResult.Query;
		this._searchOperationId = tmpOpId;
		this._searchMatches = tmpResult.Matches;
		this._searchMatchIndex = -1;

		// Build highlighted result lines
		let tmpEscaped = pQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		let tmpHighlightRegex = new RegExp(`(${tmpEscaped})`, 'gi');
		this._searchResultLines = [];
		for (let i = 0; i < tmpResult.Matches.length; i++)
		{
			let tmpMatch = tmpResult.Matches[i];
			let tmpEscapedLine = this._escape(tmpMatch.Text);
			let tmpRendered = (tmpMatch.Channel === 'stderr')
				? `{red-fg}${tmpEscapedLine}{/red-fg}`
				: tmpEscapedLine;
			let tmpHighlighted = tmpRendered.replace(tmpHighlightRegex, '{yellow-fg}{bold}$1{/bold}{/yellow-fg}');
			let tmpLineNum = String(tmpMatch.Index + 1).padStart(5, ' ');
			this._searchResultLines.push(`{gray-fg}${tmpLineNum}:{/gray-fg} ${tmpHighlighted}`);
		}

		this._renderSearchResults(tmpResult.Total);
	}

	_renderSearchResults(pTotalBufferLines)
	{
		let tmpLines = [];
		let tmpTotal = (typeof pTotalBufferLines === 'number')
			? pTotalBufferLines
			: this.processRunner.getBuffer(this._searchOperationId).length;

		tmpLines.push(`{bold}Search: "${this._searchQuery}"{/bold}  in ${tmpTotal} buffered lines`);
		tmpLines.push('');

		for (let i = 0; i < this._searchResultLines.length; i++)
		{
			if (i === this._searchMatchIndex)
			{
				tmpLines.push(`{cyan-fg}{bold}>>>{/bold}{/cyan-fg} ${this._searchResultLines[i]}`);
			}
			else
			{
				tmpLines.push(`    ${this._searchResultLines[i]}`);
			}
		}

		tmpLines.push('');
		if (!this._searchMatches || this._searchMatches.length === 0)
		{
			tmpLines.push(`{yellow-fg}{bold}No matches found{/bold}{/yellow-fg} for "${this._searchQuery}" in ${tmpTotal} lines`);
		}
		else
		{
			tmpLines.push(`{bold}${this._searchMatches.length} matches{/bold}  ] next  [ prev`);
		}
		tmpLines.push('[/] search again  [Esc] back to full output');

		this.logWidget.setContent(tmpLines.join('\n'));

		if (this._searchMatchIndex >= 0 && this._searchMatches.length > 0)
		{
			let tmpTargetLine = this._searchMatchIndex + 2;
			let tmpTotalOutputLines = tmpLines.length;
			let tmpScrollPerc = Math.max(0, Math.floor((tmpTargetLine / tmpTotalOutputLines) * 100));
			this.logWidget.setScrollPerc(tmpScrollPerc);

			let tmpMatch = this._searchMatches[this._searchMatchIndex];
			this.statusCallback('search',
				`Match ${this._searchMatchIndex + 1}/${this._searchMatches.length}  line ${tmpMatch.Index + 1}  ] next  [ prev  [/] search  [Esc] done`);
		}
		else
		{
			this.logWidget.setScrollPerc(0);
		}

		this.screen.render();
	}

	searchNavigate(pDirection)
	{
		if (!this._searchMatches || this._searchMatches.length === 0) { return; }

		this._searchMatchIndex += pDirection;
		if (this._searchMatchIndex >= this._searchMatches.length) { this._searchMatchIndex = 0; }
		else if (this._searchMatchIndex < 0) { this._searchMatchIndex = this._searchMatches.length - 1; }

		this._renderSearchResults();
	}

	searchClear()
	{
		this._resetSearch();
		// Restore the full buffer display
		if (this._currentOperationId && this.processRunner.hasBuffer(this._currentOperationId))
		{
			let tmpLines = this.processRunner.getBuffer(this._currentOperationId);
			let tmpRendered = [];
			for (let i = 0; i < tmpLines.length; i++)
			{
				tmpRendered.push(this._formatLine(tmpLines[i].Channel, tmpLines[i].Text));
			}
			this.logWidget.setContent(tmpRendered.join('\n'));
			this.logWidget.setScrollPerc(100);
			this.screen.render();
		}
	}

	_resetSearch()
	{
		this._searchQuery = '';
		this._searchMatches = null;
		this._searchMatchIndex = -1;
		this._searchResultLines = null;
		this._searchOperationId = null;
	}
}

module.exports = BlessedRenderer;
