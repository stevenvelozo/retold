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
		// ── Empty state when no plan is pending ───────────────────
		{
			Hash: 'Manager-Ripple-Empty-Template',
			Template: /*html*/`
<div class="placeholder">
	<h2>Ripple planner</h2>
	<p>No active plan. Open a module and click <strong>Ripple</strong> to plan a cascade.</p>
</div>
`
		},

		// ── Top-level: dispatches to either the Empty or the
		//    populated planner template based on a single-element
		//    array slot in AppData. Same conditional pattern as the
		//    rest of the manager.
		{
			Hash: 'Manager-Ripple-Content-Template',
			Template: /*html*/`{~TS:Manager-Ripple-Empty-Template:Record.EmptySlot~}{~TS:Manager-Ripple-Plan-Template:Record.PlanSlot~}`
		},

		// ── Plan view with header + control row + timeline ────────
		{
			Hash: 'Manager-Ripple-Plan-Template',
			Template: /*html*/`
<div class="ripple-plan">
	<div class="ripple-header">
		<span class="title">Ripple: {~TS:Manager-Ripple-RootSingle-Template:Record.RootSingleSlot~}{~TS:Manager-Ripple-RootMulti-Template:Record.RootMultiSlot~}</span>
		<span class="meta">{~D:Record.StepCount~} steps · producer {~D:Record.ProducerBumpKind~} / consumer {~D:Record.ConsumerBumpKind~} bump</span>
	</div>
	<div class="action-row" style="margin-bottom:12px">
		{~TS:Manager-Ripple-StartBtn-Template:Record.StartBtnSlot~}
		{~TS:Manager-Ripple-CancelBtn-Template:Record.CancelBtnSlot~}
		<button class="action" onclick="_Pict.views['Manager-Ripple'].handleAction('ripple-exit')">Back to workspace</button>
	</div>
	<div class="ripple-timeline">
		{~TS:Manager-Ripple-Step-Template:Record.Steps~}
	</div>
</div>
`
		},
		{
			Hash: 'Manager-Ripple-RootSingle-Template',
			Template: /*html*/`<span class="target">{~D:Record.Name~}</span>`
		},
		{
			Hash: 'Manager-Ripple-RootMulti-Template',
			Template: /*html*/`<span class="target" title="{~D:Record.AllTitle~}">{~D:Record.Count~} producers: {~D:Record.Shown~}{~D:Record.ExtraSuffix~}</span>`
		},
		{
			Hash: 'Manager-Ripple-StartBtn-Template',
			Template: /*html*/`<button class="action primary" onclick="_Pict.views['Manager-Ripple'].handleAction('ripple-start')">Start ripple</button>`
		},
		{
			Hash: 'Manager-Ripple-CancelBtn-Template',
			Template: /*html*/`<button class="action danger" onclick="_Pict.views['Manager-Ripple'].handleAction('ripple-cancel')">Cancel ripple</button>`
		},

		// ── One step row ──────────────────────────────────────────
		{
			Hash: 'Manager-Ripple-Step-Template',
			Template: /*html*/`
<div class="ripple-step {~D:Record.Status~}" data-order="{~D:Record.Order~}">
	<div class="step-row">
		<span class="step-order">{~D:Record.OrderLabel~}.</span>
		<span class="step-module">{~D:Record.Module~}</span>
		<span class="step-kind">{~D:Record.KindLabel~}</span>
		<span class="step-status">{~D:Record.StatusLabel~}</span>
	</div>
	<div class="step-actions">
		{~TS:Manager-Ripple-ActionChip-Template:Record.Actions~}
	</div>
	{~TS:Manager-Ripple-Approve-Template:Record.ApproveSlot~}
	{~TS:Manager-Ripple-Output-Template:Record.OutputSlot~}
</div>
`
		},
		{
			Hash: 'Manager-Ripple-ActionChip-Template',
			Template: /*html*/`<span class="step-action {~D:Record.State~}">{~D:Record.Label~}</span>`
		},
		{
			Hash: 'Manager-Ripple-Approve-Template',
			Template: /*html*/`
<div class="step-approve">
	<span class="hint">Publish confirmation required — {~D:Record.Package~} v{~D:Record.LocalVersion~}</span>
	{~TS:Manager-Ripple-Approve-Btn-Template:Record.BtnSlot~}
	{~TS:Manager-Ripple-Approve-Block-Template:Record.BlockSlot~}
</div>
`
		},
		{
			Hash: 'Manager-Ripple-Approve-Btn-Template',
			Template: /*html*/`<button class="action success" onclick="_Pict.views['Manager-Ripple'].handleAction('ripple-approve', {~D:Record.Order~})">Approve &amp; publish</button>`
		},
		{
			Hash: 'Manager-Ripple-Approve-Block-Template',
			Template: /*html*/`<span style="color:var(--color-danger)">Pre-publish validation failed; ripple will halt.</span>`
		},
		{
			Hash: 'Manager-Ripple-Output-Template',
			Template: /*html*/`
<div class="step-output {~D:Record.OpenClass~}">
	<button class="step-output-toggle" onclick="_Pict.views['Manager-Ripple'].handleAction('ripple-toggle-output', {~D:Record.Order~})">{~D:Record.ToggleLabel~} output ({~D:Record.LineCount~} lines)</button>
	<pre class="step-output-body">{~TS:Manager-Ripple-Output-Empty-Template:Record.EmptySlot~}{~TS:Manager-Ripple-Output-Line-Template:Record.Lines~}</pre>
</div>
`
		},
		{
			Hash: 'Manager-Ripple-Output-Empty-Template',
			Template: /*html*/`<span class="line meta">(no output yet)</span>`
		},
		{
			Hash: 'Manager-Ripple-Output-Line-Template',
			Template: /*html*/`<span class="line {~D:Record.Class~}">{~D:Record.Text~}</span>
`
		},
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
			this._writeRecord(this._buildEmptyRecord());
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
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// Public — invoked from inline onclick handlers in the timeline.
	handleAction(pAct, pOrder)
	{
		switch (pAct)
		{
			case 'ripple-start':         return this.startRipple();
			case 'ripple-cancel':        return this.cancelRipple();
			case 'ripple-exit':          return this.exitRipple();
			case 'ripple-approve':       return this.approveStep(parseInt(pOrder, 10));
			case 'ripple-toggle-output': return this.toggleOutput(parseInt(pOrder, 10));
		}
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
					this._refresh();
					return;
				case 'progress':
					if (pFrame.Message)
					{
						this._appendStepOutput(tmpIdx, 'meta', '... ' + pFrame.Message);
						this._refresh();
					}
					return;
				case 'complete':
					this._appendStepOutput(tmpIdx,
						pFrame.ExitCode === 0 ? 'success' : 'error',
						pFrame.ExitCode === 0
							? ('done' + (pFrame.Duration ? ' ' + pFrame.Duration : ''))
							: ('exit ' + pFrame.ExitCode + (pFrame.Duration ? ' (' + pFrame.Duration + ')' : '')));
					this._refresh();
					return;
				case 'error':
					this._appendStepOutput(tmpIdx, 'error', 'error: ' + (pFrame.Error || 'unknown'));
					this._refresh();
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
	//  Rendering — pure data shaping. The templates above own all
	//  the markup; this method just produces the records they iterate.
	// ─────────────────────────────────────────────

	_refresh()
	{
		let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
		if (!tmpRipple)
		{
			this._writeRecord(this._buildEmptyRecord());
			this.render();
			return;
		}
		this._writeRecord(this._buildPlanRecord(tmpRipple));
		this.render();
	}

	_buildEmptyRecord()
	{
		return { EmptySlot: [{}], PlanSlot: [] };
	}

	_buildPlanRecord(pRipple)
	{
		let tmpPlan  = pRipple.Plan;
		let tmpSteps = pRipple.Steps;

		// Multi-root header: list every selected producer (truncate to 3 +
		// overflow count, full list available on hover via title attr).
		let tmpRoots = (Array.isArray(tmpPlan.Roots) && tmpPlan.Roots.length > 0)
			? tmpPlan.Roots
			: [tmpPlan.Root];
		let tmpRootSingleSlot = [];
		let tmpRootMultiSlot  = [];
		if (tmpRoots.length === 1)
		{
			tmpRootSingleSlot.push({ Name: tmpRoots[0] });
		}
		else
		{
			let tmpShown = tmpRoots.slice(0, 3).join(', ');
			let tmpExtraSuffix = (tmpRoots.length > 3) ? (' +' + (tmpRoots.length - 3) + ' more') : '';
			tmpRootMultiSlot.push({
				Count:        tmpRoots.length,
				Shown:        tmpShown,
				ExtraSuffix:  tmpExtraSuffix,
				AllTitle:     tmpRoots.join(', '),
			});
		}

		let tmpStartBtnSlot  = (pRipple.Status === 'draft') ? [{}] : [];
		let tmpCancelBtnSlot = (pRipple.Status === 'running' || pRipple.Status === 'paused' || pRipple.Status === 'starting') ? [{}] : [];

		let tmpStepRecords = [];
		for (let i = 0; i < tmpSteps.length; i++)
		{
			tmpStepRecords.push(this._buildStepRecord(tmpSteps[i], tmpPlan.Steps[i]));
		}

		return {
			EmptySlot:        [],
			PlanSlot:
			[{
				StepCount:        tmpSteps.length,
				ProducerBumpKind: tmpPlan.Options.ProducerBumpKind || 'patch',
				ConsumerBumpKind: tmpPlan.Options.ConsumerBumpKind || 'patch',

				RootSingleSlot:   tmpRootSingleSlot,
				RootMultiSlot:    tmpRootMultiSlot,

				StartBtnSlot:     tmpStartBtnSlot,
				CancelBtnSlot:    tmpCancelBtnSlot,

				Steps:            tmpStepRecords,
			}],
		};
	}

	_buildStepRecord(pState, pPlanStep)
	{
		let tmpStatusText = STATUS_LABEL[pState.Status] || pState.Status;

		// Action chips inside this step.
		let tmpActionRecords = [];
		for (let i = 0; i < pPlanStep.Actions.length; i++)
		{
			tmpActionRecords.push({
				State: pState.ActionStates[i] || 'pending',
				Label: this._formatActionLabel(pPlanStep.Actions[i]),
			});
		}

		// Approve block (paused + report present).
		let tmpApproveSlot = [];
		if (pState.Status === 'paused' && pState.PauseReport)
		{
			let tmpReport = pState.PauseReport;
			tmpApproveSlot.push({
				Package:      tmpReport.Package,
				LocalVersion: tmpReport.LocalVersion,
				Order:        pState.Order,
				BtnSlot:      tmpReport.OkToPublish ? [{ Order: pState.Order }] : [],
				BlockSlot:    tmpReport.OkToPublish ? [] : [{}],
			});
		}

		// Output block (when there's anything to show or the step is currently running).
		let tmpOutputSlot = [];
		if ((pState.Output && pState.Output.length > 0) || pState.Status === 'running')
		{
			let tmpAutoExpand = (pState.Status === 'running' || pState.Status === 'failed' || pState.ShowOutput);
			let tmpLines      = pState.Output || [];

			let tmpLineRecords = [];
			for (let i = 0; i < tmpLines.length; i++)
			{
				let tmpLine = tmpLines[i];
				let tmpCls = '';
				if (tmpLine.Kind === 'stderr') { tmpCls = 'stderr'; }
				else if (tmpLine.Kind === 'meta' || tmpLine.Kind === 'action') { tmpCls = 'meta'; }
				else if (tmpLine.Kind === 'success') { tmpCls = 'success'; }
				else if (tmpLine.Kind === 'error')   { tmpCls = 'error'; }
				tmpLineRecords.push({ Class: tmpCls, Text: tmpLine.Text });
			}

			tmpOutputSlot.push({
				Order:        pState.Order,
				OpenClass:    tmpAutoExpand ? 'open' : '',
				ToggleLabel:  tmpAutoExpand ? '[hide]' : '[show]',
				LineCount:    tmpLines.length,
				EmptySlot:    tmpLines.length === 0 ? [{}] : [],
				Lines:        tmpLineRecords,
			});
		}

		return {
			Order:        pState.Order,
			OrderLabel:   pState.Order + 1,
			Module:       pState.Module,
			KindLabel:    pPlanStep.Kind + ' · ' + pPlanStep.Group,
			Status:       pState.Status,
			StatusLabel:  tmpStatusText,
			Actions:      tmpActionRecords,
			ApproveSlot:  tmpApproveSlot,
			OutputSlot:   tmpOutputSlot,
		};
	}

	_writeRecord(pRecord)
	{
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.Ripple = pRecord;
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
}

module.exports = ManagerRippleView;
module.exports.default_configuration = _ViewConfiguration;
