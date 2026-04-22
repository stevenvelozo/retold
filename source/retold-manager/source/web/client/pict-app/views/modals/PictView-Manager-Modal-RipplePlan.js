const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-RipplePlan',

	DefaultRenderable:            'Manager-Modal-RipplePlan-Content',
	DefaultDestinationAddress:    '#RM-ModalRoot',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.RipplePlanModal',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'Manager-Modal-RipplePlan-Template',
			Template: /*html*/`
<div class="modal-backdrop" onclick="if(event.target===this){window._Pict.views['Manager-Modal-RipplePlan'].close();}">
	<div class="modal" style="min-width:640px;max-width:780px">
		<h3>Plan ripple from {~D:Record.Root~}</h3>
		<p class="subtle" style="color:var(--color-muted);font-size:12px;margin:0 0 10px">
			Computes the ordered sequence of bumps, commits, and publishes required to propagate
			a new version of <strong>{~D:Record.Root~}</strong> through every ecosystem consumer.
		</p>
		<div class="form-row"><label>Target version</label>
			<input type="text" id="RM-R-Version" placeholder="(defaults to current local version)"></div>
		<div class="form-row"><label>Range prefix</label>
			<input type="text" id="RM-R-Prefix" value="^"></div>
		<div class="form-row"><label>Consumer bump</label>
			<input type="text" id="RM-R-Bump" value="patch" placeholder="patch / minor / major"></div>
		<div class="form-row"><label>Include devDeps</label>
			<input type="checkbox" id="RM-R-IncludeDev" style="width:auto">
			<span style="font-family:var(--font-sans);color:var(--color-muted);font-size:11px;margin-left:4px">
				(off by default &mdash; devDep cycles from test harnesses produce fallback ordering)
			</span></div>
		<div class="form-row"><label>Stop at apps</label>
			<input type="checkbox" id="RM-R-StopAtApps" checked style="width:auto"></div>
		<div class="form-row"><label>Run npm install</label>
			<input type="checkbox" id="RM-R-Install" checked style="width:auto"></div>
		<div class="form-row"><label>Run tests</label>
			<input type="checkbox" id="RM-R-Test" checked style="width:auto"></div>
		<div class="form-row"><label>Push after publish</label>
			<input type="checkbox" id="RM-R-Push" checked style="width:auto">
			<span style="font-family:var(--font-sans);color:var(--color-muted);font-size:11px;margin-left:4px">
				(<code>git push</code> after the commit-final; otherwise the module stays &uarr;N in the scan)
			</span></div>
		<div class="form-row"><label>Bring retold deps forward</label>
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

class ManagerModalRipplePlanView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	open(pRoot)
	{
		this._root = pRoot;
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.RipplePlanModal = { Root: pRoot };
		this.render();
	}

	close()
	{
		this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
	}

	submit()
	{
		let tmpOpts =
			{
				Root: this._root,
				TargetVersion:    document.getElementById('RM-R-Version').value.trim() || undefined,
				RangePrefix:      document.getElementById('RM-R-Prefix').value.trim() || '^',
				ConsumerBumpKind: document.getElementById('RM-R-Bump').value.trim() || 'patch',
				IncludeDev:       document.getElementById('RM-R-IncludeDev').checked,
				StopAtApps:       document.getElementById('RM-R-StopAtApps').checked,
				RunInstall:       document.getElementById('RM-R-Install').checked,
				RunTest:          document.getElementById('RM-R-Test').checked,
				RunPush:          document.getElementById('RM-R-Push').checked,
				BringRetoldDepsForward: document.getElementById('RM-R-BringForward').checked,
			};

		let tmpResult = document.getElementById('RM-R-Result');
		if (tmpResult) { tmpResult.innerHTML = '<em>computing plan...</em>'; }

		this.pict.providers.ManagerAPI.planRipple(tmpOpts).then(
			(pPlan) =>
			{
				this.close();
				// Navigate to /Ripple which then renders Manager-Ripple; stash the plan on AppData.
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

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
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
