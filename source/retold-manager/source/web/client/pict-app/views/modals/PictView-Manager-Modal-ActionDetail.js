/**
 * Manager-Modal-ActionDetail
 *
 * Full-screen modal review for a single action from the LogBar's
 * Actions tab history. Visually mirrors Manager-Modal-Diff so the
 * "open + fullscreen" experience is consistent across the app.
 *
 * Opens via `_Pict.views['Manager-Modal-ActionDetail'].open(opId)`
 * — typically from the "↗" button on a LogBar action entry.
 *
 * The modal lives at #RM-ModalRoot (shared with the other manager
 * modals). Closing wipes that root; only one of these modals is
 * mounted at a time.
 *
 * The Lines array on each history entry is a SHARED reference back
 * to ActiveOperation.Lines (see Pict-Provider-Manager-OperationsWS),
 * so if you open this modal while an op is still running, future
 * stdout frames append to the same array — a manual refresh() re-
 * shapes the view record and re-renders to surface the new lines.
 */

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-ActionDetail',

	DefaultRenderable:            'Manager-Modal-ActionDetail-Content',
	DefaultDestinationAddress:    '#RM-ModalRoot',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.ActionDetailModal',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'Manager-Modal-ActionDetail-Template',
			Template: /*html*/`
<div class="modal-backdrop action-modal" onclick="if(event.target===this){_Pict.views['Manager-Modal-ActionDetail'].close();}">
	<div class="modal">
		<div class="diff-panel diff-panel-modal action-detail-panel">
			<div class="diff-header">
				<span class="action-detail-header-left">
					<span class="action-detail-state-dot is-{~D:Record.State~}" title="{~D:Record.StateLabel~}"></span>
					<strong>{~D:Record.Title~}</strong>
					<span class="subtle action-detail-meta" style="margin-left:8px">{~D:Record.MetaLine~}</span>
				</span>
				<span class="diff-header-actions">
					{~TS:Manager-Modal-ActionDetail-RefreshBtn-Template:Record.RefreshBtnSlot~}
					<button id="RM-ActionDetail-Fullscreen" onclick="_Pict.views['Manager-Modal-ActionDetail'].toggleFullscreen(this)">Fullscreen</button>
					<button onclick="_Pict.views['Manager-Modal-ActionDetail'].close()">close</button>
				</span>
			</div>
			<div class="diff-body" id="RM-ActionDetail-Body">
				{~TS:Manager-Modal-ActionDetail-Empty-Template:Record.EmptySlot~}
				{~TS:Manager-Modal-ActionDetail-Line-Template:Record.Lines~}
			</div>
		</div>
	</div>
</div>
`
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
			DestinationAddress: '#RM-ModalRoot',
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
		this._keyHandler   = null;
		this._tickTimer    = null;
	}

	open(pOperationId)
	{
		this._operationId = pOperationId;
		this._fullscreen  = false;
		this._writeRecord();
		this.render();

		// Esc closes the modal — window-level keyboard event is the
		// documented exception per modules/pict/CLAUDE.md (no element-
		// level inline equivalent for "Escape from anywhere").
		this._keyHandler = (pEvent) => { if (pEvent.key === 'Escape') { this.close(); } };
		document.addEventListener('keydown', this._keyHandler);

		// While the op is still running, repaint every second so the
		// elapsed-time + line count meta stays current and any stdout
		// frames that arrive while we're open are surfaced. Stops
		// itself as soon as the entry transitions to a terminal state.
		this._tickTimer = setInterval(() => this._tickWhileRunning(), 1000);
	}

	close()
	{
		if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
		if (this._tickTimer) { clearInterval(this._tickTimer); this._tickTimer = null; }
		this._operationId = null;
		this._fullscreen = false;
		this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
	}

	refresh()
	{
		this._writeRecord();
		this.render();
	}

	toggleFullscreen(pButton)
	{
		this._fullscreen = !this._fullscreen;
		// Toggle a class on the backdrop element. We do this imperatively
		// rather than via a re-render so the user's scroll position in
		// the body is preserved.
		let tmpRoot = document.querySelector('#RM-ModalRoot .modal-backdrop.action-modal');
		if (tmpRoot) { tmpRoot.classList.toggle('action-modal-fullscreen', this._fullscreen); }
		if (pButton) { pButton.textContent = this._fullscreen ? 'Exit fullscreen' : 'Fullscreen'; }
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		// Restore the fullscreen class after a render — we toggle the
		// element class imperatively in toggleFullscreen, but a re-render
		// (refresh tick during a running op) recreates the DOM and would
		// otherwise drop the class.
		if (this._fullscreen)
		{
			let tmpRoot = document.querySelector('#RM-ModalRoot .modal-backdrop.action-modal');
			if (tmpRoot) { tmpRoot.classList.add('action-modal-fullscreen'); }
			let tmpBtn = document.getElementById('RM-ActionDetail-Fullscreen');
			if (tmpBtn) { tmpBtn.textContent = 'Exit fullscreen'; }
		}

		// Auto-scroll to the bottom on initial open so the user sees the
		// most recent line — same behavior as the LogBar entry body.
		let tmpBody = document.getElementById('RM-ActionDetail-Body');
		if (tmpBody) { tmpBody.scrollTop = tmpBody.scrollHeight; }

		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// ─────────────────────────────────────────────
	//  Internals
	// ─────────────────────────────────────────────

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

		return tmpParts.join(' · ');
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
