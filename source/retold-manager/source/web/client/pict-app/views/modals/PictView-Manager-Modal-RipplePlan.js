const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-RipplePlan',

	DefaultRenderable:            'Manager-Modal-RipplePlan-Content',
	DefaultDestinationAddress:    '#RM-ModalRoot',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.RipplePlanModal',

	AutoRender: false,

	CSS: /*css*/`
		.ripple-plan-modal .producer-list {
			border: 1px solid var(--color-border); border-radius: 4px;
			background: var(--color-panel-alt); padding: 6px 8px;
			max-height: 280px; overflow: auto; margin: 4px 0 8px;
		}
		.ripple-plan-modal .producer-group { margin-bottom: 8px; }
		.ripple-plan-modal .producer-group:last-child { margin-bottom: 0; }
		.ripple-plan-modal .producer-group-header {
			display: flex; align-items: baseline; gap: 8px;
			padding: 2px 0 4px; border-bottom: 1px dashed var(--color-border);
			margin-bottom: 4px;
		}
		.ripple-plan-modal .producer-group-name {
			font-family: var(--font-mono); font-size: 11px;
			color: var(--color-muted); text-transform: uppercase;
			letter-spacing: 0.04em;
		}
		.ripple-plan-modal .producer-group-actions {
			margin-left: auto; display: flex; gap: 4px;
		}
		.ripple-plan-modal .producer-group-actions button {
			font-size: 10px; padding: 1px 6px; background: none;
			border: 1px solid var(--color-border); border-radius: 3px;
			color: var(--color-muted); cursor: pointer;
		}
		.ripple-plan-modal .producer-group-actions button:hover {
			color: var(--color-accent); border-color: var(--color-accent);
		}
		.ripple-plan-modal .producer-row {
			display: flex; align-items: center; gap: 6px;
			padding: 1px 4px; font-family: var(--font-mono); font-size: 12px;
		}
		.ripple-plan-modal .producer-row:hover { background: var(--color-panel); }
		.ripple-plan-modal .producer-row label {
			cursor: pointer; flex: 1; display: flex; align-items: center; gap: 6px;
			min-width: 0;
		}
		.ripple-plan-modal .producer-row input[type="checkbox"] {
			width: auto; margin: 0;
		}
		.ripple-plan-modal .producer-row .producer-name { flex: 1; min-width: 0; }
		.ripple-plan-modal .producer-row.is-origin .producer-name {
			color: var(--color-accent); font-weight: 600;
		}
		.ripple-plan-modal .selection-summary {
			display: flex; align-items: baseline; gap: 8px;
			color: var(--color-muted); font-size: 11px; margin: 4px 0 8px;
		}
		.ripple-plan-modal .selection-summary .count {
			color: var(--color-accent); font-weight: 600;
		}
		.ripple-plan-modal .selection-summary .quick-actions {
			margin-left: auto; display: flex; gap: 6px;
		}
		.ripple-plan-modal .selection-summary button {
			font-size: 11px; padding: 2px 8px;
			background: rgba(47,129,247,0.12); color: var(--color-accent);
			border: 1px solid rgba(47,129,247,0.3); border-radius: 3px;
			cursor: pointer;
		}
		.ripple-plan-modal .selection-summary button:hover {
			background: rgba(47,129,247,0.22);
		}
		.ripple-plan-modal .form-row.compact { margin-bottom: 4px; }
		.ripple-plan-modal .form-row.compact label { min-width: 160px; }
	`,

	Templates:
	[
		{
			Hash: 'Manager-Modal-RipplePlan-Template',
			Template: /*html*/`
<div class="modal-backdrop ripple-plan-modal" onclick="if(event.target===this){window._Pict.views['Manager-Modal-RipplePlan'].close();}">
	<div class="modal" style="min-width:680px;max-width:820px">
		<h3>Plan ripple</h3>
		<p class="subtle" style="color:var(--color-muted);font-size:12px;margin:0 0 8px">
			Pick the producer modules to publish. Their transitive consumers will be appended
			automatically in topological order. Each producer step runs <code>bump-if-needed</code>
			(skips bump if you already advanced the version) before publishing.
		</p>

		<div class="selection-summary">
			<span><span class="count" id="RM-R-SelectionCount">0</span> selected</span>
			<span class="quick-actions">
				<button id="RM-R-PickSiblings" type="button"
					title="Select every module sharing the originating module's hyphen prefix"></button>
				<button onclick="{~P~}.views['Manager-Modal-RipplePlan'].clearSelection()" type="button">clear all</button>
			</span>
		</div>

		<div class="producer-list" id="RM-R-ProducerList">{~D:Record.ProducersHtml~}</div>

		<div class="form-row compact"><label>Range prefix</label>
			<input type="text" id="RM-R-Prefix" value="^"></div>
		<div class="form-row compact"><label>Producer bump (if needed)</label>
			<input type="text" id="RM-R-ProducerBump" value="patch" placeholder="patch / minor / major"></div>
		<div class="form-row compact"><label>Consumer bump</label>
			<input type="text" id="RM-R-Bump" value="patch" placeholder="patch / minor / major"></div>
		<div class="form-row compact"><label>Include devDeps</label>
			<input type="checkbox" id="RM-R-IncludeDev" style="width:auto">
			<span style="font-family:var(--font-sans);color:var(--color-muted);font-size:11px;margin-left:4px">
				(off by default &mdash; devDep cycles produce fallback ordering)
			</span></div>
		<div class="form-row compact"><label>Stop at apps</label>
			<input type="checkbox" id="RM-R-StopAtApps" checked style="width:auto"></div>
		<div class="form-row compact"><label>Run npm install</label>
			<input type="checkbox" id="RM-R-Install" checked style="width:auto"></div>
		<div class="form-row compact"><label>Run tests</label>
			<input type="checkbox" id="RM-R-Test" checked style="width:auto"></div>
		<div class="form-row compact"><label>Push after publish</label>
			<input type="checkbox" id="RM-R-Push" checked style="width:auto"></div>
		<div class="form-row compact"><label>Bring retold deps forward</label>
			<input type="checkbox" id="RM-R-BringForward" style="width:auto">
			<span style="font-family:var(--font-sans);color:var(--color-muted);font-size:11px;margin-left:4px">
				(<code>ncu -u --filter &lt;retold&gt;</code> before each consumer step)
			</span></div>

		<div id="RM-R-Result" style="margin-top:12px"></div>
		<div class="modal-actions">
			<button class="action" onclick="{~P~}.views['Manager-Modal-RipplePlan'].close()">Cancel</button>
			<button class="action primary" onclick="{~P~}.views['Manager-Modal-RipplePlan'].submit()">Compute plan</button>
		</div>
	</div>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Modal-RipplePlan-Content',
			TemplateHash:       'Manager-Modal-RipplePlan-Template',
			DestinationAddress: '#RM-ModalRoot',
			RenderMethod:       'replace',
		}
	]
};

// Group order matches RippleGraph's GROUP_ORDER so the modal mirrors the
// topo-sort tie-breaker. Apps sit at the bottom because they're typically
// the cone leaves, not the seeds.
const GROUP_ORDER = ['Fable', 'Meadow', 'Orator', 'Pict', 'Utility', 'Apps'];

class ManagerModalRipplePlanView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._origin = null;
		this._siblingPrefix = null;
	}

	open(pOriginatingModule)
	{
		this._origin = pOriginatingModule;
		this._siblingPrefix = this._computeSiblingPrefix(pOriginatingModule);

		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.RipplePlanModal =
			{
				Origin: pOriginatingModule,
				ProducersHtml: this._buildProducerListHtml(pOriginatingModule),
			};
		this.render();
	}

	close()
	{
		this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();

		// Wire the dynamic "select <prefix>-* siblings" button. Hide it if
		// the originating module has no meaningful sibling prefix
		// (e.g. single-segment names like "fable").
		let tmpSiblingBtn = document.getElementById('RM-R-PickSiblings');
		if (tmpSiblingBtn)
		{
			if (this._siblingPrefix)
			{
				tmpSiblingBtn.textContent = '+ select ' + this._siblingPrefix + '-* siblings';
				tmpSiblingBtn.style.display = '';
				tmpSiblingBtn.onclick = () => this.selectSiblings();
			}
			else
			{
				tmpSiblingBtn.style.display = 'none';
			}
		}

		// Wire per-group "all / none" buttons.
		let tmpGroupBtns = document.querySelectorAll('.producer-group-actions button[data-group]');
		for (let i = 0; i < tmpGroupBtns.length; i++)
		{
			tmpGroupBtns[i].onclick = (pEvent) =>
				{
					let tmpBtn = pEvent.currentTarget;
					let tmpGroup = tmpBtn.getAttribute('data-group');
					let tmpAct   = tmpBtn.getAttribute('data-act');
					this._setGroupChecked(tmpGroup, tmpAct === 'all');
				};
		}

		// Wire checkboxes to refresh the count display.
		let tmpChecks = document.querySelectorAll('#RM-R-ProducerList input[type="checkbox"][data-module]');
		for (let i = 0; i < tmpChecks.length; i++)
		{
			tmpChecks[i].addEventListener('change', () => this._refreshSelectionCount());
		}
		this._refreshSelectionCount();

		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// ─────────────────────────────────────────────
	//  Selection helpers (called from inline handlers)
	// ─────────────────────────────────────────────

	selectSiblings()
	{
		if (!this._siblingPrefix) { return; }
		let tmpPrefix = this._siblingPrefix + '-';
		let tmpChecks = document.querySelectorAll('#RM-R-ProducerList input[type="checkbox"][data-module]');
		for (let i = 0; i < tmpChecks.length; i++)
		{
			let tmpName = tmpChecks[i].getAttribute('data-module');
			if (tmpName.indexOf(tmpPrefix) === 0)
			{
				tmpChecks[i].checked = true;
			}
		}
		this._refreshSelectionCount();
	}

	clearSelection()
	{
		let tmpChecks = document.querySelectorAll('#RM-R-ProducerList input[type="checkbox"][data-module]');
		for (let i = 0; i < tmpChecks.length; i++)
		{
			tmpChecks[i].checked = false;
		}
		this._refreshSelectionCount();
	}

	submit()
	{
		let tmpRoots = this._collectSelectedRoots();
		let tmpResult = document.getElementById('RM-R-Result');

		if (tmpRoots.length === 0)
		{
			if (tmpResult)
			{
				tmpResult.innerHTML = '<div style="color:var(--color-danger)">'
					+ 'Select at least one producer module.</div>';
			}
			return;
		}

		let tmpOpts =
			{
				Roots:            tmpRoots,
				RangePrefix:      document.getElementById('RM-R-Prefix').value.trim() || '^',
				ConsumerBumpKind: document.getElementById('RM-R-Bump').value.trim() || 'patch',
				ProducerBumpKind: document.getElementById('RM-R-ProducerBump').value.trim() || 'patch',
				IncludeDev:       document.getElementById('RM-R-IncludeDev').checked,
				StopAtApps:       document.getElementById('RM-R-StopAtApps').checked,
				RunInstall:       document.getElementById('RM-R-Install').checked,
				RunTest:          document.getElementById('RM-R-Test').checked,
				RunPush:          document.getElementById('RM-R-Push').checked,
				BringRetoldDepsForward: document.getElementById('RM-R-BringForward').checked,
			};

		if (tmpResult) { tmpResult.innerHTML = '<em>computing plan...</em>'; }

		this.pict.providers.ManagerAPI.planRipple(tmpOpts).then(
			(pPlan) =>
			{
				this.close();
				this.pict.AppData.Manager.RipplePlan = pPlan;
				this.pict.PictApplication.navigateTo('/Ripple');
			},
			(pError) =>
			{
				if (tmpResult)
				{
					tmpResult.innerHTML = '<div style="color:var(--color-danger)">Plan failed: '
						+ this._escape(pError.message) + '</div>';
				}
			});
	}

	// ─────────────────────────────────────────────
	//  Internals
	// ─────────────────────────────────────────────

	_collectSelectedRoots()
	{
		let tmpResult = [];
		let tmpChecks = document.querySelectorAll('#RM-R-ProducerList input[type="checkbox"][data-module]:checked');
		for (let i = 0; i < tmpChecks.length; i++)
		{
			tmpResult.push(tmpChecks[i].getAttribute('data-module'));
		}
		return tmpResult;
	}

	_setGroupChecked(pGroup, pChecked)
	{
		let tmpChecks = document.querySelectorAll(
			'#RM-R-ProducerList input[type="checkbox"][data-group="' + pGroup + '"]');
		for (let i = 0; i < tmpChecks.length; i++)
		{
			tmpChecks[i].checked = pChecked;
		}
		this._refreshSelectionCount();
	}

	_refreshSelectionCount()
	{
		let tmpCount = this._collectSelectedRoots().length;
		let tmpEl = document.getElementById('RM-R-SelectionCount');
		if (tmpEl) { tmpEl.textContent = String(tmpCount); }
	}

	/**
	 * Sibling prefix is everything except the last hyphen segment. For
	 * "meadow-connection-mongodb" → "meadow-connection". For single-segment
	 * names like "fable" → null (no siblings to suggest).
	 */
	_computeSiblingPrefix(pName)
	{
		if (!pName || typeof pName !== 'string') { return null; }
		let tmpParts = pName.split('-');
		if (tmpParts.length < 2) { return null; }
		return tmpParts.slice(0, -1).join('-');
	}

	_buildProducerListHtml(pOrigin)
	{
		// AppData.Manager.Modules is loaded by ManagerAPI.loadModules() at
		// app startup. If it's somehow missing, render a placeholder.
		let tmpModules = (this.pict.AppData.Manager && this.pict.AppData.Manager.Modules) || [];
		if (tmpModules.length === 0)
		{
			return '<div style="color:var(--color-muted);font-style:italic">'
				+ '(modules not yet loaded — close and reopen this dialog)</div>';
		}

		// Group by .Group, ordered to match RippleGraph's GROUP_ORDER.
		let tmpByGroup = {};
		for (let i = 0; i < tmpModules.length; i++)
		{
			let tmpM = tmpModules[i];
			let tmpG = tmpM.Group || 'Other';
			if (!tmpByGroup[tmpG]) { tmpByGroup[tmpG] = []; }
			tmpByGroup[tmpG].push(tmpM);
		}

		let tmpGroupNames = Object.keys(tmpByGroup);
		tmpGroupNames.sort((pA, pB) =>
			{
				let tmpIa = GROUP_ORDER.indexOf(pA);
				let tmpIb = GROUP_ORDER.indexOf(pB);
				if (tmpIa === -1) { tmpIa = GROUP_ORDER.length; }
				if (tmpIb === -1) { tmpIb = GROUP_ORDER.length; }
				if (tmpIa !== tmpIb) { return tmpIa - tmpIb; }
				return pA.localeCompare(pB);
			});

		let tmpHtml = '';
		for (let i = 0; i < tmpGroupNames.length; i++)
		{
			let tmpGroup = tmpGroupNames[i];
			let tmpEntries = tmpByGroup[tmpGroup].slice().sort((pA, pB) => pA.Name.localeCompare(pB.Name));

			tmpHtml += '<div class="producer-group">';
			tmpHtml += '  <div class="producer-group-header">';
			tmpHtml += '    <span class="producer-group-name">' + this._escape(tmpGroup)
				+ ' (' + tmpEntries.length + ')</span>';
			tmpHtml += '    <span class="producer-group-actions">';
			tmpHtml += '      <button type="button" data-group="' + this._escape(tmpGroup) + '" data-act="all">all</button>';
			tmpHtml += '      <button type="button" data-group="' + this._escape(tmpGroup) + '" data-act="none">none</button>';
			tmpHtml += '    </span>';
			tmpHtml += '  </div>';

			for (let j = 0; j < tmpEntries.length; j++)
			{
				let tmpEntry = tmpEntries[j];
				let tmpIsOrigin = (tmpEntry.Name === pOrigin);
				let tmpId = 'RM-R-Mod-' + tmpEntry.Name.replace(/[^A-Za-z0-9_-]/g, '_');
				tmpHtml += '<div class="producer-row' + (tmpIsOrigin ? ' is-origin' : '') + '">';
				tmpHtml += '  <label for="' + tmpId + '">';
				tmpHtml += '    <input type="checkbox" id="' + tmpId + '"'
					+ ' data-module="' + this._escape(tmpEntry.Name) + '"'
					+ ' data-group="' + this._escape(tmpGroup) + '"'
					+ (tmpIsOrigin ? ' checked' : '') + '>';
				tmpHtml += '    <span class="producer-name">' + this._escape(tmpEntry.Name) + '</span>';
				tmpHtml += '  </label>';
				tmpHtml += '</div>';
			}

			tmpHtml += '</div>';
		}

		return tmpHtml;
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

module.exports = ManagerModalRipplePlanView;
module.exports.default_configuration = _ViewConfiguration;
