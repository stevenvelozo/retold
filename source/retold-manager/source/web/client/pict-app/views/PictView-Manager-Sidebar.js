const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Sidebar',

	DefaultRenderable:            'Manager-Sidebar-Shell',
	DefaultDestinationAddress:    '#RM-Sidebar',
	DefaultTemplateRecordAddress: 'AppData.Manager',

	AutoRender: false,

	CSS: /*css*/`
		.dirty-badge
		{
			display: inline-block;
			width: 7px;
			height: 7px;
			border-radius: 50%;
			background: var(--color-warning);
			margin-left: 6px;
			vertical-align: middle;
		}
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
			oninput="{~P~}.views['Manager-Sidebar'].setFilter(this.value)">
		<button id="RM-ScanButton" title="Scan all modules for changes"
			onclick="{~P~}.views['Manager-Sidebar'].triggerScan()">Scan</button>
	</div>
	<label class="sidebar-checkbox">
		<input type="checkbox" id="RM-DirtyOnly"
			onchange="{~P~}.views['Manager-Sidebar'].setDirtyOnly(this.checked)">
		Dirty only
		<span id="RM-ScanMeta"></span>
	</label>
</div>
<nav id="RM-ModuleList">
	<p class="loading">Loading modules...</p>
</nav>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Sidebar-Shell',
			TemplateHash:       'Manager-Sidebar-Shell-Template',
			DestinationAddress: '#RM-Sidebar',
			RenderMethod:       'replace',
		}
	]
};

const GROUP_ORDER = ['Fable', 'Meadow', 'Orator', 'Pict', 'Utility', 'Apps'];

const LS_KEY_FILTER     = 'rm:filter:query';
const LS_KEY_DIRTY_ONLY = 'rm:filter:dirtyOnly';
const LS_KEY_SCAN       = 'rm:scan:results';
const LS_KEY_SCAN_WHEN  = 'rm:scan:when';

function lsGet(pKey) { try { return window.localStorage.getItem(pKey); } catch (e) { return null; } }
function lsSet(pKey, pValue) { try { window.localStorage.setItem(pKey, pValue); } catch (e) { /* quota */ } }

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
			tmpState.Filter.Query     = lsGet(LS_KEY_FILTER) || '';
			tmpState.Filter.DirtyOnly = lsGet(LS_KEY_DIRTY_ONLY) === '1';
			try
			{
				let tmpCached = lsGet(LS_KEY_SCAN);
				if (tmpCached) { tmpState.Scan.Results = JSON.parse(tmpCached) || {}; }
			}
			catch (e) { tmpState.Scan.Results = {}; }
			tmpState.Scan.When = lsGet(LS_KEY_SCAN_WHEN) || null;
		}
		return this.pict.AppData.Manager;
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		let tmpDirty = document.getElementById('RM-DirtyOnly');
		if (tmpDirty) { tmpDirty.checked = !!this.pict.AppData.Manager.Filter.DirtyOnly; }

		this._renderModuleList();
		this._renderScanMeta();
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	_renderModuleList()
	{
		let tmpState    = this.pict.AppData.Manager;
		let tmpQuery    = (tmpState.Filter.Query || '').toLowerCase();
		let tmpDirtyOnly = tmpState.Filter.DirtyOnly;
		let tmpScan     = tmpState.Scan.Results || {};
		let tmpSelected = tmpState.SelectedModule;
		let tmpGroups   = tmpState.ModulesByGroup || {};

		let tmpHtml = '';
		let tmpAnyShown = false;

		for (let i = 0; i < GROUP_ORDER.length; i++)
		{
			let tmpGroup = GROUP_ORDER[i];
			let tmpList  = tmpGroups[tmpGroup] || [];

			// Filter rows
			let tmpRows = [];
			for (let j = 0; j < tmpList.length; j++)
			{
				let tmpMod = tmpList[j];
				if (tmpQuery && tmpMod.Name.toLowerCase().indexOf(tmpQuery) === -1) { continue; }
				let tmpScanEntry = tmpScan[tmpMod.Name];
				if (tmpDirtyOnly && !(tmpScanEntry && tmpScanEntry.Dirty)) { continue; }
				tmpRows.push(tmpMod);
			}
			if (tmpRows.length === 0) { continue; }

			tmpAnyShown = true;
			tmpHtml += '<div class="group">';
			tmpHtml += '<div class="group-header">' + this._escape(tmpGroup) + '</div>';

			for (let j = 0; j < tmpRows.length; j++)
			{
				let tmpMod = tmpRows[j];
				let tmpSelectedClass = (tmpSelected === tmpMod.Name) ? ' selected' : '';
				let tmpScanEntry = tmpScan[tmpMod.Name];
				let tmpDirtyBadge = tmpScanEntry && tmpScanEntry.Dirty
					? ' <span class="dirty-badge" title="Uncommitted changes"></span>' : '';
				tmpHtml += '<a class="module-row' + tmpSelectedClass + '" '
					+ 'href="#/Module/' + encodeURIComponent(tmpMod.Name) + '">'
					+ this._escape(tmpMod.Name) + tmpDirtyBadge + '</a>';
			}

			tmpHtml += '</div>';
		}

		if (!tmpAnyShown)
		{
			tmpHtml = '<p class="loading">'
				+ (tmpDirtyOnly ? 'No dirty modules (click Scan to re-scan).'
					: (tmpQuery ? 'No modules match the filter.' : 'Loading modules...'))
				+ '</p>';
		}

		this.pict.ContentAssignment.assignContent('#RM-ModuleList', tmpHtml);
	}

	// ─────────────────────────────────────────────
	//  Handlers invoked from inline attributes
	// ─────────────────────────────────────────────

	setFilter(pValue)
	{
		let tmpQ = pValue || '';
		this.pict.AppData.Manager.Filter.Query = tmpQ;
		lsSet(LS_KEY_FILTER, tmpQ);
		this._renderModuleList();
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
		this._renderModuleList();
	}

	triggerScan()
	{
		let tmpState = this.pict.AppData.Manager;
		tmpState.Scan.Running = true;
		this._renderScanMeta();

		let tmpBtn = document.getElementById('RM-ScanButton');
		if (tmpBtn) { tmpBtn.classList.add('scanning'); tmpBtn.disabled = true; }

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
				let tmpBtn2 = document.getElementById('RM-ScanButton');
				if (tmpBtn2) { tmpBtn2.classList.remove('scanning'); tmpBtn2.disabled = false; }
				this._renderScanMeta();
				this._renderModuleList();
			});
	}

	_renderScanMeta()
	{
		let tmpEl = document.getElementById('RM-ScanMeta');
		if (!tmpEl) { return; }
		let tmpState = this.pict.AppData.Manager.Scan;
		if (tmpState.Running) { tmpEl.textContent = 'scanning…'; return; }
		if (!tmpState.When)   { tmpEl.textContent = ''; return; }
		let tmpNames = Object.keys(tmpState.Results || {});
		let tmpDirty = tmpNames.filter((pN) => tmpState.Results[pN].Dirty).length;
		let tmpWhen  = new Date(tmpState.When);
		let tmpAge   = Math.max(0, Math.floor((Date.now() - tmpWhen.getTime()) / 1000));
		let tmpAgeStr;
		if      (tmpAge < 60)   { tmpAgeStr = tmpAge + 's ago'; }
		else if (tmpAge < 3600) { tmpAgeStr = Math.floor(tmpAge / 60) + 'm ago'; }
		else                    { tmpAgeStr = Math.floor(tmpAge / 3600) + 'h ago'; }
		tmpEl.textContent = tmpDirty + ' dirty · ' + tmpAgeStr;
	}

	_escape(pText)
	{
		let tmpS = String(pText == null ? '' : pText);
		return tmpS
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}
}

module.exports = ManagerSidebarView;
module.exports.default_configuration = _ViewConfiguration;
