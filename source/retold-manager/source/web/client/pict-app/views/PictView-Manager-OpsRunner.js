const libPictView = require('pict-view');

const SCRIPT_LABELS =
	{
		status:   'Status.sh',
		update:   'Update.sh',
		checkout: 'Checkout.sh',
	};

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-OpsRunner',

	DefaultRenderable:            'Manager-OpsRunner-Content',
	DefaultDestinationAddress:    '#RM-Workspace-Content',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.OpsRunner',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'Manager-OpsRunner-Template',
			Template: /*html*/`
<div class="placeholder">
	<h2>All modules &mdash; {~D:Record.Label~}</h2>
	<p>Running <code>modules/{~D:Record.Label~}</code> across every module. Output streams in the panel below.</p>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-OpsRunner-Content',
			TemplateHash:       'Manager-OpsRunner-Template',
			DestinationAddress: '#RM-Workspace-Content',
			RenderMethod:       'replace',
		}
	]
};

class ManagerOpsRunnerView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._lastScript = null;
	}

	// Called by the application's showOps(pScript) when /Ops/:script resolves.
	runScript(pScript)
	{
		if (!SCRIPT_LABELS[pScript])
		{
			this.pict.PictApplication.setStatus('Unknown ops script: ' + pScript);
			return;
		}
		this._lastScript = pScript;
		this.pict.AppData.Manager.SelectedModule = null;
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.OpsRunner = { Label: SCRIPT_LABELS[pScript] };
		this.render();

		this.pict.PictApplication.setStatus('Running ' + SCRIPT_LABELS[pScript] + '...');
		this.pict.providers.ManagerAPI.runAllModulesScript(pScript).then(
			(pResp) => { this.pict.PictApplication.setStatus('Started ' + SCRIPT_LABELS[pScript] + ' (' + pResp.OperationId + ')'); },
			(pError) =>
			{
				this.pict.PictApplication.setStatus(SCRIPT_LABELS[pScript] + ' failed to start: ' + pError.message);
			});
	}

	// Record is populated in runScript() before render() fires (pict-view
	// reads from the record address up-front, before onBeforeRender).

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = ManagerOpsRunnerView;
module.exports.default_configuration = _ViewConfiguration;
