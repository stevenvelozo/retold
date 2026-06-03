const libPictView = require('pict-view');

// Commit dialog -- a pict-section-modal `.show()` prompt (textarea + Cancel /
// Commit).  The modal section owns the overlay, backdrop-click / Esc dismiss,
// close button, and focus, so this view is just the open() trigger + submit
// wiring; there is no hand-rolled `.modal-backdrop` template or #RM-ModalRoot
// mount anymore.
const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-Commit',

	AutoRender: false,

	// Styles the textarea rendered into the modal body.  Registered via the
	// CSS cascade (theme-token driven) and injected from open() since this
	// view never renders a renderable of its own.
	CSS: /*css*/`
		.rm-commit-hint { color: var(--color-muted); font-size: 12px; margin: 0 0 10px; }
		.rm-commit-hint code { font-family: var(--font-mono); }
		.rm-commit-textarea
		{
			width: 100%; min-height: 120px; box-sizing: border-box;
			background: var(--color-bg); color: var(--color-text);
			border: 1px solid var(--color-border); border-radius: 6px;
			font-family: var(--font-mono); font-size: 12px; padding: 8px 10px; resize: vertical;
		}
		.rm-commit-textarea:focus { outline: none; border-color: var(--color-accent); }
	`
};

class ManagerModalCommitView extends libPictView
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
			this.pict.PictApplication.setStatus('Cannot open the commit dialog; modal section unavailable.');
			return;
		}

		// Make sure the textarea CSS is in the DOM before the modal paints.
		this.pict.CSSMap.injectCSS();

		tmpModal.show(
			{
				title:     'Commit - ' + pModuleName,
				closeable: true,
				content:
					'<p class="rm-commit-hint">Runs <code>git commit -a -m &lt;message&gt;</code>.</p>'
					+ '<textarea id="RM-CommitMessage" class="rm-commit-textarea" placeholder="Commit message"></textarea>',
				buttons:
				[
					{ Hash: 'cancel', Label: 'Cancel' },
					{ Hash: 'commit', Label: 'Commit', Style: 'primary' }
				],
				onOpen: () =>
				{
					let tmpTextarea = document.getElementById('RM-CommitMessage');
					if (tmpTextarea) { tmpTextarea.focus(); }
				}
			}).then((pChoice) =>
			{
				if (pChoice !== 'commit') { return; }
				let tmpTextarea = document.getElementById('RM-CommitMessage');
				let tmpMessage = (tmpTextarea ? tmpTextarea.value : '').trim();
				if (tmpMessage.length === 0)
				{
					this.pict.PictApplication.setStatus('Commit needs a message.');
					return;
				}
				this._runCommit(pModuleName, tmpMessage);
			});
	}

	_runCommit(pModuleName, pMessage)
	{
		// Route through the operation queue -- if the runner is busy
		// (e.g. mid-ncu-apply) the commit parks until idle instead of
		// merging into the running op's UI state.
		this.pict.providers.ManagerOperationsWS.enqueueOperation(
			() =>
			{
				this.pict.AppData.Manager.ActiveOperation =
					{
						OperationId: null,
						CommandTag:  null,
						Lines:       [],
						HeaderState: 'running',
						HeaderText:  'git commit',
						Scope:       'module',
						ModuleName:  pModuleName,
					};
				if (this.pict.views['Manager-OutputPanel']) { this.pict.views['Manager-OutputPanel'].render(); }
				return this.pict.providers.ManagerAPI.commitModule(pModuleName, pMessage).then(
					() => { this.pict.PictApplication.setStatus('Commit started for ' + pModuleName + '.'); },
					(pError) => { this.pict.PictApplication.setStatus('Commit failed: ' + pError.message); });
			},
			{ Label: 'git commit', ModuleName: pModuleName });
	}
}

module.exports = ManagerModalCommitView;
module.exports.default_configuration = _ViewConfiguration;
