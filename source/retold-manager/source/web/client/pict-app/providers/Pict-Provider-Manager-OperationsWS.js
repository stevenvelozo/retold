const libPictProvider = require('pict-provider');

const WS_PATH = '/ws/manager/operations';
const RECONNECT_DELAY_MS = 2500;

const _Configuration =
{
	ProviderIdentifier: 'ManagerOperationsWS',
	AutoInitialize: true,
	AutoInitializeOrdinal: 2,
};

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

		// Stdout frames are the hot path during noisy ops — append-only +
		// rAF coalescing keeps the renderer from quadratically rebuilding
		// the whole log on every line. Lifecycle frames (start/complete/
		// error/cancelled) reset the shell template.
		let tmpHotPath = (pFrame.Type === 'stdout' || pFrame.Type === 'progress');
		let tmpPanel = this.pict.views['Manager-OutputPanel'];
		if (tmpPanel)
		{
			if (tmpHotPath && typeof tmpPanel.scheduleAppend === 'function')
			{
				tmpPanel.scheduleAppend();
			}
			else
			{
				tmpPanel.render();
			}
		}
		// Live log modal (open during cross-module ops or when the user
		// explicitly requested the live view). renderFrame is rAF-batched.
		if (this.pict.views['Manager-LogModal']) { this.pict.views['Manager-LogModal'].renderFrame(); }

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
}

module.exports = ManagerOperationsWSProvider;
module.exports.default_configuration = _Configuration;
