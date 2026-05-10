/**
 * Manager-LogBar — persistent secondary bottom panel with two tabs:
 *
 *   - "Log" tab     — the manager log file's tail (/api/manager/log).
 *                     Refresh button reloads it. Same content the
 *                     LogModal used to show.
 *   - "Actions" tab — a session-scoped history of recent operations
 *                     (last N, capped by the WS provider). Each entry
 *                     is a collapsible row showing label + module +
 *                     elapsed/state. Expanding an entry reveals its
 *                     full output. The currently-running op is
 *                     auto-expanded.
 *
 * Behavior:
 *
 *   - User can click between tabs to switch views.
 *   - When a NEW action starts (OperationId changes), the bar auto-
 *     switches to the Actions tab and auto-expands the new entry.
 *     If the user has manually switched to the Log tab during the
 *     same op, we don't yank them back on every frame — only on the
 *     transition to a new op.
 *   - The running entry's body streams live via scheduleAppend()
 *     (rAF-coalesced incremental appends to that entry's <pre>).
 *     This is the documented exception to the "render through
 *     templates" rule — it's a hot-path optimization for stdout
 *     floods. The full re-render path (tab switch, new op, etc.)
 *     goes through the templates below.
 *
 * Mounted via the shell's ContentView binding in Manager-Layout
 * (auto-renders on creation + every panel-expand transition).
 */

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-LogBar',

	DefaultRenderable:            'Manager-LogBar-Content',
	DefaultDestinationAddress:    '#RM-LogBar-Content',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.LogBar',

	AutoRender: false,

	CSS: /*css*/`
		#RM-LogBar-Content
		{
			display: flex;
			flex-direction: column;
			height: 100%;
			min-height: 0;
			background: var(--color-panel-alt);
			color: var(--color-text);
		}
		.rm-logbar-toolbar
		{
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 4px 10px;
			border-bottom: 1px solid var(--color-border);
			font-size: 11px;
			color: var(--color-muted);
			flex: 0 0 auto;
		}
		.rm-logbar-tab
		{
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding: 3px 10px;
			background: transparent;
			color: var(--color-muted);
			border: 1px solid transparent;
			border-radius: 4px;
			font: inherit;
			font-size: 11px;
			font-weight: 600;
			letter-spacing: 0.4px;
			text-transform: uppercase;
			cursor: pointer;
		}
		.rm-logbar-tab:hover
		{
			color: var(--color-text);
		}
		.rm-logbar-tab.is-active
		{
			color: var(--brand-color-primary-mode, var(--color-text));
			border-color: var(--color-border);
			background: var(--color-panel);
		}
		.rm-logbar-tab .rm-logbar-tab-badge
		{
			display: inline-block;
			min-width: 14px;
			padding: 1px 4px;
			border-radius: 8px;
			background: var(--color-border);
			color: var(--color-text);
			font-size: 9px;
			text-transform: none;
			letter-spacing: 0;
			text-align: center;
			line-height: 1.2;
		}
		.rm-logbar-tab.is-active .rm-logbar-tab-badge
		{
			background: var(--brand-color-primary-mode, var(--color-accent));
			color: var(--color-bg);
		}
		.rm-logbar-tab .rm-logbar-tab-running-dot
		{
			width: 6px; height: 6px; border-radius: 50%;
			background: var(--color-warning);
			animation: rm-logbar-pulse 1.2s ease-in-out infinite;
		}
		@keyframes rm-logbar-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

		.rm-logbar-toolbar .rm-logbar-spacer { flex: 1 1 auto; }
		.rm-logbar-toolbar .rm-logbar-meta
		{
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			max-width: 50%;
		}
		.rm-logbar-toolbar button.rm-logbar-action
		{
			padding: 2px 8px;
			font-size: 11px;
			background: transparent;
			color: var(--color-muted);
			border: 1px solid var(--color-border);
			border-radius: 4px;
			cursor: pointer;
		}
		.rm-logbar-toolbar button.rm-logbar-action:hover
		{
			color: var(--brand-color-primary-mode, var(--color-accent));
			border-color: var(--brand-color-primary-mode, var(--color-accent));
		}

		/* Body — common scrollable region. Per-tab class drives the
		   inner styling. */
		.rm-logbar-body
		{
			flex: 1 1 auto;
			margin: 0;
			padding: 0;
			overflow: auto;
			background: var(--color-bg);
			color: var(--color-text);
			font-family: var(--font-mono);
			font-size: 11px;
			line-height: 1.4;
		}
		.rm-logbar-body.is-empty
		{
			padding: 12px;
			color: var(--color-muted);
			font-style: italic;
		}

		/* Log tab — single <pre>-like rendering of the file log. */
		.rm-logbar-body.tab-log
		{
			padding: 6px 10px;
			white-space: pre;
		}

		/* Actions tab — list of collapsible entries. */
		.rm-logbar-body.tab-actions { padding: 0; }
		.rm-logbar-action-entry
		{
			border-bottom: 1px solid var(--color-border);
		}
		.rm-logbar-action-entry:last-child { border-bottom: 0; }
		.rm-logbar-action-header
		{
			display: flex;
			align-items: center;
			gap: 8px;
			width: 100%;
			padding: 6px 10px;
			background: transparent;
			border: 0;
			border-left: 3px solid transparent;
			color: var(--color-text);
			font: inherit;
			font-size: 12px;
			text-align: left;
			cursor: pointer;
		}
		.rm-logbar-action-header:hover
		{
			background: var(--color-panel-alt);
		}
		.rm-logbar-action-entry.is-running    > .rm-logbar-action-header { border-left-color: var(--color-warning); }
		.rm-logbar-action-entry.is-success    > .rm-logbar-action-header { border-left-color: var(--color-success); }
		.rm-logbar-action-entry.is-error      > .rm-logbar-action-header { border-left-color: var(--color-danger); }
		.rm-logbar-action-entry.is-cancelled  > .rm-logbar-action-header { border-left-color: var(--color-muted); }

		.rm-logbar-action-chevron
		{
			width: 8px; height: 8px;
			border-right: 1.5px solid currentColor;
			border-bottom: 1.5px solid currentColor;
			transform: rotate(-45deg);
			transition: transform 140ms ease;
			flex: 0 0 auto;
			color: var(--color-muted);
		}
		.rm-logbar-action-entry.is-expanded > .rm-logbar-action-header > .rm-logbar-action-chevron
		{
			transform: rotate(45deg);
		}
		.rm-logbar-action-state
		{
			width: 8px; height: 8px; border-radius: 50%;
			background: var(--color-muted);
			flex: 0 0 auto;
		}
		.rm-logbar-action-entry.is-running   .rm-logbar-action-state { background: var(--color-warning); animation: rm-logbar-pulse 1.2s ease-in-out infinite; }
		.rm-logbar-action-entry.is-success   .rm-logbar-action-state { background: var(--color-success); }
		.rm-logbar-action-entry.is-error     .rm-logbar-action-state { background: var(--color-danger); }
		.rm-logbar-action-entry.is-cancelled .rm-logbar-action-state { background: var(--color-muted); }

		.rm-logbar-action-time
		{
			color: var(--color-muted);
			font-variant-numeric: tabular-nums;
			font-size: 11px;
			flex: 0 0 auto;
			min-width: 56px;
		}
		.rm-logbar-action-label
		{
			color: var(--color-text);
			font-weight: 600;
			overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
			min-width: 0;
		}
		.rm-logbar-action-meta
		{
			margin-left: auto;
			color: var(--color-muted);
			font-size: 11px;
			flex: 0 0 auto;
		}
		.rm-logbar-action-body
		{
			margin: 0;
			padding: 6px 10px 10px 30px;
			font-family: var(--font-mono);
			font-size: 11px;
			line-height: 1.4;
			color: var(--color-text);
			background: var(--color-bg);
			max-height: none;
		}
		.rm-logbar-action-entry:not(.is-expanded) > .rm-logbar-action-body { display: none; }
		.rm-logbar-action-body .line { white-space: pre-wrap; word-break: break-word; }
		.rm-logbar-action-body .line.cmd     { color: var(--brand-color-primary-mode, var(--color-accent)); font-weight: 600; }
		.rm-logbar-action-body .line.meta    { color: var(--color-muted); }
		.rm-logbar-action-body .line.stderr  { color: var(--color-warning); }
		.rm-logbar-action-body .line.error   { color: var(--color-danger); font-weight: 600; }
		.rm-logbar-action-body .line.success { color: var(--color-success); font-weight: 600; }

		.rm-logbar-empty
		{
			padding: 16px;
			color: var(--color-muted);
			font-style: italic;
			text-align: center;
		}
	`,
	CSSPriority: 500,

	Templates:
	[
		// ── Top-level shell ───────────────────────────────────────
		{
			Hash: 'Manager-LogBar-Template',
			Template: /*html*/`
<div class="rm-logbar-toolbar" id="RM-LogBar-Toolbar">
	<button type="button" class="rm-logbar-tab {~D:Record.LogTabClass~}"
		onclick="_Pict.views['Manager-LogBar'].switchTab('log');">Log</button>
	<button type="button" class="rm-logbar-tab {~D:Record.ActionsTabClass~}"
		onclick="_Pict.views['Manager-LogBar'].switchTab('actions');">Actions{~TS:Manager-LogBar-RunningDot-Template:Record.RunningDotSlot~}{~TS:Manager-LogBar-TabBadge-Template:Record.TabBadgeSlot~}</button>
	<span class="rm-logbar-spacer"></span>
	<span class="rm-logbar-meta">{~D:Record.MetaText~}</span>
	{~TS:Manager-LogBar-RefreshBtn-Template:Record.RefreshBtnSlot~}
	{~TS:Manager-LogBar-ExpandAllBtn-Template:Record.ExpandAllBtnSlot~}
	{~TS:Manager-LogBar-CollapseAllBtn-Template:Record.CollapseAllBtnSlot~}
	{~TS:Manager-LogBar-CancelBtn-Template:Record.CancelBtnSlot~}
	<button type="button" class="rm-logbar-action" title="Hide this log bar"
		onclick="_Pict.views['Manager-Layout'].getLogPanel().collapse();">×</button>
</div>
<div class="rm-logbar-body {~D:Record.BodyClass~}" id="RM-LogBar-Body">{~TS:Manager-LogBar-LogState-Template:Record.LogStateSlot~}{~TS:Manager-LogBar-LogText-Template:Record.LogTextSlot~}{~TS:Manager-LogBar-ActionsEmpty-Template:Record.ActionsEmptySlot~}{~TS:Manager-LogBar-ActionEntry-Template:Record.ActionEntries~}</div>
`
		},

		// ── Toolbar accents ───────────────────────────────────────
		{
			Hash: 'Manager-LogBar-RunningDot-Template',
			Template: /*html*/`<span class="rm-logbar-tab-running-dot" title="Operation in progress"></span>`
		},
		{
			Hash: 'Manager-LogBar-TabBadge-Template',
			Template: /*html*/`<span class="rm-logbar-tab-badge">{~D:Record.Text~}</span>`
		},
		{
			Hash: 'Manager-LogBar-RefreshBtn-Template',
			Template: /*html*/`<button type="button" class="rm-logbar-action" title="Refresh the tail of the log file" onclick="_Pict.views['Manager-LogBar'].reload();">Refresh</button>`
		},
		{
			Hash: 'Manager-LogBar-ExpandAllBtn-Template',
			Template: /*html*/`<button type="button" class="rm-logbar-action" title="Expand every action in the list" onclick="_Pict.views['Manager-LogBar'].expandAll();">expand all</button>`
		},
		{
			Hash: 'Manager-LogBar-CollapseAllBtn-Template',
			Template: /*html*/`<button type="button" class="rm-logbar-action" title="Collapse every action in the list" onclick="_Pict.views['Manager-LogBar'].collapseAll();">collapse all</button>`
		},
		{
			Hash: 'Manager-LogBar-CancelBtn-Template',
			Template: /*html*/`<button type="button" class="rm-logbar-action" title="Cancel the running operation" onclick="_Pict.views['Manager-LogBar'].cancel();">Cancel</button>`
		},

		// ── Log tab body ──────────────────────────────────────────
		{
			Hash: 'Manager-LogBar-LogState-Template',
			Template: /*html*/`{~D:Record.Message~}`
		},
		{
			Hash: 'Manager-LogBar-LogText-Template',
			Template: /*html*/`{~D:Record.Text~}`
		},

		// ── Actions tab body ──────────────────────────────────────
		{
			Hash: 'Manager-LogBar-ActionsEmpty-Template',
			Template: /*html*/`<div class="rm-logbar-empty">No actions yet — click any button on a module to run one.</div>`
		},
		{
			Hash: 'Manager-LogBar-ActionEntry-Template',
			Template: /*html*/`
<div class="rm-logbar-action-entry {~D:Record.RootClass~}" data-action-entry="{~D:Record.OperationId~}">
	<button type="button" class="rm-logbar-action-header" onclick="_Pict.views['Manager-LogBar'].toggleEntry('{~D:Record.OperationIdJs~}');">
		<span class="rm-logbar-action-chevron"></span>
		<span class="rm-logbar-action-state"></span>
		<span class="rm-logbar-action-time" title="{~D:Record.StartedFull~}">{~D:Record.ClockTime~}</span>
		<span class="rm-logbar-action-label">{~D:Record.Label~}</span>
		<span class="rm-logbar-action-meta">{~D:Record.MetaText~}</span>
	</button>
	<pre class="rm-logbar-action-body" data-action-body="{~D:Record.OperationId~}">{~TS:Manager-LogBar-EmptyLine-Template:Record.EmptyLineSlot~}{~TS:Manager-LogBar-Line-Template:Record.Lines~}</pre>
</div>
`
		},
		{
			Hash: 'Manager-LogBar-EmptyLine-Template',
			Template: /*html*/`<div class="line meta">(no output)</div>`
		},
		{
			Hash: 'Manager-LogBar-Line-Template',
			Template: /*html*/`<div class="line {~D:Record.Class~}">{~D:Record.Text~}</div>`
		},
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-LogBar-Content',
			TemplateHash:       'Manager-LogBar-Template',
			DestinationAddress: '#RM-LogBar-Content',
			RenderMethod:       'replace'
		}
	]
};

class ManagerLogBarView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._tab = 'log';                   // 'log' | 'actions'
		this._lastSeenOpId = null;           // tracks new-op transition for auto-tab-switch
		this._lastSeenStateByOp = {};        // OperationId → last HeaderState we processed (drives auto-collapse-on-success)
		this._expandedEntries = {};          // OperationId → bool (Actions tab expand state)
		this._renderedUpToByOp = {};         // OperationId → number (append cursor for live streaming)
		this._rafPending = false;
		this._renderedOnce = false;
		this._fileLog = null;                // cached file-log fetch result (for re-render without re-fetch)
	}

	onBeforeRender()
	{
		// Backup path: when the shell's ContentView binding kicks off the
		// initial render of this panel we never went through _renderFresh
		// ourselves, so populate the record here so the very first render
		// has data. Subsequent state changes go through _renderFresh which
		// writes the record before pict-view captures it.
		this._writeRecord();
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		if (!this._renderedOnce)
		{
			this._renderedOnce = true;
			// Initial file-log fetch so the Log tab isn't permanently
			// stuck on "(empty)" before the user clicks Refresh.
			this.reload();
		}
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// Write the per-render record into AppData and trigger a render.
	// pict-view captures the data address BEFORE onBeforeRender fires,
	// so we have to mutate the address ourselves before calling render
	// (this mirrors the pattern used by Manager-ModuleWorkspace and the
	// other manager views that own their record).
	_renderFresh()
	{
		this._writeRecord();
		this.render();
	}

	_writeRecord()
	{
		this.pict.AppData.Manager.ViewRecord = this.pict.AppData.Manager.ViewRecord || {};
		this.pict.AppData.Manager.ViewRecord.LogBar = this._buildRecord();
	}

	// ─────────────────────────────────────────────
	//  Public API — called from inline handlers + WS provider + Layout
	// ─────────────────────────────────────────────

	switchTab(pTab)
	{
		if (pTab !== 'log' && pTab !== 'actions') return;
		if (this._tab === pTab) return;
		this._tab = pTab;
		this._renderFresh();
	}

	toggleEntry(pOpId)
	{
		this._expandedEntries[pOpId] = !this._expandedEntries[pOpId];
		this._renderFresh();
	}

	expandAll()
	{
		let tmpHistory = this._history();
		for (let i = 0; i < tmpHistory.length; i++)
		{
			this._expandedEntries[tmpHistory[i].OperationId] = true;
		}
		this._renderFresh();
	}

	collapseAll()
	{
		// Reset rather than flipping each entry — also clears stale entries
		// for ops that have already aged out of ActionHistory.
		this._expandedEntries = {};
		this._renderFresh();
	}

	/**
	 * WS provider calls this on every frame (rAF-coalesced).
	 *   - On NEW op (OperationId changed): switch to Actions tab,
	 *     auto-expand the new entry, and full re-render.
	 *   - On SAME op: incremental DOM append into the running entry's
	 *     body (no re-render). This is the documented hot-path
	 *     exception to "render through templates" — stdout floods
	 *     would otherwise rebuild the whole entry list every frame.
	 */
	scheduleAppend()
	{
		if (this._rafPending) return;
		this._rafPending = true;
		let tmpSelf = this;
		let tmpRaf = (typeof window !== 'undefined' && window.requestAnimationFrame)
			? window.requestAnimationFrame.bind(window)
			: function (pFn) { return setTimeout(pFn, 16); };
		tmpRaf(function () { tmpSelf._rafPending = false; tmpSelf._tickAppend(); });
	}

	reload(pTail)
	{
		let tmpAPI = this.pict.providers.ManagerAPI;
		if (!tmpAPI || typeof tmpAPI.get !== 'function') return;

		// Render a "loading" state into the Log tab (only matters if
		// the user is currently on it).
		if (this._tab === 'log')
		{
			this._fileLog = null;
			this._renderFresh();
		}

		tmpAPI.get('/log?tail=' + (pTail || 500)).then(
			(pBody) =>
			{
				this._fileLog = pBody;
				this._renderFresh();
			},
			(pError) =>
			{
				this._fileLog = { Error: pError.message };
				this._renderFresh();
			});
	}

	cancel()
	{
		let tmpOp = this.pict.AppData.Manager.ActiveOperation;
		if (!tmpOp || !tmpOp.OperationId || tmpOp.HeaderState !== 'running') return;
		this.pict.providers.ManagerAPI.cancelOperation(tmpOp.OperationId).then(
			() => { this.pict.PictApplication.setStatus('Cancel requested.'); },
			(pError) => { this.pict.PictApplication.setStatus('Cancel failed: ' + pError.message); });
	}

	// ─────────────────────────────────────────────
	//  Internals — append + tab transition
	// ─────────────────────────────────────────────

	_tickAppend()
	{
		let tmpOp = this.pict.AppData.Manager.ActiveOperation || {};
		let tmpOpId = tmpOp.OperationId;
		if (!tmpOpId) return;

		// New op — auto-switch to Actions tab + auto-expand the new entry.
		if (tmpOpId !== this._lastSeenOpId)
		{
			this._lastSeenOpId = tmpOpId;
			this._expandedEntries[tmpOpId] = true;
			this._tab = 'actions';
			this._renderFresh();
			return;
		}

		// Same op — but did it just transition out of 'running'? The toolbar
		// chrome (running dot, Cancel button, meta text) is part of the
		// shell template, not the streamed body, so an incremental append
		// alone leaves the throbber pulsing on a finished op until the
		// user switches tabs. Do a full re-render on lifecycle frames so
		// the toolbar reflects the new state.
		//
		// Auto-collapse-on-success: when an op finishes cleanly we
		// fold the entry shut so the Actions tab reads as a tidy
		// history of "what I did" rather than a wall of green
		// stdout. Failures stay open so the user can read the error
		// without a click. Only fires on the actual transition (we
		// remember the last state we processed) so a manual expand
		// after success isn't yanked back closed.
		let tmpPrevState = this._lastSeenStateByOp[tmpOpId];
		let tmpCurrState = tmpOp.HeaderState;
		if (tmpPrevState !== tmpCurrState)
		{
			this._lastSeenStateByOp[tmpOpId] = tmpCurrState;
			if (tmpPrevState === 'running' && tmpCurrState === 'success')
			{
				this._expandedEntries[tmpOpId] = false;
			}
		}
		if (tmpCurrState !== 'running')
		{
			this._renderFresh();
			return;
		}

		// Same op — incremental append into the running entry's body.
		// Fall back to a full re-render when:
		//   - The user is on a different tab (no live DOM to incrementally
		//     update) — re-render so the toolbar badge stays current;
		//     lines wait for the user to switch tabs.
		//   - The body element has been re-created since last tick.
		if (this._tab !== 'actions') { this._renderFresh(); return; }

		let tmpBodyEl = document.querySelector('[data-action-body="' + this._cssEscape(tmpOpId) + '"]');
		if (!tmpBodyEl)
		{
			// Entry collapsed or DOM out of sync — full re-render.
			this._renderFresh();
			return;
		}

		let tmpLines = tmpOp.Lines || [];
		let tmpStart = this._renderedUpToByOp[tmpOpId] || 0;
		if (tmpStart >= tmpLines.length)
		{
			// Just refresh state-derived chrome.
			this._renderFresh();
			return;
		}

		// Strip the empty-state placeholder if present (first append).
		if (tmpStart === 0)
		{
			let tmpEmpty = tmpBodyEl.querySelector('.line.meta');
			if (tmpEmpty && tmpEmpty.textContent === '(no output)') { tmpEmpty.remove(); }
		}

		let tmpFrag = document.createDocumentFragment();
		for (let i = tmpStart; i < tmpLines.length; i++)
		{
			let tmpLine = tmpLines[i];
			let tmpDiv = document.createElement('div');
			tmpDiv.className = tmpLine.Class ? ('line ' + tmpLine.Class) : 'line';
			tmpDiv.textContent = tmpLine.Text;
			tmpFrag.appendChild(tmpDiv);
		}
		tmpBodyEl.appendChild(tmpFrag);
		this._renderedUpToByOp[tmpOpId] = tmpLines.length;

		// Keep header chrome (state class, label, meta) in sync without
		// nuking the streamed body.
		this._refreshEntryHeader(tmpOpId);
		// Toolbar meta (badge count, running dot) follows from AppData
		// changes the WS provider already mutated, but we don't want to
		// re-render the body here. A targeted render of the toolbar
		// would require splitting renderables; the simpler choice is
		// to skip the chrome update and rely on the next `render()`
		// (tab switch / completion / etc.) to refresh it.

		// Auto-scroll the panel body if the user is pinned within 60px.
		let tmpScrollEl = document.getElementById('RM-LogBar-Body');
		if (tmpScrollEl)
		{
			let tmpAtBottom = (tmpScrollEl.scrollHeight - tmpScrollEl.scrollTop - tmpScrollEl.clientHeight) < 60;
			if (tmpAtBottom) { tmpScrollEl.scrollTop = tmpScrollEl.scrollHeight; }
		}
	}

	_refreshEntryHeader(pOpId)
	{
		let tmpHistory = this._history();
		let tmpEntry = null;
		for (let i = 0; i < tmpHistory.length; i++) { if (tmpHistory[i].OperationId === pOpId) { tmpEntry = tmpHistory[i]; break; } }
		if (!tmpEntry) return;
		let tmpRoot = document.querySelector('[data-action-entry="' + this._cssEscape(pOpId) + '"]');
		if (!tmpRoot) return;
		// Update root state class.
		tmpRoot.className = 'rm-logbar-action-entry'
			+ ' is-' + (tmpEntry.State || 'running')
			+ (this._expandedEntries[pOpId] ? ' is-expanded' : '');
		// Update label text — sequence ops rotate the label between steps.
		let tmpLabel = tmpRoot.querySelector('.rm-logbar-action-label');
		if (tmpLabel) { tmpLabel.textContent = tmpEntry.Label || '(unknown)'; }
		// Update meta text.
		let tmpMeta = tmpRoot.querySelector('.rm-logbar-action-meta');
		if (tmpMeta) { tmpMeta.textContent = this._formatEntryMeta(tmpEntry); }
	}

	// ─────────────────────────────────────────────
	//  Data shaping — single place that produces the record the
	//  templates above iterate.
	// ─────────────────────────────────────────────

	_buildRecord()
	{
		let tmpHistory = this._history();
		let tmpRunning = tmpHistory.find((p) => p.State === 'running') || null;
		let tmpHistoryBadge = tmpHistory.length > 0 ? tmpHistory.length.toString() : '';

		let tmpIsLog     = (this._tab === 'log');
		let tmpIsActions = (this._tab === 'actions');

		let tmpMetaText;
		if (tmpIsLog)
		{
			if (!this._fileLog) { tmpMetaText = 'loading…'; }
			else if (this._fileLog.Error) { tmpMetaText = 'error: ' + this._fileLog.Error; }
			else
			{
				let tmpFL = this._fileLog;
				tmpMetaText = tmpFL.Exists
					? tmpFL.Path + ' — last ' + (tmpFL.Lines ? tmpFL.Lines.length : 0) + ' / ' + (tmpFL.Total || 0) + ' lines'
					: tmpFL.Path + ' — (no log yet)';
			}
		}
		else
		{
			if (tmpRunning)                   { tmpMetaText = tmpRunning.Label || ''; }
			else if (tmpHistory.length === 0) { tmpMetaText = 'no actions yet'; }
			else                              { tmpMetaText = tmpHistory.length + ' recent action' + (tmpHistory.length === 1 ? '' : 's'); }
		}

		// Body slot decisions.
		let tmpLogStateSlot    = [];
		let tmpLogTextSlot     = [];
		let tmpActionsEmptySlot = [];
		let tmpActionEntries   = [];
		let tmpBodyClass = 'tab-' + this._tab;

		if (tmpIsLog)
		{
			if (!this._fileLog)
			{
				tmpLogStateSlot.push({ Message: 'fetching…' });
				tmpBodyClass += ' is-empty';
			}
			else if (this._fileLog.Error)
			{
				tmpLogStateSlot.push({ Message: 'Error loading log: ' + this._fileLog.Error });
				tmpBodyClass += ' is-empty';
			}
			else
			{
				let tmpText = (this._fileLog.Lines || []).join('\n');
				if (!tmpText)
				{
					tmpLogStateSlot.push({ Message: '(empty)' });
					tmpBodyClass += ' is-empty';
				}
				else
				{
					tmpLogTextSlot.push({ Text: tmpText });
				}
			}
		}
		else
		{
			if (tmpHistory.length === 0)
			{
				tmpActionsEmptySlot.push({});
			}
			else
			{
				for (let i = 0; i < tmpHistory.length; i++)
				{
					tmpActionEntries.push(this._buildEntryRecord(tmpHistory[i]));
					this._renderedUpToByOp[tmpHistory[i].OperationId] = (tmpHistory[i].Lines || []).length;
				}
			}
		}

		// Expand-all / collapse-all only make sense on the Actions tab and
		// when there's at least one entry to act on. We always show both
		// (even when all entries are already expanded or all collapsed) so
		// the toolbar's button set is stable while the user clicks around.
		let tmpHasEntries        = tmpIsActions && tmpHistory.length > 0;
		let tmpExpandAllBtnSlot  = tmpHasEntries ? [{}] : [];
		let tmpCollapseAllBtnSlot = tmpHasEntries ? [{}] : [];

		return {
			LogTabClass:         tmpIsLog     ? 'is-active' : '',
			ActionsTabClass:     tmpIsActions ? 'is-active' : '',
			RunningDotSlot:      tmpRunning ? [{}] : [],
			TabBadgeSlot:        tmpHistoryBadge ? [{ Text: tmpHistoryBadge }] : [],
			MetaText:            tmpMetaText,
			RefreshBtnSlot:      tmpIsLog ? [{}] : [],
			ExpandAllBtnSlot:    tmpExpandAllBtnSlot,
			CollapseAllBtnSlot:  tmpCollapseAllBtnSlot,
			CancelBtnSlot:       (tmpIsActions && tmpRunning) ? [{}] : [],

			BodyClass:          tmpBodyClass,
			LogStateSlot:       tmpLogStateSlot,
			LogTextSlot:        tmpLogTextSlot,
			ActionsEmptySlot:   tmpActionsEmptySlot,
			ActionEntries:      tmpActionEntries,
		};
	}

	_buildEntryRecord(pEntry)
	{
		let tmpExpanded = !!this._expandedEntries[pEntry.OperationId];
		let tmpRootClass = 'is-' + (pEntry.State || 'running')
			+ (tmpExpanded ? ' is-expanded' : '');

		let tmpLines = pEntry.Lines || [];
		let tmpLineRecords = [];
		let tmpEmptyLineSlot = [];
		if (tmpLines.length === 0)
		{
			tmpEmptyLineSlot.push({});
		}
		else
		{
			for (let i = 0; i < tmpLines.length; i++)
			{
				let tmpLine = tmpLines[i];
				tmpLineRecords.push({ Class: tmpLine.Class || '', Text: tmpLine.Text || '' });
			}
		}

		return {
			OperationId:   pEntry.OperationId || '',
			OperationIdJs: this._jsString(pEntry.OperationId || ''),
			RootClass:     tmpRootClass,
			ClockTime:     this._formatClockTime(pEntry.StartedAt),
			StartedFull:   this._formatStartedFull(pEntry.StartedAt),
			Label:         pEntry.Label || '(unknown)',
			MetaText:      this._formatEntryMeta(pEntry),
			EmptyLineSlot: tmpEmptyLineSlot,
			Lines:         tmpLineRecords,
		};
	}

	// ─────────────────────────────────────────────
	//  Helpers
	// ─────────────────────────────────────────────

	_history()
	{
		return (this.pict.AppData.Manager && this.pict.AppData.Manager.ActionHistory) || [];
	}

	_formatEntryMeta(pEntry)
	{
		let tmpParts = [];
		if (pEntry.ModuleName) { tmpParts.push(pEntry.ModuleName); }
		tmpParts.push(this._formatTimeAgo(pEntry.StartedAt));
		tmpParts.push(this._stateLabel(pEntry));
		return tmpParts.join(' · ');
	}

	_formatClockTime(pISO)
	{
		if (!pISO) return '--:--:--';
		let tmpDate;
		try { tmpDate = new Date(pISO); }
		catch (pErr) { return '--:--:--'; }
		if (isNaN(tmpDate.getTime())) return '--:--:--';
		let tmpH = String(tmpDate.getHours()).padStart(2, '0');
		let tmpM = String(tmpDate.getMinutes()).padStart(2, '0');
		let tmpS = String(tmpDate.getSeconds()).padStart(2, '0');
		return tmpH + ':' + tmpM + ':' + tmpS;
	}

	_formatStartedFull(pISO)
	{
		if (!pISO) return '';
		let tmpDate;
		try { tmpDate = new Date(pISO); }
		catch (pErr) { return ''; }
		if (isNaN(tmpDate.getTime())) return '';
		return 'Started ' + tmpDate.toLocaleString();
	}

	_stateLabel(pEntry)
	{
		switch (pEntry.State)
		{
			case 'running':   return 'running';
			case 'success':   return 'success';
			case 'error':     return 'failed';
			case 'cancelled': return 'cancelled';
			default:          return pEntry.State || '?';
		}
	}

	_formatTimeAgo(pISO)
	{
		if (!pISO) return '';
		let tmpThen;
		try { tmpThen = new Date(pISO).getTime(); }
		catch (pErr) { return ''; }
		let tmpNow = Date.now();
		let tmpDelta = Math.floor((tmpNow - tmpThen) / 1000);
		if (tmpDelta < 5) return 'just now';
		if (tmpDelta < 60) return tmpDelta + 's ago';
		let tmpMin = Math.floor(tmpDelta / 60);
		if (tmpMin < 60) return tmpMin + ' min ago';
		let tmpHr = Math.floor(tmpMin / 60);
		if (tmpHr < 24) return tmpHr + ' h ago';
		return Math.floor(tmpHr / 24) + ' d ago';
	}

	_cssEscape(pText)
	{
		// Selector-safe escape for OperationIds in attribute selectors.
		// OperationIds are alphanumeric + underscores so this is mostly
		// belt-and-suspenders.
		return String(pText || '').replace(/(["\\])/g, '\\$1');
	}

	// Backslash-escape a JS string literal so it survives being injected
	// into an inline onclick=... attribute.
	_jsString(pText)
	{
		return String(pText == null ? '' : pText)
			.replace(/\\/g, '\\\\')
			.replace(/'/g, "\\'");
	}
}

module.exports = ManagerLogBarView;
module.exports.default_configuration = _ViewConfiguration;
