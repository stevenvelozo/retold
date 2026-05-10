const libPictView = require('pict-view');

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
		/* State-coded variants — picked by the most upstream pending step:
		     unstaged (orange) → staged (cyan) → unpushed (blue). */
		.dirty-badge.dirty-badge--unstaged { background: var(--color-warning); }
		.dirty-badge.dirty-badge--staged   { background: #4cc9d4; }
		.dirty-badge.dirty-badge--unpushed { background: var(--color-accent); }
	`,

	Templates:
	[
		{
			Hash: 'Manager-Sidebar-Shell-Template',
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
		<input type="checkbox" id="RM-DirtyOnly"
			onchange="_Pict.views['Manager-Sidebar'].setDirtyOnly(this.checked)">
		Dirty only
	</label>
	<label class="sidebar-checkbox">
		<input type="checkbox" id="RM-SortByTime"
			onchange="_Pict.views['Manager-Sidebar'].setSortByTime(this.checked)">
		Sort by time
		<span id="RM-ScanMeta">{~D:Record.SidebarMeta.ScanMetaText~}</span>
	</label>
</div>
<nav id="RM-ModuleList">
	{~TS:Manager-Sidebar-Empty-Template:Record.SidebarMeta.EmptySlot~}
	{~TS:Manager-Sidebar-Group-Template:Record.SidebarMeta.Groups~}
</nav>
`
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

const LS_KEY_FILTER       = 'rm:filter:query';
const LS_KEY_DIRTY_ONLY   = 'rm:filter:dirtyOnly';
const LS_KEY_SORT_BY_TIME = 'rm:filter:sortByTime';
const LS_KEY_SCAN         = 'rm:scan:results';
const LS_KEY_SCAN_WHEN    = 'rm:scan:when';

function lsGet(pKey) { try { return window.localStorage.getItem(pKey); } catch (e) { return null; } }
function lsSet(pKey, pValue) { try { window.localStorage.setItem(pKey, pValue); } catch (e) { /* quota */ } }

// A module is "dirty" for sidebar purposes when EITHER it has uncommitted
// changes in the working tree OR it has commits ahead of the upstream that
// haven't been pushed yet — both states mean "you have local work that
// hasn't reached the remote." Returns false for missing/error entries.
function isDirty(pScanEntry)
{
	if (!pScanEntry) { return false; }
	if (pScanEntry.Dirty) { return true; }
	if ((pScanEntry.Ahead || 0) > 0) { return true; }
	return false;
}

// Classify the *most upstream pending step* so the badge color reflects
// what the user needs to do next. Priority: stage → commit → push.
//   'unstaged' (orange) — there are working-tree changes / untracked files
//                         that haven't been `git add`-ed yet.
//   'staged'   (cyan)   — files are in the index but not yet committed.
//   'unpushed' (blue)   — clean tree, but commits are ahead of upstream.
//   null               — nothing to do.
function dirtyState(pScanEntry)
{
	if (!pScanEntry) { return null; }
	if (pScanEntry.HasUnstaged)        { return 'unstaged'; }
	if (pScanEntry.HasStaged)          { return 'staged'; }
	if ((pScanEntry.Ahead || 0) > 0)   { return 'unpushed'; }
	if (pScanEntry.Dirty)              { return 'unstaged'; }
	return null;
}

function dirtyTooltip(pScanEntry)
{
	if (!pScanEntry) { return ''; }
	let tmpParts = [];
	if (pScanEntry.HasUnstaged) { tmpParts.push('Unstaged changes'); }
	if (pScanEntry.HasStaged)   { tmpParts.push('Staged (uncommitted)'); }
	if (!pScanEntry.HasUnstaged && !pScanEntry.HasStaged && pScanEntry.Dirty)
	{
		tmpParts.push('Uncommitted changes');
	}
	let tmpAhead = pScanEntry.Ahead || 0;
	if (tmpAhead > 0)
	{
		tmpParts.push(tmpAhead + ' unpushed commit' + (tmpAhead === 1 ? '' : 's'));
	}
	return tmpParts.join(' · ');
}

class ManagerSidebarView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._restoredFromStorage = false;
	}

	onBeforeRender()
	{
		// Restore search/filter/scan state from localStorage on the first render.
		if (!this._restoredFromStorage)
		{
			this._restoredFromStorage = true;
			let tmpState = this.pict.AppData.Manager;
			tmpState.Filter.Query      = lsGet(LS_KEY_FILTER) || '';
			tmpState.Filter.DirtyOnly  = lsGet(LS_KEY_DIRTY_ONLY) === '1';
			tmpState.Filter.SortByTime = lsGet(LS_KEY_SORT_BY_TIME) === '1';
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

		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// ─────────────────────────────────────────────
	//  Data shaping — single place that walks the modules / scan
	//  results and produces what the templates iterate. No HTML.
	// ─────────────────────────────────────────────

	_buildSidebarMeta()
	{
		let tmpState     = this.pict.AppData.Manager;
		let tmpQuery     = (tmpState.Filter.Query || '').toLowerCase();
		let tmpDirtyOnly = tmpState.Filter.DirtyOnly;
		let tmpSortTime  = tmpState.Filter.SortByTime;
		let tmpScan      = tmpState.Scan.Results || {};
		let tmpSelected  = tmpState.SelectedModule;
		let tmpGroupsBy  = tmpState.ModulesByGroup || {};

		let tmpScanText = this._buildScanMetaText(tmpState.Scan);

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
				if (tmpQuery && tmpMod.Name.toLowerCase().indexOf(tmpQuery) === -1) { continue; }
				let tmpScanEntry = tmpScan[tmpMod.Name];
				if (tmpDirtyOnly && !isDirty(tmpScanEntry)) { continue; }
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
					ScanMetaText: tmpScanText,
					EmptySlot:    [{ Message: 'No modules match the filter.' }],
					Groups:       [],
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
				ScanMetaText: tmpScanText,
				EmptySlot:    [],
				Groups:       [{ Title: 'Recently used', Rows: tmpRows }],
			};
		}

		// Default: group-by-category view.
		let tmpGroups = [];
		for (let i = 0; i < GROUP_ORDER.length; i++)
		{
			let tmpGroupName = GROUP_ORDER[i];
			let tmpList      = tmpGroupsBy[tmpGroupName] || [];

			let tmpRows = [];
			for (let j = 0; j < tmpList.length; j++)
			{
				let tmpMod = tmpList[j];
				if (tmpQuery && tmpMod.Name.toLowerCase().indexOf(tmpQuery) === -1) { continue; }
				let tmpScanEntry = tmpScan[tmpMod.Name];
				if (tmpDirtyOnly && !isDirty(tmpScanEntry)) { continue; }
				tmpRows.push(this._buildRow(tmpMod, tmpScanEntry, tmpSelected, false));
			}
			if (tmpRows.length === 0) { continue; }

			tmpGroups.push({ Title: tmpGroupName, Rows: tmpRows });
		}

		if (tmpGroups.length === 0)
		{
			let tmpMessage = tmpDirtyOnly
				? 'No dirty modules (click Scan to re-scan).'
				: (tmpQuery ? 'No modules match the filter.' : 'Loading modules...');
			return {
				ScanMetaText: tmpScanText,
				EmptySlot:    [{ Message: tmpMessage }],
				Groups:       [],
			};
		}

		return {
			ScanMetaText: tmpScanText,
			EmptySlot:    [],
			Groups:       tmpGroups,
		};
	}

	_buildRow(pMod, pScanEntry, pSelected, pUnvisited)
	{
		let tmpRowClass = 'module-row';
		if (pSelected === pMod.Name) { tmpRowClass += ' selected'; }
		if (pUnvisited)              { tmpRowClass += ' unvisited'; }

		let tmpState = dirtyState(pScanEntry);
		return {
			Name:           pMod.Name,
			NameUrlEncoded: encodeURIComponent(pMod.Name || ''),
			RowClass:       tmpRowClass,
			DirtySlot:      tmpState ? [{ State: tmpState, Tooltip: dirtyTooltip(pScanEntry) }] : [],
		};
	}

	_buildScanMetaText(pScanState)
	{
		if (!pScanState) { return ''; }
		if (pScanState.Running) { return 'scanning…'; }
		if (!pScanState.When)   { return ''; }
		let tmpNames = Object.keys(pScanState.Results || {});
		let tmpDirty = tmpNames.filter((pN) => isDirty(pScanState.Results[pN])).length;
		let tmpWhen  = new Date(pScanState.When);
		let tmpAge   = Math.max(0, Math.floor((Date.now() - tmpWhen.getTime()) / 1000));
		let tmpAgeStr;
		if      (tmpAge < 60)   { tmpAgeStr = tmpAge + 's ago'; }
		else if (tmpAge < 3600) { tmpAgeStr = Math.floor(tmpAge / 60) + 'm ago'; }
		else                    { tmpAgeStr = Math.floor(tmpAge / 3600) + 'h ago'; }
		return tmpDirty + ' dirty · ' + tmpAgeStr;
	}

	// ─────────────────────────────────────────────
	//  Handlers invoked from inline attributes
	// ─────────────────────────────────────────────

	setFilter(pValue)
	{
		let tmpQ = pValue || '';
		this.pict.AppData.Manager.Filter.Query = tmpQ;
		lsSet(LS_KEY_FILTER, tmpQ);
		this.render();
	}

	setDirtyOnly(pChecked)
	{
		let tmpChecked = !!pChecked;
		this.pict.AppData.Manager.Filter.DirtyOnly = tmpChecked;
		lsSet(LS_KEY_DIRTY_ONLY, tmpChecked ? '1' : '0');
		// Lazy-scan if the user flips on dirty-only without any cached scan results.
		if (tmpChecked && Object.keys(this.pict.AppData.Manager.Scan.Results || {}).length === 0)
		{
			this.triggerScan();
		}
		this.render();
	}

	setSortByTime(pChecked)
	{
		let tmpChecked = !!pChecked;
		this.pict.AppData.Manager.Filter.SortByTime = tmpChecked;
		lsSet(LS_KEY_SORT_BY_TIME, tmpChecked ? '1' : '0');
		this.render();
	}

	triggerScan()
	{
		let tmpState = this.pict.AppData.Manager;
		tmpState.Scan.Running = true;
		this.render();

		this.pict.PictApplication.setStatus('Scanning all modules...');

		this.pict.providers.ManagerAPI.scanAllModules().then(
			(pBody) =>
			{
				tmpState.Scan.Results = pBody.Results || {};
				tmpState.Scan.When    = pBody.ScannedAt;
				lsSet(LS_KEY_SCAN, JSON.stringify(tmpState.Scan.Results));
				if (tmpState.Scan.When) { lsSet(LS_KEY_SCAN_WHEN, tmpState.Scan.When); }
				this.pict.PictApplication.setStatus('Scan complete (' + pBody.ElapsedMs
					+ 'ms, ' + pBody.ModuleCount + ' modules).');
			},
			(pError) => { this.pict.PictApplication.setStatus('Scan failed: ' + pError.message); }
		).then(() =>
			{
				tmpState.Scan.Running = false;
				this.render();
			});
	}
}

module.exports = ManagerSidebarView;
module.exports.default_configuration = _ViewConfiguration;
