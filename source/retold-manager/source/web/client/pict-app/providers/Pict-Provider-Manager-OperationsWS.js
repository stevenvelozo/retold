const libPictProvider = require('pict-provider');

const WS_PATH = '/ws/manager/operations';
const RECONNECT_DELAY_MS = 2500;

const _Configuration =
{
	ProviderIdentifier: 'ManagerOperationsWS',
	AutoInitialize: true,
	AutoInitializeOrdinal: 2,
};

// Cap on the in-memory action history kept under
// AppData.Manager.ActionHistory. The Log panel's "Actions" tab
// renders this list; older entries are dropped when a new one is
// pushed. Session-scoped (not persisted to localStorage).
const ACTION_HISTORY_CAP = 10;

class ManagerOperationsWSProvider extends libPictProvider
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this._ws = null;
		this._reconnectTimer = null;
	}

	connect()
	{
		if (this._ws) { return; }

		let tmpProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		let tmpUrl = tmpProtocol + '//' + window.location.host + WS_PATH;

		this._ws = new WebSocket(tmpUrl);

		this._ws.onopen = () =>
			{
				if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
			};

		this._ws.onmessage = (pEvent) =>
			{
				let tmpFrame;
				try { tmpFrame = JSON.parse(pEvent.data); }
				catch (e) { return; }
				this._handleFrame(tmpFrame);
			};

		this._ws.onclose = () =>
			{
				this._ws = null;
				if (!this._reconnectTimer)
				{
					this._reconnectTimer = setTimeout(() => { this.connect(); }, RECONNECT_DELAY_MS);
				}
			};

		this._ws.onerror = () => { /* onclose will fire right after */ };
	}

	// ─────────────────────────────────────────────
	//  Frame dispatch — updates AppData.Manager.ActiveOperation + triggers re-renders
	// ─────────────────────────────────────────────

	_handleFrame(pFrame)
	{
		// Ripple frames carry a RippleId and route to the Ripple view first.
		// While a ripple is active, op-scoped frames (start/stdout/progress/
		// complete/error) are also mirrored into the current step's output so
		// the user can see install/test/publish output inline with the timeline.
		if (pFrame.Type && pFrame.Type.indexOf('ripple-') === 0)
		{
			let tmpRippleView = this.pict.views['Manager-Ripple'];
			if (tmpRippleView && typeof tmpRippleView.handleFrame === 'function')
			{
				tmpRippleView.handleFrame(pFrame);
			}
			return;
		}

		let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
		if (tmpRipple && tmpRipple.Status === 'running')
		{
			let tmpRippleView = this.pict.views['Manager-Ripple'];
			if (tmpRippleView && typeof tmpRippleView.handleFrame === 'function')
			{
				tmpRippleView.handleFrame(pFrame);
			}
			// Still fall through so the output panel mirrors the frames too.
		}

		let tmpOp = this.pict.AppData.Manager.ActiveOperation;
		if (!tmpOp) { return; }

		let tmpComplete = false;

		switch (pFrame.Type)
		{
			case 'hello':
				// server handshake; nothing to do
				break;

			case 'start':
				tmpOp.OperationId = pFrame.OperationId;
				tmpOp.HeaderState = 'running';
				tmpOp.HeaderText  = pFrame.CommandString || pFrame.OperationId;
				// Preserve the optimistic Lines / Scope set by the initiator
				// (so the user immediately sees the cmd they kicked off, even
				// if the WS is a beat behind the HTTP response).
				if (!tmpOp.Lines) { tmpOp.Lines = []; }
				tmpOp.Lines.push({ Class: 'cmd',  Text: '$ ' + (pFrame.CommandString || '') });
				if (pFrame.Cwd)   { tmpOp.Lines.push({ Class: 'meta', Text: '  cwd: ' + pFrame.Cwd }); }
				if (pFrame.Label) { tmpOp.Lines.push({ Class: 'meta', Text: '  ' + pFrame.Label }); }
				// Push a history entry sharing the same Lines reference
				// so live appends during the run are reflected in the
				// Actions tab without copying.
				this._pushHistoryEntry(tmpOp, pFrame);
				break;

			case 'stdout':
				tmpOp.Lines.push(
					{
						Class: (pFrame.Channel === 'stderr') ? 'stderr' : '',
						Text:  pFrame.Text || '',
					});
				break;

			case 'progress':
				if (pFrame.Message) { tmpOp.Lines.push({ Class: 'meta', Text: '... ' + pFrame.Message }); }
				break;

			case 'complete':
				if (pFrame.ExitCode === 0)
				{
					tmpOp.HeaderState = 'success';
					tmpOp.HeaderText  = 'Completed'
						+ (pFrame.Duration ? ' (' + pFrame.Duration + ')' : '');
					tmpOp.Lines.push(
						{
							Class: 'success',
							Text: 'Done' + (pFrame.Duration ? '  ' + pFrame.Duration : ''),
						});
				}
				else
				{
					tmpOp.HeaderState = 'error';
					tmpOp.HeaderText  = 'Failed exit ' + pFrame.ExitCode;
					tmpOp.Lines.push(
						{
							Class: 'error',
							Text: 'exit ' + pFrame.ExitCode
								+ (pFrame.Duration ? '  (' + pFrame.Duration + ')' : ''),
						});
				}
				tmpComplete = true;
				break;

			case 'error':
				tmpOp.HeaderState = 'error';
				tmpOp.HeaderText  = 'Error';
				tmpOp.Lines.push({ Class: 'error', Text: 'Error: ' + (pFrame.Error || 'unknown') });
				tmpComplete = true;
				break;

			case 'cancelled':
				tmpOp.HeaderState = 'error';
				tmpOp.HeaderText  = 'Cancelled';
				tmpOp.Lines.push({ Class: 'error', Text: 'Cancelled' });
				tmpComplete = true;
				break;

			default:
				return;
		}

		// On any lifecycle endpoint, stamp the matching history entry
		// (success / error / cancelled + EndedAt timestamp) so the
		// Actions tab can render terminal state per entry.
		if (tmpComplete)
		{
			this._updateHistoryEntry(tmpOp.OperationId, {
				State:   tmpOp.HeaderState || 'success',
				EndedAt: new Date().toISOString()
			});
		}

		// Stdout frames are the hot path during noisy ops — append-only +
		// rAF coalescing keeps the renderer from quadratically rebuilding
		// the whole log on every line. Lifecycle frames (start/complete/
		// error/cancelled) reset the shell template.
		let tmpHotPath = (pFrame.Type === 'stdout' || pFrame.Type === 'progress');
		// Persistent Log bar (always visible at the bottom of the
		// workspace). All operation frames stream into here — replaces
		// the old in-workspace OutputPanel "magic window".
		let tmpLogBar = this.pict.views['Manager-LogBar'];
		if (tmpLogBar && typeof tmpLogBar.scheduleAppend === 'function')
		{
			tmpLogBar.scheduleAppend();
		}
		// Legacy inline OutputPanel — kept registered but only rendered
		// when explicitly mounted by a host template (currently no
		// templates do). Skip the per-frame work.
		// Legacy LogModal — kept registered for future direct-access
		// flows but not in the per-frame hot path.

		// On completion of a module-scoped op, reload the module detail so the
		// dirty-files list, package version, and dep ranges reflect reality.
		if (tmpComplete && tmpOp.Scope === 'module' && tmpOp.ModuleName)
		{
			let tmpWs = this.pict.views['Manager-ModuleWorkspace'];
			if (tmpWs && this.pict.AppData.Manager.SelectedModule === tmpOp.ModuleName
				&& typeof tmpWs.refreshDetail === 'function')
			{
				tmpWs.refreshDetail();
			}
		}
	}

	// ─────────────────────────────────────────────
	//  Action history maintenance — feeds the Log panel's "Actions" tab.
	// ─────────────────────────────────────────────

	/**
	 * Push a fresh history entry for an op that just started. The
	 * entry's `Lines` is a SHARED reference to the live ActiveOperation
	 * Lines array, so frames appended during the run are visible to
	 * any view rendering the entry without copying lines on every
	 * frame. Capped at ACTION_HISTORY_CAP (oldest dropped).
	 *
	 * For multi-step sequence operations (e.g. `ncu Apply` which runs
	 * `npx npm-check-updates -u` then `npm install`), the runner emits
	 * a 'start' frame per step but reuses the same OperationId. We
	 * detect that case and update the existing entry's label rather
	 * than pushing a duplicate — duplicates would cause `toggleEntry`
	 * to flip multiple entries with the same id, and would prevent
	 * `_updateHistoryEntry` from stamping completion state on every
	 * matching row.
	 */
	_pushHistoryEntry(pOp, pFrame)
	{
		let tmpManager = this.pict.AppData.Manager;
		if (!tmpManager.ActionHistory) { tmpManager.ActionHistory = []; }
		let tmpHistory = tmpManager.ActionHistory;

		// Sequence-step start: same OperationId already in history. Refresh
		// the label so the user sees which step is running, but don't push
		// a duplicate row.
		for (let i = 0; i < tmpHistory.length; i++)
		{
			if (tmpHistory[i].OperationId === pOp.OperationId)
			{
				tmpHistory[i].Label = pOp.HeaderText || pFrame.CommandString || tmpHistory[i].Label;
				tmpHistory[i].State = 'running';
				tmpHistory[i].EndedAt = null;
				return;
			}
		}

		tmpHistory.unshift(
			{
				OperationId: pOp.OperationId,
				Label:       pOp.HeaderText || pFrame.CommandString || '(unknown)',
				ModuleName:  pOp.ModuleName || null,
				Scope:       pOp.Scope || null,
				StartedAt:   new Date().toISOString(),
				EndedAt:     null,
				State:       'running',
				Lines:       pOp.Lines     // shared array — live appends visible
			});
		if (tmpHistory.length > ACTION_HISTORY_CAP)
		{
			tmpHistory.length = ACTION_HISTORY_CAP;
		}
	}

	/**
	 * Patch an existing history entry by OperationId (used on the
	 * complete/error/cancelled lifecycle frames to stamp the terminal
	 * state + EndedAt timestamp). Silently no-ops when the OperationId
	 * is missing — typical for very-early frames before _pushHistoryEntry
	 * landed.
	 */
	_updateHistoryEntry(pOpId, pPatch)
	{
		let tmpHistory = (this.pict.AppData.Manager && this.pict.AppData.Manager.ActionHistory) || [];
		for (let i = 0; i < tmpHistory.length; i++)
		{
			if (tmpHistory[i].OperationId === pOpId)
			{
				Object.assign(tmpHistory[i], pPatch);
				return;
			}
		}
	}
}

module.exports = ManagerOperationsWSProvider;
module.exports.default_configuration = _Configuration;
