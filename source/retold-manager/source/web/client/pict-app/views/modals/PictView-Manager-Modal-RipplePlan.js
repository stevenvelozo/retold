const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-RipplePlan',

	DefaultRenderable:            'Manager-Modal-RipplePlan-Content',
	DefaultDestinationAddress:    '#RM-ModalRoot',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.RipplePlanModal',

	AutoRender: false,

	CSS: /*css*/`
		.ripple-plan-modal .rm-flat-module-list {
			border: 1px solid var(--color-border);
			border-radius: 4px;
			background: var(--color-panel-alt);
			padding: 8px 10px;
			margin: 4px 0 12px;
			max-height: 90px;
			overflow: auto;
			font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
			font-size: 11px;
			color: var(--color-muted);
			line-height: 1.55;
		}
		.ripple-plan-modal .rm-flat-ops {
			margin: 4px 0 8px;
			border: 1px solid var(--color-border);
			border-radius: 4px;
			padding: 8px 12px;
			background: var(--color-bg);
		}
		.ripple-plan-modal .rm-flat-op-row {
			display: flex;
			align-items: center;
			gap: 10px;
			margin: 6px 0;
		}
		.ripple-plan-modal .rm-flat-op-row > label {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			min-width: 220px;
		}
		.ripple-plan-modal .rm-flat-op-detail {
			color: var(--color-muted);
			font-size: 11px;
		}
		.ripple-plan-modal .rm-flat-op-detail select {
			margin-left: 4px;
			padding: 2px 6px;
			background: var(--color-bg);
			color: var(--color-text);
			border: 1px solid var(--color-border);
			border-radius: 3px;
			font: inherit;
			font-size: 11px;
		}
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
<div class="modal-backdrop ripple-plan-modal" onclick="if(event.target===this){_Pict.views['Manager-Modal-RipplePlan'].close();}">
	<div class="modal" style="min-width:680px;max-width:820px">
		<h3>{~D:Record.Title~}</h3>
		{~TS:Manager-Modal-RipplePlan-GraphMode-Template:Record.GraphModeSlot~}
		{~TS:Manager-Modal-RipplePlan-FlatMode-Template:Record.FlatModeSlot~}

		<div id="RM-R-Result" style="margin-top:12px">
			{~TS:Manager-Modal-RipplePlan-Result-Computing-Template:Record.ResultComputingSlot~}
			{~TS:Manager-Modal-RipplePlan-Result-Error-Template:Record.ResultErrorSlot~}
		</div>
		<div class="modal-actions">
			<button class="action" onclick="_Pict.views['Manager-Modal-RipplePlan'].close()">Cancel</button>
			<button class="action primary" onclick="_Pict.views['Manager-Modal-RipplePlan'].submit()">Compute plan</button>
		</div>
	</div>
</div>
`
		},
		{
			Hash: 'Manager-Modal-RipplePlan-GraphMode-Template',
			Template: /*html*/`
<p class="subtle" style="color:var(--color-muted);font-size:12px;margin:0 0 8px">
	Pick the producer modules to publish. Their transitive consumers will be appended
	automatically in topological order. Each producer step runs <code>bump-if-needed</code>
	(skips bump if you already advanced the version) before publishing.
</p>

<div class="selection-summary">
	<span><span class="count" id="RM-R-SelectionCount">0</span> selected</span>
	<span class="quick-actions">
		{~TS:Manager-Modal-RipplePlan-SiblingsBtn-Template:Record.SiblingsBtnSlot~}
		<button onclick="_Pict.views['Manager-Modal-RipplePlan'].clearSelection()" type="button">clear all</button>
	</span>
</div>

<div class="producer-list" id="RM-R-ProducerList">
	{~TS:Manager-Modal-RipplePlan-Empty-Template:Record.EmptySlot~}
	{~TS:Manager-Modal-RipplePlan-Group-Template:Record.Groups~}
</div>

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
`
		},
		{
			Hash: 'Manager-Modal-RipplePlan-FlatMode-Template',
			Template: /*html*/`
<p class="subtle" style="color:var(--color-muted);font-size:12px;margin:0 0 8px">
	Apply the same set of operations to <strong>{~D:Record.ModuleCount~}</strong> selected
	modules, in arbitrary order (no producer/consumer dependencies). Each module runs the
	checked operations independently.
</p>

<div class="selection-summary">
	<span><span class="count">{~D:Record.ModuleCount~}</span> selected</span>
</div>
<div class="rm-flat-module-list">{~D:Record.ModuleListText~}</div>

<div class="rm-flat-ops">
	<div class="form-row compact rm-flat-op-row">
		<label><input type="checkbox" id="RM-R-FlatOp-Ncu" style="width:auto"> Run <code>ncu -u</code></label>
		<span class="rm-flat-op-detail">
			Scope:
			<select id="RM-R-FlatOp-NcuScope">
				<option value="retold" selected>retold (filter @retold/* and known ecosystem)</option>
				<option value="all">all (every dependency)</option>
			</select>
		</span>
	</div>
	<div class="form-row compact rm-flat-op-row">
		<label><input type="checkbox" id="RM-R-FlatOp-Bump" style="width:auto"> Bump version</label>
		<span class="rm-flat-op-detail">
			Kind:
			<select id="RM-R-FlatOp-BumpKind">
				<option value="patch" selected>patch</option>
				<option value="minor">minor</option>
				<option value="major">major</option>
			</select>
		</span>
	</div>
	<div class="form-row compact rm-flat-op-row">
		<label><input type="checkbox" id="RM-R-FlatOp-Commit" checked style="width:auto"> Commit changes</label>
	</div>
	<div class="form-row compact rm-flat-op-row" id="RM-R-FlatOp-CommitMessageRow">
		<label>Commit message</label>
		<input type="text" id="RM-R-FlatOp-CommitMessage" style="flex:1" placeholder="Adding brand json and some gitignore entries." value="{~D:Record.DefaultCommitMessage~}">
	</div>
	<div class="form-row compact rm-flat-op-row">
		<label><input type="checkbox" id="RM-R-FlatOp-Push" style="width:auto"> Push to origin</label>
	</div>
	<div class="form-row compact rm-flat-op-row">
		<label><input type="checkbox" id="RM-R-FlatOp-Publish" style="width:auto"> Publish to npm</label>
		<span class="rm-flat-op-detail" style="color:var(--color-warning)">
			pauses for confirmation per module
		</span>
	</div>
</div>
`
		},
		{
			Hash: 'Manager-Modal-RipplePlan-SiblingsBtn-Template',
			Template: /*html*/`<button type="button" title="Select every module sharing the originating module's hyphen prefix" onclick="_Pict.views['Manager-Modal-RipplePlan'].selectSiblings()">+ select {~D:Record.Prefix~}-* siblings</button>`
		},
		{
			Hash: 'Manager-Modal-RipplePlan-Empty-Template',
			Template: /*html*/`<div style="color:var(--color-muted);font-style:italic">{~D:Record.Message~}</div>`
		},
		{
			Hash: 'Manager-Modal-RipplePlan-Group-Template',
			Template: /*html*/`
<div class="producer-group">
	<div class="producer-group-header">
		<span class="producer-group-name">{~D:Record.Name~} ({~D:Record.Count~})</span>
		<span class="producer-group-actions">
			<button type="button" onclick="_Pict.views['Manager-Modal-RipplePlan']._setGroupChecked('{~D:Record.NameJs~}', true)">all</button>
			<button type="button" onclick="_Pict.views['Manager-Modal-RipplePlan']._setGroupChecked('{~D:Record.NameJs~}', false)">none</button>
		</span>
	</div>
	{~TS:Manager-Modal-RipplePlan-Row-Template:Record.Rows~}
</div>
`
		},
		{
			Hash: 'Manager-Modal-RipplePlan-Row-Template',
			Template: /*html*/`
<div class="producer-row {~D:Record.RowClass~}">
	<label for="{~D:Record.Id~}">
		<input type="checkbox" id="{~D:Record.Id~}" data-module="{~D:Record.Name~}" data-group="{~D:Record.GroupName~}" {~D:Record.CheckedAttr~} onchange="_Pict.views['Manager-Modal-RipplePlan']._refreshSelectionCount()">
		<span class="producer-name">{~D:Record.Name~}</span>
	</label>
</div>
`
		},
		{
			Hash: 'Manager-Modal-RipplePlan-Result-Computing-Template',
			Template: /*html*/`<em>computing plan...</em>`
		},
		{
			Hash: 'Manager-Modal-RipplePlan-Result-Error-Template',
			Template: /*html*/`<div style="color:var(--color-danger)">{~D:Record.Message~}</div>`
		},
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

function jsString(pText)
{
	return String(pText == null ? '' : pText)
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'");
}

class ManagerModalRipplePlanView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._origin = null;
		this._siblingPrefix = null;
		this._resultState = null;   // null | 'computing' | { Error: '...' }
		this._mode = 'graph';       // 'graph' (producer-tree planner) | 'flat' (bulk per-module ops)
		this._flatModules = [];
	}

	// pOriginatingModule: legacy single-arg form — sets the producer-tree
	//   modal scoped to a starting module.
	// pOriginatingModule + pOptions.Mode = 'flat' + pOptions.Modules:
	//   opens the modal in bulk-flat mode, applies the toggled operations
	//   to each selected module without producer/consumer ordering.
	open(pOriginatingModule, pOptions)
	{
		let tmpOpts = pOptions || {};
		this._mode = (tmpOpts.Mode === 'flat') ? 'flat' : 'graph';
		this._flatModules = (this._mode === 'flat' && Array.isArray(tmpOpts.Modules))
			? tmpOpts.Modules.slice()
			: [];
		this._origin = pOriginatingModule;
		this._siblingPrefix = this._computeSiblingPrefix(pOriginatingModule);
		this._resultState = null;

		this._writeRecord();
		this.render();
	}

	close()
	{
		this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		// Re-sync the live selection count from the actual checkbox state
		// (graph mode only — flat mode has no producer checkboxes).
		if (this._mode !== 'flat') { this._refreshSelectionCount(); }
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
		let tmpOpts;
		if (this._mode === 'flat')
		{
			tmpOpts = this._buildFlatOpts();
			if (!tmpOpts) { return; }   // _buildFlatOpts set the error state
		}
		else
		{
			tmpOpts = this._buildGraphOpts();
			if (!tmpOpts) { return; }
		}

		this._resultState = 'computing';
		this._writeRecord();
		this.render();

		this.pict.providers.ManagerAPI.planRipple(tmpOpts).then(
			(pPlan) =>
			{
				this.close();
				// Force the Ripple view to pick up the fresh plan: dropping
				// ActiveRipple makes showFromRoute re-enter from the plan.
				this.pict.AppData.Manager.ActiveRipple = null;
				this.pict.AppData.Manager.RipplePlan   = pPlan;
				this.pict.PictApplication.navigateTo('/Ripple');
				// If the router is already at /Ripple the navigate above is a
				// no-op (navigo doesn't refire the handler), so trigger the
				// view manually. Idempotent if navigateTo did fire.
				let tmpRippleView = this.pict.views['Manager-Ripple'];
				if (tmpRippleView && typeof tmpRippleView.showFromRoute === 'function')
				{
					tmpRippleView.showFromRoute();
				}
			},
			(pError) =>
			{
				this._resultState = { Error: 'Plan failed: ' + pError.message };
				this._writeRecord();
				this.render();
			});
	}

	_buildGraphOpts()
	{
		let tmpRoots = this._collectSelectedRoots();
		if (tmpRoots.length === 0)
		{
			this._resultState = { Error: 'Select at least one producer module.' };
			this._writeRecord();
			this.render();
			return null;
		}
		return {
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
	}

	_buildFlatOpts()
	{
		if (this._flatModules.length === 0)
		{
			this._resultState = { Error: 'No modules selected.' };
			this._writeRecord();
			this.render();
			return null;
		}
		let tmpNcu     = document.getElementById('RM-R-FlatOp-Ncu').checked;
		let tmpNcuScope = document.getElementById('RM-R-FlatOp-NcuScope').value;
		let tmpBump    = document.getElementById('RM-R-FlatOp-Bump').checked;
		let tmpBumpKind = document.getElementById('RM-R-FlatOp-BumpKind').value;
		let tmpCommit  = document.getElementById('RM-R-FlatOp-Commit').checked;
		let tmpCommitMsg = (document.getElementById('RM-R-FlatOp-CommitMessage').value || '').trim();
		let tmpPush    = document.getElementById('RM-R-FlatOp-Push').checked;
		let tmpPublish = document.getElementById('RM-R-FlatOp-Publish').checked;

		if (tmpCommit && !tmpCommitMsg)
		{
			this._resultState = { Error: 'Commit is checked — please supply a commit message.' };
			this._writeRecord();
			this.render();
			return null;
		}
		if (!tmpNcu && !tmpBump && !tmpCommit && !tmpPush && !tmpPublish)
		{
			this._resultState = { Error: 'Pick at least one operation to perform.' };
			this._writeRecord();
			this.render();
			return null;
		}
		return {
			Mode:    'flat',
			Modules: this._flatModules.slice(),
			Operations: {
				Ncu:           tmpNcu,
				NcuScope:      tmpNcuScope,
				Bump:          tmpBump,
				BumpKind:      tmpBumpKind,
				Commit:        tmpCommit,
				CommitMessage: tmpCommitMsg,
				Push:          tmpPush,
				Publish:       tmpPublish
			}
		};
	}

	// Public — called from inline handlers in the group-header all/none buttons.
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

	// ─────────────────────────────────────────────
	//  Data shaping
	// ─────────────────────────────────────────────

	_writeRecord()
	{
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.RipplePlanModal = this._buildRecord();
	}

	_buildRecord()
	{
		let tmpModules = (this.pict.AppData.Manager && this.pict.AppData.Manager.Modules) || [];

		let tmpEmptySlot = [];
		let tmpGroups   = [];

		if (tmpModules.length === 0)
		{
			tmpEmptySlot.push({ Message: '(modules not yet loaded — close and reopen this dialog)' });
		}
		else
		{
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

			for (let i = 0; i < tmpGroupNames.length; i++)
			{
				let tmpGroupName = tmpGroupNames[i];
				let tmpEntries = tmpByGroup[tmpGroupName].slice().sort((pA, pB) => pA.Name.localeCompare(pB.Name));

				let tmpRows = [];
				for (let j = 0; j < tmpEntries.length; j++)
				{
					let tmpEntry = tmpEntries[j];
					let tmpIsOrigin = (tmpEntry.Name === this._origin);
					tmpRows.push({
						Name:        tmpEntry.Name,
						GroupName:   tmpGroupName,
						Id:          'RM-R-Mod-' + tmpEntry.Name.replace(/[^A-Za-z0-9_-]/g, '_'),
						RowClass:    tmpIsOrigin ? 'is-origin' : '',
						CheckedAttr: tmpIsOrigin ? 'checked' : '',
					});
				}

				tmpGroups.push({
					Name:    tmpGroupName,
					NameJs:  jsString(tmpGroupName),
					Count:   tmpEntries.length,
					Rows:    tmpRows,
				});
			}
		}

		let tmpResultComputingSlot = (this._resultState === 'computing') ? [{}] : [];
		let tmpResultErrorSlot     = (this._resultState && this._resultState.Error)
			? [{ Message: this._resultState.Error }] : [];

		// Mode-gated slots: only one of GraphModeSlot / FlatModeSlot is
		// populated.  The producer-tree UI lives in the graph slot;
		// the bulk-ops UI in the flat slot.
		let tmpIsFlat = this._mode === 'flat';
		let tmpFlatModuleListText = '';
		if (tmpIsFlat)
		{
			let tmpSample = this._flatModules.slice(0, 12);
			tmpFlatModuleListText = tmpSample.join(', ')
				+ (this._flatModules.length > tmpSample.length
					? ' … (+' + (this._flatModules.length - tmpSample.length) + ' more)' : '');
		}

		return {
			Title:               tmpIsFlat
				? ('Ripple ' + this._flatModules.length + ' selected module' + (this._flatModules.length === 1 ? '' : 's'))
				: 'Plan ripple',
			Origin:              this._origin,
			GraphModeSlot:       tmpIsFlat ? [] : [{}],
			FlatModeSlot:        tmpIsFlat
				? [{
						ModuleCount:          this._flatModules.length,
						ModuleListText:       tmpFlatModuleListText,
						DefaultCommitMessage: ''
					}]
				: [],
			SiblingsBtnSlot:     this._siblingPrefix ? [{ Prefix: this._siblingPrefix }] : [],
			EmptySlot:           tmpEmptySlot,
			Groups:              tmpGroups,
			ResultComputingSlot: tmpResultComputingSlot,
			ResultErrorSlot:     tmpResultErrorSlot,
		};
	}
}

module.exports = ManagerModalRipplePlanView;
module.exports.default_configuration = _ViewConfiguration;
