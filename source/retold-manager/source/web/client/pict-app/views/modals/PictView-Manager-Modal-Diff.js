const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-Diff',

	DefaultRenderable:            'Manager-Modal-Diff-Content',
	DefaultDestinationAddress:    '#RM-ModalRoot',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.DiffModal',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'Manager-Modal-Diff-Template',
			Template: /*html*/`
<div class="modal-backdrop diff-modal" onclick="if(event.target===this){window._Pict.views['Manager-Modal-Diff'].close();}">
	<div class="modal">
		<div class="diff-panel diff-panel-modal">
			<div class="diff-header">
				<span><strong>Diff &mdash; {~D:Record.ModuleName~}</strong>
					<span class="subtle" id="RM-DiffModalSummary" style="margin-left:8px">{~D:Record.Summary~}</span></span>
				<span class="diff-header-actions">
					<button onclick="{~P~}.views['Manager-Modal-Diff'].refresh()">refresh</button>
					<button onclick="{~P~}.views['Manager-Modal-Diff'].close()">close</button>
				</span>
			</div>
			<div class="diff-body" id="RM-DiffModalBody">{~D:Record.BodyHtml~}</div>
		</div>
	</div>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Modal-Diff-Content',
			TemplateHash:       'Manager-Modal-Diff-Template',
			DestinationAddress: '#RM-ModalRoot',
			RenderMethod:       'replace',
		}
	]
};

class ManagerModalDiffView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._moduleName = null;
		this._keyHandler = null;
	}

	open(pModuleName)
	{
		this._moduleName = pModuleName;
		this._writeRecord(
			{
				ModuleName: pModuleName,
				Summary: 'loading diff...',
				BodyHtml: '<div class="diff-line meta">fetching ' + this._escape(pModuleName) + ' diff...</div>',
			});
		this.render();
		this._loadDiff();

		this._keyHandler = (pEvent) => { if (pEvent.key === 'Escape') { this.close(); } };
		document.addEventListener('keydown', this._keyHandler);
	}

	close()
	{
		if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
		this._moduleName = null;
		this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
	}

	refresh()
	{
		if (!this._moduleName) { return; }
		let tmpBody = document.getElementById('RM-DiffModalBody');
		let tmpSummary = document.getElementById('RM-DiffModalSummary');
		if (tmpBody)    { tmpBody.innerHTML = '<div class="diff-line meta">fetching...</div>'; }
		if (tmpSummary) { tmpSummary.textContent = 'loading...'; }
		this._loadDiff();
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// ─────────────────────────────────────────────

	_loadDiff()
	{
		let tmpName = this._moduleName;
		this.pict.providers.ManagerAPI.fetchGitDiffText(tmpName).then(
			(pText) =>
			{
				// If the user closed or switched modules, drop the stale result.
				if (this._moduleName !== tmpName) { return; }
				this._paintDiff(pText);
			},
			(pError) =>
			{
				if (this._moduleName !== tmpName) { return; }
				let tmpBody = document.getElementById('RM-DiffModalBody');
				let tmpSummary = document.getElementById('RM-DiffModalSummary');
				if (tmpBody)
				{
					tmpBody.innerHTML = '<div class="diff-line del">Diff fetch failed: '
						+ this._escape(pError.message) + '</div>';
				}
				if (tmpSummary) { tmpSummary.textContent = 'error'; }
			});
	}

	_paintDiff(pText)
	{
		let tmpBody    = document.getElementById('RM-DiffModalBody');
		let tmpSummary = document.getElementById('RM-DiffModalSummary');
		if (!tmpBody) { return; }

		if (!pText || pText.trim().length === 0)
		{
			tmpBody.innerHTML = '<div class="diff-line none">No changes (excluding dist/).</div>';
			if (tmpSummary) { tmpSummary.textContent = 'clean'; }
			return;
		}

		let tmpLines = pText.split('\n');
		let tmpParts = [];
		let tmpFiles = 0;
		let tmpAdds  = 0;
		let tmpDels  = 0;

		for (let i = 0; i < tmpLines.length; i++)
		{
			let tmpLine = tmpLines[i];
			if (tmpLine.length === 0 && i === tmpLines.length - 1) { continue; }

			let tmpCls;
			if (tmpLine.startsWith('diff --git'))
			{
				tmpCls = 'file';
				tmpFiles++;
			}
			else if (tmpLine.startsWith('index ')
				|| tmpLine.startsWith('new file')
				|| tmpLine.startsWith('deleted file')
				|| tmpLine.startsWith('---')
				|| tmpLine.startsWith('+++')
				|| tmpLine.startsWith('similarity ')
				|| tmpLine.startsWith('rename '))
			{
				tmpCls = 'meta';
			}
			else if (tmpLine.startsWith('@@'))
			{
				tmpCls = 'hunk';
			}
			else if (tmpLine.startsWith('+'))
			{
				tmpCls = 'add';
				tmpAdds++;
			}
			else if (tmpLine.startsWith('-'))
			{
				tmpCls = 'del';
				tmpDels++;
			}
			else
			{
				tmpCls = '';
			}

			tmpParts.push('<div class="diff-line ' + tmpCls + '">' + this._escape(tmpLine) + '</div>');
		}

		tmpBody.innerHTML = tmpParts.join('');
		if (tmpSummary)
		{
			tmpSummary.textContent = tmpFiles + (tmpFiles === 1 ? ' file, ' : ' files, ')
				+ '+' + tmpAdds + ', -' + tmpDels;
		}
	}

	_writeRecord(pRecord)
	{
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.DiffModal = pRecord;
	}

	_escape(pText)
	{
		let tmpS = String(pText == null ? '' : pText);
		return tmpS
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}
}

module.exports = ManagerModalDiffView;
module.exports.default_configuration = _ViewConfiguration;
