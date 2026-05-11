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
<div class="modal-backdrop diff-modal" onclick="if(event.target===this){_Pict.views['Manager-Modal-Diff'].close();}">
	<div class="modal">
		<div class="diff-panel diff-panel-modal">
			<div class="diff-header">
				<span><strong>Diff &mdash; {~D:Record.ModuleName~}</strong>
					<span class="subtle" id="RM-DiffModalSummary" style="margin-left:8px">{~D:Record.Summary~}</span></span>
				<span class="diff-header-actions">
					<button onclick="_Pict.views['Manager-Modal-Diff'].refresh()">refresh</button>
					<button id="RM-DiffModal-Fullscreen" onclick="_Pict.views['Manager-Modal-Diff'].toggleFullscreen(this)">Fullscreen</button>
					<button onclick="_Pict.views['Manager-Modal-Diff'].close()">close</button>
				</span>
			</div>
			<div class="diff-body" id="RM-DiffModalBody">
				{~TS:Manager-Modal-Diff-Loading-Template:Record.LoadingSlot~}
				{~TS:Manager-Modal-Diff-Empty-Template:Record.EmptySlot~}
				{~TS:Manager-Modal-Diff-Error-Template:Record.ErrorSlot~}
				{~TS:Manager-Modal-Diff-Line-Template:Record.Lines~}
			</div>
		</div>
	</div>
</div>
`
		},
		{
			Hash: 'Manager-Modal-Diff-Loading-Template',
			Template: /*html*/`<div class="diff-line meta">{~D:Record.Message~}</div>`
		},
		{
			Hash: 'Manager-Modal-Diff-Empty-Template',
			Template: /*html*/`<div class="diff-line none">No changes (excluding dist/).</div>`
		},
		{
			Hash: 'Manager-Modal-Diff-Error-Template',
			Template: /*html*/`<div class="diff-line del">Diff fetch failed: {~D:Record.Message~}</div>`
		},
		{
			Hash: 'Manager-Modal-Diff-Line-Template',
			Template: /*html*/`<div class="diff-line {~D:Record.Cls~}">{~D:Record.Text~}</div>`
		},
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
		this._fullscreen = false;
	}

	open(pModuleName)
	{
		this._moduleName = pModuleName;
		this._fullscreen = false;
		this._writeRecord(
			{
				ModuleName:  pModuleName,
				Summary:     'loading diff...',
				LoadingSlot: [{ Message: 'fetching ' + pModuleName + ' diff...' }],
				EmptySlot:   [],
				ErrorSlot:   [],
				Lines:       [],
			});
		this.render();
		this._loadDiff();

		// Window-level keydown is the documented exception in modules/pict/CLAUDE.md
		// (no element-level inline equivalent for "Escape from anywhere").
		this._keyHandler = (pEvent) => { if (pEvent.key === 'Escape') { this.close(); } };
		document.addEventListener('keydown', this._keyHandler);
	}

	close()
	{
		if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
		this._moduleName = null;
		this._fullscreen = false;
		this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
	}

	refresh()
	{
		if (!this._moduleName) { return; }
		let tmpRec = this.pict.AppData.Manager.ViewRecord.DiffModal;
		if (tmpRec)
		{
			tmpRec.Summary = 'loading...';
			tmpRec.LoadingSlot = [{ Message: 'fetching...' }];
			tmpRec.EmptySlot   = [];
			tmpRec.ErrorSlot   = [];
			tmpRec.Lines       = [];
			this.render();
		}
		this._loadDiff();
	}

	toggleFullscreen(pButton)
	{
		this._fullscreen = !this._fullscreen;
		let tmpRoot = document.querySelector('#RM-ModalRoot .modal-backdrop.diff-modal');
		if (tmpRoot) { tmpRoot.classList.toggle('diff-modal-fullscreen', this._fullscreen); }
		if (pButton) { pButton.textContent = this._fullscreen ? 'Exit fullscreen' : 'Fullscreen'; }
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		// Re-applies the fullscreen class after a render (refresh() paints
		// loading/empty/error states by re-rendering), otherwise the user's
		// fullscreen toggle would visually reset on every refresh.
		if (this._fullscreen)
		{
			let tmpRoot = document.querySelector('#RM-ModalRoot .modal-backdrop.diff-modal');
			if (tmpRoot) { tmpRoot.classList.add('diff-modal-fullscreen'); }
			let tmpBtn = document.getElementById('RM-DiffModal-Fullscreen');
			if (tmpBtn) { tmpBtn.textContent = 'Exit fullscreen'; }
		}
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
				if (this._moduleName !== tmpName) { return; }
				this._paintDiff(pText);
			},
			(pError) =>
			{
				if (this._moduleName !== tmpName) { return; }
				this._writeRecord({
					ModuleName:  tmpName,
					Summary:     'error',
					LoadingSlot: [],
					EmptySlot:   [],
					ErrorSlot:   [{ Message: pError.message }],
					Lines:       [],
				});
				this.render();
			});
	}

	_paintDiff(pText)
	{
		if (!pText || pText.trim().length === 0)
		{
			this._writeRecord({
				ModuleName:  this._moduleName,
				Summary:     'clean',
				LoadingSlot: [],
				EmptySlot:   [{}],
				ErrorSlot:   [],
				Lines:       [],
			});
			this.render();
			return;
		}

		let tmpRawLines = pText.split('\n');
		let tmpLineRecords = [];
		let tmpFiles = 0;
		let tmpAdds  = 0;
		let tmpDels  = 0;

		for (let i = 0; i < tmpRawLines.length; i++)
		{
			let tmpLine = tmpRawLines[i];
			if (tmpLine.length === 0 && i === tmpRawLines.length - 1) { continue; }

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

			tmpLineRecords.push({ Cls: tmpCls, Text: tmpLine });
		}

		let tmpSummary = tmpFiles + (tmpFiles === 1 ? ' file, ' : ' files, ')
			+ '+' + tmpAdds + ', -' + tmpDels;

		this._writeRecord({
			ModuleName:  this._moduleName,
			Summary:     tmpSummary,
			LoadingSlot: [],
			EmptySlot:   [],
			ErrorSlot:   [],
			Lines:       tmpLineRecords,
		});
		this.render();
	}

	_writeRecord(pRecord)
	{
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.DiffModal = pRecord;
	}
}

module.exports = ManagerModalDiffView;
module.exports.default_configuration = _ViewConfiguration;
