const libPictView = require('pict-view');

// Create-PR dialog.  Hosted in a pict-section-modal `.show()` window (the modal
// section owns the overlay / Esc / close); this view renders its async-resolved
// slots (loading -> not-forkable | form) into the dialog body and controls its
// own dismiss so an empty title keeps the dialog open.
const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-CreatePR',

	DefaultRenderable:            'Manager-Modal-CreatePR-Content',
	DefaultDestinationAddress:    '#RM-CreatePR-Body',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.CreatePRModal',

	AutoRender: false,

	CSS: /*css*/`
		.rm-pr-summary
		{
			font-size: 12px;
			color: var(--color-muted);
			font-variant-numeric: tabular-nums;
			margin: 0 0 10px;
			word-break: break-word;
		}
		.rm-pr-summary code { color: var(--color-accent); }
		.rm-pr-field-label { display: block; font-size: 11px; color: var(--color-muted); margin: 8px 0 3px; }
		#RM-PRTitle { width: 100%; box-sizing: border-box; }
		.rm-pr-existing
		{
			font-size: 12px;
			border: 1px solid var(--color-warning);
			border-radius: 6px;
			padding: 6px 8px;
			margin: 0 0 10px;
		}
		.rm-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
	`,

	Templates:
	[
		{
			Hash: 'Manager-Modal-CreatePR-Template',
			Template: /*html*/`
{~TS:Manager-Modal-CreatePR-Loading-Template:Record.LoadingSlot~}
{~TS:Manager-Modal-CreatePR-NotForkable-Template:Record.NotForkableSlot~}
{~TS:Manager-Modal-CreatePR-Form-Template:Record.FormSlot~}`
		},
		{
			Hash: 'Manager-Modal-CreatePR-Loading-Template',
			Template: /*html*/`<p class="loading">Resolving fork &amp; upstream...</p>`
		},
		{
			Hash: 'Manager-Modal-CreatePR-NotForkable-Template',
			Template: /*html*/`
<p style="color:var(--color-muted);font-size:13px">
	This module isn't set up for a fork -&gt; upstream PR.
</p>
<p class="rm-pr-summary">{~D:Record.Reason~}</p>
<div class="rm-modal-actions">
	<button class="action" onclick="_Pict.views['Manager-Modal-CreatePR'].close()">Close</button>
</div>
`
		},
		{
			Hash: 'Manager-Modal-CreatePR-Form-Template',
			Template: /*html*/`
<p class="rm-pr-summary">Opens a PR <code>{~D:Record.HeadLabel~}</code></p>
{~TS:Manager-Modal-CreatePR-ExistingPr-Template:Record.ExistingPrSlot~}
<label class="rm-pr-field-label" for="RM-PRTitle">Title</label>
<input type="text" id="RM-PRTitle" class="pict-input" placeholder="Pull request title">
<label class="rm-pr-field-label" for="RM-PRBody">Description</label>
<textarea id="RM-PRBody" placeholder="Pull request description (optional)"></textarea>
<div class="rm-modal-actions">
	<button class="action" onclick="_Pict.views['Manager-Modal-CreatePR'].close()">Cancel</button>
	<button class="action primary" onclick="_Pict.views['Manager-Modal-CreatePR'].submit()">Create PR</button>
</div>
`
		},
		{
			Hash: 'Manager-Modal-CreatePR-ExistingPr-Template',
			Template: /*html*/`
<p class="rm-pr-existing">
	PR <a href="{~D:Record.Url~}" target="_blank" rel="noopener">#{~D:Record.Number~}</a>
	already exists ({~D:Record.State~}).
	An open one is surfaced instead of opening a duplicate.
</p>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Modal-CreatePR-Content',
			TemplateHash:       'Manager-Modal-CreatePR-Template',
			DestinationAddress: '#RM-CreatePR-Body',
			RenderMethod:       'replace',
		}
	]
};

class ManagerModalCreatePRView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._moduleName = null;
		this._titlePrefill = '';
		this._bodyPrefill = '';
		this._dialog = null;
	}

	open(pModuleName)
	{
		this._moduleName = pModuleName;
		this._titlePrefill = '';
		this._bodyPrefill = '';
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }

		// First paint: a loading shell while we resolve the PR context.
		this.pict.AppData.Manager.ViewRecord.CreatePRModal =
			{
				ModuleName: pModuleName,
				LoadingSlot: [{}],
				NotForkableSlot: [],
				FormSlot: [],
			};

		let tmpModal = this.pict.views['Pict-Section-Modal'];
		if (!tmpModal || typeof tmpModal.show !== 'function')
		{
			this.pict.PictApplication.setStatus('Cannot open the PR dialog; modal section unavailable.');
			return;
		}

		this.pict.CSSMap.injectCSS();
		tmpModal.show(
			{
				title:     'Create PR - ' + pModuleName,
				closeable: true,
				width:     '560px',
				content:   '<div id="RM-CreatePR-Body"></div>',
				buttons:   [],
				onOpen: (pDialog) => { this._dialog = pDialog; this.render(); }
			});

		this.pict.providers.ManagerAPI.getPrContext(pModuleName).then(
			(pCtx) =>
			{
				if (this._moduleName !== pModuleName) { return; } // modal moved on
				if (!pCtx || !pCtx.Forkable)
				{
					this.pict.AppData.Manager.ViewRecord.CreatePRModal =
						{
							ModuleName: pModuleName,
							LoadingSlot: [],
							NotForkableSlot: [{ Reason: (pCtx && pCtx.Reason) || 'No upstream remote configured.' }],
							FormSlot: [],
						};
					this.render();
					return;
				}

				let tmpCommit = pCtx.LatestCommit || {};
				this._titlePrefill = tmpCommit.Subject || ('Update ' + pModuleName);
				this._bodyPrefill = tmpCommit.Body || '';

				let tmpHeadLabel = pCtx.Fork.Owner + ':' + pCtx.Branch
					+ '  ->  ' + pCtx.Upstream.Owner + '/' + pCtx.Upstream.Repo + ':' + pCtx.BaseBranch;

				this.pict.AppData.Manager.ViewRecord.CreatePRModal =
					{
						ModuleName: pModuleName,
						LoadingSlot: [],
						NotForkableSlot: [],
						FormSlot: [{ HeadLabel: tmpHeadLabel,
							ExistingPrSlot: pCtx.ExistingPr
								? [{ Number: pCtx.ExistingPr.Number, Url: pCtx.ExistingPr.Url, State: pCtx.ExistingPr.State }]
								: [] }],
					};
				this.render();

				// Prefill via DOM rather than template attributes so quotes /
				// angle brackets in the commit message can't break the markup.
				setTimeout(() =>
					{
						let tmpTitle = document.getElementById('RM-PRTitle');
						let tmpBody  = document.getElementById('RM-PRBody');
						if (tmpTitle) { tmpTitle.value = this._titlePrefill; tmpTitle.focus(); tmpTitle.select(); }
						if (tmpBody)  { tmpBody.value  = this._bodyPrefill; }
					}, 0);
			},
			(pError) =>
			{
				if (this._moduleName !== pModuleName) { return; }
				this.pict.AppData.Manager.ViewRecord.CreatePRModal =
					{
						ModuleName: pModuleName,
						LoadingSlot: [],
						NotForkableSlot: [{ Reason: (pError && pError.message) || 'Could not resolve PR context.' }],
						FormSlot: [],
					};
				this.render();
			});
	}

	close()
	{
		this._moduleName = null;
		if (this._dialog && typeof this._dialog._dismiss === 'function') { this._dialog._dismiss(null); }
		this._dialog = null;
	}

	submit()
	{
		let tmpTitleEl = document.getElementById('RM-PRTitle');
		let tmpBodyEl  = document.getElementById('RM-PRBody');
		let tmpTitle = (tmpTitleEl ? tmpTitleEl.value : '').trim() || this._titlePrefill;
		let tmpBody  = (tmpBodyEl ? tmpBodyEl.value : '').trim();
		if (!tmpTitle) { if (tmpTitleEl) { tmpTitleEl.focus(); } return; }

		let tmpName = this._moduleName;
		let tmpModal = this.pict.views['Pict-Section-Modal'];
		this.close();

		let tmpLabel = 'gh pr create';
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
						ModuleName:  tmpName,
					};
				if (this.pict.views['Manager-OutputPanel']) { this.pict.views['Manager-OutputPanel'].render(); }
				let tmpLayout = this.pict.views['Manager-Layout'];
				if (tmpLayout && typeof tmpLayout.popLogPanel === 'function') { tmpLayout.popLogPanel(); }

				return this.pict.providers.ManagerAPI.createPr(tmpName, tmpTitle, tmpBody).then(
					(pBody) =>
					{
						if (pBody && pBody.AlreadyExists)
						{
							// No operation launched server-side; resolve the
							// stamped spinner ourselves and point at the open PR.
							let tmpOp = this.pict.AppData.Manager.ActiveOperation;
							if (tmpOp && tmpOp.HeaderState === 'running' && !tmpOp.OperationId)
							{
								tmpOp.HeaderState = 'success';
								tmpOp.HeaderText  = 'PR #' + pBody.PrNumber + ' already open';
							}
							if (tmpModal && typeof tmpModal.toast === 'function')
							{
								tmpModal.toast('PR #' + pBody.PrNumber + ' is already open - ' + pBody.PrUrl,
									{ type: 'info', duration: 8000 });
							}
							if (this.pict.views['Manager-OutputPanel']) { this.pict.views['Manager-OutputPanel'].render(); }
							let tmpLogBar = this.pict.views['Manager-LogBar'];
							if (tmpLogBar && typeof tmpLogBar.scheduleAppend === 'function') { tmpLogBar.scheduleAppend(); }
						}
						else
						{
							this.pict.PictApplication.setStatus('PR creation started for ' + tmpName + '.');
						}
					},
					(pError) =>
					{
						let tmpOp = this.pict.AppData.Manager.ActiveOperation;
						if (tmpOp && tmpOp.HeaderState === 'running' && !tmpOp.OperationId)
						{
							tmpOp.HeaderState = 'error';
							tmpOp.HeaderText  = tmpLabel + ' - ' + (pError && pError.message ? pError.message : 'failed');
						}
						if (tmpModal && typeof tmpModal.toast === 'function')
						{
							tmpModal.toast(pError && pError.message ? pError.message : 'PR creation failed',
								{ type: 'error', duration: 6000 });
						}
						if (this.pict.views['Manager-OutputPanel']) { this.pict.views['Manager-OutputPanel'].render(); }
						let tmpLogBar = this.pict.views['Manager-LogBar'];
						if (tmpLogBar && typeof tmpLogBar.scheduleAppend === 'function') { tmpLogBar.scheduleAppend(); }
					});
			},
			{ Label: tmpLabel, ModuleName: tmpName });
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = ManagerModalCreatePRView;
module.exports.default_configuration = _ViewConfiguration;
