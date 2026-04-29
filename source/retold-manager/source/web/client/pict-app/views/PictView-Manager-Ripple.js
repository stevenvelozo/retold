const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Ripple',

	DefaultRenderable:            'Manager-Ripple-Content',
	DefaultDestinationAddress:    '#RM-Workspace-Content',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.Ripple',

	AutoRender: false,

	CSS: /*css*/`
		.ripple-plan { padding: 4px 0; }
		.ripple-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
		.ripple-header .title { font-weight: 600; font-size: 15px; }
		.ripple-header .target { color: var(--color-accent); }
		.ripple-header .meta   { color: var(--color-muted); font-size: 12px; }
		.ripple-timeline { display: flex; flex-direction: column; gap: 8px; }
		.ripple-step { border: 1px solid var(--color-border); border-left: 3px solid var(--color-border);
			border-radius: 6px; padding: 8px 12px; background: var(--color-panel); }
		.ripple-step.running   { border-left-color: var(--color-accent); }
		.ripple-step.paused    { border-left-color: var(--color-warning); }
		.ripple-step.complete  { border-left-color: var(--color-success); }
		.ripple-step.failed    { border-left-color: var(--color-danger); }
		.ripple-step.cancelled { border-left-color: var(--color-muted); opacity: 0.7; }
		.step-row { display: flex; align-items: baseline; gap: 10px; font-family: var(--font-mono); font-size: 13px; }
		.step-order    { color: var(--color-muted); min-width: 28px; }
		.step-module   { font-weight: 600; }
		.step-kind     { color: var(--color-muted); font-size: 11px; }
		.step-status   { margin-left: auto; color: var(--color-muted); font-size: 11px; }
		.step-actions  { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; font-size: 11px; }
		.step-action   { padding: 2px 6px; border-radius: 3px; background: var(--color-panel-alt); color: var(--color-muted); }
		.step-action.current { background: rgba(47,129,247,0.18); color: var(--color-accent); }
		.step-action.done    { background: rgba(63,185,80,0.18);  color: var(--color-success); }
		.step-action.failed  { background: rgba(248,81,73,0.18);  color: var(--color-danger); }
		.step-approve { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
		.step-approve .hint { color: var(--color-muted); font-size: 11px; }
		.step-output  { margin-top: 8px; border-top: 1px dashed var(--color-border); padding-top: 6px; }
		.step-output-toggle { background: none; border: none; color: var(--color-muted);
			font-family: var(--font-mono); font-size: 11px; cursor: pointer; }
		.step-output-body { max-height: 240px; overflow: auto; padding: 6px 8px;
			background: var(--color-panel-alt); border-radius: 4px; font-family: var(--font-mono);
			font-size: 11px; white-space: pre-wrap; word-break: break-word; }
		.step-output:not(.open) .step-output-body { display: none; }
		.step-output .line.stderr  { color: var(--color-danger); }
		.step-output .line.meta    { color: var(--color-muted); }
		.step-output .line.success { color: var(--color-success); }
		.step-output .line.error   { color: var(--color-danger); }
	`,

	Templates:
	[
		{
			Hash: 'Manager-Ripple-Empty-Template',
			Template: /*html*/`
<div class="placeholder">
	<h2>Ripple planner</h2>
	<p>No active plan. Open a module and click <strong>Ripple</strong> to plan a cascade.</p>
</div>
`
		},
		{
			Hash: 'Manager-Ripple-Content-Template',
			Template: /*html*/`{~D:Record.Html~}`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Ripple-Content',
			TemplateHash:       'Manager-Ripple-Content-Template',
			DestinationAddress: '#RM-Workspace-Content',
			RenderMethod:       'replace',
		}
	]
};

const STATUS_LABEL =
{
	pending:   'pending',
	running:   'running',
	paused:    'paused, awaiting confirm',
	complete:  'done',
	failed:    'failed',
	cancelled: 'cancelled',
};

class ManagerRippleView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	// Called by the router when /Ripple resolves.
	showFromRoute()
	{
		let tmpPlan = this.pict.AppData.Manager.RipplePlan;
		if (!tmpPlan)
		{
			// No plan pending — show the empty state.
			this._writeRecord({ Html: this.pict.parseTemplateByHash('Manager-Ripple-Empty-Template', {}) });
			this.render();
			return;
		}
		// If we don't yet have an active ripple state, create one from the plan.
		if (!this.pict.AppData.Manager.ActiveRipple
			|| this.pict.AppData.Manager.ActiveRipple.Plan !== tmpPlan)
		{
			this._enterFromPlan(tmpPlan);
		}
		this._refresh();
	}

	_enterFromPlan(pPlan)
	{
		this.pict.AppData.Manager.ActiveRipple =
			{
				RippleId: null,
				Plan: pPlan,
				Steps: pPlan.Steps.map((pS) =>
					({
						Order: pS.Order,
						Module: pS.Module,
						Status: 'pending',
						CurrentAction: -1,
						ActionStates: pS.Actions.map(() => 'pending'),
						ActionResults: [],
						PauseReport: null,
						Output: [],
						ShowOutput: false,
					})),
				Status: 'draft',
			};
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this._wireButtons();
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// ─────────────────────────────────────────────
	//  WebSocket frame dispatch (called from OperationsWS provider)
	// ─────────────────────────────────────────────

	handleFrame(pFrame)
	{
		let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
		if (!tmpRipple) { return; }
		if (pFrame.RippleId && tmpRipple.RippleId && pFrame.RippleId !== tmpRipple.RippleId) { return; }

		// Op-scoped frames (non-ripple-prefixed): mirror into the current running step's output
		if (pFrame.Type && pFrame.Type.indexOf('ripple-') !== 0)
		{
			if (tmpRipple.Status !== 'running') { return; }
			let tmpIdx = tmpRipple.Steps.findIndex((pS) => pS.Status === 'running');
			if (tmpIdx < 0) { return; }
			switch (pFrame.Type)
			{
				case 'stdout':
					this._appendStepOutput(tmpIdx, (pFrame.Channel === 'stderr') ? 'stderr' : '', pFrame.Text);
					this._renderStepOutput(tmpIdx);
					return;
				case 'progress':
					if (pFrame.Message)
					{
						this._appendStepOutput(tmpIdx, 'meta', '... ' + pFrame.Message);
						this._renderStepOutput(tmpIdx);
					}
					return;
				case 'complete':
					this._appendStepOutput(tmpIdx,
						pFrame.ExitCode === 0 ? 'success' : 'error',
						pFrame.ExitCode === 0
							? ('done' + (pFrame.Duration ? ' ' + pFrame.Duration : ''))
							: ('exit ' + pFrame.ExitCode + (pFrame.Duration ? ' (' + pFrame.Duration + ')' : '')));
					this._renderStepOutput(tmpIdx);
					return;
				case 'error':
					this._appendStepOutput(tmpIdx, 'error', 'error: ' + (pFrame.Error || 'unknown'));
					this._renderStepOutput(tmpIdx);
					return;
			}
			return;
		}

		switch (pFrame.Type)
		{
			case 'ripple-start':
				tmpRipple.Status = 'running';
				this._refresh();
				break;
			case 'ripple-step-start':
				tmpRipple.Steps[pFrame.StepOrder].Status = 'running';
				this._refresh();
				break;
			case 'ripple-action-start':
				tmpRipple.Steps[pFrame.StepOrder].CurrentAction = pFrame.ActionIndex;
				tmpRipple.Steps[pFrame.StepOrder].ActionStates[pFrame.ActionIndex] = 'current';
				this._appendStepOutput(pFrame.StepOrder, 'action',
					'── ' + this._formatActionLabel(pFrame.Action) + ' ──');
				this._refresh();
				break;
			case 'ripple-action-end':
				tmpRipple.Steps[pFrame.StepOrder].ActionStates[pFrame.ActionIndex] = 'done';
				tmpRipple.Steps[pFrame.StepOrder].ActionResults[pFrame.ActionIndex] = pFrame.Result;
				this._refresh();
				break;
			case 'ripple-paused':
				tmpRipple.Status = 'paused';
				tmpRipple.Steps[pFrame.StepOrder].Status = 'paused';
				tmpRipple.Steps[pFrame.StepOrder].PauseReport = pFrame.PreviewReport;
				this._refresh();
				break;
			case 'ripple-step-complete':
				tmpRipple.Steps[pFrame.StepOrder].Status = 'complete';
				this._refresh();
				break;
			case 'ripple-complete':
				tmpRipple.Status = 'complete';
				this._refresh();
				this.pict.PictApplication.setStatus('Ripple complete.');
				break;
			case 'ripple-failed':
				tmpRipple.Status = 'failed';
				if (typeof pFrame.StepOrder === 'number' && tmpRipple.Steps[pFrame.StepOrder])
				{
					tmpRipple.Steps[pFrame.StepOrder].Status = 'failed';
					if (typeof pFrame.ActionIndex === 'number' && pFrame.ActionIndex >= 0)
					{
						tmpRipple.Steps[pFrame.StepOrder].ActionStates[pFrame.ActionIndex] = 'failed';
					}
				}
				this._refresh();
				this.pict.PictApplication.setStatus('Ripple failed: ' + pFrame.Error);
				break;
			case 'ripple-cancelled':
				tmpRipple.Status = 'cancelled';
				for (let i = 0; i < tmpRipple.Steps.length; i++)
				{
					let tmpS = tmpRipple.Steps[i];
					if (tmpS.Status === 'pending' || tmpS.Status === 'running' || tmpS.Status === 'paused')
					{
						tmpS.Status = 'cancelled';
					}
				}
				this._refresh();
				this.pict.PictApplication.setStatus('Ripple cancelled.');
				break;
		}
	}

	// ─────────────────────────────────────────────
	//  Action handlers invoked from inline handlers
	// ─────────────────────────────────────────────

	startRipple()
	{
		let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
		if (!tmpRipple || tmpRipple.Status !== 'draft') { return; }
		tmpRipple.Status = 'starting';
		this._refresh();

		this.pict.providers.ManagerAPI.runRipple(tmpRipple.Plan).then(
			(pBody) =>
			{
				tmpRipple.RippleId = pBody.RippleId;
				tmpRipple.Status   = 'running';
				this._refresh();
			},
			(pError) =>
			{
				tmpRipple.Status = 'failed';
				tmpRipple.Error  = pError.message;
				this._refresh();
				this.pict.PictApplication.setStatus('Ripple start failed: ' + pError.message);
			});
	}

	cancelRipple()
	{
		let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
		if (!tmpRipple || !tmpRipple.RippleId) { return; }
		this.pict.providers.ManagerAPI.cancelRipple(tmpRipple.RippleId).catch(() => {});
	}

	exitRipple()
	{
		this.pict.AppData.Manager.ActiveRipple = null;
		this.pict.AppData.Manager.RipplePlan   = null;
		this.pict.PictApplication.navigateTo('/Home');
	}

	approveStep(pOrder)
	{
		let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
		if (!tmpRipple || !tmpRipple.RippleId) { return; }
		let tmpState = tmpRipple.Steps[pOrder];
		if (!tmpState || !tmpState.PauseReport) { return; }

		let tmpHash = tmpState.PauseReport.PreviewHash;
		tmpState.PauseReport = null;
		tmpState.Status = 'running';
		tmpRipple.Status = 'running';
		this._refresh();

		this.pict.providers.ManagerAPI.confirmRippleStep(tmpRipple.RippleId, pOrder, tmpHash).catch(
			(pError) => { this.pict.PictApplication.setStatus('Approve failed: ' + pError.message); });
	}

	toggleOutput(pOrder)
	{
		let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
		if (!tmpRipple) { return; }
		let tmpStep = tmpRipple.Steps[pOrder];
		if (!tmpStep) { return; }
		tmpStep.ShowOutput = !tmpStep.ShowOutput;
		this._refresh();
	}

	// ─────────────────────────────────────────────
	//  Rendering internals
	// ─────────────────────────────────────────────

	_refresh()
	{
		let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
		if (!tmpRipple)
		{
			this._writeRecord({ Html: this.pict.parseTemplateByHash('Manager-Ripple-Empty-Template', {}) });
			this.render();
			return;
		}
		this._writeRecord({ Html: this._buildHtml(tmpRipple) });
		this.render();
	}

	_writeRecord(pRecord)
	{
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.Ripple = pRecord;
	}

	_wireButtons()
	{
		let tmpWs = document.getElementById('RM-Workspace');
		if (!tmpWs) { return; }
		let tmpButtons = tmpWs.querySelectorAll('button[data-act]');
		for (let i = 0; i < tmpButtons.length; i++)
		{
			tmpButtons[i].addEventListener('click', (pEvent) =>
				{
					let tmpAct   = pEvent.currentTarget.getAttribute('data-act');
					let tmpOrder = pEvent.currentTarget.getAttribute('data-order');
					switch (tmpAct)
					{
						case 'ripple-start':         return this.startRipple();
						case 'ripple-cancel':        return this.cancelRipple();
						case 'ripple-exit':          return this.exitRipple();
						case 'ripple-approve':       return this.approveStep(parseInt(tmpOrder, 10));
						case 'ripple-toggle-output': return this.toggleOutput(parseInt(tmpOrder, 10));
					}
				});
		}
	}

	_appendStepOutput(pStepOrder, pKind, pText)
	{
		let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
		if (!tmpRipple) { return; }
		let tmpStep = tmpRipple.Steps[pStepOrder];
		if (!tmpStep) { return; }
		tmpStep.Output.push({ Kind: pKind, Text: pText });
		if (tmpStep.Output.length > 2000)
		{
			tmpStep.Output.splice(0, tmpStep.Output.length - 2000);
		}
	}

	_renderStepOutput(pStepOrder)
	{
		let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
		if (!tmpRipple) { return; }
		let tmpStep = tmpRipple.Steps[pStepOrder];
		if (!tmpStep) { return; }
		let tmpPanel = document.querySelector('.ripple-step[data-order="' + pStepOrder + '"] .step-output-body');
		if (!tmpPanel) { return; }
		tmpPanel.innerHTML = this._renderStepOutputLines(tmpStep);
		tmpPanel.scrollTop = tmpPanel.scrollHeight;
	}

	_renderStepOutputLines(pStep)
	{
		if (!pStep.Output || pStep.Output.length === 0) { return '<span class="line meta">(no output yet)</span>'; }
		let tmpParts = [];
		for (let i = 0; i < pStep.Output.length; i++)
		{
			let tmpLine = pStep.Output[i];
			let tmpCls = 'line';
			if (tmpLine.Kind === 'stderr') { tmpCls += ' stderr'; }
			else if (tmpLine.Kind === 'meta' || tmpLine.Kind === 'action') { tmpCls += ' meta'; }
			else if (tmpLine.Kind === 'success') { tmpCls += ' success'; }
			else if (tmpLine.Kind === 'error')   { tmpCls += ' error'; }
			tmpParts.push('<span class="' + tmpCls + '">' + this._escape(tmpLine.Text) + '</span>');
		}
		return tmpParts.join('\n');
	}

	_buildHtml(pRipple)
	{
		let tmpPlan  = pRipple.Plan;
		let tmpSteps = pRipple.Steps;

		// Multi-root header: list every selected producer (truncate to 3 +
		// overflow count, full list available on hover via title attr).
		let tmpRoots = (Array.isArray(tmpPlan.Roots) && tmpPlan.Roots.length > 0)
			? tmpPlan.Roots
			: [tmpPlan.Root];
		let tmpRootsLabel;
		if (tmpRoots.length === 1)
		{
			tmpRootsLabel = '<span class="target">' + this._escape(tmpRoots[0]) + '</span>';
		}
		else
		{
			let tmpShown = tmpRoots.slice(0, 3).map((pR) => this._escape(pR)).join(', ');
			let tmpExtra = (tmpRoots.length > 3) ? (' +' + (tmpRoots.length - 3) + ' more') : '';
			tmpRootsLabel = '<span class="target" title="' + this._escape(tmpRoots.join(', ')) + '">'
				+ tmpRoots.length + ' producers: ' + tmpShown + tmpExtra + '</span>';
		}

		let tmpHtml = '<div class="ripple-plan">';
		tmpHtml += '<div class="ripple-header">';
		tmpHtml += '  <span class="title">Ripple: ' + tmpRootsLabel + '</span>';
		tmpHtml += '  <span class="meta">' + tmpSteps.length + ' steps · producer '
			+ this._escape(tmpPlan.Options.ProducerBumpKind || 'patch') + ' / consumer '
			+ this._escape(tmpPlan.Options.ConsumerBumpKind || 'patch') + ' bump</span>';
		tmpHtml += '</div>';

		tmpHtml += '<div class="action-row" style="margin-bottom:12px">';
		if (pRipple.Status === 'draft')
		{
			tmpHtml += '<button class="action primary" data-act="ripple-start">Start ripple</button>';
		}
		if (pRipple.Status === 'running' || pRipple.Status === 'paused' || pRipple.Status === 'starting')
		{
			tmpHtml += '<button class="action danger" data-act="ripple-cancel">Cancel ripple</button>';
		}
		tmpHtml += '<button class="action" data-act="ripple-exit">Back to workspace</button>';
		tmpHtml += '</div>';

		tmpHtml += '<div class="ripple-timeline">';
		for (let i = 0; i < tmpSteps.length; i++)
		{
			tmpHtml += this._renderStep(tmpSteps[i], tmpPlan.Steps[i]);
		}
		tmpHtml += '</div>';
		tmpHtml += '</div>';

		return tmpHtml;
	}

	_renderStep(pState, pPlanStep)
	{
		let tmpStatusText = STATUS_LABEL[pState.Status] || pState.Status;

		let tmpHtml = '<div class="ripple-step ' + pState.Status + '" data-order="' + pState.Order + '">';
		tmpHtml += '  <div class="step-row">';
		tmpHtml += '    <span class="step-order">' + (pState.Order + 1) + '.</span>';
		tmpHtml += '    <span class="step-module">' + this._escape(pState.Module) + '</span>';
		tmpHtml += '    <span class="step-kind">' + this._escape(pPlanStep.Kind) + ' · ' + this._escape(pPlanStep.Group) + '</span>';
		tmpHtml += '    <span class="step-status">' + this._escape(tmpStatusText) + '</span>';
		tmpHtml += '  </div>';

		tmpHtml += '  <div class="step-actions">';
		for (let i = 0; i < pPlanStep.Actions.length; i++)
		{
			let tmpAction = pPlanStep.Actions[i];
			let tmpState  = pState.ActionStates[i] || 'pending';
			tmpHtml += '<span class="step-action ' + tmpState + '">' + this._escape(this._formatActionLabel(tmpAction)) + '</span>';
		}
		tmpHtml += '  </div>';

		if (pState.Status === 'paused' && pState.PauseReport)
		{
			let tmpReport = pState.PauseReport;
			tmpHtml += '  <div class="step-approve">';
			tmpHtml += '    <span class="hint">Publish confirmation required — '
				+ this._escape(tmpReport.Package) + ' v'
				+ this._escape(tmpReport.LocalVersion) + '</span>';
			if (tmpReport.OkToPublish)
			{
				tmpHtml += '    <button class="action success" data-act="ripple-approve" data-order="'
					+ pState.Order + '">Approve & publish</button>';
			}
			else
			{
				tmpHtml += '    <span style="color:var(--color-danger)">Pre-publish validation failed; ripple will halt.</span>';
			}
			tmpHtml += '  </div>';
		}

		let tmpAutoExpand = (pState.Status === 'running' || pState.Status === 'failed' || pState.ShowOutput);
		if ((pState.Output && pState.Output.length > 0) || pState.Status === 'running')
		{
			tmpHtml += '  <div class="step-output' + (tmpAutoExpand ? ' open' : '') + '">';
			tmpHtml += '    <button class="step-output-toggle" data-act="ripple-toggle-output" data-order="'
				+ pState.Order + '">'
				+ (tmpAutoExpand ? '[hide]' : '[show]') + ' output ('
				+ (pState.Output ? pState.Output.length : 0) + ' lines)'
				+ '</button>';
			tmpHtml += '    <pre class="step-output-body">' + this._renderStepOutputLines(pState) + '</pre>';
			tmpHtml += '  </div>';
		}

		tmpHtml += '</div>';
		return tmpHtml;
	}

	_formatActionLabel(pAction)
	{
		switch (pAction.Op)
		{
			case 'update-dep':
			{
				let tmpTarget = pAction.Range
					? pAction.Range
					: ((pAction.RangePrefix || '^') + 'latest');
				return 'update ' + pAction.Dep + ' (' + (pAction.OldRange || '?') + ' to ' + tmpTarget + ')';
			}
			case 'preflight-clean-tree': return 'preflight (clean tree)';
			case 'ncu-retold':           return 'ncu -u (retold)';
			case 'install':              return 'npm install';
			case 'test':                 return 'npm test';
			case 'commit':               return 'git commit (deps)';
			case 'bump':                 return 'bump ' + (pAction.Kind || 'patch');
			case 'bump-if-needed':       return 'bump if needed (' + (pAction.Kind || 'patch') + ')';
			case 'publish':              return 'npm publish';
			case 'commit-final':         return 'git commit (post-publish)';
			case 'push':                 return 'git push';
			default:                     return pAction.Op;
		}
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

module.exports = ManagerRippleView;
module.exports.default_configuration = _ViewConfiguration;
