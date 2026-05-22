const libPictProvider = require('pict-provider');

const WS_PATH = '/ws/manager/operations';
const RECONNECT_DELAY_MS = 2500;

// Watchdog reconciliation — when the local state thinks an op is still
// running, poll the server every WATCHDOG_INTERVAL_MS to check. Server is
// the source of truth; if it says "not running" we synthesize a complete
// frame so the UI doesn't stay stuck on an orange spinner forever.
// Triggered when the browser missed a lifecycle WS frame (tab throttled
// during npm install, ws blip, OS-level proxy timeout, etc.).
const WATCHDOG_INTERVAL_MS = 3000;
// Don't even attempt reconciliation until the op has been "running"
// client-side for at least this long — gives the genuine 'complete' WS
// frame a chance to land first on a healthy connection.
const WATCHDOG_MIN_RUNNING_MS = 4000;

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
		this._watchdogTimer = null;       // setInterval handle for the reconciliation poll
		this._watchdogActiveOpId = null;  // OperationId the watchdog is currently watching
		this._watchdogStartedAt = 0;      // timestamp the watchdog started; gates first poll
		this._watchdogPollInflight = false; // de-dupe overlapping fetches

		// FIFO queue of operations the user kicked off while another op
		// was already running. Each entry is { Start, Descriptor }:
		//   Start      — fn() that performs the full "stamp AppData
		//                .Manager.ActiveOperation, popLogPanel, call API"
		//                sequence for one button press
		//   Descriptor — { Label, ModuleName? } used to render the
		//                "+N queued" pill in the LogBar
		// Pumped on every terminal frame (complete/error/cancelled) in
		// _handleFrame so the next click resumes as soon as the current
		// op finishes — without the user having to babysit the panel.
		this._opQueue = [];
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
			// Stamp / update a single ActionHistory entry for the whole
			// ripple so the Actions summary records that the user ran one.
			// We deliberately don't push per-action entries (would flood
			// the 10-entry cap and be redundant with the Ripple view's
			// own per-step drill-down). The synthetic OperationId 'ripple_*'
			// can't collide with a real op id ('op_*' / 'rex_*') so the
			// existing _updateHistoryEntry can patch terminal state by id.
			this._stampRippleHistory(pFrame);

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
			// All non-ripple-* frames during a running ripple come from
			// the ripple's INTERNAL action executor (OperationIds prefixed
			// 'rex_'). The Ripple view is the place those render — per-
			// step drill-down with per-action output. Mirror them there
			// and RETURN, so they don't pollute the user-initiated action
			// history (which would otherwise flood the 10-entry cap with
			// 'npm install' / 'npm test' / 'git push' rows over and over,
			// pushing the single ripple summary entry out of view) and
			// don't get appended to the user's stale ActiveOperation
			// (which would cross-write the previous op's lines and
			// terminal state).
			let tmpRippleView = this.pict.views['Manager-Ripple'];
			if (tmpRippleView && typeof tmpRippleView.handleFrame === 'function')
			{
				tmpRippleView.handleFrame(pFrame);
			}
			return;
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
				// Spin up (or extend) the missed-frame watchdog for this op.
				this._startWatchdog(pFrame.OperationId);
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
			// Op reached a terminal state — stop the missed-frame poller.
			this._stopWatchdog();
			// Pump any operation the user queued while this one was
			// running. Deferred to a microtask so the current render
			// pass settles (the just-finished op gets to paint its
			// terminal state) before the next op stamps a new
			// ActiveOperation.
			this._pumpQueue();
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

	/**
	 * Stamp / update a single ActionHistory entry that represents the
	 * entire ripple run. Called from the ripple-* short-circuit in
	 * _handleFrame so the Actions summary shows ripples as one entry
	 * each — not the dozens of internal action frames a ripple emits.
	 * Synthetic OperationId 'ripple_<id>' keeps it from colliding with
	 * any real op id, so _updateHistoryEntry can patch terminal state.
	 */
	_stampRippleHistory(pFrame)
	{
		if (!pFrame || !pFrame.RippleId) { return; }
		let tmpSyntheticId = 'ripple_' + pFrame.RippleId;

		// 'ripple-start' is the only frame we treat as a fresh entry.
		// 'ripple-resume' updates the existing entry's state back to
		// 'running' but doesn't reset its StartedAt.
		if (pFrame.Type === 'ripple-start')
		{
			let tmpRoots = (pFrame.Plan && Array.isArray(pFrame.Plan.Roots)) ? pFrame.Plan.Roots : [];
			let tmpStepCount = (pFrame.Plan && Array.isArray(pFrame.Plan.Steps)) ? pFrame.Plan.Steps.length : 0;
			let tmpRootLabel = tmpRoots.length > 3
				? (tmpRoots.slice(0, 3).join(', ') + ' +' + (tmpRoots.length - 3) + ' more')
				: tmpRoots.join(', ');
			let tmpLabel = 'Ripple — ' + (tmpRootLabel || '(empty roots)')
				+ (tmpStepCount ? ' (' + tmpStepCount + ' steps)' : '');

			let tmpManager = this.pict.AppData.Manager;
			if (!tmpManager.ActionHistory) { tmpManager.ActionHistory = []; }
			let tmpHistory = tmpManager.ActionHistory;
			// If a resumed ripple lands as ripple-start (older server),
			// reuse the existing entry rather than pushing a duplicate.
			for (let i = 0; i < tmpHistory.length; i++)
			{
				if (tmpHistory[i].OperationId === tmpSyntheticId)
				{
					tmpHistory[i].Label   = tmpLabel;
					tmpHistory[i].State   = 'running';
					tmpHistory[i].EndedAt = null;
					return;
				}
			}
			tmpHistory.unshift(
				{
					OperationId: tmpSyntheticId,
					Label:       tmpLabel,
					ModuleName:  null,
					Scope:       'ripple',
					StartedAt:   new Date().toISOString(),
					EndedAt:     null,
					State:       'running',
					Lines:       []
				});
			if (tmpHistory.length > ACTION_HISTORY_CAP)
			{
				tmpHistory.length = ACTION_HISTORY_CAP;
			}
			let tmpLogBar = this.pict.views['Manager-LogBar'];
			if (tmpLogBar && typeof tmpLogBar.scheduleAppend === 'function') { tmpLogBar.scheduleAppend(); }
			return;
		}

		if (pFrame.Type === 'ripple-resume')
		{
			this._updateHistoryEntry(tmpSyntheticId, { State: 'running', EndedAt: null });
			return;
		}

		// Terminal frames.
		let tmpTerminal = false;
		if (pFrame.Type === 'ripple-complete')
		{
			this._updateHistoryEntry(tmpSyntheticId, { State: 'success',   EndedAt: new Date().toISOString() });
			tmpTerminal = true;
		}
		else if (pFrame.Type === 'ripple-failed')
		{
			this._updateHistoryEntry(tmpSyntheticId, { State: 'error',     EndedAt: new Date().toISOString() });
			tmpTerminal = true;
		}
		else if (pFrame.Type === 'ripple-cancelled')
		{
			this._updateHistoryEntry(tmpSyntheticId, { State: 'cancelled', EndedAt: new Date().toISOString() });
			tmpTerminal = true;
		}

		let tmpLogBar = this.pict.views['Manager-LogBar'];
		if (tmpLogBar && typeof tmpLogBar.scheduleAppend === 'function') { tmpLogBar.scheduleAppend(); }

		// Ripple just reached a terminal state — pump the operation queue
		// so any user click that landed during the ripple now fires. The
		// 'normal' fall-through path used to do this but ripple frames
		// now short-circuit at the top of _handleFrame, so we handle the
		// pump explicitly here.
		if (tmpTerminal) { this._pumpQueue(); }
	}

	// ─────────────────────────────────────────────
	//  Missed-frame watchdog
	//
	//  The WS protocol has no replay buffer — if a lifecycle frame
	//  ('progress' between steps, 'complete' at the end) is missed (browser
	//  tab throttled during a long step, transient WS blip, OS-level proxy
	//  timeout, etc.) the UI is stranded on an orange spinner forever.
	//  Multi-step operations like `ncu Apply` (ncu -u → npm install) are
	//  particularly exposed because there are more frames to miss.
	//
	//  Recovery: while we believe an op is running client-side, poll
	//  `GET /operations/:id` every WATCHDOG_INTERVAL_MS. If the server
	//  reports Running=false with a recent Result, synthesize the missing
	//  lifecycle frame ourselves. The Result was stamped by the stream
	//  bridge with the real ExitCode/Duration, so the synthesized frame
	//  is indistinguishable from a real one.
	// ─────────────────────────────────────────────

	_startWatchdog(pOperationId)
	{
		// Already watching this op (e.g. step 1 'start' after step 0 'start')
		// — just refresh the start timestamp so the grace period applies to
		// the *latest* step, not the first one.
		if (this._watchdogActiveOpId === pOperationId && this._watchdogTimer)
		{
			this._watchdogStartedAt = Date.now();
			return;
		}
		this._stopWatchdog();
		this._watchdogActiveOpId = pOperationId;
		this._watchdogStartedAt = Date.now();
		this._watchdogTimer = setInterval(() => this._watchdogTick(), WATCHDOG_INTERVAL_MS);
	}

	_stopWatchdog()
	{
		if (this._watchdogTimer)
		{
			clearInterval(this._watchdogTimer);
			this._watchdogTimer = null;
		}
		this._watchdogActiveOpId = null;
		this._watchdogStartedAt = 0;
		this._watchdogPollInflight = false;
	}

	_watchdogTick()
	{
		let tmpOpId = this._watchdogActiveOpId;
		if (!tmpOpId) { this._stopWatchdog(); return; }

		// If the local state already moved out of 'running' (a normal
		// 'complete' frame landed between ticks), the start-path will
		// have called _stopWatchdog. Defensive check just in case.
		let tmpOp = this.pict.AppData.Manager.ActiveOperation;
		if (!tmpOp || tmpOp.OperationId !== tmpOpId || tmpOp.HeaderState !== 'running')
		{
			this._stopWatchdog();
			return;
		}

		// Honour the grace period — don't race the genuine 'complete' frame
		// on the happy path.
		if (Date.now() - this._watchdogStartedAt < WATCHDOG_MIN_RUNNING_MS) { return; }

		if (this._watchdogPollInflight) { return; }
		this._watchdogPollInflight = true;

		let tmpApi = this.pict.providers.ManagerAPI;
		if (!tmpApi || typeof tmpApi.get !== 'function')
		{
			this._watchdogPollInflight = false;
			return;
		}

		tmpApi.get('/operations/' + encodeURIComponent(tmpOpId)).then(
			(pBody) =>
			{
				this._watchdogPollInflight = false;
				// Op might have completed normally while the poll was in flight.
				if (this._watchdogActiveOpId !== tmpOpId) { return; }
				let tmpCurrent = this.pict.AppData.Manager.ActiveOperation;
				if (!tmpCurrent || tmpCurrent.OperationId !== tmpOpId || tmpCurrent.HeaderState !== 'running') { return; }

				if (pBody.Running) { return; } // genuinely still running on the server

				// Server says this op is done. Synthesize the missing
				// lifecycle frame and feed it back through _handleFrame
				// so all the regular machinery (history stamp, workspace
				// refresh, LogBar re-render) runs.
				let tmpResult = pBody.Result || {};
				if (tmpResult.Kind === 'error')
				{
					this._handleFrame(
						{
							Type: 'error',
							OperationId: tmpOpId,
							Error: '(recovered) ' + (tmpResult.Error || 'process error'),
						});
					return;
				}
				this._handleFrame(
					{
						Type: 'complete',
						OperationId: tmpOpId,
						ExitCode:  typeof tmpResult.ExitCode === 'number' ? tmpResult.ExitCode : 0,
						ElapsedMs: tmpResult.ElapsedMs,
						Duration:  tmpResult.Duration,
						LineCount: tmpResult.LineCount,
					});
			},
			() =>
			{
				// Network blip or server hiccup — leave the watchdog
				// running; we'll retry on the next tick.
				this._watchdogPollInflight = false;
			});
	}

	// ─────────────────────────────────────────────
	//  Operation queue — single chokepoint for "the user clicked an
	//  action button"
	//
	//  Every button that kicks off a server-side operation routes through
	//  enqueueOperation(startFn, descriptor) instead of stamping
	//  AppData.Manager.ActiveOperation and posting to the API directly.
	//  If nothing is running, startFn fires immediately. Otherwise the
	//  click is queued and runs as soon as the current op reaches a
	//  terminal frame (complete/error/cancelled in _handleFrame).
	//
	//  Without this, a mis-click during a long-running op (ncu apply →
	//  npm install, ripple, etc.) would stamp a fresh ActiveOperation
	//  over the running one, then the server's 409 RunnerBusy response
	//  would arrive too late to undo the stamp — the UI showed two
	//  overlapping ops, the WS frames from the running op merged into
	//  the wrong AppData slot, and neither op ever reached a clean
	//  terminal state in the UI even though both completed on the server.
	// ─────────────────────────────────────────────

	/**
	 * Run startFn now if the runner is idle, otherwise enqueue it to
	 * run after the current op completes. The descriptor (`{ Label,
	 * ModuleName? }`) is what the LogBar's queued-pill displays.
	 *
	 * startFn owns the full "press this button" workflow: stamping
	 * AppData.Manager.ActiveOperation, popping the LogBar, calling the
	 * API. The provider just decides when to invoke it.
	 */
	enqueueOperation(pStartFn, pDescriptor)
	{
		if (typeof pStartFn !== 'function') { return; }
		let tmpDescriptor = pDescriptor || {};
		let tmpActive = this.pict.AppData.Manager.ActiveOperation;
		let tmpBusy = !!(tmpActive && tmpActive.HeaderState === 'running');
		if (!tmpBusy)
		{
			return pStartFn();
		}
		this._opQueue.push({ Start: pStartFn, Descriptor: tmpDescriptor });
		this._publishQueueChanged();
		let tmpLabel = tmpDescriptor.Label || 'operation';
		this.pict.PictApplication.setStatus('Queued: ' + tmpLabel
			+ ' (' + this._opQueue.length + ' waiting — will run when '
			+ (tmpActive.HeaderText || 'current op') + ' finishes).');
	}

	/**
	 * Drop every queued operation without running them. Used by the
	 * cancel button when the user wants to walk back a chain of
	 * mis-clicks. Does not touch the currently-running op.
	 */
	clearOperationQueue()
	{
		if (this._opQueue.length === 0) { return 0; }
		let tmpCount = this._opQueue.length;
		this._opQueue.length = 0;
		this._publishQueueChanged();
		this.pict.PictApplication.setStatus('Cleared ' + tmpCount + ' queued operation' + (tmpCount === 1 ? '' : 's') + '.');
		return tmpCount;
	}

	_publishQueueChanged()
	{
		// Expose the queue descriptor list under AppData so the LogBar
		// (or any other view) can render the queued count without
		// having to reach into the provider's privates.
		this.pict.AppData.Manager.OperationQueue = this._opQueue.map((p) => p.Descriptor);
		let tmpLogBar = this.pict.views['Manager-LogBar'];
		if (tmpLogBar && typeof tmpLogBar.scheduleAppend === 'function') { tmpLogBar.scheduleAppend(); }
	}

	_pumpQueue()
	{
		if (this._opQueue.length === 0) { return; }
		let tmpNext = this._opQueue.shift();
		this._publishQueueChanged();
		// Defer one tick so the just-completed op's terminal-state
		// render pass settles (history entry stamped, LogBar repaint)
		// before the next op stamps a fresh ActiveOperation. Without
		// this defer the new op's 'start' frame can race the previous
		// op's complete frame inside the same render cycle.
		let tmpSelf = this;
		setTimeout(function ()
		{
			try { tmpNext.Start(); }
			catch (pError) { tmpSelf.pict.PictApplication.setStatus('Queued operation failed to start: ' + (pError && pError.message ? pError.message : pError)); }
		}, 0);
	}
}

module.exports = ManagerOperationsWSProvider;
module.exports.default_configuration = _Configuration;
