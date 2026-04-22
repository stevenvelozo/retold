const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-EditModule',

	DefaultRenderable:            'Manager-Modal-EditModule-Content',
	DefaultDestinationAddress:    '#RM-ModalRoot',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.EditModuleModal',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'Manager-Modal-EditModule-Template',
			Template: /*html*/`
<div class="modal-backdrop" onclick="if(event.target===this){window._Pict.views['Manager-Modal-EditModule'].close();}">
	<div class="modal" style="min-width:640px;max-width:760px">
		<h3>{~D:Record.Title~}</h3>
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
		<div class="modal-actions">
			<button class="action" onclick="{~P~}.views['Manager-Modal-EditModule'].close()">Cancel</button>
			<button class="action primary" onclick="{~P~}.views['Manager-Modal-EditModule'].save()">{~D:Record.SaveLabel~}</button>
		</div>
	</div>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Modal-EditModule-Content',
			TemplateHash:       'Manager-Modal-EditModule-Template',
			DestinationAddress: '#RM-ModalRoot',
			RenderMethod:       'replace',
		}
	]
};

class ManagerModalEditModuleView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
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

		this.render();
	}

	close()
	{
		this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
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
			window.alert('Name is required.');
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
				window.alert('Save failed: ' + pError.message);
			});
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = ManagerModalEditModuleView;
module.exports.default_configuration = _ViewConfiguration;
