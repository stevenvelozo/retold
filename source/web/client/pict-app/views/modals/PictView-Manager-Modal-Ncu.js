const libPictView = require('pict-view');

// npm-check-updates dialog -- a pict-section-modal `.show()` prompt (scope
// radios + Cancel / Check / Apply).  The modal section owns the overlay,
// backdrop-click / Esc dismiss, and close button; there is no hand-rolled
// `.modal-backdrop` template or #RM-ModalRoot mount anymore.
const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-Ncu',

	AutoRender: false,

	CSS: /*css*/`
		.rm-ncu-hint { color: var(--color-muted); font-size: 12px; margin: 0 0 12px; }
		.rm-ncu-hint code { font-family: var(--font-mono); }
		.rm-ncu-scope { display: flex; flex-direction: column; gap: 6px; }
		.rm-ncu-scope label { font-family: var(--font-sans); color: var(--color-text); font-size: 13px; }
		.rm-ncu-scope input { width: auto; margin-right: 6px; }
	`
};

class ManagerModalNcuView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	open(pModuleName)
	{
		let tmpModal = this.pict.views['Pict-Section-Modal'];
		if (!tmpModal || typeof tmpModal.show !== 'function')
		{
			this.pict.PictApplication.setStatus('Cannot open the ncu dialog; modal section unavailable.');
			return;
		}

		this.pict.CSSMap.injectCSS();

		tmpModal.show(
			{
				title:     'npm-check-updates - ' + pModuleName,
				closeable: true,
				content:
					'<p class="rm-ncu-hint"><strong>Check</strong> lists outdated packages. <strong>Apply</strong> runs '
					+ '<code>ncu -u</code> (updates package.json) and then <code>npm install</code>. '
					+ '<strong>Retold scope</strong> filters to ecosystem modules only; <strong>All</strong> includes every dep. '
					+ 'Output streams in the panel below.</p>'
					+ '<div class="rm-ncu-scope">'
					+ '<label><input type="radio" name="rm-ncu-scope" value="retold" checked> Retold ecosystem only</label>'
					+ '<label><input type="radio" name="rm-ncu-scope" value="all"> All dependencies</label>'
					+ '</div>',
				buttons:
				[
					{ Hash: 'cancel', Label: 'Cancel' },
					{ Hash: 'check',  Label: 'Check', Style: 'primary' },
					{ Hash: 'apply',  Label: 'Apply (update + install)', Style: 'success' }
				]
			}).then((pChoice) =>
			{
				if (pChoice !== 'check' && pChoice !== 'apply') { return; }
				// The dialog DOM is still present here (removal is deferred),
				// so the scope radio is readable.
				let tmpScope = 'retold';
				let tmpChecked = document.querySelector('input[name="rm-ncu-scope"]:checked');
				if (tmpChecked) { tmpScope = tmpChecked.value; }
				this._runNcu(pModuleName, (pChoice === 'apply'), tmpScope);
			});
	}

	_runNcu(pModuleName, pApply, pScope)
	{
		let tmpLabel = pApply ? 'ncu -u + npm install' : 'ncu';
		// Route through the operation queue -- multi-step ncu apply is
		// the canonical "I clicked something else by accident while it
		// was running" trap; queuing the next click rather than letting
		// it overwrite ActiveOperation is what eliminates the bug.
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
						Scope:       'module',
						ModuleName:  pModuleName,
					};
				if (this.pict.views['Manager-OutputPanel']) { this.pict.views['Manager-OutputPanel'].render(); }
				return this.pict.providers.ManagerAPI.runNcu(pModuleName, pApply, pScope).then(
					() => { this.pict.PictApplication.setStatus('ncu ' + (pApply ? 'apply' : 'check') + ' started.'); },
					(pError) => { this.pict.PictApplication.setStatus('NCU failed: ' + pError.message); });
			},
			{ Label: tmpLabel, ModuleName: pModuleName });
	}
}

module.exports = ManagerModalNcuView;
module.exports.default_configuration = _ViewConfiguration;
