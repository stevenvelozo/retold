const libPictView = require('pict-view');

const SCRIPT_LABELS =
	{
		status:   'Status.sh',
		update:   'Update.sh',
		checkout: 'Checkout.sh',
	};

/**
 * Manager-OpsRunner
 *
 * Cross-module ops (Status / Update / Checkout) used to swap the workspace
 * content area to a placeholder while output streamed into the bottom panel.
 * Now we keep the user where they were and surface the output through the
 * pict-section-modal-backed log viewer (Manager-LogModal). The route still
 * exists so deep links work.
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

		// Mark the operation scope so OperationsWS can route frames correctly.
		this.pict.AppData.Manager.ActiveOperation =
			{
				OperationId: null,
				CommandTag:  null,
				Lines:       [],
				HeaderState: 'running',
				HeaderText:  'Starting ' + tmpLabel + '...',
				Scope:       'all',
			};

		// Open the log modal so the user can watch the stream.
		let tmpLogModal = this.pict.views['Manager-LogModal'];
		if (tmpLogModal) { tmpLogModal.openForOperation('All modules — ' + tmpLabel); }

		this.pict.PictApplication.setStatus('Running ' + tmpLabel + '...');
		this.pict.providers.ManagerAPI.runAllModulesScript(pScript).then(
			(pResp) => { this.pict.PictApplication.setStatus('Started ' + tmpLabel + ' (' + pResp.OperationId + ')'); },
			(pError) =>
			{
				this.pict.PictApplication.setStatus(tmpLabel + ' failed to start: ' + pError.message);
			});
	}
}

module.exports = ManagerOpsRunnerView;
module.exports.default_configuration = _ViewConfiguration;
