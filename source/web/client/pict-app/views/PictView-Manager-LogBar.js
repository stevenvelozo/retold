/**
 * Manager-LogBar — persistent secondary bottom panel with three tabs:
 *
 *   - "Actions" tab — a session-scoped history of recent operations
 *                     (last N, capped by the WS provider). Default
 *                     tab so the user always lands on what they just
 *                     ran. Each entry is a collapsible row showing
 *                     label + module + elapsed/state. The currently-
 *                     running op is auto-expanded.
 *   - "Log" tab     — the manager log file's tail (/api/manager/log).
 *                     Refresh button reloads it. Same content the
 *                     LogModal used to show.
 *   - "Scan" tab    — wide table view of the per-module scan results
 *                     (branch, ahead, behind, local/published version,
 *                     and categorized line counts: source/tests/docs/
 *                     tooling). Filter + sort.  Populated by the
 *                     sidebar's Scan button.
 *
 * Toolbar also has a "fullscreen" toggle on the right that flips the
 * panel between its resizable size and the full viewport height —
 * useful when reading a wide scan table or a long log.
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

// Shared "dirty" classification — same source of truth the sidebar uses, so
// the bottom "dirty" filter and the sidebar's "Dirty only" never disagree.
const libScanState = require('../Manager-Scan-State.js');

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
		/* The header is a row with two buttons: the wide toggle and a
		   small "↗ open" affordance that pops the action-detail modal.
		   We can't nest <button> inside <button>, so the header is a
		   div containing two siblings. */
		.rm-logbar-action-header
		{
			display: flex;
			align-items: stretch;
			border-left: 3px solid transparent;
		}
		.rm-logbar-action-entry.is-running    > .rm-logbar-action-header { border-left-color: var(--color-warning); }
		.rm-logbar-action-entry.is-success    > .rm-logbar-action-header { border-left-color: var(--color-success); }
		.rm-logbar-action-entry.is-error      > .rm-logbar-action-header { border-left-color: var(--color-danger); }
		.rm-logbar-action-entry.is-cancelled  > .rm-logbar-action-header { border-left-color: var(--color-muted); }

		.rm-logbar-action-toggle
		{
			display: flex;
			align-items: center;
			gap: 8px;
			flex: 1 1 auto;
			min-width: 0;
			padding: 6px 10px;
			background: transparent;
			border: 0;
			color: var(--color-text);
			font: inherit;
			font-size: 12px;
			text-align: left;
			cursor: pointer;
		}
		.rm-logbar-action-toggle:hover
		{
			background: var(--color-panel-alt);
		}
		.rm-logbar-action-open
		{
			flex: 0 0 auto;
			padding: 0 10px;
			background: transparent;
			border: 0;
			border-left: 1px solid transparent;
			color: var(--color-muted);
			font: inherit;
			font-size: 13px;
			cursor: pointer;
		}
		.rm-logbar-action-open:hover
		{
			color: var(--brand-color-primary-mode, var(--color-accent));
			border-left-color: var(--color-border);
			background: var(--color-panel-alt);
		}

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
		.rm-logbar-action-entry.is-expanded > .rm-logbar-action-header > .rm-logbar-action-toggle > .rm-logbar-action-chevron
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
		.rm-logbar-queued-pill
		{
			margin-left: 8px;
			padding: 1px 8px;
			font-size: 10.5px;
			font-weight: 600;
			color: var(--color-warning);
			background: rgba(208, 156, 22, 0.12);
			border: 1px solid rgba(208, 156, 22, 0.5);
			border-radius: 10px;
			cursor: pointer;
			flex: 0 0 auto;
			user-select: none;
		}
		.rm-logbar-queued-pill:hover
		{
			background: rgba(208, 156, 22, 0.22);
			border-color: var(--color-warning);
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

		/* Scan tab — wide module table.  The whole tab scrolls (the
		   body class .tab-scan keeps overflow:auto) so the table can
		   exceed the viewport width without crushing columns. */
		.rm-logbar-body.tab-scan
		{
			padding: 0;
			font-family: var(--font-sans, inherit);
			font-size: 12px;
		}
		.rm-scan-filterbar
		{
			display: flex;
			align-items: center;
			gap: 12px;
			padding: 6px 10px;
			border-bottom: 1px solid var(--color-border);
			background: var(--color-panel-alt);
			position: sticky;
			top: 0;
			z-index: 2;
		}
		.rm-scan-filterbar input[type="search"]
		{
			flex: 0 0 220px;
			padding: 3px 8px;
			background: var(--color-bg);
			border: 1px solid var(--color-border);
			border-radius: 4px;
			color: var(--color-text);
			font: inherit;
		}
		.rm-scan-filterbar label
		{
			display: inline-flex;
			align-items: center;
			gap: 4px;
			color: var(--color-muted);
			font-size: 11px;
			cursor: pointer;
		}
		.rm-scan-filterbar .rm-scan-status
		{
			margin-left: auto;
			color: var(--color-muted);
			font-size: 11px;
		}
		.rm-scan-filterbar .rm-scan-freshness
		{
			color: var(--color-muted);
			font-size: 11px;
			white-space: nowrap;
		}
		/* Stale (>1h since the oldest fork's last fetch) — the drift counts may
		   lag a recent merge until you re-fetch upstream. */
		.rm-scan-filterbar .rm-scan-freshness.is-stale { color: var(--color-warning); }
		.rm-scan-table
		{
			width: 100%;
			border-collapse: collapse;
			font-variant-numeric: tabular-nums;
		}
		.rm-scan-table thead th
		{
			text-align: left;
			padding: 6px 8px;
			background: var(--color-panel-alt);
			border-bottom: 1px solid var(--color-border);
			color: var(--color-muted);
			font-size: 11px;
			font-weight: 600;
			letter-spacing: 0.3px;
			text-transform: uppercase;
			position: sticky;
			top: 30px;
			z-index: 1;
			cursor: pointer;
			user-select: none;
			white-space: nowrap;
		}
		.rm-scan-table thead th.is-numeric { text-align: right; }
		.rm-scan-table thead th .rm-scan-sort-indicator
		{
			margin-left: 4px;
			opacity: 0.7;
			font-size: 9px;
		}
		.rm-scan-table tbody td
		{
			padding: 6px 8px;
			border-bottom: 1px solid var(--color-border);
			color: var(--color-text);
			/* baseline so each row's text baseline lines up across all
			   columns — the gh/docs/npm chip text sits on the same
			   visual line as the module name, branch, and version. */
			vertical-align: baseline;
			white-space: nowrap;
		}
		.rm-scan-table tbody td.is-numeric { text-align: right; }
		.rm-scan-table tbody tr:hover { background: var(--color-panel-alt); }

		.rm-scan-table tbody tr.is-docs-only > td:first-child
		{
			border-left: 3px solid var(--color-info, #6aa3ff);
		}
		.rm-scan-table tbody tr.is-source-heavy > td:first-child
		{
			border-left: 3px solid var(--color-warning);
		}
		.rm-scan-table tbody tr.is-unpublished-bump > td:first-child
		{
			border-left: 3px solid var(--color-success);
		}
		/* Fork has drifted from the org (upstream) — ahead (PR-able) or behind
		   (needs sync). Only marks rows that aren't already flagged above. */
		.rm-scan-table tbody tr.is-drifted:not(.is-docs-only):not(.is-source-heavy):not(.is-unpublished-bump) > td:first-child
		{
			border-left: 3px solid #b07bd6;
		}
		.rm-scan-table tbody td.is-numeric .rm-scan-zero { color: var(--color-muted); }

		.rm-scan-module-name { font-weight: 600; }
		a.rm-scan-module-link
		{
			color: var(--color-text);
			text-decoration: none;
			cursor: pointer;
		}
		a.rm-scan-module-link:hover
		{
			color: var(--brand-color-primary-mode, var(--color-accent));
			text-decoration: underline;
		}
		.rm-scan-links
		{
			/* Inline flow — flex would force chips into their own
			   center-aligned line and break the row's text baseline.
			   Plain inline-block chips inherit the cell's baseline. */
			white-space: nowrap;
			line-height: 1;
		}
		.rm-scan-links .rm-scan-link
		{
			display: inline-block;
			margin-right: 4px;
			padding: 1px 6px;
			background: var(--color-panel-alt);
			border: 1px solid var(--color-border);
			border-radius: 3px;
			color: var(--color-muted);
			text-decoration: none;
			font-size: 11px;
			font-family: var(--font-mono);
			line-height: 1.4;
		}
		.rm-scan-links .rm-scan-link:last-child { margin-right: 0; }
		.rm-scan-links .rm-scan-link:hover
		{
			background: var(--color-panel);
			color: var(--brand-color-primary-mode, var(--color-accent));
			border-color: var(--brand-color-primary-mode, var(--color-accent));
		}
		.rm-scan-published-at
		{
			display: block;
			margin-top: 2px;
			color: var(--color-muted);
			font-size: 10px;
			font-family: var(--font-mono);
		}

		.rm-scan-table .rm-scan-select-col
		{
			width: 24px;
			min-width: 24px;
			text-align: center;
			padding-left: 6px;
			padding-right: 4px;
		}
		.rm-scan-table .rm-scan-select-col input[type="checkbox"]
		{
			cursor: pointer;
		}
		.rm-scan-selection-bar
		{
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 4px 10px;
			background: var(--color-panel-alt);
			border-bottom: 1px solid var(--color-border);
			position: sticky;
			top: 30px;
			z-index: 2;
			font-size: 11px;
			color: var(--color-text);
		}
		.rm-scan-selection-bar.is-empty { display: none; }
		.rm-scan-selection-bar .count
		{
			font-weight: 600;
			color: var(--brand-color-primary-mode, var(--color-accent));
		}
		.rm-scan-selection-bar .rm-scan-action
		{
			padding: 2px 10px;
			background: transparent;
			color: var(--color-muted);
			border: 1px solid var(--color-border);
			border-radius: 4px;
			font: inherit;
			font-size: 11px;
			cursor: pointer;
		}
		.rm-scan-selection-bar .rm-scan-action:hover
		{
			color: var(--brand-color-primary-mode, var(--color-accent));
			border-color: var(--brand-color-primary-mode, var(--color-accent));
		}
		.rm-scan-selection-bar .rm-scan-action.primary
		{
			background: var(--brand-color-primary-mode, var(--color-accent));
			color: var(--color-bg);
			border-color: var(--brand-color-primary-mode, var(--color-accent));
		}
		.rm-scan-selection-bar .rm-scan-action.primary:disabled
		{
			opacity: 0.5;
			cursor: not-allowed;
		}
		.rm-scan-version
		{
			font-family: var(--font-mono);
			font-size: 11px;
			color: var(--color-text);
		}
		.rm-scan-version.is-unpublished-bump  { color: var(--color-success); font-weight: 600; }
		.rm-scan-version.is-behind-published  { color: var(--color-warning); font-weight: 600; }
		.rm-scan-version.is-unpublished       { color: var(--color-muted); font-style: italic; }
		.rm-scan-version.is-unknown           { color: var(--color-muted); }

		.rm-scan-zero { color: var(--color-muted); }
		/* "Next action" chip — color-coded to match the sidebar action badge. */
		.rm-scan-table .rm-scan-next-col { white-space: nowrap; }
		.rm-scan-next
		{
			display: inline-block;
			font-size: 10px;
			font-weight: 600;
			padding: 1px 6px;
			border-radius: 8px;
			white-space: nowrap;
			color: var(--color-bg, #111);
		}
		.rm-scan-next--commit { background: var(--color-warning); }
		.rm-scan-next--pull   { background: #4cc9d4; }
		.rm-scan-next--push   { background: var(--color-accent); }
		.rm-scan-next--sync   { background: #b07bd6; }
		.rm-scan-next--pr     { background: var(--color-success); }
		.rm-scan-next--none   { background: transparent; color: var(--color-muted); }
		.rm-scan-delta-add    { color: var(--color-success); }
		.rm-scan-delta-remove { color: var(--color-danger); }
		.rm-scan-empty
		{
			padding: 20px;
			color: var(--color-muted);
			font-style: italic;
			text-align: center;
		}

		/* Fullscreen — when the LogBar root has .is-fullscreen, it
		   floats over the shell at full viewport size.  The shell's
		   panel host sets an inline height to track its resizable
		   size, so we need !important here to win against that. */
		.rm-logbar-host-fullscreen
		{
			position: fixed !important;
			top: 0 !important;
			left: 0 !important;
			right: 0 !important;
			bottom: 0 !important;
			width: 100vw !important;
			height: 100vh !important;
			max-width: 100vw !important;
			max-height: 100vh !important;
			z-index: 9000;
			background: var(--color-bg);
			border-top: 0 !important;
		}
		.rm-logbar-host-fullscreen .pict-modal-shell-panel-content,
		.rm-logbar-host-fullscreen .pict-modal-shell-panel-content-inner
		{
			height: 100% !important;
			max-height: none !important;
		}
		.rm-logbar-toolbar .rm-logbar-action.is-active
		{
			color: var(--brand-color-primary-mode, var(--color-accent));
			border-color: var(--brand-color-primary-mode, var(--color-accent));
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
	<button type="button" class="rm-logbar-tab {~D:Record.ActionsTabClass~}"
		onclick="_Pict.views['Manager-LogBar'].switchTab('actions');">Actions{~TS:Manager-LogBar-RunningDot-Template:Record.RunningDotSlot~}{~TS:Manager-LogBar-TabBadge-Template:Record.TabBadgeSlot~}</button>
	<button type="button" class="rm-logbar-tab {~D:Record.LogTabClass~}"
		onclick="_Pict.views['Manager-LogBar'].switchTab('log');">Log</button>
	<button type="button" class="rm-logbar-tab {~D:Record.ScanTabClass~}"
		onclick="_Pict.views['Manager-LogBar'].switchTab('scan');">Modules{~TS:Manager-LogBar-ScanBadge-Template:Record.ScanBadgeSlot~}</button>
	<span class="rm-logbar-spacer"></span>
	<span class="rm-logbar-meta">{~D:Record.MetaText~}</span>
	{~TS:Manager-LogBar-RefreshBtn-Template:Record.RefreshBtnSlot~}
	{~TS:Manager-LogBar-RescanBtn-Template:Record.RescanBtnSlot~}
	{~TS:Manager-LogBar-ExpandAllBtn-Template:Record.ExpandAllBtnSlot~}
	{~TS:Manager-LogBar-CollapseAllBtn-Template:Record.CollapseAllBtnSlot~}
	{~TS:Manager-LogBar-CancelBtn-Template:Record.CancelBtnSlot~}
	<button type="button" class="rm-logbar-action {~D:Record.FullscreenBtnClass~}"
		title="Toggle fullscreen for this tab"
		onclick="_Pict.views['Manager-LogBar'].toggleFullscreen();">{~D:Record.FullscreenBtnLabel~}</button>
	<button type="button" class="rm-logbar-action" title="Hide this log bar"
		onclick="_Pict.views['Manager-LogBar'].closePanel();">×</button>
</div>
<div class="rm-logbar-body {~D:Record.BodyClass~}" id="RM-LogBar-Body">{~TS:Manager-LogBar-LogState-Template:Record.LogStateSlot~}{~TS:Manager-LogBar-LogText-Template:Record.LogTextSlot~}{~TS:Manager-LogBar-ActionsEmpty-Template:Record.ActionsEmptySlot~}{~TS:Manager-LogBar-ActionEntry-Template:Record.ActionEntries~}{~TS:Manager-LogBar-ScanShell-Template:Record.ScanShellSlot~}</div>
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
		{
			Hash: 'Manager-LogBar-RescanBtn-Template',
			Template: /*html*/`<button type="button" class="rm-logbar-action" title="Re-scan every module — refreshes git status, version, and change stats" onclick="_Pict.views['Manager-Sidebar'].triggerScan();">Rescan</button>`
		},
		{
			Hash: 'Manager-LogBar-ScanBadge-Template',
			Template: /*html*/`<span class="rm-logbar-tab-badge">{~D:Record.Text~}</span>`
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
	<div class="rm-logbar-action-header">
		<button type="button" class="rm-logbar-action-toggle" onclick="_Pict.views['Manager-LogBar'].toggleEntry('{~D:Record.OperationIdJs~}');">
			<span class="rm-logbar-action-chevron"></span>
			<span class="rm-logbar-action-state"></span>
			<span class="rm-logbar-action-time" title="{~D:Record.StartedFull~}">{~D:Record.ClockTime~}</span>
			<span class="rm-logbar-action-label">{~D:Record.Label~}</span>
			<span class="rm-logbar-action-meta">{~D:Record.MetaText~}</span>
			{~TS:Manager-LogBar-QueuedPill-Template:Record.QueuedSlot~}
		</button>
		<button type="button" class="rm-logbar-action-open" title="Open this action in a fullscreen review modal" onclick="_Pict.views['Manager-Modal-ActionDetail'].open('{~D:Record.OperationIdJs~}'); event.stopPropagation();">↗</button>
	</div>
	<pre class="rm-logbar-action-body" data-action-body="{~D:Record.OperationId~}">{~TS:Manager-LogBar-EmptyLine-Template:Record.EmptyLineSlot~}{~TS:Manager-LogBar-Line-Template:Record.Lines~}</pre>
</div>
`
		},
		{
			Hash: 'Manager-LogBar-QueuedPill-Template',
			Template: /*html*/`<span class="rm-logbar-queued-pill" title="{~D:Record.Tooltip~}" onclick="event.stopPropagation(); _Pict.views['Manager-LogBar'].clearQueue();">+{~D:Record.Count~} queued</span>`
		},
		{
			Hash: 'Manager-LogBar-EmptyLine-Template',
			Template: /*html*/`<div class="line meta">(no output)</div>`
		},
		{
			Hash: 'Manager-LogBar-Line-Template',
			Template: /*html*/`<div class="line {~D:Record.Class~}">{~D:Record.Text~}</div>`
		},

		// ── Modules (scan) tab body ──────────────────────────────────
		// One template owns the whole sticky-header filter row + table
		// shell so a single replace re-renders cleanly when filter /
		// sort state changes.  Rows are repeated via {~TS:~}.
		{
			Hash: 'Manager-LogBar-ScanShell-Template',
			Template: /*html*/`
<div class="rm-scan-filterbar">
	<input type="search" id="RM-LogBar-ScanFilter" placeholder="filter modules…" value="{~D:Record.FilterQuery~}"
		oninput="_Pict.views['Manager-LogBar'].onScanFilterInput(this.value)">
	<label title="Anything with a pending next action (not in-sync)"><input type="checkbox" {~D:Record.DirtyOnlyChecked~} onchange="_Pict.views['Manager-LogBar'].onScanFlag('DirtyOnly', this.checked)"> needs action</label>
	<label><input type="checkbox" {~D:Record.AheadOnlyChecked~} onchange="_Pict.views['Manager-LogBar'].onScanFlag('AheadOnly', this.checked)"> ahead</label>
	<label><input type="checkbox" {~D:Record.BehindOnlyChecked~} onchange="_Pict.views['Manager-LogBar'].onScanFlag('BehindOnly', this.checked)"> behind</label>
	<label title="Fork is ahead of the org (upstream) — a PR would ship these commits"><input type="checkbox" {~D:Record.AheadUpstreamOnlyChecked~} onchange="_Pict.views['Manager-LogBar'].onScanFlag('AheadUpstreamOnly', this.checked)"> ahead of org</label>
	<label title="Fork is behind the org (upstream) — needs a sync"><input type="checkbox" {~D:Record.BehindUpstreamOnlyChecked~} onchange="_Pict.views['Manager-LogBar'].onScanFlag('BehindUpstreamOnly', this.checked)"> behind org</label>
	<label><input type="checkbox" {~D:Record.DocsOnlyChecked~} onchange="_Pict.views['Manager-LogBar'].onScanFlag('DocsOnly', this.checked)"> docs-only</label>
	<label><input type="checkbox" {~D:Record.UnpubBumpChecked~} onchange="_Pict.views['Manager-LogBar'].onScanFlag('UnpubBump', this.checked)"> unpublished bump</label>
	<label><input type="checkbox" {~D:Record.VersionMismatchChecked~} onchange="_Pict.views['Manager-LogBar'].onScanFlag('VersionMismatch', this.checked)"> version mismatch</label>
	<label><input type="checkbox" {~D:Record.IncludeExamplesChecked~} onchange="_Pict.views['Manager-LogBar'].setIncludeExamples(this.checked)"> include examples</label>
	<span class="rm-scan-status">{~D:Record.StatusText~}</span>
	<span class="rm-scan-freshness {~D:Record.OrgFreshnessClass~}" title="The ↑org / ↓org columns are computed from each fork's last fetch of upstream. Tick &quot;fetch upstreams on scan&quot; (sidebar) or run Update to refresh.">{~D:Record.OrgFreshnessText~}</span>
</div>
{~TS:Manager-LogBar-ScanSelectionBar-Template:Record.SelectionBarSlot~}
{~TS:Manager-LogBar-ScanEmpty-Template:Record.ScanEmptySlot~}
{~TS:Manager-LogBar-ScanTable-Template:Record.ScanTableSlot~}
`
		},
		{
			Hash: 'Manager-LogBar-ScanSelectionBar-Template',
			Template: /*html*/`
<div class="rm-scan-selection-bar {~D:Record.EmptyClass~}">
	<span class="count">{~D:Record.Count~} selected</span>
	<button type="button" class="rm-scan-action" onclick="_Pict.views['Manager-LogBar'].onScanClearSelection()">clear</button>
	<button type="button" class="rm-scan-action primary" onclick="_Pict.views['Manager-LogBar'].onScanRippleSelected()">Ripple selected →</button>
</div>
`
		},
		{
			Hash: 'Manager-LogBar-ScanEmpty-Template',
			Template: /*html*/`<div class="rm-scan-empty">{~D:Record.Message~}</div>`
		},
		{
			Hash: 'Manager-LogBar-ScanTable-Template',
			Template: /*html*/`
<table class="rm-scan-table">
	<thead><tr>
		<th class="rm-scan-select-col"><input type="checkbox" {~D:Record.SelectAllChecked~} title="Select / clear all visible rows" onclick="_Pict.views['Manager-LogBar'].onScanToggleSelectAll(this.checked)"></th>
		<th onclick="_Pict.views['Manager-LogBar'].onScanSort('Module')">Module<span class="rm-scan-sort-indicator">{~D:Record.SortMarkers.Module~}</span></th>
		<th>Links</th>
		<th onclick="_Pict.views['Manager-LogBar'].onScanSort('Branch')">Branch<span class="rm-scan-sort-indicator">{~D:Record.SortMarkers.Branch~}</span></th>
		<th class="is-numeric" onclick="_Pict.views['Manager-LogBar'].onScanSort('Ahead')">Ahead<span class="rm-scan-sort-indicator">{~D:Record.SortMarkers.Ahead~}</span></th>
		<th class="is-numeric" onclick="_Pict.views['Manager-LogBar'].onScanSort('Behind')">Behind<span class="rm-scan-sort-indicator">{~D:Record.SortMarkers.Behind~}</span></th>
		<th class="is-numeric" title="Your fork ahead of the org (upstream) — these would go in a PR" onclick="_Pict.views['Manager-LogBar'].onScanSort('AheadUpstream')">↑org<span class="rm-scan-sort-indicator">{~D:Record.SortMarkers.AheadUpstream~}</span></th>
		<th class="is-numeric" title="Your fork behind the org (upstream) — needs a sync" onclick="_Pict.views['Manager-LogBar'].onScanSort('BehindUpstream')">↓org<span class="rm-scan-sort-indicator">{~D:Record.SortMarkers.BehindUpstream~}</span></th>
		<th title="The single recommended next action (commit / push / pull / sync / PR), server-derived" onclick="_Pict.views['Manager-LogBar'].onScanSort('NextAction')">Next<span class="rm-scan-sort-indicator">{~D:Record.SortMarkers.NextAction~}</span></th>
		<th onclick="_Pict.views['Manager-LogBar'].onScanSort('Local')">Local<span class="rm-scan-sort-indicator">{~D:Record.SortMarkers.Local~}</span></th>
		<th onclick="_Pict.views['Manager-LogBar'].onScanSort('Published')">Published<span class="rm-scan-sort-indicator">{~D:Record.SortMarkers.Published~}</span></th>
		<th class="is-numeric" onclick="_Pict.views['Manager-LogBar'].onScanSort('Source')">Source<span class="rm-scan-sort-indicator">{~D:Record.SortMarkers.Source~}</span></th>
		<th class="is-numeric" onclick="_Pict.views['Manager-LogBar'].onScanSort('Tests')">Tests<span class="rm-scan-sort-indicator">{~D:Record.SortMarkers.Tests~}</span></th>
		<th class="is-numeric" onclick="_Pict.views['Manager-LogBar'].onScanSort('Docs')">Docs<span class="rm-scan-sort-indicator">{~D:Record.SortMarkers.Docs~}</span></th>
		<th class="is-numeric" onclick="_Pict.views['Manager-LogBar'].onScanSort('Tooling')">Tooling<span class="rm-scan-sort-indicator">{~D:Record.SortMarkers.Tooling~}</span></th>
		<th class="is-numeric" onclick="_Pict.views['Manager-LogBar'].onScanSort('Total')">Total<span class="rm-scan-sort-indicator">{~D:Record.SortMarkers.Total~}</span></th>
	</tr></thead>
	<tbody>{~TS:Manager-LogBar-ScanRow-Template:Record.Rows~}</tbody>
</table>
`
		},
		{
			Hash: 'Manager-LogBar-ScanRow-Template',
			Template: /*html*/`
<tr class="{~D:Record.RowClass~}" title="{~D:Record.Tooltip~}">
	<td class="rm-scan-select-col"><input type="checkbox" {~D:Record.SelectedChecked~} onclick="event.stopPropagation(); _Pict.views['Manager-LogBar'].onScanToggleRow('{~D:Record.ModuleJs~}', this.checked)"></td>
	<td><a class="rm-scan-module-name rm-scan-module-link" href="#/Module/{~D:Record.ModuleUrlEncoded~}">{~D:Record.Module~}</a></td>
	<td class="rm-scan-links">{~TS:Manager-LogBar-ScanLink-Gh-Template:Record.GhSlot~}{~TS:Manager-LogBar-ScanLink-Docs-Template:Record.DocsSlot~}{~TS:Manager-LogBar-ScanLink-Npm-Template:Record.NpmSlot~}</td>
	<td>{~D:Record.Branch~}</td>
	<td class="is-numeric">{~D:Record.AheadDisplay~}</td>
	<td class="is-numeric">{~D:Record.BehindDisplay~}</td>
	<td class="is-numeric">{~D:Record.AheadUpstreamDisplay~}</td>
	<td class="is-numeric">{~D:Record.BehindUpstreamDisplay~}</td>
	<td class="rm-scan-next-col">{~D:Record.NextActionDisplay~}</td>
	<td><span class="rm-scan-version">{~D:Record.LocalVersion~}</span></td>
	<td>
		<span class="rm-scan-version {~D:Record.PublishedClass~}">{~D:Record.PublishedVersion~}</span>
		{~TS:Manager-LogBar-ScanPublishedDate-Template:Record.PublishedAtSlot~}
	</td>
	<td class="is-numeric">{~D:Record.SourceCell~}</td>
	<td class="is-numeric">{~D:Record.TestsCell~}</td>
	<td class="is-numeric">{~D:Record.DocsCell~}</td>
	<td class="is-numeric">{~D:Record.ToolingCell~}</td>
	<td class="is-numeric">{~D:Record.TotalCell~}</td>
</tr>
`
		},
		{
			Hash: 'Manager-LogBar-ScanLink-Gh-Template',
			Template: /*html*/`<a class="rm-scan-link" href="{~D:Record.Url~}" target="_blank" rel="noopener" title="GitHub" onclick="event.stopPropagation()">gh</a>`
		},
		{
			Hash: 'Manager-LogBar-ScanLink-Docs-Template',
			Template: /*html*/`<a class="rm-scan-link" href="{~D:Record.Url~}" target="_blank" rel="noopener" title="Docs" onclick="event.stopPropagation()">docs</a>`
		},
		{
			Hash: 'Manager-LogBar-ScanLink-Npm-Template',
			Template: /*html*/`<a class="rm-scan-link" href="{~D:Record.Url~}" target="_blank" rel="noopener" title="npm" onclick="event.stopPropagation()">npm</a>`
		},
		{
			Hash: 'Manager-LogBar-ScanPublishedDate-Template',
			Template: /*html*/`<span class="rm-scan-published-at" title="{~D:Record.FullDate~}">{~D:Record.Relative~}</span>`
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
		this._tab = 'actions';               // 'actions' | 'log' | 'scan'  — Actions is the default landing
		this._lastSeenOpId = null;           // tracks new-op transition for auto-tab-switch
		this._lastSeenStateByOp = {};        // OperationId → last HeaderState we processed (drives auto-collapse-on-success)
		this._expandedEntries = {};          // OperationId → bool (Actions tab expand state)
		this._renderedUpToByOp = {};         // OperationId → number (append cursor for live streaming)
		this._rafPending = false;
		this._renderedOnce = false;
		this._fileLog = null;                // cached file-log fetch result (for re-render without re-fetch)
		this._fullscreen = false;            // toggled by toolbar fullscreen button

		// Scan tab UI state.  Persists for the session; filter strings
		// don't bleed into localStorage on purpose — they're a transient
		// "I'm looking at X" workflow, not a saved preference.
		this._scanFilter =
			{
				Query:              '',
				DirtyOnly:          false,
				AheadOnly:          false,
				BehindOnly:         false,
				AheadUpstreamOnly:  false,
				BehindUpstreamOnly: false,
				DocsOnly:           false,
				UnpubBump:          false,
				VersionMismatch:    false
			};
		this._scanSort = { Column: 'Module', Direction: 'asc' };

		// Multi-select state for "ripple selected" — Set of module names
		// chosen via the row checkboxes.  Persists for the session
		// across re-renders; cleared explicitly via the toolbar.
		this._scanSelected = new Set();
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

		// Restore focus on the scan-filter input when a keystroke triggered
		// this render — otherwise each typed character defocuses the field
		// (the old <input> DOM node is replaced when the whole shell
		// re-renders).  Single-shot so unrelated re-renders (a scan
		// landing, tab switch) don't steal focus.
		if (this._scanFilterFocusToRestore)
		{
			let tmpInput = document.getElementById('RM-LogBar-ScanFilter');
			if (tmpInput)
			{
				tmpInput.focus();
				let tmpLen = tmpInput.value.length;
				try { tmpInput.setSelectionRange(tmpLen, tmpLen); } catch (e) { /* search inputs may refuse */ }
			}
			this._scanFilterFocusToRestore = false;
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
		if (pTab !== 'log' && pTab !== 'actions' && pTab !== 'scan') return;
		if (this._tab === pTab) return;
		this._tab = pTab;
		this._renderFresh();
	}

	// Called by the sidebar when scan results land (and again when the
	// published-versions decoration arrives) so the table refreshes
	// without forcing the user to manually click between tabs.
	onScanResultsChanged()
	{
		if (this._tab === 'scan') { this._renderFresh(); }
	}

	// Sidebar's Scan button calls this so the user lands on the table
	// view immediately when they kick off a scan.
	openScanTab()
	{
		this._tab = 'scan';
		this._renderFresh();
	}

	onScanFilterInput(pValue)
	{
		this._scanFilter.Query = pValue || '';
		// Mirror the sidebar's pattern: ask onAfterRender to re-focus
		// the filter input so per-keystroke renders don't defocus it.
		this._scanFilterFocusToRestore = true;
		this._renderFresh();
	}

	onScanFlag(pName, pChecked)
	{
		this._scanFilter[pName] = !!pChecked;
		this._renderFresh();
	}

	// ─────────────────────────────────────────────
	//  Modules-table multi-select
	// ─────────────────────────────────────────────

	onScanToggleRow(pModule, pChecked)
	{
		if (!pModule) { return; }
		if (pChecked) { this._scanSelected.add(pModule); }
		else          { this._scanSelected.delete(pModule); }
		this._syncSelectedToAppData();
		this._patchSelectionUI();
	}

	onScanToggleSelectAll(pChecked)
	{
		// Operates on the CURRENTLY-VISIBLE filtered rows only, so a
		// narrow filter (e.g. "docs-only") + select-all picks exactly
		// the user's working set, not every module in the manifest.
		let tmpVisible = this._currentVisibleScanRows();
		if (pChecked)
		{
			for (let i = 0; i < tmpVisible.length; i++) { this._scanSelected.add(tmpVisible[i]); }
		}
		else
		{
			for (let i = 0; i < tmpVisible.length; i++) { this._scanSelected.delete(tmpVisible[i]); }
		}
		this._syncSelectedToAppData();
		// Mirror the header-checkbox flip onto every visible row checkbox
		// so the table stays in sync without re-rendering.
		let tmpRowChecks = document.querySelectorAll('.rm-scan-table tbody .rm-scan-select-col input[type="checkbox"]');
		for (let i = 0; i < tmpRowChecks.length; i++) { tmpRowChecks[i].checked = pChecked; }
		this._patchSelectionUI();
	}

	onScanClearSelection()
	{
		this._scanSelected.clear();
		this._syncSelectedToAppData();
		let tmpAllChecks = document.querySelectorAll('.rm-scan-table .rm-scan-select-col input[type="checkbox"]');
		for (let i = 0; i < tmpAllChecks.length; i++) { tmpAllChecks[i].checked = false; }
		this._patchSelectionUI();
	}

	// Surgically reflect _scanSelected into the DOM (selection-bar count +
	// visibility, header select-all state) without re-rendering the whole
	// scan panel. Re-rendering the panel would replace the table tbody and
	// lose the user's scroll position with every checkbox click.
	_patchSelectionUI()
	{
		let tmpCount = this._scanSelected.size;
		let tmpBar = document.querySelector('.rm-scan-selection-bar');
		if (tmpBar)
		{
			let tmpCountEl = tmpBar.querySelector('.count');
			if (tmpCountEl) { tmpCountEl.textContent = tmpCount + ' selected'; }
			if (tmpCount === 0) { tmpBar.classList.add('is-empty'); }
			else                { tmpBar.classList.remove('is-empty'); }
		}
		let tmpHeaderCheck = document.querySelector('.rm-scan-table thead .rm-scan-select-col input[type="checkbox"]');
		if (tmpHeaderCheck)
		{
			let tmpVisible = this._currentVisibleScanRows();
			tmpHeaderCheck.checked =
				(tmpVisible.length > 0)
				&& tmpVisible.every((pName) => this._scanSelected.has(pName));
		}
	}

	onScanRippleSelected()
	{
		if (this._scanSelected.size === 0) { return; }
		let tmpModal = this.pict.views['Manager-Modal-RipplePlan'];
		if (!tmpModal || typeof tmpModal.open !== 'function')
		{
			this.pict.PictApplication.setStatus('Ripple modal not registered');
			return;
		}
		// Open the modal in flat mode with the current selection as the
		// step list.  Modal handles the rest (operation toggles, commit
		// message, plan-then-run flow).
		tmpModal.open(null, { Mode: 'flat', Modules: Array.from(this._scanSelected) });
	}

	// Walk the latest scan results through the same filter pipeline
	// as _buildScanRecord so select-all targets exactly what the user
	// sees — without having to re-run _buildScanRecord (which would
	// also re-sort and rebuild rows).
	_currentVisibleScanRows()
	{
		let tmpResults = (this.pict.AppData.Manager.Scan && this.pict.AppData.Manager.Scan.Results) || {};
		let tmpIncludeEx = !!(this.pict.AppData.Manager.Filter && this.pict.AppData.Manager.Filter.IncludeExamples);
		let tmpQ = (this._scanFilter.Query || '').toLowerCase().trim();
		let tmpOut = [];
		let tmpNames = Object.keys(tmpResults);
		for (let i = 0; i < tmpNames.length; i++)
		{
			let tmpR = tmpResults[tmpNames[i]];
			if (!tmpR || tmpR.Error) { continue; }
			let tmpIsExample = (tmpR.Type || 'library') === 'example';
			if (!tmpIncludeEx && tmpIsExample) { continue; }
			let tmpName = tmpNames[i];
			if (tmpQ && tmpName.toLowerCase().indexOf(tmpQ) < 0) { continue; }
			let tmpRow = this._buildScanRow(tmpName, tmpR);
			if (this._scanFilter.DirtyOnly  && !tmpRow._IsDirty) { continue; }
			if (this._scanFilter.AheadOnly  && !(tmpRow._Ahead  > 0)) { continue; }
			if (this._scanFilter.BehindOnly && !(tmpRow._Behind > 0)) { continue; }
			if (this._scanFilter.AheadUpstreamOnly  && !(tmpRow._AheadUpstream  > 0)) { continue; }
			if (this._scanFilter.BehindUpstreamOnly && !(tmpRow._BehindUpstream > 0)) { continue; }
			if (this._scanFilter.DocsOnly   && !tmpRow._IsDocsOnly) { continue; }
			if (this._scanFilter.UnpubBump  && tmpRow._VersionState !== 'unpublished-bump') { continue; }
			if (this._scanFilter.VersionMismatch
				&& (tmpRow._VersionState !== 'unpublished-bump' && tmpRow._VersionState !== 'behind-published'))
			{ continue; }
			tmpOut.push(tmpName);
		}
		return tmpOut;
	}

	// Mirror the Set onto AppData so other views (Ripple modal) can
	// see the selection without reaching into this view's internals.
	_syncSelectedToAppData()
	{
		if (!this.pict.AppData.Manager) { return; }
		this.pict.AppData.Manager.SelectedModules = Array.from(this._scanSelected);
	}

	// Single source of truth for "include examples" lives on the
	// sidebar (it owns the localStorage persistence + the user-facing
	// setter).  Both surfaces flow through it so flipping the box on
	// either side keeps the badge and the sidebar in lock-step.
	setIncludeExamples(pChecked)
	{
		let tmpSidebar = this.pict.views['Manager-Sidebar'];
		if (tmpSidebar && typeof tmpSidebar.setIncludeExamples === 'function')
		{
			tmpSidebar.setIncludeExamples(!!pChecked);
		}
		else
		{
			this.pict.AppData.Manager.Filter.IncludeExamples = !!pChecked;
			this._renderFresh();
		}
	}

	onIncludeExamplesChanged()
	{
		// Sidebar flipped the flag — re-render so the badge + table
		// reflect the new include/exclude.
		this._renderFresh();
	}

	onScanSort(pColumn)
	{
		if (this._scanSort.Column === pColumn)
		{
			this._scanSort.Direction = (this._scanSort.Direction === 'asc') ? 'desc' : 'asc';
		}
		else
		{
			this._scanSort.Column = pColumn;
			// Most numeric columns are more useful descending first
			// (biggest changes / most ahead), so default the direction
			// per column type rather than dogmatically 'asc'.
			this._scanSort.Direction = (pColumn === 'Module' || pColumn === 'Branch'
				|| pColumn === 'Local' || pColumn === 'Published') ? 'asc' : 'desc';
		}
		this._renderFresh();
	}

	toggleFullscreen()
	{
		this._fullscreen = !this._fullscreen;
		// The LogBar mounts inside the shell's bottom panel.  Fullscreen
		// is implemented by toggling a class on the panel host element
		// (NOT the inner #RM-LogBar-Content) so the CSS `position:fixed`
		// takes the whole viewport.  When toggled off, the shell's
		// resizable-panel sizing takes over again automatically.
		let tmpHost = document.querySelector('[data-panel-hash="logbar"]')
			|| (document.getElementById('RM-LogBar-Content') && document.getElementById('RM-LogBar-Content').closest('.pict-modal-shell-panel'));
		if (tmpHost)
		{
			if (this._fullscreen) { tmpHost.classList.add('rm-logbar-host-fullscreen'); }
			else                  { tmpHost.classList.remove('rm-logbar-host-fullscreen'); }
		}
		// Re-render so the button reflects the new label.
		this._renderFresh();
	}

	closePanel()
	{
		// Fullscreen would be visually broken after a collapse-then-expand,
		// so drop out of it before letting the shell close.
		if (this._fullscreen) { this.toggleFullscreen(); }
		let tmpLayout = this.pict.views['Manager-Layout'];
		if (tmpLayout && typeof tmpLayout.getLogPanel === 'function')
		{
			let tmpPanel = tmpLayout.getLogPanel();
			if (tmpPanel) { tmpPanel.collapse(); }
		}
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

		// New op — auto-switch to Actions tab. Auto-expand the new entry
		// while it's running so the user sees output streaming in; if the
		// op was fast enough that its complete frame arrived before our
		// first rAF tick (`ncu`, `git pull` when in sync, `git push` when
		// nothing to push) the state-transition path below never sees a
		// 'running' → 'success' edge — handle that here by stamping the
		// last-seen state and collapsing-on-success up front.
		if (tmpOpId !== this._lastSeenOpId)
		{
			this._lastSeenOpId = tmpOpId;
			this._lastSeenStateByOp[tmpOpId] = tmpOp.HeaderState;
			this._expandedEntries[tmpOpId] = (tmpOp.HeaderState === 'success') ? false : true;
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
		let tmpIsScan    = (this._tab === 'scan');

		let tmpScanResults = (this.pict.AppData.Manager.Scan && this.pict.AppData.Manager.Scan.Results) || {};

		// Badge reflects the user's working count: real modules only by
		// default (examples — Type='example' — are filtered out unless
		// they explicitly opt in).  The full count is preserved in the
		// status text inside the Modules tab.  Error rows are skipped
		// from the badge entirely so a scan failure doesn't inflate
		// it; the table itself surfaces those errors separately.
		let tmpIncludeEx   = !!(this.pict.AppData.Manager.Filter && this.pict.AppData.Manager.Filter.IncludeExamples);
		let tmpScanNames   = Object.keys(tmpScanResults);
		let tmpRealCount   = 0;
		let tmpAllNonError = 0;
		for (let i = 0; i < tmpScanNames.length; i++)
		{
			let tmpRec = tmpScanResults[tmpScanNames[i]];
			if (!tmpRec || tmpRec.Error) { continue; }
			tmpAllNonError++;
			if ((tmpRec.Type || 'library') !== 'example') { tmpRealCount++; }
		}
		let tmpScanCount   = tmpIncludeEx ? tmpAllNonError : tmpRealCount;
		let tmpScanBadge   = tmpScanCount > 0 ? tmpScanCount.toString() : '';

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
		else if (tmpIsActions)
		{
			if (tmpRunning)                   { tmpMetaText = tmpRunning.Label || ''; }
			else if (tmpHistory.length === 0) { tmpMetaText = 'no actions yet'; }
			else                              { tmpMetaText = tmpHistory.length + ' recent action' + (tmpHistory.length === 1 ? '' : 's'); }
		}
		else
		{
			let tmpWhen = this.pict.AppData.Manager.Scan && this.pict.AppData.Manager.Scan.When;
			tmpMetaText = (tmpScanCount > 0)
				? (tmpScanCount + ' modules' + (tmpWhen ? '  scanned ' + this._friendlyTimestamp(tmpWhen) : ''))
				: 'no scan yet — click Rescan';
		}

		// Body slot decisions.
		let tmpLogStateSlot     = [];
		let tmpLogTextSlot      = [];
		let tmpActionsEmptySlot = [];
		let tmpActionEntries    = [];
		let tmpScanShellSlot    = [];
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
		else if (tmpIsActions)
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
		else
		{
			tmpScanShellSlot.push(this._buildScanRecord(tmpScanResults));
		}

		// Expand-all / collapse-all only make sense on the Actions tab and
		// when there's at least one entry to act on. We always show both
		// (even when all entries are already expanded or all collapsed) so
		// the toolbar's button set is stable while the user clicks around.
		let tmpHasEntries        = tmpIsActions && tmpHistory.length > 0;
		let tmpExpandAllBtnSlot  = tmpHasEntries ? [{}] : [];
		let tmpCollapseAllBtnSlot = tmpHasEntries ? [{}] : [];

		return {
			ActionsTabClass:     tmpIsActions ? 'is-active' : '',
			LogTabClass:         tmpIsLog     ? 'is-active' : '',
			ScanTabClass:        tmpIsScan    ? 'is-active' : '',
			RunningDotSlot:      tmpRunning ? [{}] : [],
			TabBadgeSlot:        tmpHistoryBadge ? [{ Text: tmpHistoryBadge }] : [],
			ScanBadgeSlot:       tmpScanBadge    ? [{ Text: tmpScanBadge }]    : [],
			MetaText:            tmpMetaText,
			RefreshBtnSlot:      tmpIsLog  ? [{}] : [],
			RescanBtnSlot:       tmpIsScan ? [{}] : [],
			ExpandAllBtnSlot:    tmpExpandAllBtnSlot,
			CollapseAllBtnSlot:  tmpCollapseAllBtnSlot,
			CancelBtnSlot:       (tmpIsActions && tmpRunning) ? [{}] : [],
			FullscreenBtnClass:  this._fullscreen ? 'is-active' : '',
			FullscreenBtnLabel:  this._fullscreen ? 'restore' : 'fullscreen',

			BodyClass:          tmpBodyClass,
			LogStateSlot:       tmpLogStateSlot,
			LogTextSlot:        tmpLogTextSlot,
			ActionsEmptySlot:   tmpActionsEmptySlot,
			ActionEntries:      tmpActionEntries,
			ScanShellSlot:      tmpScanShellSlot,
		};
	}

	// Builds the record consumed by the scan-shell template — handles
	// filter + sort + per-row classification.  Returns an object the
	// shell template iterates / dereferences directly.
	_buildScanRecord(pResults)
	{
		let tmpIncludeEx = !!(this.pict.AppData.Manager.Filter && this.pict.AppData.Manager.Filter.IncludeExamples);
		let tmpAllNames = Object.keys(pResults);
		let tmpRows = [];
		let tmpExampleCount = 0;
		for (let i = 0; i < tmpAllNames.length; i++)
		{
			let tmpName = tmpAllNames[i];
			let tmpR = pResults[tmpName];
			if (!tmpR) { continue; }
			// Count examples up-front (errored or not) so the status
			// text can report "82 hidden" / "82 shown" regardless of
			// whether each example produced a usable scan.
			let tmpIsExample = (tmpR.Type || 'library') === 'example';
			if (tmpIsExample) { tmpExampleCount++; }
			if (tmpR.Error) { continue; }
			if (!tmpIncludeEx && tmpIsExample) { continue; }
			tmpRows.push(this._buildScanRow(tmpName, tmpR));
		}

		// Apply filter.
		let tmpQ = (this._scanFilter.Query || '').toLowerCase().trim();
		let tmpFiltered = tmpRows.filter((pRow) =>
			{
				if (tmpQ && pRow.Module.toLowerCase().indexOf(tmpQ) < 0) { return false; }
				if (this._scanFilter.DirtyOnly  && !pRow._IsDirty)        { return false; }
				if (this._scanFilter.AheadOnly  && !((pRow._Ahead || 0)  > 0)) { return false; }
				if (this._scanFilter.BehindOnly && !((pRow._Behind || 0) > 0)) { return false; }
				if (this._scanFilter.AheadUpstreamOnly  && !((pRow._AheadUpstream || 0)  > 0)) { return false; }
				if (this._scanFilter.BehindUpstreamOnly && !((pRow._BehindUpstream || 0) > 0)) { return false; }
				if (this._scanFilter.DocsOnly   && !pRow._IsDocsOnly)     { return false; }
				if (this._scanFilter.UnpubBump  && pRow._VersionState !== 'unpublished-bump') { return false; }
				// "version mismatch" — local differs from published.
				// Treats unpublished modules as NOT a mismatch (there's
				// no published baseline to disagree with).
				if (this._scanFilter.VersionMismatch
					&& (pRow._VersionState !== 'unpublished-bump' && pRow._VersionState !== 'behind-published'))
				{
					return false;
				}
				return true;
			});

		// Apply sort.
		let tmpSortCol = this._scanSort.Column;
		let tmpDir     = this._scanSort.Direction === 'desc' ? -1 : 1;
		tmpFiltered.sort((pA, pB) =>
			{
				let tmpVa = pA['_sort_' + tmpSortCol];
				let tmpVb = pB['_sort_' + tmpSortCol];
				if (tmpVa === tmpVb) { return pA.Module.localeCompare(pB.Module); }
				if (tmpVa === null || tmpVa === undefined) { return 1; }
				if (tmpVb === null || tmpVb === undefined) { return -1; }
				if (typeof tmpVa === 'string')
				{
					return tmpDir * tmpVa.localeCompare(tmpVb);
				}
				return tmpDir * (tmpVa - tmpVb);
			});

		let tmpSortMarkers = {};
		let tmpSortCols = ['Module','Branch','Ahead','Behind','AheadUpstream','BehindUpstream','NextAction','Local','Published','Source','Tests','Docs','Tooling','Total'];
		for (let i = 0; i < tmpSortCols.length; i++)
		{
			tmpSortMarkers[tmpSortCols[i]] = (tmpSortCols[i] === tmpSortCol)
				? (this._scanSort.Direction === 'desc' ? '▼' : '▲')
				: '';
		}

		let tmpStatusText = tmpFiltered.length + ' / ' + tmpRows.length + ' modules';
		if (tmpExampleCount > 0)
		{
			tmpStatusText += tmpIncludeEx
				? ' · ' + tmpExampleCount + ' examples shown'
				: ' · ' + tmpExampleCount + ' examples hidden';
		}

		// Selection: each visible row gets a checked/unchecked flag
		// based on _scanSelected.  Select-all checkbox in the header
		// is "checked" only when every visible row is currently
		// selected (the natural meaning for a header toggle that
		// operates on the visible filter).
		let tmpVisibleAllSelected = tmpFiltered.length > 0;
		for (let i = 0; i < tmpFiltered.length; i++)
		{
			let tmpIsSel = this._scanSelected.has(tmpFiltered[i].Module);
			tmpFiltered[i].SelectedChecked = tmpIsSel ? 'checked' : '';
			tmpFiltered[i].ModuleJs        = this._jsString(tmpFiltered[i].Module);
			if (!tmpIsSel) { tmpVisibleAllSelected = false; }
		}

		let tmpEmptySlot  = (tmpFiltered.length === 0) ? [{ Message: 'No modules match the current filter.' }] : [];
		let tmpTableSlot  = (tmpFiltered.length > 0)
			? [{
					SortMarkers:      tmpSortMarkers,
					Rows:             tmpFiltered,
					SelectAllChecked: tmpVisibleAllSelected ? 'checked' : ''
				}]
			: [];

		// Selection bar is always emitted so per-row checkbox clicks can
		// patch the count via the DOM without forcing a full re-render
		// (which would otherwise scroll the table back to the top). The
		// is-empty class hides it via CSS when nothing is selected.
		let tmpSelectionBarSlot =
		[{
			Count:      this._scanSelected.size,
			EmptyClass: (this._scanSelected.size === 0) ? 'is-empty' : ''
		}];

		return {
			FilterQuery:             this._scanFilter.Query,
			OrgFreshnessText:        this._orgFreshness(pResults).Text,
			OrgFreshnessClass:       this._orgFreshness(pResults).Class,
			DirtyOnlyChecked:        this._scanFilter.DirtyOnly       ? 'checked' : '',
			AheadOnlyChecked:        this._scanFilter.AheadOnly       ? 'checked' : '',
			BehindOnlyChecked:       this._scanFilter.BehindOnly      ? 'checked' : '',
			AheadUpstreamOnlyChecked:  this._scanFilter.AheadUpstreamOnly  ? 'checked' : '',
			BehindUpstreamOnlyChecked: this._scanFilter.BehindUpstreamOnly ? 'checked' : '',
			DocsOnlyChecked:         this._scanFilter.DocsOnly        ? 'checked' : '',
			UnpubBumpChecked:        this._scanFilter.UnpubBump       ? 'checked' : '',
			VersionMismatchChecked:  this._scanFilter.VersionMismatch ? 'checked' : '',
			IncludeExamplesChecked:  tmpIncludeEx                     ? 'checked' : '',
			StatusText:              tmpStatusText,
			SelectionBarSlot:        tmpSelectionBarSlot,
			ScanEmptySlot:           tmpEmptySlot,
			ScanTableSlot:           tmpTableSlot
		};
	}

	// _jsString — escape for safe inclusion inside single-quoted inline JS
	_jsString(pVal)
	{
		return String(pVal || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n');
	}

	_buildScanRow(pName, pR)
	{
		let tmpChanges = pR.Changes || { Source: {}, Tests: {}, Documentation: {}, Tooling: {}, Total: {} };
		let tmpSrc  = tmpChanges.Source        || { Files: 0, Added: 0, Removed: 0 };
		let tmpTst  = tmpChanges.Tests         || { Files: 0, Added: 0, Removed: 0 };
		let tmpDoc  = tmpChanges.Documentation || { Files: 0, Added: 0, Removed: 0 };
		let tmpTool = tmpChanges.Tooling       || { Files: 0, Added: 0, Removed: 0 };
		let tmpTot  = tmpChanges.Total         || { Files: 0, Added: 0, Removed: 0 };

		let tmpIsDirty = libScanState.needsAction(pR);
		let tmpIsDocsOnly = (tmpDoc.Files > 0) && (tmpSrc.Files + tmpTst.Files + tmpTool.Files === 0);
		let tmpIsSourceHeavy = (tmpSrc.Files > 0) && (tmpSrc.Added + tmpSrc.Removed) >= 100;
		let tmpHasDrift = (pR.AheadUpstream || 0) > 0 || (pR.BehindUpstream || 0) > 0;

		let tmpRowClass = [];
		if (tmpIsDocsOnly)                            { tmpRowClass.push('is-docs-only'); }
		else if (tmpIsSourceHeavy)                    { tmpRowClass.push('is-source-heavy'); }
		if (pR.VersionState === 'unpublished-bump')   { tmpRowClass.push('is-unpublished-bump'); }
		if (tmpHasDrift)                              { tmpRowClass.push('is-drifted'); }

		let tmpPublishedClass = pR.VersionState ? ('is-' + pR.VersionState) : 'is-unknown';
		let tmpPublishedText  = (pR.PublishedVersion !== null && pR.PublishedVersion !== undefined)
			? pR.PublishedVersion
			: (pR.VersionState === 'unpublished' ? 'unpublished' : (pR.VersionState === 'unknown' ? '—' : ''));

		let tmpTooltipParts = [];
		if (tmpIsDirty)               { tmpTooltipParts.push('dirty'); }
		if ((pR.Ahead  || 0) > 0)     { tmpTooltipParts.push(pR.Ahead  + ' ahead (fork)'); }
		if ((pR.Behind || 0) > 0)     { tmpTooltipParts.push(pR.Behind + ' behind (fork)'); }
		if ((pR.AheadUpstream  || 0) > 0) { tmpTooltipParts.push(pR.AheadUpstream  + ' ahead of org'); }
		if ((pR.BehindUpstream || 0) > 0) { tmpTooltipParts.push(pR.BehindUpstream + ' behind org'); }
		if (pR.VersionState === 'unpublished-bump') { tmpTooltipParts.push('local ' + pR.LocalVersion + ' > published ' + pR.PublishedVersion); }
		let tmpTooltip = tmpTooltipParts.length > 0 ? tmpTooltipParts.join(' · ') : '';

		// Mini-links come from the manifest entry — same source the
		// workspace header uses.  Look up by module name; if the entry
		// isn't loaded yet, slots stay empty.
		let tmpManifestEntry = this._findModuleEntry(pName);
		let tmpGhSlot   = (tmpManifestEntry && tmpManifestEntry.GitHub)
			? [{ Url: tmpManifestEntry.GitHub }] : [];
		let tmpDocsSlot = (tmpManifestEntry && tmpManifestEntry.Documentation)
			? [{ Url: tmpManifestEntry.Documentation }] : [];
		let tmpNpmSlot  = pR.PackageName
			? [{ Url: 'https://www.npmjs.com/package/' + encodeURIComponent(pR.PackageName) }]
			: [];

		// Published-at sub-line — only shown when we have a timestamp;
		// FullDate hover gives the precise value, Relative is the
		// human-readable "3d ago" the user sees inline.
		let tmpPubAtSlot = [];
		if (pR.PublishedAt)
		{
			tmpPubAtSlot.push({
				FullDate: pR.PublishedAt,
				Relative: this._friendlyTimestamp(pR.PublishedAt)
			});
		}

		return {
			Module:             pName,
			ModuleUrlEncoded:   encodeURIComponent(pName),
			Branch:             pR.Branch || '',
			AheadDisplay:       this._renderCount(pR.Ahead),
			BehindDisplay:      this._renderCount(pR.Behind),
			AheadUpstreamDisplay:  this._renderCount(pR.ForkAheadUpstream),
			BehindUpstreamDisplay: this._renderCount(pR.ForkBehindUpstream),
			NextActionDisplay:     this._nextActionCell(pR),
			LocalVersion:       pR.LocalVersion || '—',
			PublishedVersion:   tmpPublishedText,
			PublishedClass:     tmpPublishedClass,
			PublishedAtSlot:    tmpPubAtSlot,
			SourceCell:         this._renderChangeCell(tmpSrc),
			TestsCell:          this._renderChangeCell(tmpTst),
			DocsCell:           this._renderChangeCell(tmpDoc),
			ToolingCell:        this._renderChangeCell(tmpTool),
			TotalCell:          this._renderChangeCell(tmpTot),
			RowClass:           tmpRowClass.join(' '),
			Tooltip:            tmpTooltip,
			GhSlot:             tmpGhSlot,
			DocsSlot:           tmpDocsSlot,
			NpmSlot:            tmpNpmSlot,

			// Internals used by filter + sort — prefix-protected so they
			// don't accidentally bind in the template (which uses {~D:~}
			// only on the keys it knows).
			_IsDirty:         tmpIsDirty,
			_IsDocsOnly:      tmpIsDocsOnly,
			_Ahead:           pR.Ahead  || 0,
			_Behind:          pR.Behind || 0,
			_AheadUpstream:   pR.ForkAheadUpstream  || 0,
			_BehindUpstream:  pR.ForkBehindUpstream || 0,
			_NextAction:      libScanState.nextAction(pR),
			_VersionState:    pR.VersionState,
			_sort_Module:     pName.toLowerCase(),
			_sort_Branch:     (pR.Branch || '').toLowerCase(),
			_sort_Ahead:      pR.Ahead  || 0,
			_sort_Behind:     pR.Behind || 0,
			_sort_AheadUpstream:  pR.ForkAheadUpstream  || 0,
			_sort_BehindUpstream: pR.ForkBehindUpstream || 0,
			_sort_NextAction:     libScanState.actionRank(pR),
			_sort_Local:      pR.LocalVersion     || '',
			_sort_Published:  pR.PublishedVersion || '',
			_sort_Source:     tmpSrc.Added + tmpSrc.Removed,
			_sort_Tests:      tmpTst.Added + tmpTst.Removed,
			_sort_Docs:       tmpDoc.Added + tmpDoc.Removed,
			_sort_Tooling:    tmpTool.Added + tmpTool.Removed,
			_sort_Total:      tmpTot.Added + tmpTot.Removed
		};
	}

	// Find the manifest entry for a module by name.  Builds a memoized
	// lookup map on first use so we don't scan the array 100+ times per
	// render.  Invalidates when AppData.Manager.Modules is replaced.
	_findModuleEntry(pName)
	{
		let tmpAll = (this.pict.AppData.Manager && this.pict.AppData.Manager.Modules) || [];
		if (this._moduleIndexFor !== tmpAll)
		{
			this._moduleIndex    = {};
			this._moduleIndexFor = tmpAll;
			for (let i = 0; i < tmpAll.length; i++)
			{
				if (tmpAll[i] && tmpAll[i].Name) { this._moduleIndex[tmpAll[i].Name] = tmpAll[i]; }
			}
		}
		return this._moduleIndex[pName] || null;
	}

	// Freshness of the ↑org/↓org columns: they reflect each fork's last upstream
	// fetch, so report the oldest age across forks and flag it stale. Lets a
	// merged-but-not-refetched module read "as of N ago" instead of silently wrong.
	_orgFreshness(pResults)
	{
		let tmpTimes = [];
		let tmpNames = Object.keys(pResults || {});
		for (let i = 0; i < tmpNames.length; i++)
		{
			let tmpE = pResults[tmpNames[i]];
			if (tmpE && tmpE.HasUpstreamRef && tmpE.UpstreamFetchedAt)
			{
				let tmpT = Date.parse(tmpE.UpstreamFetchedAt);
				if (tmpT) { tmpTimes.push(tmpT); }
			}
		}
		if (tmpTimes.length === 0) { return { Text: '', Class: '' }; }
		let tmpAgeMin = Math.floor((Date.now() - Math.min.apply(null, tmpTimes)) / 60000);
		let tmpAgeStr = tmpAgeMin < 1 ? 'moments ago'
			: tmpAgeMin < 60 ? tmpAgeMin + 'm ago'
			: tmpAgeMin < 1440 ? Math.floor(tmpAgeMin / 60) + 'h ago'
			: Math.floor(tmpAgeMin / 1440) + 'd ago';
		return { Text: '· org drift as of ' + tmpAgeStr, Class: (tmpAgeMin > 60) ? 'is-stale' : '' };
	}

	// Build a single category cell as "N (+A -R)" or "—" when empty.
	_renderChangeCell(pBucket)
	{
		if (!pBucket || !pBucket.Files) { return '<span class="rm-scan-zero">—</span>'; }
		let tmpFiles   = pBucket.Files;
		let tmpAdded   = pBucket.Added   || 0;
		let tmpRemoved = pBucket.Removed || 0;
		let tmpDelta = '';
		if (tmpAdded   > 0) { tmpDelta += '<span class="rm-scan-delta-add">+'   + tmpAdded   + '</span>'; }
		if (tmpRemoved > 0) { tmpDelta += (tmpDelta ? ' ' : '') + '<span class="rm-scan-delta-remove">-' + tmpRemoved + '</span>'; }
		return tmpFiles + (tmpDelta ? ' (' + tmpDelta + ')' : '');
	}

	_renderCount(pN)
	{
		if (!pN || pN === 0) { return '<span class="rm-scan-zero">—</span>'; }
		return String(pN);
	}

	// "Next action" cell — a colored chip from the shared (server-driven) state
	// map, or a muted dash when the module is in sync.
	_nextActionCell(pR)
	{
		if (libScanState.nextAction(pR) === 'in-sync') { return '<span class="rm-scan-zero">—</span>'; }
		let tmpMeta = libScanState.actionMeta(pR);
		return '<span class="rm-scan-next rm-scan-next--' + (tmpMeta.Badge || 'none') + '">' + tmpMeta.Label + '</span>';
	}

	_friendlyTimestamp(pIso)
	{
		try
		{
			let tmpD = new Date(pIso);
			let tmpDelta = Math.floor((Date.now() - tmpD.getTime()) / 1000);
			if (tmpDelta < 60)       { return 'just now'; }
			if (tmpDelta < 3600)     { return Math.floor(tmpDelta / 60)   + 'm ago'; }
			if (tmpDelta < 86400)    { return Math.floor(tmpDelta / 3600) + 'h ago'; }
			return tmpD.toLocaleString();
		}
		catch (e) { return pIso; }
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

		// "+N queued" pill — only the currently-running entry surfaces it,
		// and only when the operation queue (driven by enqueueOperation)
		// has pending items. Lets users see at a glance that their next
		// click is waiting in line, and click-to-clear to drop pending
		// operations without affecting the running one.
		let tmpQueuedSlot = [];
		if (pEntry.State === 'running')
		{
			let tmpQueue = (this.pict.AppData.Manager && this.pict.AppData.Manager.OperationQueue) || [];
			if (tmpQueue.length > 0)
			{
				let tmpTooltipParts = ['Queued (click to clear):'];
				for (let i = 0; i < tmpQueue.length; i++)
				{
					let tmpQ = tmpQueue[i];
					tmpTooltipParts.push(
						'  ' + (i + 1) + '. ' + (tmpQ.Label || 'operation')
						+ (tmpQ.ModuleName ? ' (' + tmpQ.ModuleName + ')' : ''));
				}
				tmpQueuedSlot.push({ Count: tmpQueue.length, Tooltip: tmpTooltipParts.join('\n') });
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
			QueuedSlot:    tmpQueuedSlot,
		};
	}

	// Drop every queued operation without touching the currently-running
	// one. Exposed for the queued-pill click handler.
	clearQueue()
	{
		let tmpProv = this.pict.providers.ManagerOperationsWS;
		if (tmpProv && typeof tmpProv.clearOperationQueue === 'function') { tmpProv.clearOperationQueue(); }
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
