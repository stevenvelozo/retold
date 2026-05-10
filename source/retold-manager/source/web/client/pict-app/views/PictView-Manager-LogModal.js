const libPictView = require('pict-view');

/**
 * Manager-LogModal
 *
 * A pict-section-modal-backed log viewer with a fullscreen toggle.
 *
 * Two modes:
 *   openForLogFile()  - reads /api/manager/log on demand with a refresh button.
 *   openForOperation(pLabel) - streams live frames from AppData.Manager.ActiveOperation
 *                              into the modal body until completion.
 *
 * Exposes a single dialog at a time. Re-opening swaps the content.
 */

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-LogModal',

	AutoRender: false,

	CSS: /*css*/`
		.rm-log-modal-body
		{
			background: #05070a;
			color: #c9d1d9;
			font-family: var(--font-mono);
			font-size: 12px;
			line-height: 1.4;
			padding: 12px;
			margin: 0;
			border-radius: 6px;
			border: 1px solid var(--color-border);
			height: 60vh;
			max-height: 70vh;
			overflow: auto;
			white-space: pre-wrap;
			word-break: break-word;
		}
		.rm-log-modal-body.empty { color: var(--color-muted); font-style: italic; }
		.rm-log-modal-body .line { display: block; }
		.rm-log-modal-body .line.cmd     { color: var(--color-accent); font-weight: 600; }
		.rm-log-modal-body .line.meta    { color: var(--color-muted); }
		.rm-log-modal-body .line.stderr  { color: var(--color-danger); }
		.rm-log-modal-body .line.success { color: var(--color-success); font-weight: 600; }
		.rm-log-modal-body .line.error   { color: var(--color-danger); font-weight: 600; }
		.rm-log-modal-toolbar
		{
			display: flex;
			align-items: center;
			gap: 8px;
			margin: 0 0 8px;
			font-family: var(--font-mono);
			font-size: 11.5px;
			color: var(--color-muted);
		}
		.rm-log-modal-toolbar .spacer { flex: 1 1 auto; }
		.rm-log-modal-toolbar button
		{
			font-family: var(--font-mono);
			font-size: 11.5px;
			background: transparent;
			color: var(--color-text);
			border: 1px solid var(--color-border);
			padding: 3px 10px;
			border-radius: 4px;
			cursor: pointer;
		}
		.rm-log-modal-toolbar button:hover { border-color: var(--color-accent); color: var(--color-accent); }
		.rm-log-modal-toolbar .live-dot
		{
			display: inline-block;
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: var(--color-muted);
		}
		.rm-log-modal-toolbar.running .live-dot { background: var(--color-accent); animation: pulse 1s infinite; }
		.rm-log-modal-toolbar.success .live-dot { background: var(--color-success); }
		.rm-log-modal-toolbar.error   .live-dot { background: var(--color-danger); }

		/* Fullscreen takeover - applies to the pict-modal-dialog when toggled */
		.pict-modal-dialog.rm-log-modal-fullscreen
		{
			width: 100vw !important;
			max-width: 100vw !important;
			height: 100vh;
			max-height: 100vh !important;
			top: 0;
			left: 0;
			transform: none !important;
			border-radius: 0;
		}
		.pict-modal-dialog.rm-log-modal-fullscreen .rm-log-modal-body
		{
			height: calc(100vh - 130px);
			max-height: none;
		}
	`,
};

class ManagerLogModalView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this._mode = null;          // 'logfile' | 'operation' | null
		this._dialog = null;        // current pict-modal-dialog element
		this._dismissDialog = null; // function to dismiss the current dialog
		this._headerLabel = '';
		this._renderedUpTo = 0;     // append cursor for live mode
		this._lastOpId = null;
		this._rafPending = false;
	}

	// ─────────────────────────────────────────────
	//  Public API
	// ─────────────────────────────────────────────

	openForLogFile()
	{
		this._mode = 'logfile';
		this._headerLabel = 'Operation log';
		this._openShell();
		this.refreshLogFile(500);
	}

	openForOperation(pLabel)
	{
		this._mode = 'operation';
		this._headerLabel = pLabel || 'Live operation';
		this._renderedUpTo = 0;
		this._lastOpId = null;
		this._openShell();
		this.renderFrame();
	}

	// Called from OperationsWS provider whenever ActiveOperation updates. We
	// coalesce many frame events into one paint via requestAnimationFrame so
	// a flood of stdout (e.g. a noisy publish) doesn't pile up DOM work.
	renderFrame()
	{
		if (this._mode !== 'operation' || !this._dialog) { return; }
		if (this._rafPending) { return; }
		this._rafPending = true;
		let tmpSelf = this;
		let tmpRaf = (typeof window !== 'undefined' && window.requestAnimationFrame)
			? window.requestAnimationFrame.bind(window)
			: function (pCb) { return setTimeout(pCb, 16); };
		tmpRaf(function ()
			{
				tmpSelf._rafPending = false;
				if (tmpSelf._mode !== 'operation' || !tmpSelf._dialog) { return; }
				let tmpOp = tmpSelf.pict.AppData.Manager.ActiveOperation;
				tmpSelf._paintOperationBody(tmpOp);
				tmpSelf._paintOperationToolbar(tmpOp);
			});
	}

	close()
	{
		if (this._dismissDialog)
		{
			let tmpDismiss = this._dismissDialog;
			this._dismissDialog = null;
			tmpDismiss(null);
		}
		this._dialog = null;
		this._mode = null;
	}

	refreshLogFile(pTail)
	{
		if (this._mode !== 'logfile' || !this._dialog) { return; }
		let tmpToolbar = this._dialog.querySelector('.rm-log-modal-toolbar .meta-text');
		let tmpBody = this._dialog.querySelector('.rm-log-modal-body');
		if (tmpToolbar) { tmpToolbar.textContent = 'loading...'; }
		if (tmpBody) { tmpBody.textContent = 'fetching...'; tmpBody.classList.add('empty'); }

		this.pict.providers.ManagerAPI.get('/log?tail=' + (pTail || 500)).then(
			(pBody) =>
			{
				if (this._mode !== 'logfile' || !this._dialog) { return; }
				if (tmpToolbar)
				{
					tmpToolbar.textContent = pBody.Exists
						? pBody.Path + ' — last ' + pBody.Lines.length + ' / ' + pBody.Total + ' lines'
						: pBody.Path + ' — (no log yet)';
				}
				if (tmpBody)
				{
					let tmpText = (pBody.Lines || []).join('\n');
					tmpBody.textContent = tmpText || '(empty)';
					if (tmpText) { tmpBody.classList.remove('empty'); }
					tmpBody.scrollTop = tmpBody.scrollHeight;
				}
			},
			(pError) =>
			{
				if (tmpBody)
				{
					tmpBody.textContent = 'Error loading log: ' + pError.message;
					tmpBody.classList.add('empty');
				}
			});
	}

	// ─────────────────────────────────────────────
	//  Dialog plumbing
	// ─────────────────────────────────────────────

	_openShell()
	{
		// Close any existing dialog first so we don't stack them.
		if (this._dismissDialog) { this._dismissDialog(null); this._dismissDialog = null; this._dialog = null; }

		let tmpModal = this.pict.views['Pict-Section-Modal'];
		if (!tmpModal) { this.pict.log.error('pict-section-modal view not registered'); return; }

		let tmpToolbarHtml = (this._mode === 'logfile')
			? this._logFileToolbar()
			: this._operationToolbar();

		let tmpContent =
			tmpToolbarHtml
			+ '<pre class="rm-log-modal-body empty">(no output yet)</pre>';

		tmpModal.show(
			{
				title: this._headerLabel,
				content: tmpContent,
				width: '900px',
				closeable: true,
				buttons: [],
				onOpen: (pDialog) =>
				{
					this._dialog = pDialog;
					this._dismissDialog = pDialog._dismiss;
					// Toolbar buttons use inline onclick handlers — no
					// per-render JS wiring needed.
				},
				onClose: () =>
				{
					this._dialog = null;
					this._dismissDialog = null;
					this._mode = null;
				},
			});
	}

	_logFileToolbar()
	{
		return ''
			+ '<div class="rm-log-modal-toolbar">'
			+ '  <span class="meta-text">loading...</span>'
			+ '  <span class="spacer"></span>'
			+ '  <button onclick="_Pict.views[\'Manager-LogModal\'].handleToolbarAction(\'refresh-500\', this)">Refresh (500)</button>'
			+ '  <button onclick="_Pict.views[\'Manager-LogModal\'].handleToolbarAction(\'refresh-2000\', this)">Last 2000</button>'
			+ '  <button onclick="_Pict.views[\'Manager-LogModal\'].handleToolbarAction(\'fullscreen\', this)">Fullscreen</button>'
			+ '</div>';
	}

	_operationToolbar()
	{
		return ''
			+ '<div class="rm-log-modal-toolbar">'
			+ '  <span class="live-dot"></span>'
			+ '  <span class="meta-text">starting...</span>'
			+ '  <span class="spacer"></span>'
			+ '  <button onclick="_Pict.views[\'Manager-LogModal\'].handleToolbarAction(\'cancel\', this)">Cancel</button>'
			+ '  <button onclick="_Pict.views[\'Manager-LogModal\'].handleToolbarAction(\'fullscreen\', this)">Fullscreen</button>'
			+ '</div>';
	}

	// Public — invoked from inline onclick handlers in the toolbars above.
	handleToolbarAction(pAction, pButton)
	{
		switch (pAction)
		{
			case 'refresh-500':  this.refreshLogFile(500); break;
			case 'refresh-2000': this.refreshLogFile(2000); break;
			case 'fullscreen':
				if (!this._dialog) { return; }
				let tmpFullscreen = this._dialog.classList.toggle('rm-log-modal-fullscreen');
				if (pButton) { pButton.textContent = tmpFullscreen ? 'Exit fullscreen' : 'Fullscreen'; }
				break;
			case 'cancel':
				let tmpOp = this.pict.AppData.Manager.ActiveOperation;
				if (tmpOp.OperationId && tmpOp.HeaderState === 'running')
				{
					this.pict.providers.ManagerAPI.cancelOperation(tmpOp.OperationId);
				}
				break;
		}
	}

	_paintOperationBody(pOp)
	{
		if (!this._dialog) { return; }
		let tmpBody = this._dialog.querySelector('.rm-log-modal-body');
		if (!tmpBody) { return; }

		let tmpLines = (pOp && pOp.Lines) ? pOp.Lines : [];

		// Operation switched out from under us — wipe and start fresh.
		let tmpOpId = pOp ? pOp.OperationId : null;
		if (tmpOpId !== this._lastOpId)
		{
			this._lastOpId = tmpOpId;
			this._renderedUpTo = 0;
			tmpBody.innerHTML = '';
		}

		if (tmpLines.length === 0)
		{
			if (this._renderedUpTo === 0)
			{
				tmpBody.textContent = '(no output yet)';
				tmpBody.classList.add('empty');
			}
			return;
		}
		tmpBody.classList.remove('empty');

		// Append-only: only build DOM for new lines since the last paint.
		if (this._renderedUpTo === 0) { tmpBody.innerHTML = ''; }
		let tmpFrag = document.createDocumentFragment();
		for (let i = this._renderedUpTo; i < tmpLines.length; i++)
		{
			let tmpLine = tmpLines[i];
			let tmpSpan = document.createElement('span');
			tmpSpan.className = tmpLine.Class ? ('line ' + tmpLine.Class) : 'line';
			tmpSpan.textContent = tmpLine.Text;
			tmpFrag.appendChild(tmpSpan);
		}
		tmpBody.appendChild(tmpFrag);
		this._renderedUpTo = tmpLines.length;

		let tmpAtBottom = (tmpBody.scrollHeight - tmpBody.scrollTop - tmpBody.clientHeight) < 80;
		if (tmpAtBottom) { tmpBody.scrollTop = tmpBody.scrollHeight; }
	}

	_paintOperationToolbar(pOp)
	{
		if (!this._dialog) { return; }
		let tmpToolbar = this._dialog.querySelector('.rm-log-modal-toolbar');
		if (!tmpToolbar) { return; }
		tmpToolbar.classList.remove('running', 'success', 'error');
		if (pOp.HeaderState) { tmpToolbar.classList.add(pOp.HeaderState); }
		let tmpText = tmpToolbar.querySelector('.meta-text');
		if (tmpText) { tmpText.textContent = pOp.HeaderText || pOp.HeaderState || 'idle'; }
		let tmpCancel = tmpToolbar.querySelector('[data-rm-log-action="cancel"]');
		if (tmpCancel) { tmpCancel.disabled = pOp.HeaderState !== 'running'; }
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

	_escapeAttr(pText) { return this._escape(pText); }
}

module.exports = ManagerLogModalView;
module.exports.default_configuration = _ViewConfiguration;
