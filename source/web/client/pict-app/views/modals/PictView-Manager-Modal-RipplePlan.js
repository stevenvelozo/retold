const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-RipplePlan',

	DefaultRenderable:            'Manager-Modal-RipplePlan-Content',
	DefaultDestinationAddress:    '#RM-R-Body',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.RipplePlanModal',

	AutoRender: false,

	CSS: /*css*/`
		.rm-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
		.ripple-plan-modal .rm-flat-filter-bar {
			display: flex; align-items: center; gap: 8px;
			margin: 4px 0 6px;
		}
		.ripple-plan-modal .rm-flat-filter-bar input[type="text"] {
			flex: 1;
			padding: 4px 8px;
			background: var(--color-bg);
			color: var(--color-text);
			border: 1px solid var(--color-border);
			border-radius: 3px;
			font: inherit;
			font-size: 12px;
		}
		.ripple-plan-modal .rm-flat-filter-bar .rm-flat-quick-actions {
			display: flex; gap: 4px;
		}
		.ripple-plan-modal .rm-flat-filter-bar button {
			font-size: 11px; padding: 2px 8px;
			background: rgba(47,129,247,0.12); color: var(--color-accent);
			border: 1px solid rgba(47,129,247,0.3); border-radius: 3px;
			cursor: pointer;
		}
		.ripple-plan-modal .rm-flat-filter-bar button:hover { background: rgba(47,129,247,0.22); }
		.ripple-plan-modal .rm-flat-list {
			border: 1px solid var(--color-border);
			border-radius: 4px;
			background: var(--color-panel-alt);
			padding: 4px 8px;
			margin: 0 0 8px;
			max-height: 220px;
			overflow: auto;
		}
		.ripple-plan-modal .rm-flat-row {
			display: flex; align-items: center; gap: 6px;
			padding: 1px 4px;
			font-family: var(--font-mono); font-size: 12px;
			cursor: pointer;
		}
		.ripple-plan-modal .rm-flat-row:hover { background: var(--color-panel); }
		.ripple-plan-modal .rm-flat-row input[type="checkbox"] { width: auto; margin: 0; }
		.ripple-plan-modal .rm-flat-row .rm-flat-row-name { flex: 1; min-width: 0; }
		.ripple-plan-modal .rm-flat-row .rm-flat-row-group {
			color: var(--color-muted);
			font-size: 10px;
			text-transform: uppercase;
			letter-spacing: 0.04em;
		}
		.ripple-plan-modal .rm-flat-row.is-origin .rm-flat-row-name {
			color: var(--color-accent); font-weight: 600;
		}
		.ripple-plan-modal .rm-flat-empty {
			padding: 8px 12px;
			color: var(--color-muted);
			font-size: 11px;
			font-style: italic;
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
<div class="ripple-plan-modal">
	{~TS:Manager-Modal-RipplePlan-GraphMode-Template:Record.GraphModeSlot~}
	{~TS:Manager-Modal-RipplePlan-FlatMode-Template:Record.FlatModeSlot~}

	<div id="RM-R-Result" style="margin-top:12px">
		{~TS:Manager-Modal-RipplePlan-Result-Computing-Template:Record.ResultComputingSlot~}
		{~TS:Manager-Modal-RipplePlan-Result-Error-Template:Record.ResultErrorSlot~}
	</div>
	<div class="rm-modal-actions">
		<button class="action" onclick="_Pict.views['Manager-Modal-RipplePlan'].close()">Cancel</button>
		<button class="action primary" onclick="_Pict.views['Manager-Modal-RipplePlan'].submit()">Compute plan</button>
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
		(off by default - devDep cycles produce fallback ordering)
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
<div class="form-row compact"><label>Prepare documentation index</label>
	<input type="checkbox" id="RM-R-PrepareDocs" style="width:auto">
	<span style="font-family:var(--font-sans);color:var(--color-muted);font-size:11px;margin-left:4px">
		(<code>npx quack prepare-docs</code> before each step's bump — sweeps regenerated indices into the publish commit)
	</span></div>
`
		},
		{
			Hash: 'Manager-Modal-RipplePlan-FlatMode-Template',
			Template: /*html*/`
<p class="subtle" style="color:var(--color-muted);font-size:12px;margin:0 0 8px">
	Apply the same set of operations to the checked modules, in arbitrary order
	(no producer/consumer dependencies). Each module runs the checked operations
	independently.
</p>

<div class="selection-summary">
	<span><span class="count" id="RM-R-FlatCheckedCount">{~D:Record.FlatCheckedCount~}</span> of <span class="total">{~D:Record.FlatTotalCount~}</span> selected</span>
</div>
<div class="rm-flat-filter-bar">
	<input type="text" id="RM-R-FlatFilter" placeholder="filter by module name…"
		value="{~D:Record.FlatFilter~}"
		oninput="_Pict.views['Manager-Modal-RipplePlan']._applyFlatFilter(this.value)">
	<div class="rm-flat-quick-actions">
		<button type="button" onclick="_Pict.views['Manager-Modal-RipplePlan']._setFlatAll(true)">all (visible)</button>
		<button type="button" onclick="_Pict.views['Manager-Modal-RipplePlan']._setFlatAll(false)">none</button>
		<button type="button" onclick="_Pict.views['Manager-Modal-RipplePlan']._invertFlat()">invert</button>
	</div>
</div>
<div class="rm-flat-list" id="RM-R-FlatList">
	{~TS:Manager-Modal-RipplePlan-FlatEmpty-Template:Record.FlatEmptySlot~}
	{~TS:Manager-Modal-RipplePlan-FlatRow-Template:Record.FlatRows~}
</div>

<div class="rm-flat-ops">
	<div class="form-row compact rm-flat-op-row">
		<label><input type="checkbox" id="RM-R-FlatOp-MergeUpstream" style="width:auto"> Pull upstream into fork (merge, no force-push)</label>
		<span class="rm-flat-op-detail">gentle: <code>fetch + merge</code> the org's commits, fast-forward push to the fork. Keeps your history; no rebase/force.</span>
	</div>
	<div class="form-row compact rm-flat-op-row">
		<label><input type="checkbox" id="RM-R-FlatOp-SyncUpstream" checked style="width:auto"> Sync from upstream (rebase + force-push)</label>
		<span class="rm-flat-op-detail">aggressive: rebases your commits onto upstream and force-pushes. Linear history; skips dirty repos &amp; non-forks</span>
	</div>
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
		<label><input type="checkbox" id="RM-R-FlatOp-Commit" style="width:auto"> Commit changes</label>
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
	<div class="form-row compact rm-flat-op-row">
		<label><input type="checkbox" id="RM-R-FlatOp-CreatePR" style="width:auto"> Create PR (fork → upstream)</label>
		<span class="rm-flat-op-detail">requires each module to have an <code>upstream</code> remote</span>
	</div>
	<div class="form-row compact rm-flat-op-row" id="RM-R-FlatOp-PRTitleRow">
		<label>PR title</label>
		<input type="text" id="RM-R-FlatOp-PRTitle" style="flex:1" placeholder="(defaults to latest commit subject)">
	</div>
	<div class="form-row compact rm-flat-op-row" id="RM-R-FlatOp-PRBodyRow">
		<label>PR body</label>
		<textarea id="RM-R-FlatOp-PRBody" rows="3" style="flex:1" placeholder="(defaults to latest commit body)"></textarea>
	</div>
	<div class="form-row compact rm-flat-op-row">
		<label><input type="checkbox" id="RM-R-FlatOp-ApprovePR" style="width:auto"> Approve PR</label>
		<span class="rm-flat-op-detail">requires review permission; GitHub blocks self-approval</span>
	</div>
	<div class="form-row compact rm-flat-op-row">
		<label><input type="checkbox" id="RM-R-FlatOp-MergePR" style="width:auto"> Merge PR</label>
		<span class="rm-flat-op-detail">
			Strategy:
			<select id="RM-R-FlatOp-MergeStrategy">
				<option value="rebase" selected>rebase</option>
				<option value="squash">squash</option>
				<option value="merge">merge commit</option>
			</select>
			&nbsp;<label style="font-weight:normal"><input type="checkbox" id="RM-R-FlatOp-AdminMerge" style="width:auto"> Admin override</label>
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
			Hash: 'Manager-Modal-RipplePlan-FlatRow-Template',
			Template: /*html*/`
<label class="rm-flat-row {~D:Record.OriginClass~}" data-flat-name="{~D:Record.Name~}">
	<input type="checkbox" data-flat-checkbox="{~D:Record.Name~}" {~D:Record.CheckedAttr~}
		onchange="_Pict.views['Manager-Modal-RipplePlan']._toggleFlatModule('{~D:Record.Name~}', this.checked)">
	<span class="rm-flat-row-name">{~D:Record.Name~}</span>
	<span class="rm-flat-row-group">{~D:Record.Group~}</span>
</label>`
		},
		{
			Hash: 'Manager-Modal-RipplePlan-FlatEmpty-Template',
			Template: /*html*/`<div class="rm-flat-empty">{~D:Record.Message~}</div>`
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
			DestinationAddress: '#RM-R-Body',
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
		this._flatModules = [];     // full pool of module names available to bulk-op against
		this._flatChecked = {};     // map<name, true> for modules that are checked
		this._flatFilter = '';      // current filter substring (lowercased); '' = no filter
		this._dialog = null;
	}

	// pOriginatingModule: legacy single-arg form — sets the producer-tree
	//   modal scoped to a starting module.
	// pOriginatingModule + pOptions.Mode = 'flat' + pOptions.Modules:
	//   opens the modal in bulk-flat mode.  Modules (if given) is the pool of
	//   names available to choose from; otherwise the full forkable manifest
	//   set from AppData.Manager.Modules is used.  PreCheck (if given) is the
	//   array of names checked by default; otherwise every pool entry is
	//   checked (legacy behaviour, so existing callers continue to act on the
	//   modules they passed in).
	open(pOriginatingModule, pOptions)
	{
		let tmpOpts = pOptions || {};
		this._mode = (tmpOpts.Mode === 'flat') ? 'flat' : 'graph';

		if (this._mode === 'flat')
		{
			let tmpPool = (Array.isArray(tmpOpts.Modules) && tmpOpts.Modules.length > 0)
				? tmpOpts.Modules.slice()
				: this._getAllManifestModuleNames();
			this._flatModules = tmpPool;

			this._flatChecked = {};
			let tmpInitial = Array.isArray(tmpOpts.PreCheck) ? tmpOpts.PreCheck : tmpPool;
			for (let i = 0; i < tmpInitial.length; i++)
			{
				this._flatChecked[tmpInitial[i]] = true;
			}
			this._flatFilter = '';
		}
		else
		{
			this._flatModules = [];
			this._flatChecked = {};
			this._flatFilter = '';
		}

		this._origin = pOriginatingModule;
		this._siblingPrefix = this._computeSiblingPrefix(pOriginatingModule);
		this._resultState = null;

		this._writeRecord();

		let tmpModal = this.pict.views['Pict-Section-Modal'];
		if (!tmpModal || typeof tmpModal.show !== 'function')
		{
			this.pict.PictApplication.setStatus('Cannot open the ripple planner; modal section unavailable.');
			return;
		}

		let tmpRec = this.pict.AppData.Manager.ViewRecord.RipplePlanModal;
		let tmpTitle = (tmpRec && tmpRec.Title) || 'Plan ripple';

		this.pict.CSSMap.injectCSS();
		tmpModal.show(
			{
				title:     tmpTitle,
				closeable: true,
				width:     '820px',
				content:   '<div id="RM-R-Body"></div>',
				buttons:   [],
				onOpen: (pDialog) => { this._dialog = pDialog; this.render(); },
				onClose: () => { this._dialog = null; }
			});
	}

	// ─────────────────────────────────────────────
	//  Flat-mode helpers
	// ─────────────────────────────────────────────

	// Pull every module name out of AppData.Manager.Modules (excluding any
	// example/sub-path entries with a "/" in the name). Used as the default
	// pool when a caller opens flat mode without an explicit Modules list.
	_getAllManifestModuleNames()
	{
		let tmpAll = (this.pict.AppData.Manager && this.pict.AppData.Manager.Modules) || [];
		let tmpOut = [];
		for (let i = 0; i < tmpAll.length; i++)
		{
			let tmpName = tmpAll[i] && tmpAll[i].Name;
			if (!tmpName) continue;
			if (tmpName.indexOf('/') !== -1) continue; // skip example sub-paths
			tmpOut.push(tmpName);
		}
		return tmpOut;
	}

	_countFlatChecked()
	{
		let tmpN = 0;
		for (let i = 0; i < this._flatModules.length; i++)
		{
			if (this._flatChecked[this._flatModules[i]]) tmpN++;
		}
		return tmpN;
	}

	// Called from the filter input's oninput=.  Updates instance state +
	// toggles row visibility via the DOM (no re-render — keeps focus on the
	// input).  Filter is case-insensitive substring against the module name.
	_applyFlatFilter(pValue)
	{
		this._flatFilter = (pValue || '').toLowerCase().trim();
		let tmpRows = document.querySelectorAll('#RM-R-FlatList .rm-flat-row');
		for (let i = 0; i < tmpRows.length; i++)
		{
			let tmpName = (tmpRows[i].dataset.flatName || '').toLowerCase();
			let tmpShow = this._flatFilter === '' || tmpName.indexOf(this._flatFilter) !== -1;
			tmpRows[i].style.display = tmpShow ? '' : 'none';
		}
	}

	// Called from row checkboxes' onchange=. Updates instance state + count.
	_toggleFlatModule(pName, pChecked)
	{
		if (pChecked) this._flatChecked[pName] = true;
		else delete this._flatChecked[pName];
		this._refreshFlatCount();
	}

	// Quick-action: check (or uncheck) every currently-visible row.  Hidden
	// rows (filtered out) are left untouched, so the filter doubles as a
	// scoped multi-select.
	_setFlatAll(pChecked)
	{
		let tmpBoxes = document.querySelectorAll('#RM-R-FlatList .rm-flat-row');
		for (let i = 0; i < tmpBoxes.length; i++)
		{
			if (tmpBoxes[i].style.display === 'none') continue;
			let tmpName = tmpBoxes[i].dataset.flatName;
			if (!tmpName) continue;
			let tmpCb = tmpBoxes[i].querySelector('input[type="checkbox"]');
			if (tmpCb) tmpCb.checked = pChecked;
			if (pChecked) this._flatChecked[tmpName] = true;
			else delete this._flatChecked[tmpName];
		}
		this._refreshFlatCount();
	}

	// Invert across visible rows (consistent with _setFlatAll's filter scope).
	_invertFlat()
	{
		let tmpBoxes = document.querySelectorAll('#RM-R-FlatList .rm-flat-row');
		for (let i = 0; i < tmpBoxes.length; i++)
		{
			if (tmpBoxes[i].style.display === 'none') continue;
			let tmpName = tmpBoxes[i].dataset.flatName;
			if (!tmpName) continue;
			let tmpCb = tmpBoxes[i].querySelector('input[type="checkbox"]');
			let tmpNew = !(tmpCb && tmpCb.checked);
			if (tmpCb) tmpCb.checked = tmpNew;
			if (tmpNew) this._flatChecked[tmpName] = true;
			else delete this._flatChecked[tmpName];
		}
		this._refreshFlatCount();
	}

	_refreshFlatCount()
	{
		let tmpEl = document.getElementById('RM-R-FlatCheckedCount');
		if (tmpEl) tmpEl.textContent = String(this._countFlatChecked());
	}

	close()
	{
		if (this._dialog && typeof this._dialog._dismiss === 'function') { this._dialog._dismiss(null); }
		// onClose resets the dialog handle.
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		// Re-sync the live selection count from the actual checkbox state.
		// In graph mode this scans the producer tree; in flat mode it just
		// reads our own _flatChecked map.
		if (this._mode !== 'flat')
		{
			this._refreshSelectionCount();
		}
		else
		{
			this._refreshFlatCount();
			// Reapply any active filter so row visibility matches state across
			// re-renders (e.g. after a submit-validation error redraws the modal).
			if (this._flatFilter) { this._applyFlatFilter(this._flatFilter); }
		}
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
			RunPrepareDocs:   document.getElementById('RM-R-PrepareDocs').checked,
		};
	}

	_buildFlatOpts()
	{
		// Build the actual modules list from the checked set (not the pool).
		let tmpModulesToRun = [];
		for (let i = 0; i < this._flatModules.length; i++)
		{
			if (this._flatChecked[this._flatModules[i]]) tmpModulesToRun.push(this._flatModules[i]);
		}
		if (tmpModulesToRun.length === 0)
		{
			this._resultState = { Error: 'No modules checked. Check at least one module in the list.' };
			this._writeRecord();
			this.render();
			return null;
		}
		let tmpMergeUpstream = document.getElementById('RM-R-FlatOp-MergeUpstream').checked;
		let tmpSyncUpstream = document.getElementById('RM-R-FlatOp-SyncUpstream').checked;
		let tmpNcu     = document.getElementById('RM-R-FlatOp-Ncu').checked;
		let tmpNcuScope = document.getElementById('RM-R-FlatOp-NcuScope').value;
		let tmpBump    = document.getElementById('RM-R-FlatOp-Bump').checked;
		let tmpBumpKind = document.getElementById('RM-R-FlatOp-BumpKind').value;
		let tmpCommit  = document.getElementById('RM-R-FlatOp-Commit').checked;
		let tmpCommitMsg = (document.getElementById('RM-R-FlatOp-CommitMessage').value || '').trim();
		let tmpPush    = document.getElementById('RM-R-FlatOp-Push').checked;
		let tmpPublish = document.getElementById('RM-R-FlatOp-Publish').checked;
		let tmpCreatePR  = document.getElementById('RM-R-FlatOp-CreatePR').checked;
		let tmpPRTitle   = (document.getElementById('RM-R-FlatOp-PRTitle').value || '').trim();
		let tmpPRBody    = document.getElementById('RM-R-FlatOp-PRBody').value || '';
		let tmpApprovePR = document.getElementById('RM-R-FlatOp-ApprovePR').checked;
		let tmpMergePR   = document.getElementById('RM-R-FlatOp-MergePR').checked;
		let tmpMergeStrategy = document.getElementById('RM-R-FlatOp-MergeStrategy').value || 'squash';
		let tmpAdminMerge    = document.getElementById('RM-R-FlatOp-AdminMerge').checked;

		if (tmpCommit && !tmpCommitMsg)
		{
			this._resultState = { Error: 'Commit is checked — please supply a commit message.' };
			this._writeRecord();
			this.render();
			return null;
		}
		if (!tmpMergeUpstream && !tmpSyncUpstream && !tmpNcu && !tmpBump && !tmpCommit && !tmpPush && !tmpPublish && !tmpCreatePR && !tmpApprovePR && !tmpMergePR)
		{
			this._resultState = { Error: 'Pick at least one operation to perform.' };
			this._writeRecord();
			this.render();
			return null;
		}
		return {
			Mode:    'flat',
			Modules: tmpModulesToRun,
			Operations: {
				MergeUpstream: tmpMergeUpstream,
				SyncUpstream:  tmpSyncUpstream,
				Ncu:           tmpNcu,
				NcuScope:      tmpNcuScope,
				Bump:          tmpBump,
				BumpKind:      tmpBumpKind,
				Commit:        tmpCommit,
				CommitMessage: tmpCommitMsg,
				Push:          tmpPush,
				Publish:       tmpPublish,
				CreatePR:      tmpCreatePR,
				PRTitle:       tmpPRTitle,
				PRBody:        tmpPRBody,
				ApprovePR:     tmpApprovePR,
				MergePR:       tmpMergePR,
				MergeStrategy: tmpMergeStrategy,
				AdminMerge:    tmpAdminMerge
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
		let tmpFlatRows = [];
		let tmpFlatEmptySlot = [];
		let tmpFlatCheckedCount = 0;
		if (tmpIsFlat)
		{
			// Group lookup keyed by module name (for the right-side group label on each row).
			let tmpModuleGroups = {};
			let tmpAllModules = (this.pict.AppData.Manager && this.pict.AppData.Manager.Modules) || [];
			for (let i = 0; i < tmpAllModules.length; i++)
			{
				if (tmpAllModules[i] && tmpAllModules[i].Name)
				{
					tmpModuleGroups[tmpAllModules[i].Name] = tmpAllModules[i].Group || 'Other';
				}
			}

			// Sort pool by group order then name for a stable visual layout.
			let tmpSorted = this._flatModules.slice().sort((pA, pB) =>
			{
				let tmpGa = tmpModuleGroups[pA] || 'Other';
				let tmpGb = tmpModuleGroups[pB] || 'Other';
				let tmpIa = GROUP_ORDER.indexOf(tmpGa);
				let tmpIb = GROUP_ORDER.indexOf(tmpGb);
				if (tmpIa === -1) tmpIa = GROUP_ORDER.length;
				if (tmpIb === -1) tmpIb = GROUP_ORDER.length;
				if (tmpIa !== tmpIb) return tmpIa - tmpIb;
				return pA.localeCompare(pB);
			});

			for (let i = 0; i < tmpSorted.length; i++)
			{
				let tmpName = tmpSorted[i];
				let tmpChecked = !!this._flatChecked[tmpName];
				if (tmpChecked) tmpFlatCheckedCount++;
				tmpFlatRows.push({
					Name:        tmpName,
					Group:       tmpModuleGroups[tmpName] || 'Other',
					CheckedAttr: tmpChecked ? 'checked' : '',
					OriginClass: (tmpName === this._origin) ? 'is-origin' : ''
				});
			}

			if (tmpSorted.length === 0)
			{
				tmpFlatEmptySlot.push({ Message: '(no modules in pool — close and reopen this dialog)' });
			}
		}

		// GraphModeSlot is a one-element-array conditional (rendered via {~TS:~}),
		// so anything the GraphMode template addresses as Record.X must live
		// INSIDE the slot entry — the inner template's record is the slot
		// element, not the outer view record. Producer-list data (Groups,
		// SiblingsBtnSlot, EmptySlot) goes here; the outer-scoped slots
		// (ResultComputingSlot, ResultErrorSlot) stay at the top level
		// because they're referenced by the outer template directly.
		let tmpGraphModeSlot = tmpIsFlat
			? []
			: [{
					SiblingsBtnSlot: this._siblingPrefix ? [{ Prefix: this._siblingPrefix }] : [],
					EmptySlot:       tmpEmptySlot,
					Groups:          tmpGroups,
				}];

		return {
			Title:               tmpIsFlat
				? ('Bulk ops - ' + tmpFlatCheckedCount + ' of ' + this._flatModules.length + ' module' + (this._flatModules.length === 1 ? '' : 's') + ' checked')
				: 'Plan ripple',
			Origin:              this._origin,
			GraphModeSlot:       tmpGraphModeSlot,
			FlatModeSlot:        tmpIsFlat
				? [{
						ModuleCount:          this._flatModules.length,
						FlatTotalCount:       this._flatModules.length,
						FlatCheckedCount:     tmpFlatCheckedCount,
						FlatFilter:           this._flatFilter,
						FlatRows:             tmpFlatRows,
						FlatEmptySlot:        tmpFlatEmptySlot,
						DefaultCommitMessage: ''
					}]
				: [],
			ResultComputingSlot: tmpResultComputingSlot,
			ResultErrorSlot:     tmpResultErrorSlot,
		};
	}
}

module.exports = ManagerModalRipplePlanView;
module.exports.default_configuration = _ViewConfiguration;
