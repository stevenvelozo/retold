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
		.step-failure {
			margin: 8px 10px 4px;
			border: 1px solid var(--color-danger);
			border-radius: 4px;
			background: rgba(248,81,73,0.08);
			padding: 8px 10px;
		}
		.step-failure-headline {
			display: flex; align-items: center; gap: 6px;
			color: var(--color-danger);
			font-weight: 600;
			margin-bottom: 4px;
		}
		.step-failure-headline .pict-icon { font-size: 14px; }
		.step-failure-headline code {
			background: rgba(248,81,73,0.18);
			padding: 1px 6px; border-radius: 3px;
			font-family: var(--font-mono);
			font-size: 12px;
		}
		.step-failure-message {
			color: var(--color-text);
			font-size: 12px;
			margin: 4px 0 6px;
			white-space: pre-wrap;
			word-break: break-word;
		}
		.step-failure-output {
			background: var(--color-bg);
			border: 1px solid var(--color-border);
			border-radius: 3px;
			padding: 4px 8px;
			max-height: 160px;
			overflow: auto;
			font-family: var(--font-mono);
			font-size: 11px;
			line-height: 1.5;
		}
		.step-failure-line { color: var(--color-danger); white-space: pre-wrap; }
		.step-failure-line.meta { color: var(--color-muted); font-style: italic; }
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

		.ripple-step.disabled            { opacity: 0.45; border-left-color: var(--color-muted); }
		.ripple-step.disabled .step-module { text-decoration: line-through; }
		.step-include { display: flex; align-items: center; gap: 6px; }
		.step-include label { display: flex; align-items: center; gap: 4px; cursor: pointer;
			color: var(--color-muted); font-size: 11px; font-family: var(--font-sans); }
		.step-include input[type="checkbox"] { width: auto; margin: 0; }
		.step-include .stop-after { background: none; border: 1px solid var(--color-border);
			border-radius: 3px; padding: 1px 6px; color: var(--color-muted);
			font-size: 10px; cursor: pointer; }
		.step-include .stop-after:hover { color: var(--color-accent); border-color: var(--color-accent); }

		.ripple-include-bar { display: flex; align-items: center; gap: 8px;
			color: var(--color-muted); font-size: 11px; margin: 6px 0; }
		.ripple-include-bar .count { color: var(--color-accent); font-weight: 600; }
		.ripple-include-bar .actions { display: flex; gap: 4px; margin-left: auto; }
		.ripple-include-bar button { font-size: 11px; padding: 2px 8px;
			background: rgba(47,129,247,0.12); color: var(--color-accent);
			border: 1px solid rgba(47,129,247,0.3); border-radius: 3px; cursor: pointer; }
		.ripple-include-bar button:hover { background: rgba(47,129,247,0.22); }
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
		{~TS:Manager-Ripple-RetryBtn-Template:Record.RetryBtnSlot~}
		{~TS:Manager-Ripple-CancelBtn-Template:Record.CancelBtnSlot~}
		<button class="action" onclick="_Pict.views['Manager-Ripple'].handleAction('ripple-exit')">Back to workspace</button>
	</div>
	{~TS:Manager-Ripple-IncludeBar-Template:Record.IncludeBarSlot~}
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
		{
			Hash: 'Manager-Ripple-RetryBtn-Template',
			Template: /*html*/`<button class="action primary" title="Resume execution at the failed action — earlier completed steps are skipped" onclick="_Pict.views['Manager-Ripple'].handleAction('ripple-retry')">Retry from failed step</button>`
		},
		{
			Hash: 'Manager-Ripple-IncludeBar-Template',
			Template: /*html*/`
<div class="ripple-include-bar">
	<span><span class="count">{~D:Record.IncludedCount~}</span> of {~D:Record.TotalCount~} steps included</span>
	<span class="actions">
		<button onclick="_Pict.views['Manager-Ripple'].handleAction('ripple-include-all')">include all</button>
		<button onclick="_Pict.views['Manager-Ripple'].handleAction('ripple-include-none')">clear all</button>
	</span>
</div>`
		},
		{
			Hash: 'Manager-Ripple-Step-IncludeToggle-Template',
			Template: /*html*/`
<div class="step-include">
	<label title="Uncheck to skip this step on Start">
		<input type="checkbox" {~D:Record.CheckedAttr~} onchange="_Pict.views['Manager-Ripple'].handleAction('ripple-toggle-include', {~D:Record.Order~})">
		<span>include</span>
	</label>
	<button type="button" class="stop-after" title="Include up to this step and exclude everything after" onclick="_Pict.views['Manager-Ripple'].handleAction('ripple-include-through', {~D:Record.Order~})">stop after</button>
</div>`
		},

		// ── One step row ──────────────────────────────────────────
		{
			Hash: 'Manager-Ripple-Step-Template',
			Template: /*html*/`
<div class="ripple-step {~D:Record.Status~} {~D:Record.DisabledClass~}" data-order="{~D:Record.Order~}">
	<div class="step-row">
		<span class="step-order">{~D:Record.OrderLabel~}.</span>
		<span class="step-module">{~D:Record.Module~}</span>
		<span class="step-kind">{~D:Record.KindLabel~}</span>
		<span class="step-status">{~D:Record.StatusLabel~}</span>
		{~TS:Manager-Ripple-Step-IncludeToggle-Template:Record.IncludeToggleSlot~}
	</div>
	<div class="step-actions">
		{~TS:Manager-Ripple-ActionChip-Template:Record.Actions~}
	</div>
	{~TS:Manager-Ripple-Approve-Template:Record.ApproveSlot~}
	{~TS:Manager-Ripple-Failure-Template:Record.FailureSlot~}
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
			Hash: 'Manager-Ripple-Failure-Template',
			Template: /*html*/`
<div class="step-failure">
	<div class="step-failure-headline">
		<span class="step-failure-icon">{~I:Error~}</span>
		<span class="step-failure-title">Failed at <code>{~D:Record.ActionLabel~}</code></span>
	</div>
	<div class="step-failure-message">{~D:Record.Message~}</div>
	<div class="step-failure-output">
		{~TS:Manager-Ripple-Failure-NoErrorLines-Template:Record.NoErrorLines~}
		{~TS:Manager-Ripple-Failure-Line-Template:Record.ErrorLines~}
	</div>
</div>`
		},
		{
			Hash: 'Manager-Ripple-Failure-Line-Template',
			Template: /*html*/`<div class="step-failure-line">{~D:Record.Text~}</div>`
		},
		{
			Hash: 'Manager-Ripple-Failure-NoErrorLines-Template',
			Template: /*html*/`<div class="step-failure-line meta">(no stderr captured — see the full output below for details)</div>`
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
						// User can uncheck steps before clicking Start to scope
						// the ripple — useful when they want to publish up to
						// a known point, test in place, then re-plan from a
						// clean state. Defaults to true; toggled in draft state
						// only and frozen once the run starts.
						Included: true,
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
			case 'ripple-start':            return this.startRipple();
			case 'ripple-retry':            return this.retryRipple();
			case 'ripple-cancel':           return this.cancelRipple();
			case 'ripple-exit':             return this.exitRipple();
			case 'ripple-approve':          return this.approveStep(parseInt(pOrder, 10));
			case 'ripple-toggle-output':    return this.toggleOutput(parseInt(pOrder, 10));
			case 'ripple-toggle-include':   return this.toggleStepInclusion(parseInt(pOrder, 10));
			case 'ripple-include-all':      return this.setAllStepsIncluded(true);
			case 'ripple-include-none':     return this.setAllStepsIncluded(false);
			case 'ripple-include-through':  return this.setIncludedThrough(parseInt(pOrder, 10));
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
			case 'ripple-resume':
				// Server is restarting from a failed step/action. Clear the
				// failure markers on the step being resumed; the upcoming
				// ripple-step-start and ripple-action-start frames will
				// repaint authoritative state.
				tmpRipple.Status = 'running';
				if (typeof pFrame.StartStep === 'number' && tmpRipple.Steps[pFrame.StartStep])
				{
					let tmpStep = tmpRipple.Steps[pFrame.StartStep];
					if (tmpStep.Status === 'failed') { tmpStep.Status = 'pending'; }
					let tmpResumeAction = (typeof pFrame.StartAction === 'number') ? pFrame.StartAction : 0;
					for (let i = tmpResumeAction; i < tmpStep.ActionStates.length; i++)
					{
						if (tmpStep.ActionStates[i] === 'failed') { tmpStep.ActionStates[i] = 'pending'; }
					}
				}
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
					let tmpFailedStep = tmpRipple.Steps[pFrame.StepOrder];
					tmpFailedStep.Status = 'failed';
					// Stash the error message + which action exploded so the step
					// row can surface a banner at the top, not just bury it in
					// the collapsed output panel.
					tmpFailedStep.Error = pFrame.Error || '';
					if (typeof pFrame.ActionIndex === 'number' && pFrame.ActionIndex >= 0)
					{
						tmpFailedStep.ActionStates[pFrame.ActionIndex] = 'failed';
						tmpFailedStep.FailedActionIndex = pFrame.ActionIndex;
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

	// Toggle a single step's Included flag (draft state only — the run is
	// committed once Start fires).
	toggleStepInclusion(pOrder)
	{
		let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
		if (!tmpRipple || tmpRipple.Status !== 'draft') { return; }
		let tmpStep = tmpRipple.Steps[pOrder];
		if (!tmpStep) { return; }
		tmpStep.Included = (tmpStep.Included === false);
		this._refresh();
	}

	// All / none convenience for the header.
	setAllStepsIncluded(pIncluded)
	{
		let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
		if (!tmpRipple || tmpRipple.Status !== 'draft') { return; }
		for (let i = 0; i < tmpRipple.Steps.length; i++)
		{
			tmpRipple.Steps[i].Included = !!pIncluded;
		}
		this._refresh();
	}

	// "Stop after this step" — include 0..pOrder, exclude everything after.
	// The per-step caret-style helper next to each row's checkbox.
	setIncludedThrough(pOrder)
	{
		let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
		if (!tmpRipple || tmpRipple.Status !== 'draft') { return; }
		for (let i = 0; i < tmpRipple.Steps.length; i++)
		{
			tmpRipple.Steps[i].Included = (i <= pOrder);
		}
		this._refresh();
	}

	startRipple()
	{
		let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
		if (!tmpRipple || tmpRipple.Status !== 'draft') { return; }

		// Drop any unchecked steps before running. Server's step/action
		// indexing is positional — to keep the executor's loops and the
		// WS frames (ripple-step-start / ripple-action-* / ripple-failed)
		// pointing at the right rows, re-index Order to a contiguous
		// 0..N-1 over the included steps.
		let tmpIncludedIdx = [];
		for (let i = 0; i < tmpRipple.Steps.length; i++)
		{
			if (tmpRipple.Steps[i].Included !== false) { tmpIncludedIdx.push(i); }
		}
		if (tmpIncludedIdx.length === 0)
		{
			this.pict.PictApplication.setStatus('No steps included — pick at least one before running.');
			return;
		}

		if (tmpIncludedIdx.length < tmpRipple.Plan.Steps.length)
		{
			let tmpFilteredSteps = tmpIncludedIdx.map((pIdx, pNewIdx) =>
				Object.assign({}, tmpRipple.Plan.Steps[pIdx], { Order: pNewIdx }));
			let tmpFilteredPlan = Object.assign({}, tmpRipple.Plan, { Steps: tmpFilteredSteps });

			// Replace both the AppData copy and the ActiveRipple's reference
			// so showFromRoute (which compares the two) doesn't decide to
			// re-enter from the unfiltered plan if the user navigates away
			// and back during the run.
			this.pict.AppData.Manager.RipplePlan = tmpFilteredPlan;
			tmpRipple.Plan = tmpFilteredPlan;
			tmpRipple.Steps = tmpFilteredSteps.map((pS) =>
				({
					Order: pS.Order,
					Module: pS.Module,
					Status: 'pending',
					Included: true,
					CurrentAction: -1,
					ActionStates: pS.Actions.map(() => 'pending'),
					ActionResults: [],
					PauseReport: null,
					Output: [],
					ShowOutput: false,
				}));
		}

		tmpRipple.Status = 'starting';
		this._refresh();

		this.pict.providers.ManagerAPI.runRipple(tmpRipple.Plan).then(
			(pBody) =>
			{
				tmpRipple.RippleId = pBody.RippleId;
				// The server kicks off the executor before sending its 202,
				// so WS frames (ripple-start, ripple-step-start, even
				// ripple-failed on a fast-failing first action like
				// preflight-clean-tree) routinely beat this HTTP response
				// back to the client. Only promote to 'running' if we're
				// still in the pre-frame 'starting' window; otherwise the
				// frames have already advanced state and we'd clobber a
				// terminal status ('failed'/'complete'/'cancelled').
				if (tmpRipple.Status === 'starting')
				{
					tmpRipple.Status = 'running';
				}
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

	// Resume a failed ripple. Optimistically clears the failed step/action
	// state so the UI shows "running" right away; the upcoming
	// ripple-resume + ripple-step-start frames will paint authoritative
	// state once they arrive. On API error, revert.
	retryRipple()
	{
		let tmpRipple = this.pict.AppData.Manager.ActiveRipple;
		if (!tmpRipple || !tmpRipple.RippleId) { return; }
		if (tmpRipple.Status !== 'failed') { return; }

		let tmpFailedIdx = tmpRipple.Steps.findIndex((pS) => pS.Status === 'failed');
		let tmpFailedActionStates = null;
		if (tmpFailedIdx >= 0)
		{
			let tmpStep = tmpRipple.Steps[tmpFailedIdx];
			tmpFailedActionStates = tmpStep.ActionStates.slice();
			tmpStep.Status = 'pending';
			for (let i = 0; i < tmpStep.ActionStates.length; i++)
			{
				if (tmpStep.ActionStates[i] === 'failed') { tmpStep.ActionStates[i] = 'pending'; }
			}
		}
		tmpRipple.Status = 'running';
		this._refresh();

		this.pict.providers.ManagerAPI.retryRipple(tmpRipple.RippleId).catch(
			(pError) =>
			{
				// Roll back optimistic state on failure.
				tmpRipple.Status = 'failed';
				if (tmpFailedIdx >= 0)
				{
					tmpRipple.Steps[tmpFailedIdx].Status = 'failed';
					if (tmpFailedActionStates)
					{
						tmpRipple.Steps[tmpFailedIdx].ActionStates = tmpFailedActionStates;
					}
				}
				this._refresh();
				this.pict.PictApplication.setStatus('Retry failed: ' + pError.message);
			});
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

		let tmpIsDraft       = (pRipple.Status === 'draft');
		let tmpStartBtnSlot  = tmpIsDraft ? [{}] : [];
		let tmpIncludedCount = 0;
		for (let i = 0; i < tmpSteps.length; i++)
		{
			if (tmpSteps[i].Included !== false) { tmpIncludedCount++; }
		}
		let tmpIncludeBarSlot = tmpIsDraft
			? [{ IncludedCount: tmpIncludedCount, TotalCount: tmpSteps.length }]
			: [];
		let tmpCancelBtnSlot = (pRipple.Status === 'running' || pRipple.Status === 'paused' || pRipple.Status === 'starting') ? [{}] : [];
		// Retry surfaces only when the ripple actually started on the
		// server (RippleId is assigned) and then halted. A start-error
		// before the server accepted the run leaves RippleId null — there's
		// no server-side ripple to resume, so re-clicking "Start" is the
		// right affordance there.
		let tmpRetryBtnSlot  = (pRipple.Status === 'failed' && pRipple.RippleId) ? [{}] : [];

		let tmpStepRecords = [];
		for (let i = 0; i < tmpSteps.length; i++)
		{
			tmpStepRecords.push(this._buildStepRecord(tmpSteps[i], tmpPlan.Steps[i], tmpIsDraft));
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
				RetryBtnSlot:     tmpRetryBtnSlot,
				CancelBtnSlot:    tmpCancelBtnSlot,
				IncludeBarSlot:   tmpIncludeBarSlot,

				Steps:            tmpStepRecords,
			}],
		};
	}

	_buildStepRecord(pState, pPlanStep, pIsDraft)
	{
		let tmpStatusText = STATUS_LABEL[pState.Status] || pState.Status;
		let tmpIsIncluded = (pState.Included !== false);
		let tmpIncludeToggleSlot = pIsDraft
			? [{
					Order:       pState.Order,
					CheckedAttr: tmpIsIncluded ? 'checked' : '',
				}]
			: [];
		let tmpDisabledClass = (pIsDraft && !tmpIsIncluded) ? 'disabled' : '';

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

		// Failure block — surfaces WHY a step failed at the top of the row so
		// the user doesn't have to expand the output panel and skim it to find
		// the actionable line.  Pulls the most recent stderr / error / exit
		// lines from the captured output, plus the JS-side Error string from
		// the ripple-failed frame (often just "exit 1", but sometimes a
		// meaningful message like "approve-pr: GitHub blocks self-approval").
		let tmpFailureSlot = [];
		if (pState.Status === 'failed')
		{
			let tmpFailedActionLabel = '(unknown action)';
			if (typeof pState.FailedActionIndex === 'number'
				&& pPlanStep.Actions
				&& pPlanStep.Actions[pState.FailedActionIndex])
			{
				tmpFailedActionLabel = this._formatActionLabel(pPlanStep.Actions[pState.FailedActionIndex]);
			}

			let tmpErrLines = [];
			let tmpAllLines = pState.Output || [];
			for (let i = 0; i < tmpAllLines.length; i++)
			{
				let tmpLine = tmpAllLines[i];
				if (!tmpLine) continue;
				if (tmpLine.Kind === 'stderr' || tmpLine.Kind === 'error')
				{
					tmpErrLines.push({ Text: tmpLine.Text });
				}
			}
			// Keep only the tail (the actionable bit is almost always at the end).
			if (tmpErrLines.length > 8) { tmpErrLines = tmpErrLines.slice(-8); }

			tmpFailureSlot.push({
				Order:        pState.Order,
				ActionLabel:  tmpFailedActionLabel,
				Message:      pState.Error || '(no error message reported)',
				ErrorLines:   tmpErrLines,
				NoErrorLines: tmpErrLines.length === 0 ? [{}] : []
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
			Order:              pState.Order,
			OrderLabel:         pState.Order + 1,
			Module:             pState.Module,
			KindLabel:          pPlanStep.Kind + ' · ' + pPlanStep.Group,
			Status:             pState.Status,
			StatusLabel:        tmpStatusText,
			DisabledClass:      tmpDisabledClass,
			IncludeToggleSlot:  tmpIncludeToggleSlot,
			Actions:            tmpActionRecords,
			ApproveSlot:        tmpApproveSlot,
			FailureSlot:        tmpFailureSlot,
			OutputSlot:         tmpOutputSlot,
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
			case 'merge-upstream':       return 'pull upstream into fork (merge)';
			case 'sync-upstream':        return 'sync from upstream (rebase + push)';
			default:                     return pAction.Op;
		}
	}
}

module.exports = ManagerRippleView;
module.exports.default_configuration = _ViewConfiguration;
