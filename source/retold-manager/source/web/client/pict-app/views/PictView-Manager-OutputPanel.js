const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-OutputPanel',

	DefaultRenderable:            'Manager-OutputPanel-Shell',
	DefaultDestinationAddress:    '#RM-OutputPanelContainer',
	DefaultTemplateRecordAddress: 'AppData.Manager',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'Manager-OutputPanel-Shell-Template',
			Template: /*html*/`
<div id="RM-OutputPanel">
	<div id="RM-OutputHeader">
		<span>
			<span class="live-dot"></span>
			<span id="RM-OutputHeaderText">{~D:Record.ActiveOperation.HeaderText~}</span>
		</span>
		<button class="action danger" id="RM-CancelButton"
			onclick="{~P~}.views['Manager-OutputPanel'].cancel()">Cancel</button>
	</div>
	<div id="RM-Output"></div>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-OutputPanel-Shell',
			TemplateHash:       'Manager-OutputPanel-Shell-Template',
			DestinationAddress: '#RM-OutputPanelContainer',
			RenderMethod:       'replace',
		}
	]
};

class ManagerOutputPanelView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._shellRendered = false;
	}

	onBeforeRender() { return this.pict.AppData.Manager; }

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this._shellRendered = true;

		let tmpOp = this.pict.AppData.Manager.ActiveOperation;

		// Header state → CSS class
		let tmpHeader = document.getElementById('RM-OutputHeader');
		if (tmpHeader)
		{
			tmpHeader.className = ''; // reset
			if (tmpOp.HeaderState) { tmpHeader.classList.add(tmpOp.HeaderState); }
		}

		let tmpCancel = document.getElementById('RM-CancelButton');
		if (tmpCancel) { tmpCancel.disabled = tmpOp.HeaderState !== 'running'; }

		// Body: render all current lines. Cheap for <~5k lines; if this grows
		// we can switch to append-only DOM ops keyed by an index counter.
		let tmpBody = document.getElementById('RM-Output');
		if (tmpBody)
		{
			let tmpHtml = '';
			let tmpLines = tmpOp.Lines || [];
			for (let i = 0; i < tmpLines.length; i++)
			{
				let tmpLine = tmpLines[i];
				let tmpClass = tmpLine.Class ? ' class="' + this._escape(tmpLine.Class) + '"' : '';
				tmpHtml += '<div' + tmpClass + '>' + this._escape(tmpLine.Text) + '</div>';
			}
			tmpBody.innerHTML = tmpHtml;
			tmpBody.scrollTop = tmpBody.scrollHeight;
		}

		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	cancel()
	{
		let tmpOp = this.pict.AppData.Manager.ActiveOperation;
		if (!tmpOp.OperationId || tmpOp.HeaderState !== 'running') { return; }
		this.pict.providers.ManagerAPI.cancelOperation(tmpOp.OperationId).then(
			() => { this.pict.PictApplication.setStatus('Cancel requested.'); },
			(pError) => { this.pict.PictApplication.setStatus('Cancel failed: ' + pError.message); });
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

module.exports = ManagerOutputPanelView;
module.exports.default_configuration = _ViewConfiguration;
