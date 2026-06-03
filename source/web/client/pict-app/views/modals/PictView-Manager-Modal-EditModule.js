const libPictView = require('pict-view');

// Add / edit manifest-module dialog.  Hosted in a pict-section-modal `.show()`
// window: the modal section owns the overlay, backdrop-click / Esc dismiss,
// and close button, while this view renders its form into the dialog body and
// keeps the dialog open on validation errors (it controls its own dismiss).
const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-EditModule',

	DefaultRenderable:            'Manager-Modal-EditModule-Content',
	DefaultDestinationAddress:    '#RM-EditModule-Body',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.EditModuleModal',

	AutoRender: false,

	CSS: /*css*/`
		.rm-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
	`,

	Templates:
	[
		{
			Hash: 'Manager-Modal-EditModule-Template',
			Template: /*html*/`
<div class="form-row"><label>Name</label>
	<input type="text" id="RM-E-Name" value="{~D:Record.Entry.Name~}"></div>
<div class="form-row"><label>Path</label>
	<input type="text" id="RM-E-Path" value="{~D:Record.Entry.Path~}" placeholder="modules/&lt;group&gt;/&lt;name&gt;"></div>
<div class="form-row"><label>Description</label>
	<textarea id="RM-E-Desc" rows="2">{~D:Record.Entry.Description~}</textarea></div>
<div class="form-row"><label>GitHub</label>
	<input type="text" id="RM-E-GitHub" value="{~D:Record.Entry.GitHub~}" placeholder="https://github.com/..."></div>
<div class="form-row"><label>Documentation</label>
	<input type="text" id="RM-E-Docs" value="{~D:Record.Entry.Documentation~}" placeholder="https://..."></div>
<div class="form-row"><label>Related</label>
	<input type="text" id="RM-E-Related" value="{~D:Record.RelatedString~}" placeholder="comma-separated module names"></div>
<div class="rm-modal-actions">
	<button class="action" onclick="_Pict.views['Manager-Modal-EditModule'].close()">Cancel</button>
	<button class="action primary" onclick="_Pict.views['Manager-Modal-EditModule'].save()">{~D:Record.SaveLabel~}</button>
</div>`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Modal-EditModule-Content',
			TemplateHash:       'Manager-Modal-EditModule-Template',
			DestinationAddress: '#RM-EditModule-Body',
			RenderMethod:       'replace',
		}
	]
};

class ManagerModalEditModuleView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._dialog = null;
	}

	/**
	 * pOptions: { GroupName, ExistingEntry?, SeedName? }
	 * - ExistingEntry present → edit; otherwise add.
	 * - SeedName pre-fills Name when adding from disk.
	 */
	open(pOptions)
	{
		let tmpOpts = pOptions || {};
		let tmpIsEdit = !!tmpOpts.ExistingEntry;

		this._isEdit       = tmpIsEdit;
		this._groupName    = tmpOpts.GroupName;
		this._originalName = tmpIsEdit ? tmpOpts.ExistingEntry.Name : null;

		let tmpEntry = tmpIsEdit
			? Object.assign({}, tmpOpts.ExistingEntry)
			: {
				Name:          tmpOpts.SeedName || '',
				Path:          '',
				Description:   '',
				GitHub:        '',
				Documentation: '',
				RelatedModules: [],
			};

		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.EditModuleModal =
			{
				Title: tmpIsEdit ? ('Edit ' + tmpEntry.Name) : ('Add module to ' + tmpOpts.GroupName),
				SaveLabel: tmpIsEdit ? 'Save' : 'Add',
				Entry: tmpEntry,
				RelatedString: (tmpEntry.RelatedModules || []).join(', '),
			};

		let tmpModal = this.pict.views['Pict-Section-Modal'];
		if (!tmpModal || typeof tmpModal.show !== 'function')
		{
			this.pict.PictApplication.setStatus('Cannot open the module editor; modal section unavailable.');
			return;
		}

		this.pict.CSSMap.injectCSS();
		tmpModal.show(
			{
				title:     this.pict.AppData.Manager.ViewRecord.EditModuleModal.Title,
				closeable: true,
				width:     '720px',
				content:   '<div id="RM-EditModule-Body"></div>',
				buttons:   [],
				onOpen: (pDialog) =>
				{
					this._dialog = pDialog;
					this.render();
					let tmpName = document.getElementById('RM-E-Name');
					if (tmpName) { tmpName.focus(); }
				}
			});
	}

	close()
	{
		if (this._dialog && typeof this._dialog._dismiss === 'function') { this._dialog._dismiss(null); }
		this._dialog = null;
	}

	save()
	{
		let tmpRelatedStr = document.getElementById('RM-E-Related').value.trim();
		let tmpPayload =
			{
				Name:          document.getElementById('RM-E-Name').value.trim(),
				Path:          document.getElementById('RM-E-Path').value.trim(),
				Description:   document.getElementById('RM-E-Desc').value.trim(),
				GitHub:        document.getElementById('RM-E-GitHub').value.trim(),
				Documentation: document.getElementById('RM-E-Docs').value.trim(),
				RelatedModules: tmpRelatedStr
					? tmpRelatedStr.split(',').map(function (pS) { return pS.trim(); }).filter(Boolean)
					: [],
			};

		if (!tmpPayload.Name)
		{
			// Validation failure keeps the dialog open (we control dismiss).
			this._toast('Name is required.', 'error');
			return;
		}

		let tmpApi = this.pict.providers.ManagerAPI;
		let tmpPromise;
		if (this._isEdit)
		{
			tmpPromise = tmpApi.updateManifestModule(this._originalName, tmpPayload);
		}
		else
		{
			tmpPayload.Group = this._groupName;
			tmpPromise = tmpApi.createManifestModule(tmpPayload);
		}

		tmpPromise.then(
			() =>
			{
				this.close();
				// Refresh manifest + sidebar
				let tmpManifestView = this.pict.views['Manager-ManifestEditor'];
				if (tmpManifestView && typeof tmpManifestView.reload === 'function')
				{
					tmpManifestView.reload();
				}
				this.pict.providers.ManagerAPI.loadModules();
			},
			(pError) =>
			{
				this._toast('Save failed: ' + pError.message, 'error');
			});
	}

	// Surface a transient error via pict-section-modal.toast, falling back
	// to the status bar when the modal view isn't loaded.
	_toast(pMessage, pType)
	{
		let tmpModal = this.pict.views['Pict-Section-Modal'];
		if (tmpModal && typeof tmpModal.toast === 'function')
		{
			tmpModal.toast(pMessage, { type: pType || 'error', duration: 6000 });
			return;
		}
		this.pict.PictApplication.setStatus(pMessage);
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = ManagerModalEditModuleView;
module.exports.default_configuration = _ViewConfiguration;
