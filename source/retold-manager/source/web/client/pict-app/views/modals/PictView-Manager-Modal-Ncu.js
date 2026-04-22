const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-Ncu',

	DefaultRenderable:            'Manager-Modal-Ncu-Content',
	DefaultDestinationAddress:    '#RM-ModalRoot',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.NcuModal',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'Manager-Modal-Ncu-Template',
			Template: /*html*/`
<div class="modal-backdrop" onclick="if(event.target===this){window._Pict.views['Manager-Modal-Ncu'].close();}">
	<div class="modal" style="min-width:520px">
		<h3>npm-check-updates &mdash; {~D:Record.ModuleName~}</h3>
		<p style="color:var(--color-muted);font-size:12px;margin:0 0 12px">
			<strong>Check</strong> lists outdated packages. <strong>Apply</strong> runs
			<code>ncu -u</code> (updates package.json) and then <code>npm install</code>.
			<strong>Retold scope</strong> filters to ecosystem modules only; <strong>All</strong>
			includes every dep. Output streams in the panel below.
		</p>
		<div class="form-row"><label>Scope</label>
			<div>
				<label style="font-family:var(--font-sans);color:var(--color-text)">
					<input type="radio" name="rm-ncu-scope" value="retold" checked style="width:auto;margin-right:6px"> Retold ecosystem only
				</label><br>
				<label style="font-family:var(--font-sans);color:var(--color-text)">
					<input type="radio" name="rm-ncu-scope" value="all" style="width:auto;margin-right:6px"> All dependencies
				</label>
			</div>
		</div>
		<div class="modal-actions">
			<button class="action" onclick="{~P~}.views['Manager-Modal-Ncu'].close()">Cancel</button>
			<button class="action primary" onclick="{~P~}.views['Manager-Modal-Ncu'].submit(false)">Check</button>
			<button class="action success" onclick="{~P~}.views['Manager-Modal-Ncu'].submit(true)">Apply (update + install)</button>
		</div>
	</div>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Modal-Ncu-Content',
			TemplateHash:       'Manager-Modal-Ncu-Template',
			DestinationAddress: '#RM-ModalRoot',
			RenderMethod:       'replace',
		}
	]
};

class ManagerModalNcuView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	open(pModuleName)
	{
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.NcuModal = { ModuleName: pModuleName };
		this._moduleName = pModuleName;
		this.render();
	}

	close()
	{
		this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
	}

	submit(pApply)
	{
		let tmpScope = 'retold';
		let tmpChecked = document.querySelector('input[name="rm-ncu-scope"]:checked');
		if (tmpChecked) { tmpScope = tmpChecked.value; }

		let tmpName = this._moduleName;
		this.close();
		this.pict.providers.ManagerAPI.runNcu(tmpName, pApply, tmpScope).then(
			() => { this.pict.PictApplication.setStatus('ncu ' + (pApply ? 'apply' : 'check') + ' started.'); },
			(pError) => { this.pict.PictApplication.setStatus('NCU failed: ' + pError.message); });
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = ManagerModalNcuView;
module.exports.default_configuration = _ViewConfiguration;
