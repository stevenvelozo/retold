const libPictView = require('pict-view');

// Working-tree diff viewer.  Hosted in a wide pict-section-modal `.show()`
// window (the modal section owns the overlay / backdrop-click / Esc dismiss /
// close button), with a fullscreen toggle that expands the dialog itself.  No
// hand-rolled `.modal-backdrop` or document-level keydown handler anymore.
const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-Diff',

	DefaultRenderable:            'Manager-Modal-Diff-Content',
	DefaultDestinationAddress:    '#RM-Diff-Body',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.DiffModal',

	AutoRender: false,

	CSS: /*css*/`
		.rm-diff-panel { border: none; margin: 0; }
	`,

	Templates:
	[
		{
			Hash: 'Manager-Modal-Diff-Template',
			Template: /*html*/`
<div class="diff-panel rm-diff-panel">
	<div class="diff-header">
		<span class="subtle" id="RM-DiffModalSummary">{~D:Record.Summary~}</span>
		<span class="diff-header-actions">
			<button onclick="_Pict.views['Manager-Modal-Diff'].refresh()">refresh</button>
			<button id="RM-DiffModal-Fullscreen" onclick="_Pict.views['Manager-Modal-Diff'].toggleFullscreen(this)">Fullscreen</button>
		</span>
	</div>
	<div class="diff-body rm-modal-scroll" id="RM-DiffModalBody">
		{~TS:Manager-Modal-Diff-Loading-Template:Record.LoadingSlot~}
		{~TS:Manager-Modal-Diff-Empty-Template:Record.EmptySlot~}
		{~TS:Manager-Modal-Diff-Error-Template:Record.ErrorSlot~}
		{~TS:Manager-Modal-Diff-Line-Template:Record.Lines~}
	</div>
</div>`
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
			DestinationAddress: '#RM-Diff-Body',
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
		this._fullscreen = false;
		this._dialog = null;
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

		let tmpModal = this.pict.views['Pict-Section-Modal'];
		if (!tmpModal || typeof tmpModal.show !== 'function')
		{
			this.pict.PictApplication.setStatus('Cannot open the diff viewer; modal section unavailable.');
			return;
		}

		this.pict.CSSMap.injectCSS();
		tmpModal.show(
			{
				title:     'Diff - ' + pModuleName,
				closeable: true,
				width:     '90vw',
				content:   '<div id="RM-Diff-Body"></div>',
				buttons:   [],
				onOpen: (pDialog) => { this._dialog = pDialog; this.render(); },
				// Fires on any dismiss (close button / Esc / overlay / our close()).
				onClose: () => { this._moduleName = null; this._fullscreen = false; this._dialog = null; }
			});

		this._loadDiff();
	}

	close()
	{
		if (this._dialog && typeof this._dialog._dismiss === 'function') { this._dialog._dismiss(null); }
		// onClose resets the rest of the state.
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
		if (this._dialog) { this._dialog.classList.toggle('rm-modal-fullscreen', this._fullscreen); }
		if (pButton) { pButton.textContent = this._fullscreen ? 'Exit fullscreen' : 'Fullscreen'; }
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		// refresh() re-renders the header, recreating the fullscreen button with
		// its default label; restore it (the dialog's fullscreen class lives on
		// the dialog element and survives the body re-render).
		if (this._fullscreen)
		{
			let tmpBtn = document.getElementById('RM-DiffModal-Fullscreen');
			if (tmpBtn) { tmpBtn.textContent = 'Exit fullscreen'; }
		}
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// ---------------------------------------------

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
