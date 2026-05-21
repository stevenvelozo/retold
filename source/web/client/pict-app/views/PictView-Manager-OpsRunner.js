const libPictView = require('pict-view');

const SCRIPT_LABELS =
	{
		status:   'Status.sh',
		update:   'Update.sh',
		checkout: 'Checkout.sh',
		install:  'Install.sh',
	};

/**
 * Manager-OpsRunner
 *
 * Cross-module ops (Status / Update / Checkout) used to swap the workspace
 * content area, then briefly used a pict-section-modal log viewer. Now
 * they share the same plumbing as every other action — frames stream into
 * the persistent Log panel's Actions tab, and we just pop the panel open
 * so the user can watch.
 *
 * The `/Ops/:script` route still exists so deep links + the topbar
 * navigateTo() calls work, but the route handler invokes runScript() and
 * does not swap the workspace view.
 */
const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-OpsRunner',

	AutoRender: false,
};

class ManagerOpsRunnerView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	runScript(pScript)
	{
		let tmpLabel = SCRIPT_LABELS[pScript];
		if (!tmpLabel)
		{
			this.pict.PictApplication.setStatus('Unknown ops script: ' + pScript);
			return;
		}

		// Route through the operation queue so clicking Status/Update/
		// Checkout/Install while another op is running parks the click
		// instead of clobbering ActiveOperation. Same shape ModuleWorkspace
		// uses, just with Scope: 'all' and no ModuleName — the LogBar's
		// Actions tab renders any history entry regardless of scope.
		this.pict.providers.ManagerOperationsWS.enqueueOperation(
			() =>
			{
				this.pict.AppData.Manager.ActiveOperation =
					{
						OperationId: null,
						CommandTag:  null,
						Lines:       [],
						HeaderState: 'running',
						HeaderText:  tmpLabel,
						Scope:       'all',
						ModuleName:  null,
					};
				// Pop the persistent Log panel — single shared codepath
				// used by every action button. The Actions tab auto-
				// switches and auto-expands the new entry as soon as the
				// WS 'start' frame arrives.
				let tmpLayout = this.pict.views['Manager-Layout'];
				if (tmpLayout && typeof tmpLayout.popLogPanel === 'function')
				{
					tmpLayout.popLogPanel();
				}
				this.pict.PictApplication.setStatus('Running ' + tmpLabel + '...');
				return this.pict.providers.ManagerAPI.runAllModulesScript(pScript).then(
					(pResp) => { this.pict.PictApplication.setStatus('Started ' + tmpLabel + ' (' + pResp.OperationId + ')'); },
					(pError) =>
					{
						this.pict.PictApplication.setStatus(tmpLabel + ' failed to start: ' + pError.message);
					});
			},
			{ Label: tmpLabel });
	}
}

module.exports = ManagerOpsRunnerView;
module.exports.default_configuration = _ViewConfiguration;
