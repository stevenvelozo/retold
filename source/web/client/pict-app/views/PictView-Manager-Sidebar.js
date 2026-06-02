const libPictView = require('pict-view');

// Shared "dirty" classification — same source of truth the LogBar Scan table
// uses, so the sidebar's "Dirty only" filter / badges and the bottom table's
// "dirty" filter never disagree.
const libScanState = require('../Manager-Scan-State.js');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Sidebar',

	DefaultRenderable:            'Manager-Sidebar-Shell',
	DefaultDestinationAddress:    '#RM-Sidebar-Content',
	DefaultTemplateRecordAddress: 'AppData.Manager',

	AutoRender: false,

	CSS: /*css*/`
		.dirty-badge
		{
			display: inline-block;
			width: 7px;
			height: 7px;
			border-radius: 50%;
			background: var(--color-warning); /* legacy fallback */
			margin-left: 6px;
			vertical-align: middle;
		}
		/* Action-coded: the dot color = the single recommended next action
		   (server-derived). commit (orange) · pull-from-fork (cyan) ·
		   push (blue) · sync-from-upstream (purple) · open-PR (green). */
		.dirty-badge.dirty-badge--commit { background: var(--color-warning); }
		.dirty-badge.dirty-badge--pull   { background: #4cc9d4; }
		.dirty-badge.dirty-badge--push   { background: var(--color-accent); }
		.dirty-badge.dirty-badge--sync   { background: #b07bd6; }
		.dirty-badge.dirty-badge--pr     { background: var(--color-success); }

		/* Hint next to the "fetch upstreams on scan" checkbox. Its own class so
		   the examples-count DOM patch (which querySelectors .rm-examples-count)
		   doesn't overwrite it. */
		.rm-fetch-hint { color: var(--color-muted); font-size: 11px; margin-left: 4px; }

		/* ── Sidebar tab strip ─────────────────────────────────────
		   Three top-level surfaces in the sidebar: Modules / Files /
		   Search.  Tabs are flush rows of buttons at the very top of
		   the sidebar; only the active tab's body is rendered into
		   AppData so we never carry stale state into a hidden pane. */
		.rm-sidebar-tabs
		{
			display: flex;
			gap: 4px;
			padding: 6px 8px 0 8px;
			border-bottom: 1px solid var(--color-border);
		}
		.rm-sidebar-tab
		{
			padding: 4px 10px 6px;
			background: transparent;
			color: var(--color-muted);
			border: 0;
			border-bottom: 2px solid transparent;
			font: inherit;
			font-size: 11px;
			font-weight: 600;
			letter-spacing: 0.4px;
			text-transform: uppercase;
			cursor: pointer;
		}
		.rm-sidebar-tab:hover { color: var(--color-text); }
		.rm-sidebar-tab.is-active
		{
			color: var(--brand-color-primary-mode, var(--color-text));
			border-bottom-color: var(--brand-color-primary-mode, var(--color-accent));
		}

		/* ── Files tab ─────────────────────────────────────────── */
		/* Wrapper for the canonical pict-section-filebrowser mount.
		   The section's own CSS handles list + breadcrumb styling;
		   we only need to size the mount target. */
		.rm-files-mount
		{
			display: flex;
			flex-direction: column;
			flex: 1 1 auto;
			min-height: 0;
		}
		.rm-files-no-module
		{
			padding: 16px 12px;
			color: var(--color-muted);
			font-size: 12px;
			font-style: italic;
			text-align: center;
		}

		/* ── Search tab ───────────────────────────────────────── */
		.rm-search-bar
		{
			padding: 6px 8px;
			border-bottom: 1px solid var(--color-border);
		}
		.rm-search-bar input[type="search"]
		{
			width: 100%;
			padding: 4px 8px;
			background: var(--color-bg);
			color: var(--color-text);
			border: 1px solid var(--color-border);
			border-radius: 4px;
			font: inherit;
			font-size: 12px;
		}
		.rm-search-bar input[type="search"] + input[type="search"]
		{
			margin-top: 4px;
			font-size: 11px;
			font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
			color: var(--color-muted);
		}
		.rm-search-scope
		{
			display: flex;
			gap: 8px;
			margin-top: 6px;
			color: var(--color-muted);
			font-size: 11px;
		}
		.rm-search-scope label { cursor: pointer; }
		.rm-search-meta
		{
			padding: 4px 10px;
			color: var(--color-muted);
			font-size: 11px;
			font-style: italic;
		}
		.rm-search-results { padding: 2px 0; }
		.rm-search-result
		{
			display: block;
			padding: 4px 10px;
			border-bottom: 1px solid var(--color-border);
			color: var(--color-text);
			text-decoration: none;
			cursor: pointer;
		}
		.rm-search-result:hover { background: var(--color-panel-alt); }
		.rm-search-result-path
		{
			font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
			font-size: 11px;
			color: var(--color-muted);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.rm-search-result-text
		{
			font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
			font-size: 11px;
			color: var(--color-text);
			margin-top: 2px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.rm-search-result-text mark
		{
			background: var(--brand-color-primary-mode, var(--color-accent));
			color: var(--color-bg, #000);
			padding: 0 1px;
			border-radius: 2px;
		}
	`,

	Templates:
	[
		{
			Hash: 'Manager-Sidebar-Shell-Template',
			Template: /*html*/`
<div class="rm-sidebar-tabs">
	<button type="button" class="rm-sidebar-tab {~D:Record.SidebarMeta.TabModulesClass~}"
		onclick="_Pict.views['Manager-Sidebar'].switchTab('modules')">Modules</button>
	<button type="button" class="rm-sidebar-tab {~D:Record.SidebarMeta.TabFilesClass~}"
		onclick="_Pict.views['Manager-Sidebar'].switchTab('files')">Files</button>
	<button type="button" class="rm-sidebar-tab {~D:Record.SidebarMeta.TabSearchClass~}"
		onclick="_Pict.views['Manager-Sidebar'].switchTab('search')">Search</button>
</div>
{~TS:Manager-Sidebar-ModulesPane-Template:Record.SidebarMeta.ModulesPaneSlot~}
{~TS:Manager-Sidebar-FilesPane-Template:Record.SidebarMeta.FilesPaneSlot~}
{~TS:Manager-Sidebar-SearchPane-Template:Record.SidebarMeta.SearchPaneSlot~}
`
		},
		{
			Hash: 'Manager-Sidebar-ModulesPane-Template',
			Template: /*html*/`
<div id="RM-SidebarHeader">
	<div class="sidebar-search-row">
		<input type="search" id="RM-SidebarSearch" placeholder="Filter modules..."
			value="{~D:Record.Filter.Query~}"
			oninput="_Pict.views['Manager-Sidebar'].setFilter(this.value)">
		<button id="RM-ScanButton" title="Scan all modules for changes"
			onclick="_Pict.views['Manager-Sidebar'].triggerScan()">Scan</button>
	</div>
	<label class="sidebar-checkbox">
		<input type="checkbox" id="RM-FetchRemotes"
			onchange="_Pict.views['Manager-Sidebar'].setScanFetch(this.checked)">
		Fetch upstreams on scan
		<span class="rm-fetch-hint" title="Slower: runs git fetch upstream per forkable module so the org drift counts are exact rather than as-of-last-fetch">(exact org drift)</span>
	</label>
	<label class="sidebar-checkbox">
		<input type="checkbox" id="RM-DirtyOnly"
			onchange="_Pict.views['Manager-Sidebar'].setDirtyOnly(this.checked)">
		Needs action
	</label>
	<label class="sidebar-checkbox">
		<input type="checkbox" id="RM-SortByTime"
			onchange="_Pict.views['Manager-Sidebar'].setSortByTime(this.checked)">
		Sort by time
		<span id="RM-ScanMeta">{~D:Record.ScanMetaText~}</span>
	</label>
	<label class="sidebar-checkbox">
		<input type="checkbox" id="RM-IncludeExamples"
			onchange="_Pict.views['Manager-Sidebar'].setIncludeExamples(this.checked)">
		Include examples
		<span class="rm-examples-count">{~D:Record.ExamplesMetaText~}</span>
	</label>
</div>
<nav id="RM-ModuleList">
	{~TS:Manager-Sidebar-Empty-Template:Record.EmptySlot~}
	{~TS:Manager-Sidebar-Group-Template:Record.Groups~}
</nav>
`
		},
		{
			Hash: 'Manager-Sidebar-FilesPane-Template',
			Template: /*html*/`
{~TS:Manager-Sidebar-FilesNoModule-Template:Record.NoModuleSlot~}
<div id="RM-Sidebar-FilesPane-Mount" class="rm-files-mount"></div>
`
		},
		{
			Hash: 'Manager-Sidebar-FilesNoModule-Template',
			Template: /*html*/`<div class="rm-files-no-module">Pick a module on the Modules tab to browse files.</div>`
		},
		{
			Hash: 'Manager-Sidebar-SearchPane-Template',
			Template: /*html*/`
<div class="rm-search-bar">
	<input type="search" id="RM-SidebarSearchQ" placeholder="search…" value="{~D:Record.Query~}"
		oninput="_Pict.views['Manager-Sidebar'].onSearchInput(this.value)"
		onkeydown="if (event.key === 'Enter') { _Pict.views['Manager-Sidebar'].runSearch(); }">
	<input type="search" id="RM-SidebarSearchTypes" placeholder="types: js,json,md (optional)" value="{~D:Record.Types~}"
		title="Comma-separated file types or extensions (e.g. js,json,md). Leave empty to search all files."
		oninput="_Pict.views['Manager-Sidebar'].onSearchTypesInput(this.value)"
		onkeydown="if (event.key === 'Enter') { _Pict.views['Manager-Sidebar'].runSearch(); }">
	<div class="rm-search-scope">
		<label><input type="radio" name="rm-search-scope" value="module" {~D:Record.ScopeModuleChecked~}
			onchange="_Pict.views['Manager-Sidebar'].setSearchScope('module')"> this module</label>
		<label><input type="radio" name="rm-search-scope" value="repo" {~D:Record.ScopeRepoChecked~}
			onchange="_Pict.views['Manager-Sidebar'].setSearchScope('repo')"> whole repo</label>
	</div>
</div>
<div class="rm-search-meta">{~D:Record.MetaText~}</div>
<nav class="rm-search-results">{~TS:Manager-Sidebar-SearchResult-Template:Record.Results~}</nav>
`
		},
		{
			Hash: 'Manager-Sidebar-SearchResult-Template',
			Template: /*html*/`<a class="rm-search-result" onclick="_Pict.views['Manager-Sidebar'].onSearchResultClick('{~D:Record.ModuleJs~}', '{~D:Record.PathJs~}', '{~D:Record.Line~}')"><div class="rm-search-result-path">{~D:Record.Display~}:{~D:Record.Line~}</div><div class="rm-search-result-text">{~D:Record.HighlightedText~}</div></a>`
		},
		{
			Hash: 'Manager-Sidebar-Empty-Template',
			Template: /*html*/`<p class="loading">{~D:Record.Message~}</p>`
		},
		{
			Hash: 'Manager-Sidebar-Group-Template',
			Template: /*html*/`
<div class="group">
	<div class="group-header">{~D:Record.Title~}</div>
	{~TS:Manager-Sidebar-Row-Template:Record.Rows~}
</div>
`
		},
		{
			Hash: 'Manager-Sidebar-Row-Template',
			Template: /*html*/`<a class="{~D:Record.RowClass~}" href="#/Module/{~D:Record.NameUrlEncoded~}">{~D:Record.Name~}{~TS:Manager-Sidebar-DirtyBadge-Template:Record.DirtySlot~}</a>`
		},
		{
			Hash: 'Manager-Sidebar-DirtyBadge-Template',
			Template: /*html*/` <span class="dirty-badge dirty-badge--{~D:Record.State~}" title="{~D:Record.Tooltip~}"></span>`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Sidebar-Shell',
			TemplateHash:       'Manager-Sidebar-Shell-Template',
			DestinationAddress: '#RM-Sidebar-Content',
			RenderMethod:       'replace',
		}
	]
};

const GROUP_ORDER = ['Fable', 'Meadow', 'Orator', 'Pict', 'Utility', 'Apps'];

const LS_KEY_FILTER          = 'rm:filter:query';
const LS_KEY_DIRTY_ONLY      = 'rm:filter:dirtyOnly';
const LS_KEY_SORT_BY_TIME    = 'rm:filter:sortByTime';
const LS_KEY_INCLUDE_EXAMPLES = 'rm:filter:includeExamples';
const LS_KEY_SCAN            = 'rm:scan:results';
const LS_KEY_SCAN_WHEN       = 'rm:scan:when';

// True for entries the manifest classifies as `library` or `webapp` —
// the things the user actually thinks of as "their modules".
// `example` entries (nested demo apps inside other modules' folders)
// are filtered out by default to keep counts and the list honest.
function _isRealModule(pEntry)
{
	if (!pEntry) { return false; }
	let tmpType = pEntry.Type || 'library';
	return tmpType !== 'example';
}

function lsGet(pKey) { try { return window.localStorage.getItem(pKey); } catch (e) { return null; } }
function lsSet(pKey, pValue) { try { window.localStorage.setItem(pKey, pValue); } catch (e) { /* quota */ } }

// Derive a stable label for the local-vs-published version pair.
//   'in-sync'           — local matches published exactly
//   'unpublished-bump'  — local > published (we bumped but didn't publish)
//   'behind-published'  — local < published (we're somehow behind npm)
//   'unpublished'       — never published
//   'unknown'           — we don't have published data (offline, timeout)
function _classifyVersionState(pLocal, pPublished)
{
	if (!pLocal) { return 'unknown'; }
	if (pPublished === null || pPublished === undefined) { return 'unpublished'; }
	if (pLocal === pPublished) { return 'in-sync'; }
	// Numeric semver comparison; falls back to string equality if either side
	// isn't shaped like a normal release.
	let tmpLocalParts = pLocal.split('.').map((n) => parseInt(n, 10));
	let tmpPubParts   = pPublished.split('.').map((n) => parseInt(n, 10));
	for (let i = 0; i < 3; i++)
	{
		let tmpL = tmpLocalParts[i] || 0;
		let tmpP = tmpPubParts[i]   || 0;
		if (tmpL > tmpP) { return 'unpublished-bump'; }
		if (tmpL < tmpP) { return 'behind-published'; }
	}
	return 'in-sync';
}

// Action classification (needsAction / badgeState / badgeTooltip) lives in
// ../Manager-Scan-State.js — shared with the LogBar Scan table, and ultimately
// driven by the server's NextAction. Referenced via libScanState below.

class ManagerSidebarView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._restoredFromStorage = false;

		// Three sidebar surfaces: 'modules' | 'files' | 'search'.
		this._tab = 'modules';

		// Files-tab state — the canonical pict-section-filebrowser
		// view owns the breadcrumb + list + selection lifecycle.  We
		// just track which (module, path) pair we last fetched so
		// stale folder-navigations don't paint over a fresh module.
		this._files = {
			Mounted:        false,    // Pict-FileBrowser rendered into the mount target
			HooksWired:     false,    // onFileSelected / onFolderNavigated registered
			ModuleName:     null,
			Path:           ''
		};

		// Search tab state.  Query + scope persist for the session so
		// the user can pivot to another module and re-run the same
		// search without retyping.
		this._search = {
			Query:        '',
			Types:        '',         // comma-separated file types: 'js,json,md'
			Scope:        'module',   // 'module' | 'repo'
			Running:      false,
			LastQuery:    null,
			Tool:         null,
			ElapsedMs:    0,
			TotalHits:    0,
			Truncated:    false,
			Results:      [],
			Error:        null
		};
	}

	onBeforeRender()
	{
		// Restore search/filter/scan state from localStorage on the first render.
		if (!this._restoredFromStorage)
		{
			this._restoredFromStorage = true;
			let tmpState = this.pict.AppData.Manager;
			tmpState.Filter.Query           = lsGet(LS_KEY_FILTER) || '';
			tmpState.Filter.DirtyOnly       = lsGet(LS_KEY_DIRTY_ONLY) === '1';
			tmpState.Filter.SortByTime      = lsGet(LS_KEY_SORT_BY_TIME) === '1';
			tmpState.Filter.IncludeExamples = lsGet(LS_KEY_INCLUDE_EXAMPLES) === '1';
			try
			{
				let tmpCached = lsGet(LS_KEY_SCAN);
				if (tmpCached) { tmpState.Scan.Results = JSON.parse(tmpCached) || {}; }
			}
			catch (e) { tmpState.Scan.Results = {}; }
			tmpState.Scan.When = lsGet(LS_KEY_SCAN_WHEN) || null;
		}

		// Materialize the per-render derived data the templates iterate.
		this.pict.AppData.Manager.SidebarMeta = this._buildSidebarMeta();

		return this.pict.AppData.Manager;
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		let tmpDirty = document.getElementById('RM-DirtyOnly');
		if (tmpDirty) { tmpDirty.checked = !!this.pict.AppData.Manager.Filter.DirtyOnly; }
		let tmpSort  = document.getElementById('RM-SortByTime');
		if (tmpSort)  { tmpSort.checked  = !!this.pict.AppData.Manager.Filter.SortByTime; }
		let tmpEx    = document.getElementById('RM-IncludeExamples');
		if (tmpEx)    { tmpEx.checked    = !!this.pict.AppData.Manager.Filter.IncludeExamples; }
		let tmpFetchRemotes = document.getElementById('RM-FetchRemotes');
		if (tmpFetchRemotes) { tmpFetchRemotes.checked = !!(this.pict.AppData.Manager.Scan && this.pict.AppData.Manager.Scan.FetchRemotes); }

		// Defensive AppData → input sync. The template's value binding
		// covers the initial render path, but this guarantees the input
		// can never desync from AppData on subsequent full renders (tab
		// switches, future code paths that drive a full render). Guarded
		// against fighting the user's in-progress typing by only writing
		// when the input is not currently focused.
		let tmpSearch = document.getElementById('RM-SidebarSearch');
		if (tmpSearch && document.activeElement !== tmpSearch)
		{
			let tmpExpected = this.pict.AppData.Manager.Filter.Query || '';
			if (tmpSearch.value !== tmpExpected) { tmpSearch.value = tmpExpected; }
		}

		// Restore focus on the filter input when a keystroke triggered
		// this render — without this, every typed character defocuses
		// the field (the old DOM node is gone and the new one is fresh).
		// _searchFocusToRestore is set by setFilter() before it calls
		// render(); we cap restoration to a single render so unrelated
		// re-renders (scan results landing, sort flip) don't yank focus
		// onto the filter field unexpectedly.
		if (this._searchFocusToRestore)
		{
			let tmpSearch = document.getElementById('RM-SidebarSearch');
			if (tmpSearch)
			{
				tmpSearch.focus();
				let tmpLen = tmpSearch.value.length;
				try { tmpSearch.setSelectionRange(tmpLen, tmpLen); } catch (e) { /* search inputs may refuse */ }
			}
			this._searchFocusToRestore = false;
		}
		if (this._searchInputFocusToRestore)
		{
			let tmpSearchQ = document.getElementById('RM-SidebarSearchQ');
			if (tmpSearchQ)
			{
				tmpSearchQ.focus();
				let tmpLen = tmpSearchQ.value.length;
				try { tmpSearchQ.setSelectionRange(tmpLen, tmpLen); } catch (e) { /* */ }
			}
			this._searchInputFocusToRestore = false;
		}
		if (this._searchTypesFocusToRestore)
		{
			let tmpTypes = document.getElementById('RM-SidebarSearchTypes');
			if (tmpTypes)
			{
				tmpTypes.focus();
				let tmpLen = tmpTypes.value.length;
				try { tmpTypes.setSelectionRange(tmpLen, tmpLen); } catch (e) { /* */ }
			}
			this._searchTypesFocusToRestore = false;
		}

		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// ─────────────────────────────────────────────
	//  Data shaping — single place that walks the modules / scan
	//  results and produces what the templates iterate. No HTML.
	// ─────────────────────────────────────────────

	_buildSidebarMeta()
	{
		// Top-level shape — the three tabs share one record and the
		// active tab's pane gets a single-element-array slot.  Inactive
		// panes render to nothing so we never leak stale state.
		let tmpActive = this._tab || 'modules';
		return {
			TabModulesClass: tmpActive === 'modules' ? 'is-active' : '',
			TabFilesClass:   tmpActive === 'files'   ? 'is-active' : '',
			TabSearchClass:  tmpActive === 'search'  ? 'is-active' : '',
			ModulesPaneSlot: tmpActive === 'modules' ? [this._buildModulesPane()] : [],
			FilesPaneSlot:   tmpActive === 'files'   ? [this._buildFilesPane()]   : [],
			SearchPaneSlot:  tmpActive === 'search'  ? [this._buildSearchPane()]  : []
		};
	}

	_buildModulesPane()
	{
		let tmpState        = this.pict.AppData.Manager;
		let tmpQuery        = (tmpState.Filter.Query || '').toLowerCase();
		let tmpDirtyOnly    = tmpState.Filter.DirtyOnly;
		let tmpSortTime     = tmpState.Filter.SortByTime;
		let tmpIncludeEx    = !!tmpState.Filter.IncludeExamples;
		let tmpScan         = tmpState.Scan.Results || {};
		let tmpSelected     = tmpState.SelectedModule;
		let tmpGroupsBy     = tmpState.ModulesByGroup || {};

		let tmpScanText     = this._buildScanMetaText(tmpState.Scan);

		// "Include examples" hint text shows how many examples we're
		// hiding so the user knows the count is intentional.
		let tmpAllModules   = tmpState.Modules || [];
		let tmpExampleCount = 0;
		for (let i = 0; i < tmpAllModules.length; i++)
		{
			if ((tmpAllModules[i].Type || 'library') === 'example') { tmpExampleCount++; }
		}
		let tmpExamplesMetaText = tmpExampleCount > 0
			? (tmpIncludeEx ? '(' + tmpExampleCount + ' shown)' : '(' + tmpExampleCount + ' hidden)')
			: '';

		// Sort-by-time renders one flat list ordered by RecentModules.
		if (tmpSortTime)
		{
			let tmpAll = tmpState.Modules || [];
			let tmpRecent = tmpState.RecentModules || [];
			let tmpOrder = {};
			for (let i = 0; i < tmpRecent.length; i++) { tmpOrder[tmpRecent[i]] = i; }

			let tmpFiltered = [];
			for (let i = 0; i < tmpAll.length; i++)
			{
				let tmpMod = tmpAll[i];
				if (!tmpIncludeEx && !_isRealModule(tmpMod)) { continue; }
				if (tmpQuery && tmpMod.Name.toLowerCase().indexOf(tmpQuery) === -1) { continue; }
				let tmpScanEntry = tmpScan[tmpMod.Name];
				if (tmpDirtyOnly && !libScanState.needsAction(tmpScanEntry)) { continue; }
				tmpFiltered.push(tmpMod);
			}
			tmpFiltered.sort(function (pA, pB)
				{
					let tmpAi = (pA.Name in tmpOrder) ? tmpOrder[pA.Name] : Infinity;
					let tmpBi = (pB.Name in tmpOrder) ? tmpOrder[pB.Name] : Infinity;
					if (tmpAi !== tmpBi) { return tmpAi - tmpBi; }
					return pA.Name.localeCompare(pB.Name);
				});

			if (tmpFiltered.length === 0)
			{
				return {
					Filter:           tmpState.Filter,
					ScanMetaText:     tmpScanText,
					ExamplesMetaText: tmpExamplesMetaText,
					EmptySlot:        [{ Message: 'No modules match the filter.' }],
					Groups:           [],
				};
			}

			let tmpRows = [];
			for (let i = 0; i < tmpFiltered.length; i++)
			{
				let tmpMod = tmpFiltered[i];
				let tmpUnvisited = !(tmpMod.Name in tmpOrder);
				tmpRows.push(this._buildRow(tmpMod, tmpScan[tmpMod.Name], tmpSelected, tmpUnvisited));
			}

			return {
				Filter:           tmpState.Filter,
				ScanMetaText:     tmpScanText,
				ExamplesMetaText: tmpExamplesMetaText,
				EmptySlot:        [],
				Groups:           [{ Title: 'Recently used', Rows: tmpRows }],
			};
		}

		// Default: group-by-category view.
		// Build the group walk order — the manifest may ship groups not
		// in GROUP_ORDER (e.g. 'Examples', 'Tools'); fold them in at the
		// end so they're still discoverable.  The 'Examples' group is
		// gated on the IncludeExamples flag.
		let tmpWalkOrder = GROUP_ORDER.slice();
		let tmpExistingGroups = Object.keys(tmpGroupsBy || {});
		for (let i = 0; i < tmpExistingGroups.length; i++)
		{
			let tmpExtra = tmpExistingGroups[i];
			if (tmpWalkOrder.indexOf(tmpExtra) >= 0) { continue; }
			if (tmpExtra === 'Examples' && !tmpIncludeEx) { continue; }
			tmpWalkOrder.push(tmpExtra);
		}

		let tmpGroups = [];
		for (let i = 0; i < tmpWalkOrder.length; i++)
		{
			let tmpGroupName = tmpWalkOrder[i];
			let tmpList      = tmpGroupsBy[tmpGroupName] || [];

			let tmpRows = [];
			for (let j = 0; j < tmpList.length; j++)
			{
				let tmpMod = tmpList[j];
				if (!tmpIncludeEx && !_isRealModule(tmpMod)) { continue; }
				if (tmpQuery && tmpMod.Name.toLowerCase().indexOf(tmpQuery) === -1) { continue; }
				let tmpScanEntry = tmpScan[tmpMod.Name];
				if (tmpDirtyOnly && !libScanState.needsAction(tmpScanEntry)) { continue; }
				tmpRows.push(this._buildRow(tmpMod, tmpScanEntry, tmpSelected, false));
			}
			if (tmpRows.length === 0) { continue; }

			tmpGroups.push({ Title: tmpGroupName, Rows: tmpRows });
		}

		if (tmpGroups.length === 0)
		{
			let tmpMessage = tmpDirtyOnly
				? 'Nothing needs action (click Scan to re-scan).'
				: (tmpQuery ? 'No modules match the filter.' : 'Loading modules...');
			return {
				Filter:           tmpState.Filter,
				ScanMetaText:     tmpScanText,
				ExamplesMetaText: tmpExamplesMetaText,
				EmptySlot:        [{ Message: tmpMessage }],
				Groups:           [],
			};
		}

		return {
			Filter:           tmpState.Filter,
			ScanMetaText:     tmpScanText,
			ExamplesMetaText: tmpExamplesMetaText,
			EmptySlot:        [],
			Groups:           tmpGroups,
		};
	}

	_buildRow(pMod, pScanEntry, pSelected, pUnvisited)
	{
		let tmpRowClass = 'module-row';
		if (pSelected === pMod.Name) { tmpRowClass += ' selected'; }
		if (pUnvisited)              { tmpRowClass += ' unvisited'; }

		let tmpState = libScanState.badgeState(pScanEntry);
		return {
			Name:           pMod.Name,
			NameUrlEncoded: encodeURIComponent(pMod.Name || ''),
			RowClass:       tmpRowClass,
			DirtySlot:      tmpState ? [{ State: tmpState, Tooltip: libScanState.badgeTooltip(pScanEntry) }] : [],
		};
	}

	_buildScanMetaText(pScanState)
	{
		if (!pScanState) { return ''; }
		if (pScanState.Running) { return 'scanning…'; }
		if (!pScanState.When)   { return ''; }
		let tmpNames = Object.keys(pScanState.Results || {});
		let tmpDirty = tmpNames.filter((pN) => libScanState.needsAction(pScanState.Results[pN])).length;
		let tmpWhen  = new Date(pScanState.When);
		let tmpAge   = Math.max(0, Math.floor((Date.now() - tmpWhen.getTime()) / 1000));
		let tmpAgeStr;
		if      (tmpAge < 60)   { tmpAgeStr = tmpAge + 's ago'; }
		else if (tmpAge < 3600) { tmpAgeStr = Math.floor(tmpAge / 60) + 'm ago'; }
		else                    { tmpAgeStr = Math.floor(tmpAge / 3600) + 'h ago'; }
		return tmpDirty + ' need action · ' + tmpAgeStr;
	}

	_buildFilesPane()
	{
		// Files-tab is now backed by the canonical pict-section-filebrowser
		// view in list-only layout.  This method just produces the "pick
		// a module first" message when no module is selected.  The actual
		// listing + breadcrumb + click handling lives in Pict-FileBrowser
		// / Pict-FileBrowser-ListDetail, mounted into
		// #RM-Sidebar-FilesPane-Mount by mountFileBrowser() below.
		let tmpSelected = this.pict.AppData.Manager.SelectedModule;
		return {
			NoModuleSlot: tmpSelected ? [] : [{}]
		};
	}

	_buildSearchPane()
	{
		let tmpScope = this._search.Scope || 'module';
		let tmpMeta;
		if (this._search.Running)
		{
			tmpMeta = 'searching…';
		}
		else if (this._search.Error)
		{
			tmpMeta = 'error: ' + this._search.Error;
		}
		else if (this._search.LastQuery === null)
		{
			tmpMeta = (tmpScope === 'repo')
				? 'press enter to search the whole monorepo'
				: 'press enter to search the active module';
		}
		else
		{
			tmpMeta = this._search.TotalHits + ' hits in ' + this._search.ElapsedMs + 'ms via '
				+ (this._search.Tool || '?')
				+ (this._search.Truncated ? '  (capped)' : '');
		}

		// Highlight occurrences of the query in the displayed line text.
		let tmpResults = [];
		let tmpQ = this._search.LastQuery || '';
		for (let i = 0; i < this._search.Results.length; i++)
		{
			let tmpR = this._search.Results[i];
			tmpResults.push({
				ModuleJs:        this._jsString(tmpR.Module || ''),
				PathJs:          this._jsString(tmpR.Path || ''),
				Line:            tmpR.Line,
				Display:         tmpR.Display || tmpR.Path,
				HighlightedText: this._highlightMatch(tmpR.Text || '', tmpQ)
			});
		}

		return {
			Query:                this._search.Query || '',
			Types:                this._search.Types || '',
			ScopeModuleChecked:   tmpScope === 'module' ? 'checked' : '',
			ScopeRepoChecked:     tmpScope === 'repo'   ? 'checked' : '',
			MetaText:             tmpMeta,
			Results:              tmpResults
		};
	}

	_highlightMatch(pText, pQuery)
	{
		// Escape HTML first, then wrap query matches in <mark>.  Trim
		// to a reasonable length so a 4KB minified-JS line doesn't
		// blow up the sidebar layout.
		let tmpText = (pText || '').slice(0, 240);
		tmpText = tmpText
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
		if (!pQuery) { return tmpText; }
		let tmpEscQ = pQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		let tmpRx = new RegExp(tmpEscQ, 'gi');
		return tmpText.replace(tmpRx, function (pMatch) { return '<mark>' + pMatch + '</mark>'; });
	}

	_jsString(pVal)
	{
		// Escape for safe inclusion inside single-quoted inline JS
		// (onclick="...('value')").  Backslash, single-quote, and
		// newlines are the dangerous trio.
		return String(pVal || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n');
	}

	// ─────────────────────────────────────────────
	//  Files-tab — canonical pict-section-filebrowser integration
	// ─────────────────────────────────────────────

	// Mount the Pict-FileBrowser shell + its ListDetail sub-view into
	// the Files tab's mount target.  Idempotent — re-runs are cheap
	// and pict-view's `render()` replaces the destination contents.
	// Wires the file-select + folder-navigate hooks on first mount.
	_mountFileBrowser()
	{
		let tmpShell = this.pict.views['Pict-FileBrowser'];
		let tmpList  = this.pict.views['Pict-FileBrowser-ListDetail'];
		if (!tmpShell || !tmpList)
		{
			// Section not registered — quiet fail so the rest of the
			// sidebar still works in pruned builds.
			return;
		}
		// Render the outer 3-pane shell (CSS hides the irrelevant panes
		// because Layout='list-only' applies the pict-fb-layout-list-only
		// class to the wrap div).
		tmpShell.render();
		// Render the file list into the list pane.  Sub-view target is
		// the shell's #Pict-FileBrowser-ListPane id from the
		// DefaultConfiguration template.
		tmpList.render();

		// Hook file selection + folder navigation once.  These are the
		// upstream hooks pict-section-filebrowser exposes (1.0.3+).
		// Hosts get a clean callback instead of having to poll AppData
		// or subclass the provider.
		if (!this._files.HooksWired)
		{
			let tmpListProvider = this.pict.providers['Pict-FileBrowser-List'];
			let tmpBrowseProvider = this.pict.providers['Pict-FileBrowser-Browse'];
			if (tmpListProvider && typeof tmpListProvider.onFileSelected === 'function')
			{
				tmpListProvider.onFileSelected((pEntry) =>
					{
						if (!pEntry || pEntry.Type === 'folder') { return; }
						// Build a module-relative path from CurrentLocation
						// + the entry's Name.  The filebrowser's section is
						// path-agnostic, so we reassemble here.
						let tmpModule = this._files.ModuleName;
						if (!tmpModule) { return; }
						let tmpLoc = (this.pict.AppData.PictFileBrowser && this.pict.AppData.PictFileBrowser.CurrentLocation) || '';
						let tmpPath = tmpLoc ? (tmpLoc + '/' + pEntry.Name) : pEntry.Name;
						let tmpViewer = this.pict.views['Manager-FileViewer'];
						if (tmpViewer && typeof tmpViewer.openFile === 'function')
						{
							tmpViewer.openFile(tmpModule, tmpPath);
						}
					});
			}
			if (tmpBrowseProvider && typeof tmpBrowseProvider.onFolderNavigated === 'function')
			{
				tmpBrowseProvider.onFolderNavigated((pPath) =>
					{
						this._files.Path = pPath || '';
						this._refetchFileList();
					});
			}
			this._files.HooksWired = true;
		}
		this._files.Mounted = true;
	}

	// Fetch the directory listing for (ModuleName, Path) and push it
	// onto AppData.PictFileBrowser.FileList in the shape the section
	// expects (`{ Name, Type, Size?, Modified? }` per row).
	_refetchFileList()
	{
		let tmpAPI = this.pict.providers.ManagerAPI;
		if (!tmpAPI || typeof tmpAPI.get !== 'function') { return; }
		let tmpModule = this._files.ModuleName;
		let tmpPath   = this._files.Path || '';
		if (!tmpModule) { return; }
		let tmpQS = '?path=' + encodeURIComponent(tmpPath);
		tmpAPI.get('/modules/' + encodeURIComponent(tmpModule) + '/files' + tmpQS).then(
			(pBody) =>
			{
				// Drop stale responses.
				if (this._files.ModuleName !== tmpModule || this._files.Path !== tmpPath) { return; }
				let tmpEntries = pBody.Entries || [];
				let tmpFBList = tmpEntries.map((pEntry) =>
					{
						return {
							Name:      pEntry.Name,
							Type:      pEntry.Kind === 'dir' ? 'folder' : 'file',
							Size:      pEntry.Size,
							Modified:  pEntry.Modified,
							Extension: pEntry.Extension,
							// Carry the manager's category through so a
							// future enhancement could colour rows.
							Category:  pEntry.Category
						};
					});
				if (!this.pict.AppData.PictFileBrowser) { this.pict.AppData.PictFileBrowser = {}; }
				this.pict.AppData.PictFileBrowser.FileList = tmpFBList;
				let tmpList = this.pict.views['Pict-FileBrowser-ListDetail'];
				if (tmpList && typeof tmpList.render === 'function') { tmpList.render(); }
			},
			(pError) =>
			{
				if (this._files.ModuleName !== tmpModule || this._files.Path !== tmpPath) { return; }
				if (!this.pict.AppData.PictFileBrowser) { this.pict.AppData.PictFileBrowser = {}; }
				this.pict.AppData.PictFileBrowser.FileList = [];
				let tmpList = this.pict.views['Pict-FileBrowser-ListDetail'];
				if (tmpList && typeof tmpList.render === 'function') { tmpList.render(); }
				this.pict.PictApplication.setStatus('files: ' + (pError && pError.message ? pError.message : 'failed'));
			});
	}

	// Called from switchTab('files') and from showModule.  Mount on
	// first activation; refresh the listing when the module changes;
	// re-mount the section if a prior sidebar render (e.g. the one
	// _touchRecentModule + setActiveRoute fire from inside showModule)
	// blew away our mount target.
	_syncFilesTab()
	{
		let tmpSelected = this.pict.AppData.Manager.SelectedModule;
		if (!tmpSelected) { return; }
		// If anything wiped the filebrowser's mount target, rebuild
		// from scratch.  Cheap: pict-view.render() repaints into the
		// fresh target and the upstream hooks stay subscribed
		// (HooksWired is one-shot, registered against the provider
		// instance which outlives the view's DOM).
		if (!document.getElementById('Pict-FileBrowser-ListPane'))
		{
			this._files.Mounted = false;
			this._mountFileBrowser();
		}
		if (this._files.ModuleName !== tmpSelected)
		{
			this._files.ModuleName = tmpSelected;
			this._files.Path       = '';
			// Tell the section we're at the root of this module.  The
			// browse provider's navigateToFolder will clear CurrentFile
			// and fire the onFolderNavigated hook, which triggers our
			// own _refetchFileList — so we don't need to call it again.
			let tmpBrowseProvider = this.pict.providers['Pict-FileBrowser-Browse'];
			if (tmpBrowseProvider && typeof tmpBrowseProvider.navigateToFolder === 'function')
			{
				tmpBrowseProvider.navigateToFolder('');
			}
			else
			{
				this._refetchFileList();
			}
		}
		else
		{
			// Same module but the shell may have been remounted
			// against a stale FileList — refetch to be safe.
			this._refetchFileList();
		}
	}

	// ─────────────────────────────────────────────
	//  Search-tab fetch
	// ─────────────────────────────────────────────

	_runSearchInternal()
	{
		let tmpAPI = this.pict.providers.ManagerAPI;
		if (!tmpAPI || typeof tmpAPI.get !== 'function') { return; }
		let tmpQ = (this._search.Query || '').trim();
		if (tmpQ.length < 2)
		{
			this._search.Error = 'query must be at least 2 characters';
			this.render();
			return;
		}
		let tmpScope = this._search.Scope || 'module';
		let tmpModule = this.pict.AppData.Manager.SelectedModule;
		if (tmpScope === 'module' && !tmpModule)
		{
			this._search.Error = 'pick a module first (or switch scope to whole repo)';
			this.render();
			return;
		}

		this._search.Running = true;
		this._search.Error   = null;
		this.render();

		let tmpURL = '/search?q=' + encodeURIComponent(tmpQ) + '&scope=' + tmpScope;
		if (tmpScope === 'module') { tmpURL += '&module=' + encodeURIComponent(tmpModule); }
		let tmpTypes = (this._search.Types || '').trim();
		if (tmpTypes) { tmpURL += '&types=' + encodeURIComponent(tmpTypes); }

		let tmpFireFor = tmpQ + '|' + tmpScope + '|' + (tmpModule || '') + '|' + tmpTypes;
		this._lastSearchKey = tmpFireFor;

		tmpAPI.get(tmpURL).then(
			(pBody) =>
			{
				if (this._lastSearchKey !== tmpFireFor) { return; }
				this._search.Running   = false;
				this._search.LastQuery = tmpQ;
				this._search.Tool      = pBody.Tool;
				this._search.ElapsedMs = pBody.ElapsedMs;
				this._search.TotalHits = pBody.TotalHits;
				this._search.Truncated = pBody.Truncated;

				// For repo-scope results, each path is relative to the
				// monorepo root and may look like "modules/pict/.../foo.js".
				// We need to identify which module each hit belongs to so
				// the file viewer can open it.
				let tmpResults = (pBody.Results || []).map((pR) => this._tagResultWithModule(pR, pBody.Scope, pBody.Module));
				this._search.Results = tmpResults;
				this._search.Error   = null;
				this.render();
			},
			(pError) =>
			{
				if (this._lastSearchKey !== tmpFireFor) { return; }
				this._search.Running = false;
				this._search.Error   = pError && pError.message ? pError.message : 'failed';
				this.render();
			});
	}

	_tagResultWithModule(pResult, pScope, pScopeModule)
	{
		// For module-scoped search, every result is in the same module.
		let tmpPath = pResult.Path || '';
		if (pScope === 'module')
		{
			return Object.assign({}, pResult, { Module: pScopeModule, Display: tmpPath });
		}

		// Repo-scope: walk the manifest and find the longest module
		// Path prefix that matches.  This catches:
		//   - modules/<group>/<name>/...  (most modules)
		//   - source/<name>/...           (root-of-repo modules like
		//                                  retold-manager)
		// Caches the prefix list on first use, refreshed whenever
		// AppData.Manager.Modules is replaced.
		let tmpAll = (this.pict.AppData.Manager && this.pict.AppData.Manager.Modules) || [];
		if (this._moduleByPrefix_For !== tmpAll)
		{
			// Build a list of [PathPrefix, ModuleName] sorted by descending
			// prefix length so a longer prefix wins ties.
			this._moduleByPrefix = [];
			for (let i = 0; i < tmpAll.length; i++)
			{
				let tmpM = tmpAll[i];
				if (tmpM && tmpM.Path && tmpM.Name)
				{
					this._moduleByPrefix.push({ Prefix: tmpM.Path + '/', Name: tmpM.Name });
				}
			}
			this._moduleByPrefix.sort((pA, pB) => pB.Prefix.length - pA.Prefix.length);
			this._moduleByPrefix_For = tmpAll;
		}
		for (let i = 0; i < this._moduleByPrefix.length; i++)
		{
			let tmpEntry = this._moduleByPrefix[i];
			if (tmpPath.indexOf(tmpEntry.Prefix) === 0)
			{
				let tmpRel = tmpPath.slice(tmpEntry.Prefix.length);
				return Object.assign({}, pResult,
					{ Module: tmpEntry.Name, Path: tmpRel, Display: tmpEntry.Name + ' · ' + tmpRel });
			}
		}
		return Object.assign({}, pResult, { Module: null, Display: tmpPath });
	}

	// ─────────────────────────────────────────────
	//  Handlers invoked from inline attributes
	// ─────────────────────────────────────────────

	setFilter(pValue)
	{
		let tmpQ = pValue || '';
		this.pict.AppData.Manager.Filter.Query = tmpQ;
		lsSet(LS_KEY_FILTER, tmpQ);
		// Hot path — only repaint the module list; leave the input,
		// checkboxes, and surrounding shell DOM untouched. Calling the
		// full `this.render()` here would tear down and rebuild the
		// <input> on every keystroke, dropping focus + characters and
		// making the filter feel twitchy. The DOM input is the source
		// of truth for its own .value while the user types; AppData is
		// kept in sync inside this handler.
		this._repaintModulesPane();
	}

	// Surgical repaint of just the modules pane (#RM-ModuleList plus the
	// scan-meta + examples-count text spans). Used by every hot-path
	// filter handler so the input + checkbox DOM survives untouched.
	_repaintModulesPane()
	{
		let tmpRecord = this._buildModulesPane();

		let tmpHtml = '';
		for (let i = 0; i < tmpRecord.EmptySlot.length; i++)
		{
			tmpHtml += this.pict.parseTemplateByHash(
				'Manager-Sidebar-Empty-Template', tmpRecord.EmptySlot[i]);
		}
		for (let i = 0; i < tmpRecord.Groups.length; i++)
		{
			tmpHtml += this.pict.parseTemplateByHash(
				'Manager-Sidebar-Group-Template', tmpRecord.Groups[i]);
		}
		this.pict.ContentAssignment.assignContent('#RM-ModuleList', tmpHtml);

		// The two meta-text spans live inside the toolbar / checkbox
		// labels, so we update them in place rather than re-rendering
		// the whole shell.
		let tmpScanMeta = document.getElementById('RM-ScanMeta');
		if (tmpScanMeta) { tmpScanMeta.textContent = tmpRecord.ScanMetaText || ''; }
		let tmpExCount = document.querySelector('.rm-examples-count');
		if (tmpExCount) { tmpExCount.textContent = tmpRecord.ExamplesMetaText || ''; }
	}

	switchTab(pTab)
	{
		if (pTab !== 'modules' && pTab !== 'files' && pTab !== 'search') { return; }
		if (this._tab === pTab) { return; }
		this._tab = pTab;
		this.render();
		// Mount + sync the Files-tab section AFTER the sidebar shell
		// has painted, so the mount target #RM-Sidebar-FilesPane-Mount
		// exists.  Render is synchronous in pict-view, so a microtask
		// defer is enough.
		if (pTab === 'files')
		{
			setTimeout(() =>
				{
					this._mountFileBrowser();
					this._syncFilesTab();
				}, 0);
		}
	}

	onSearchInput(pValue)
	{
		this._search.Query = pValue || '';
		this._searchInputFocusToRestore = true;
		this.render();
	}

	onSearchTypesInput(pValue)
	{
		this._search.Types = pValue || '';
		this._searchTypesFocusToRestore = true;
		this.render();
	}

	setSearchScope(pScope)
	{
		if (pScope !== 'module' && pScope !== 'repo') { return; }
		this._search.Scope = pScope;
		this.render();
	}

	runSearch()
	{
		this._searchInputFocusToRestore = true;
		this._runSearchInternal();
	}

	onSearchResultClick(pModuleJs, pPathJs, pLine)
	{
		// The inline `onclick` passes the JS-escaped strings; we get
		// them back through the function args already unescaped by the
		// JS engine.  When Module is empty the hit is outside any
		// manifested module — route through the repo-relative file
		// reader so the user can still view top-level configs / scripts
		// / test fixtures without leaving the manager.
		let tmpViewer = this.pict.views['Manager-FileViewer'];
		if (!tmpViewer) { return; }
		let tmpLine = parseInt(pLine, 10) || 0;
		if (pModuleJs)
		{
			if (typeof tmpViewer.openFile === 'function')
			{
				tmpViewer.openFile(pModuleJs, pPathJs, tmpLine);
			}
		}
		else
		{
			if (typeof tmpViewer.openRepoFile === 'function')
			{
				tmpViewer.openRepoFile(pPathJs, tmpLine);
			}
		}
	}

	setDirtyOnly(pChecked)
	{
		let tmpChecked = !!pChecked;
		this.pict.AppData.Manager.Filter.DirtyOnly = tmpChecked;
		lsSet(LS_KEY_DIRTY_ONLY, tmpChecked ? '1' : '0');
		// Lazy-scan if the user flips on dirty-only without any cached
		// scan results. triggerScan() drives its own full render to
		// flip the scan-button state, so don't double-render here.
		if (tmpChecked && Object.keys(this.pict.AppData.Manager.Scan.Results || {}).length === 0)
		{
			this.triggerScan();
			return;
		}
		this._repaintModulesPane();
	}

	// Opt into a live `git fetch upstream` per forkable module on the next
	// Scan, so the org-drift columns/badges are exact rather than as-of-last-
	// fetch. Not persisted — it's an explicit, slower choice each session.
	setScanFetch(pChecked)
	{
		this.pict.AppData.Manager.Scan.FetchRemotes = !!pChecked;
	}

	setSortByTime(pChecked)
	{
		let tmpChecked = !!pChecked;
		this.pict.AppData.Manager.Filter.SortByTime = tmpChecked;
		lsSet(LS_KEY_SORT_BY_TIME, tmpChecked ? '1' : '0');
		this._repaintModulesPane();
	}

	setIncludeExamples(pChecked)
	{
		let tmpChecked = !!pChecked;
		this.pict.AppData.Manager.Filter.IncludeExamples = tmpChecked;
		lsSet(LS_KEY_INCLUDE_EXAMPLES, tmpChecked ? '1' : '0');
		// Nudge the LogBar Modules tab too — it shares this filter so
		// the bottom table stays in lock-step with the sidebar.
		let tmpLogBar = this.pict.views['Manager-LogBar'];
		if (tmpLogBar && typeof tmpLogBar.onIncludeExamplesChanged === 'function')
		{
			tmpLogBar.onIncludeExamplesChanged();
		}
		this._repaintModulesPane();
	}

	triggerScan()
	{
		let tmpState = this.pict.AppData.Manager;
		tmpState.Scan.Running = true;
		// Surgical repaint — flips the meta text to "scanning…" without
		// tearing down the input or checkboxes (in case the user typed
		// a filter, then hit Scan).
		this._repaintModulesPane();

		// Don't auto-switch tabs — the user has asked us to land on
		// Actions by default and to let them navigate to Modules
		// explicitly when they want to look at scan results.  The
		// LogBar's Scan tab will repaint silently if it's already the
		// active tab when results arrive (see onScanResultsChanged).

		let tmpFetch = !!(tmpState.Scan && tmpState.Scan.FetchRemotes);
		this.pict.PictApplication.setStatus(tmpFetch
			? 'Scanning all modules (fetching upstreams — this is slower)...'
			: 'Scanning all modules...');

		let tmpApi = this.pict.providers.ManagerAPI;
		tmpApi.scanAllModules(tmpFetch).then(
			(pBody) =>
			{
				tmpState.Scan.Results = pBody.Results || {};
				tmpState.Scan.When    = pBody.ScannedAt;
				lsSet(LS_KEY_SCAN, JSON.stringify(tmpState.Scan.Results));
				if (tmpState.Scan.When) { lsSet(LS_KEY_SCAN_WHEN, tmpState.Scan.When); }
				this.pict.PictApplication.setStatus('Scan complete (' + pBody.ElapsedMs
					+ 'ms, ' + pBody.ModuleCount + ' modules). Looking up published versions...');

				// Notify the LogBar Scan tab if it's mounted so it can
				// re-render the table with the fresh data.
				let tmpLogBar = this.pict.views['Manager-LogBar'];
				if (tmpLogBar && typeof tmpLogBar.onScanResultsChanged === 'function')
				{
					tmpLogBar.onScanResultsChanged();
				}
				// Repaint the sidebar list now so the action badges appear as
				// soon as the git scan returns, rather than waiting on the slower
				// published-versions decoration below.
				this._repaintModulesPane();

				// Fire-and-forget published-versions decoration: this can
				// hang on a slow registry; we already have the local scan
				// rendered.  Merge in whatever comes back.
				return tmpApi.loadPublishedVersions().then(
					(pVersionsBody) =>
					{
						let tmpVerByName = pVersionsBody && pVersionsBody.Results ? pVersionsBody.Results : {};
						let tmpNames = Object.keys(tmpState.Scan.Results);
						let tmpDecorated = 0;
						for (let i = 0; i < tmpNames.length; i++)
						{
							let tmpName = tmpNames[i];
							let tmpRec  = tmpState.Scan.Results[tmpName];
							if (!tmpRec || tmpRec.Error) { continue; }
							let tmpInfo = tmpVerByName[tmpName];
							if (!tmpInfo) { continue; }
							tmpRec.PublishedVersion = tmpInfo.PublishedVersion || null;
							tmpRec.PublishedAt      = tmpInfo.PublishedAt      || null;
							tmpRec.VersionState     = _classifyVersionState(tmpRec.LocalVersion, tmpRec.PublishedVersion);
							tmpDecorated++;
						}
						lsSet(LS_KEY_SCAN, JSON.stringify(tmpState.Scan.Results));
						this.pict.PictApplication.setStatus('Scan complete — versions resolved for '
							+ tmpDecorated + ' modules.');
						if (tmpLogBar && typeof tmpLogBar.onScanResultsChanged === 'function')
						{
							tmpLogBar.onScanResultsChanged();
						}
					},
					(pError) =>
					{
						this.pict.PictApplication.setStatus('Scan complete (published versions unavailable: '
							+ (pError && pError.message ? pError.message : 'offline') + ').');
					});
			},
			(pError) => { this.pict.PictApplication.setStatus('Scan failed: ' + pError.message); }
		).then(() =>
			{
				tmpState.Scan.Running = false;
				// Same as the start path — surgical repaint, don't
				// nuke the input/checkbox DOM.
				this._repaintModulesPane();
			});
	}
}

module.exports = ManagerSidebarView;
module.exports.default_configuration = _ViewConfiguration;
