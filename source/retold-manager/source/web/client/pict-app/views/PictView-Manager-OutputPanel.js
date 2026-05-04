const libPictView = require('pict-view');

/**
 * Manager-OutputPanel
 *
 * Renders the active module-scoped operation log as an inline panel inside
 * the module workspace template (anchor: #RM-OutputPanelContainer). Hidden
 * if there's no operation to show. Cross-module ops surface in the
 * pict-section-modal log viewer instead, but we still mirror them here when
 * a module workspace is open so the user has a record either way.
 */
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
		<span>
			<button class="action" id="RM-PopOutButton"
				title="Open this log in a fullscreen modal"
				onclick="{~P~}.views['Manager-LogModal'].openForOperation('Operation log')">pop out</button>
			<button class="action danger" id="RM-CancelButton"
				onclick="{~P~}.views['Manager-OutputPanel'].cancel()">Cancel</button>
		</span>
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
		this._renderedUpTo = 0;          // index of next un-rendered line in tmpOp.Lines
		this._lastBodyEl = null;          // the #RM-Output element we appended into
		this._rafPending = false;         // coalesce multiple frame events into one paint
		this._lastOpId = null;            // detect operation switches (reset cursor)
	}

	onBeforeRender() { return this.pict.AppData.Manager; }

	// External callers (OperationsWS, ModuleWorkspace) call render() — that
	// triggers the shell template, then onAfterRender wires up the DOM. For
	// per-frame stdout updates we instead use scheduleAppend(), which
	// performs an append-only DOM mutation on the next animation frame.
	scheduleAppend()
	{
		if (this._rafPending) { return; }
		this._rafPending = true;
		let tmpSelf = this;
		let tmpRaf = (typeof window !== 'undefined' && window.requestAnimationFrame)
			? window.requestAnimationFrame.bind(window)
			: function (pCb) { return setTimeout(pCb, 16); };
		tmpRaf(function () { tmpSelf._rafPending = false; tmpSelf._appendNewLines(); });
	}

	_appendNewLines()
	{
		let tmpAnchor = document.getElementById('RM-OutputPanelContainer');
		if (!tmpAnchor) { return; }

		let tmpOp = this.pict.AppData.Manager.ActiveOperation || {};
		let tmpSelected = this.pict.AppData.Manager.SelectedModule;
		let tmpInScope = tmpOp.Scope === 'module'
			&& tmpOp.ModuleName && tmpOp.ModuleName === tmpSelected;
		if (!tmpInScope) { return; }

		// New operation? Force a full reset/render via the shell template.
		if (tmpOp.OperationId !== this._lastOpId)
		{
			this._renderedUpTo = 0;
			this._lastOpId = tmpOp.OperationId;
			this._lastBodyEl = null;
			this.render();
			return;
		}

		let tmpBody = this._lastBodyEl || document.getElementById('RM-Output');
		if (!tmpBody) { this.render(); return; }
		this._lastBodyEl = tmpBody;

		// Update header (cheap).
		let tmpHeader = document.getElementById('RM-OutputHeader');
		if (tmpHeader)
		{
			tmpHeader.className = '';
			if (tmpOp.HeaderState) { tmpHeader.classList.add(tmpOp.HeaderState); }
		}
		let tmpHeaderText = document.getElementById('RM-OutputHeaderText');
		if (tmpHeaderText && tmpOp.HeaderText) { tmpHeaderText.textContent = tmpOp.HeaderText; }
		let tmpCancel = document.getElementById('RM-CancelButton');
		if (tmpCancel) { tmpCancel.disabled = tmpOp.HeaderState !== 'running'; }

		let tmpLines = tmpOp.Lines || [];
		let tmpStart = this._renderedUpTo;
		if (tmpStart >= tmpLines.length) { return; }

		// Build the new lines as a DocumentFragment so the browser does one
		// reflow regardless of how many lines we just received.
		let tmpFrag = document.createDocumentFragment();
		for (let i = tmpStart; i < tmpLines.length; i++)
		{
			let tmpLine = tmpLines[i];
			let tmpDiv = document.createElement('div');
			tmpDiv.className = tmpLine.Class ? ('line ' + tmpLine.Class) : 'line';
			tmpDiv.textContent = tmpLine.Text;
			tmpFrag.appendChild(tmpDiv);
		}
		tmpBody.appendChild(tmpFrag);
		this._renderedUpTo = tmpLines.length;

		// Auto-scroll only if the user is already pinned to the bottom (within
		// 60px), so they can scroll back to read history without being yanked
		// down on every new line.
		let tmpAtBottom = (tmpBody.scrollHeight - tmpBody.scrollTop - tmpBody.clientHeight) < 60;
		if (tmpAtBottom) { tmpBody.scrollTop = tmpBody.scrollHeight; }
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		// Reset the append cursor — we're about to repaint the shell from
		// scratch, so subsequent appends should resume from line 0.
		this._renderedUpTo = 0;
		this._lastBodyEl = null;

		let tmpAnchor = document.getElementById('RM-OutputPanelContainer');
		if (!tmpAnchor) { return super.onAfterRender(pRenderable, pAddress, pRecord, pContent); }

		let tmpOp = this.pict.AppData.Manager.ActiveOperation || {};
		let tmpSelected = this.pict.AppData.Manager.SelectedModule;
		let tmpInScope = tmpOp.Scope === 'module'
			&& tmpOp.ModuleName && tmpOp.ModuleName === tmpSelected;
		let tmpHasContent = tmpInScope && ((tmpOp.Lines && tmpOp.Lines.length > 0)
			|| (tmpOp.HeaderState && tmpOp.HeaderState !== 'idle'));
		tmpAnchor.style.display = tmpHasContent ? '' : 'none';
		if (!tmpHasContent) { return super.onAfterRender(pRenderable, pAddress, pRecord, pContent); }

		this._lastOpId = tmpOp.OperationId;

		let tmpHeader = document.getElementById('RM-OutputHeader');
		if (tmpHeader)
		{
			tmpHeader.className = '';
			if (tmpOp.HeaderState) { tmpHeader.classList.add(tmpOp.HeaderState); }
		}
		let tmpCancel = document.getElementById('RM-CancelButton');
		if (tmpCancel) { tmpCancel.disabled = tmpOp.HeaderState !== 'running'; }

		let tmpBody = document.getElementById('RM-Output');
		if (tmpBody)
		{
			let tmpFrag = document.createDocumentFragment();
			let tmpLines = tmpOp.Lines || [];
			for (let i = 0; i < tmpLines.length; i++)
			{
				let tmpLine = tmpLines[i];
				let tmpDiv = document.createElement('div');
				tmpDiv.className = tmpLine.Class ? ('line ' + tmpLine.Class) : 'line';
				tmpDiv.textContent = tmpLine.Text;
				tmpFrag.appendChild(tmpDiv);
			}
			tmpBody.innerHTML = '';
			tmpBody.appendChild(tmpFrag);
			tmpBody.scrollTop = tmpBody.scrollHeight;
			this._lastBodyEl = tmpBody;
			this._renderedUpTo = tmpLines.length;
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
