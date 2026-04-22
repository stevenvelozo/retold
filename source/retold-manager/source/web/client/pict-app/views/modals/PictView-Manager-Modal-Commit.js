const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-Commit',

	DefaultRenderable:            'Manager-Modal-Commit-Content',
	DefaultDestinationAddress:    '#RM-ModalRoot',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.CommitModal',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'Manager-Modal-Commit-Template',
			Template: /*html*/`
<div class="modal-backdrop" onclick="if(event.target===this){window._Pict.views['Manager-Modal-Commit'].close();}">
	<div class="modal">
		<h3>Commit &mdash; {~D:Record.ModuleName~}</h3>
		<p style="color:var(--color-muted);font-size:12px;margin:0 0 10px">
			Runs <code>git commit -a -m &lt;message&gt;</code>.
		</p>
		<textarea id="RM-CommitMessage" placeholder="Commit message"></textarea>
		<div class="modal-actions">
			<button class="action" onclick="{~P~}.views['Manager-Modal-Commit'].close()">Cancel</button>
			<button class="action primary" onclick="{~P~}.views['Manager-Modal-Commit'].submit()">Commit</button>
		</div>
	</div>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Modal-Commit-Content',
			TemplateHash:       'Manager-Modal-Commit-Template',
			DestinationAddress: '#RM-ModalRoot',
			RenderMethod:       'replace',
		}
	]
};

class ManagerModalCommitView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	open(pModuleName)
	{
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.CommitModal = { ModuleName: pModuleName };
		this._moduleName = pModuleName;
		this.render();
		setTimeout(() =>
			{
				let tmpTA = document.getElementById('RM-CommitMessage');
				if (tmpTA) { tmpTA.focus(); }
			}, 0);
	}

	close()
	{
		this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
	}

	submit()
	{
		let tmpTA = document.getElementById('RM-CommitMessage');
		if (!tmpTA) { return; }
		let tmpMessage = tmpTA.value.trim();
		if (tmpMessage.length === 0) { tmpTA.focus(); return; }

		let tmpName = this._moduleName;
		this.close();
		this.pict.providers.ManagerAPI.commitModule(tmpName, tmpMessage).then(
			() => { this.pict.PictApplication.setStatus('Commit started for ' + tmpName + '.'); },
			(pError) => { this.pict.PictApplication.setStatus('Commit failed: ' + pError.message); });
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = ManagerModalCommitView;
module.exports.default_configuration = _ViewConfiguration;
