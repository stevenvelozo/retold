/**
 * Manager-Modal-ActionDetail
 *
 * Review for a single action from the LogBar's Actions tab history.
 * Hosted in a wide pict-section-modal `.show()` window (overlay / Esc /
 * close owned by the modal section) with a fullscreen toggle on the
 * dialog, so the "open + fullscreen" experience matches Manager-Modal-Diff.
 *
 * Opens via `_Pict.views['Manager-Modal-ActionDetail'].open(opId)`.
 *
 * The Lines array on each history entry is a SHARED reference back to
 * ActiveOperation.Lines (see Pict-Provider-Manager-OperationsWS), so if
 * you open this modal while an op is still running, future stdout frames
 * append to the same array — a 1s tick re-shapes the view record and
 * re-renders to surface new lines until the op reaches a terminal state.
 */

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-ActionDetail',

	DefaultRenderable:            'Manager-Modal-ActionDetail-Content',
	DefaultDestinationAddress:    '#RM-ActionDetail-Host',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.ActionDetailModal',

	AutoRender: false,

	CSS: /*css*/`
		.rm-diff-panel { border: none; margin: 0; }
	`,

	Templates:
	[
		{
			Hash: 'Manager-Modal-ActionDetail-Template',
			Template: /*html*/`
<div class="diff-panel action-detail-panel rm-diff-panel">
	<div class="diff-header">
		<span class="action-detail-header-left">
			<span class="action-detail-state-dot is-{~D:Record.State~}" title="{~D:Record.StateLabel~}"></span>
			<span class="subtle action-detail-meta">{~D:Record.MetaLine~}</span>
		</span>
		<span class="diff-header-actions">
			{~TS:Manager-Modal-ActionDetail-RefreshBtn-Template:Record.RefreshBtnSlot~}
			<button id="RM-ActionDetail-Fullscreen" onclick="_Pict.views['Manager-Modal-ActionDetail'].toggleFullscreen(this)">Fullscreen</button>
		</span>
	</div>
	<div class="diff-body rm-modal-scroll" id="RM-ActionDetail-Body">
		{~TS:Manager-Modal-ActionDetail-Empty-Template:Record.EmptySlot~}
		{~TS:Manager-Modal-ActionDetail-Line-Template:Record.Lines~}
	</div>
</div>`
		},
		{
			Hash: 'Manager-Modal-ActionDetail-RefreshBtn-Template',
			Template: /*html*/`<button onclick="_Pict.views['Manager-Modal-ActionDetail'].refresh()">refresh</button>`
		},
		{
			Hash: 'Manager-Modal-ActionDetail-Empty-Template',
			Template: /*html*/`<div class="diff-line none">{~D:Record.Message~}</div>`
		},
		{
			Hash: 'Manager-Modal-ActionDetail-Line-Template',
			// Reuse the diff-line shell so the look matches the diff modal,
			// but the inner color classes (cmd / meta / stderr / success /
			// error) come from the operation logger and are styled in
			// retold-manager.css alongside the LogBar line classes.
			Template: /*html*/`<div class="diff-line action-line line {~D:Record.Class~}">{~D:Record.Text~}</div>`
		},
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Modal-ActionDetail-Content',
			TemplateHash:       'Manager-Modal-ActionDetail-Template',
			DestinationAddress: '#RM-ActionDetail-Host',
			RenderMethod:       'replace',
		}
	]
};

const STATE_LABELS =
{
	running:   'running',
	success:   'success',
	error:     'failed',
	cancelled: 'cancelled',
};

class ManagerModalActionDetailView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._operationId  = null;
		this._fullscreen   = false;
		this._tickTimer    = null;
		this._dialog       = null;
	}

	open(pOperationId)
	{
		this._operationId = pOperationId;
		this._fullscreen  = false;
		this._writeRecord();

		let tmpModal = this.pict.views['Pict-Section-Modal'];
		if (!tmpModal || typeof tmpModal.show !== 'function')
		{
			this.pict.PictApplication.setStatus('Cannot open the action detail; modal section unavailable.');
			return;
		}

		let tmpRec = this.pict.AppData.Manager.ViewRecord.ActionDetailModal;
		let tmpTitle = (tmpRec && tmpRec.Title) || 'Action';

		this.pict.CSSMap.injectCSS();
		tmpModal.show(
			{
				title:     tmpTitle,
				closeable: true,
				width:     '90vw',
				content:   '<div id="RM-ActionDetail-Host"></div>',
				buttons:   [],
				onOpen: (pDialog) => { this._dialog = pDialog; this.render(); },
				onClose: () =>
				{
					if (this._tickTimer) { clearInterval(this._tickTimer); this._tickTimer = null; }
					this._operationId = null;
					this._fullscreen = false;
					this._dialog = null;
				}
			});

		// While the op is still running, repaint every second so the
		// elapsed-time + line count meta stays current and any stdout
		// frames that arrive while we're open are surfaced. Stops itself
		// as soon as the entry transitions to a terminal state.
		this._tickTimer = setInterval(() => this._tickWhileRunning(), 1000);
	}

	close()
	{
		if (this._dialog && typeof this._dialog._dismiss === 'function') { this._dialog._dismiss(null); }
		// onClose clears the tick timer + resets state.
	}

	refresh()
	{
		if (!this._dialog) { return; }
		this._writeRecord();
		this.render();
	}

	toggleFullscreen(pButton)
	{
		this._fullscreen = !this._fullscreen;
		if (this._dialog) { this._dialog.classList.toggle('rm-modal-fullscreen', this._fullscreen); }
		if (pButton) { pButton.textContent = this._fullscreen ? 'Exit fullscreen' : 'Fullscreen'; }
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		// A refresh tick re-renders the header, recreating the fullscreen
		// button with its default label; restore it (the dialog's fullscreen
		// class lives on the dialog element and survives the body re-render).
		if (this._fullscreen)
		{
			let tmpBtn = document.getElementById('RM-ActionDetail-Fullscreen');
			if (tmpBtn) { tmpBtn.textContent = 'Exit fullscreen'; }
		}

		// Auto-scroll to the bottom so the user sees the most recent line —
		// same behavior as the LogBar entry body.
		let tmpBody = document.getElementById('RM-ActionDetail-Body');
		if (tmpBody) { tmpBody.scrollTop = tmpBody.scrollHeight; }

		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// ---------------------------------------------
	//  Internals
	// ---------------------------------------------

	_tickWhileRunning()
	{
		let tmpEntry = this._findEntry();
		if (!tmpEntry) { return; }
		if (tmpEntry.State === 'running')
		{
			this.refresh();
		}
		else if (this._tickTimer)
		{
			// Final paint with the terminal state, then stop ticking.
			this.refresh();
			clearInterval(this._tickTimer);
			this._tickTimer = null;
		}
	}

	_findEntry()
	{
		if (!this._operationId) { return null; }
		let tmpHistory = (this.pict.AppData.Manager && this.pict.AppData.Manager.ActionHistory) || [];
		for (let i = 0; i < tmpHistory.length; i++)
		{
			if (tmpHistory[i].OperationId === this._operationId) { return tmpHistory[i]; }
		}
		return null;
	}

	_writeRecord()
	{
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.ActionDetailModal = this._buildRecord();
	}

	_buildRecord()
	{
		let tmpEntry = this._findEntry();
		if (!tmpEntry)
		{
			return {
				Title:        'Action not found',
				State:        'error',
				StateLabel:   'missing',
				MetaLine:     'No entry in the action history with this OperationId.',
				EmptySlot:    [{ Message: '(operation has aged out of the in-memory history)' }],
				Lines:        [],
				RefreshBtnSlot: [],
			};
		}

		let tmpLines = tmpEntry.Lines || [];
		let tmpLineRecords = [];
		for (let i = 0; i < tmpLines.length; i++)
		{
			tmpLineRecords.push({
				Class: tmpLines[i].Class || '',
				Text:  tmpLines[i].Text  || '',
			});
		}

		let tmpEmptySlot = tmpLineRecords.length === 0 ? [{ Message: '(no output yet)' }] : [];

		return {
			Title:          tmpEntry.Label || '(unknown action)',
			State:          tmpEntry.State || 'running',
			StateLabel:     STATE_LABELS[tmpEntry.State] || tmpEntry.State || '',
			MetaLine:       this._formatMetaLine(tmpEntry),
			Lines:          tmpLineRecords,
			EmptySlot:      tmpEmptySlot,
			// Only a running op might gain new lines between renders —
			// otherwise hide the refresh button (history is immutable).
			RefreshBtnSlot: tmpEntry.State === 'running' ? [{}] : [],
		};
	}

	_formatMetaLine(pEntry)
	{
		let tmpParts = [];
		if (pEntry.ModuleName) { tmpParts.push(pEntry.ModuleName); }
		else if (pEntry.Scope === 'all') { tmpParts.push('all modules'); }

		tmpParts.push(this._stateLabel(pEntry));

		let tmpStartedClock = this._formatClock(pEntry.StartedAt);
		let tmpEndedClock   = this._formatClock(pEntry.EndedAt);
		if (tmpStartedClock !== '--:--:--')
		{
			tmpParts.push('started ' + tmpStartedClock);
		}
		if (pEntry.EndedAt && tmpEndedClock !== '--:--:--')
		{
			tmpParts.push('ended ' + tmpEndedClock);
		}

		let tmpElapsed = this._formatElapsed(pEntry);
		if (tmpElapsed) { tmpParts.push(tmpElapsed); }

		let tmpLineCount = (pEntry.Lines || []).length;
		tmpParts.push(tmpLineCount + ' line' + (tmpLineCount === 1 ? '' : 's'));

		return tmpParts.join(' / ');
	}

	_stateLabel(pEntry)
	{
		return STATE_LABELS[pEntry.State] || pEntry.State || '?';
	}

	_formatClock(pISO)
	{
		if (!pISO) return '--:--:--';
		let tmpDate;
		try { tmpDate = new Date(pISO); }
		catch (pErr) { return '--:--:--'; }
		if (isNaN(tmpDate.getTime())) return '--:--:--';
		let tmpH = String(tmpDate.getHours()).padStart(2, '0');
		let tmpM = String(tmpDate.getMinutes()).padStart(2, '0');
		let tmpS = String(tmpDate.getSeconds()).padStart(2, '0');
		return tmpH + ':' + tmpM + ':' + tmpS;
	}

	_formatElapsed(pEntry)
	{
		if (!pEntry.StartedAt) { return ''; }
		let tmpStart;
		try { tmpStart = new Date(pEntry.StartedAt).getTime(); }
		catch (pErr) { return ''; }
		if (isNaN(tmpStart)) { return ''; }
		let tmpEnd = pEntry.EndedAt
			? (new Date(pEntry.EndedAt).getTime() || Date.now())
			: Date.now();
		let tmpMs = Math.max(0, tmpEnd - tmpStart);
		if (tmpMs < 1000) { return tmpMs + 'ms'; }
		let tmpSeconds = Math.floor(tmpMs / 1000);
		if (tmpSeconds < 60) { return tmpSeconds + 's'; }
		let tmpMinutes = Math.floor(tmpSeconds / 60);
		let tmpRemSec  = tmpSeconds % 60;
		if (tmpMinutes < 60) { return tmpMinutes + 'm ' + tmpRemSec + 's'; }
		let tmpHours   = Math.floor(tmpMinutes / 60);
		let tmpRemMin  = tmpMinutes % 60;
		return tmpHours + 'h ' + tmpRemMin + 'm ' + tmpRemSec + 's';
	}
}

module.exports = ManagerModalActionDetailView;
module.exports.default_configuration = _ViewConfiguration;
