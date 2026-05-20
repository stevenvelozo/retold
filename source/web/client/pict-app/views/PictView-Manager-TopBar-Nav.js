/**
 * Manager-TopBar-Nav — retold-manager's primary action buttons + health
 * badge, designed to drop into the Theme-TopBar nav slot.
 *
 * Renders into `#Theme-TopBar-Nav` (the destination Theme-TopBar
 * exposes for host-supplied nav content). Theme-TopBar handles the
 * brand mark, the user-area widgets, and the theme button — this view
 * owns only retold-manager's app-specific navigation.
 *
 * Mounted automatically by Theme-TopBar via `NavView: 'Manager-TopBar-Nav'`
 * in the Theme-Section provider's ViewOptions.
 */

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-TopBar-Nav',

	DefaultRenderable:            'Manager-TopBar-Nav-Content',
	DefaultDestinationAddress:    '#Theme-TopBar-Nav',
	DefaultTemplateRecordAddress: 'AppData.Manager',

	AutoRender: false,

	CSS: /*css*/`
.rm-topbar-nav
{
	display: flex;
	align-items: center;
	gap: 8px;
}
.rm-topbar-nav-divider
{
	width: 1px;
	background: var(--theme-color-border-default, #d0d4d8);
	margin: 0 4px;
	align-self: stretch;
}
.rm-docserve-chip
{
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 2px 4px 2px 10px;
	border-radius: 12px;
	background: var(--theme-color-status-success-tint, rgba(40, 160, 80, 0.12));
	color: var(--theme-color-status-success, #1e7a3a);
	border: 1px solid var(--theme-color-status-success, #1e7a3a);
	font-size: 0.78em;
	line-height: 1.2;
	cursor: pointer;
	user-select: none;
	transition: background-color 0.1s, border-color 0.1s;
}
.rm-docserve-chip:hover
{
	background: var(--theme-color-status-success, #1e7a3a);
	color: var(--theme-color-background-panel, #ffffff);
}
.rm-docserve-chip-dot
{
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--theme-color-status-success, #1e7a3a);
	box-shadow: 0 0 0 2px rgba(40, 160, 80, 0.18);
	animation: rm-docserve-chip-pulse 1.6s infinite;
}
.rm-docserve-chip:hover .rm-docserve-chip-dot
{
	background: var(--theme-color-background-panel, #ffffff);
	box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}
@keyframes rm-docserve-chip-pulse
{
	0%, 100% { opacity: 1.0; }
	50%      { opacity: 0.45; }
}
.rm-docserve-chip-label
{
	white-space: nowrap;
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.rm-docserve-chip-stop
{
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	margin-left: 2px;
	padding: 0;
	background: transparent;
	color: inherit;
	border: none;
	border-radius: 50%;
	cursor: pointer;
	font-size: 1.1em;
	line-height: 1;
}
.rm-docserve-chip-stop:hover
{
	background: rgba(255, 255, 255, 0.25);
}
/* Content-editor chip — same anatomy as docserve, recoloured so the
   two running supervisors are visually distinguishable at a glance. */
.rm-content-editor-chip
{
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 2px 4px 2px 10px;
	border-radius: 12px;
	background: var(--theme-color-status-info-tint, rgba(40, 100, 180, 0.12));
	color: var(--theme-color-status-info, #1d6fbf);
	border: 1px solid var(--theme-color-status-info, #1d6fbf);
	font-size: 0.78em;
	line-height: 1.2;
	cursor: pointer;
	user-select: none;
	transition: background-color 0.1s, border-color 0.1s;
}
.rm-content-editor-chip:hover
{
	background: var(--theme-color-status-info, #1d6fbf);
	color: var(--theme-color-background-panel, #ffffff);
}
.rm-content-editor-chip-dot
{
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--theme-color-status-info, #1d6fbf);
	box-shadow: 0 0 0 2px rgba(40, 100, 180, 0.18);
	animation: rm-docserve-chip-pulse 1.6s infinite;
}
.rm-content-editor-chip:hover .rm-content-editor-chip-dot
{
	background: var(--theme-color-background-panel, #ffffff);
	box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}
.rm-content-editor-chip-label
{
	white-space: nowrap;
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.rm-content-editor-chip-stop
{
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	margin-left: 2px;
	padding: 0;
	background: transparent;
	color: inherit;
	border: none;
	border-radius: 50%;
	cursor: pointer;
	font-size: 1.1em;
	line-height: 1;
}
.rm-content-editor-chip-stop:hover
{
	background: rgba(255, 255, 255, 0.25);
}
/* Active-module pill — to the left of the green-dot health badge.
   Always shown when a module is selected; clicking returns to the
   module workspace.  Stays put until a different module is opened. */
.rm-active-module
{
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 10px;
	border-radius: 12px;
	background: var(--theme-color-background-tertiary, rgba(255, 255, 255, 0.06));
	color: var(--theme-color-text-primary, #ffffff);
	border: 1px solid var(--theme-color-border-default, rgba(255, 255, 255, 0.18));
	font-size: 0.78em;
	line-height: 1.2;
	text-decoration: none;
	cursor: pointer;
	user-select: none;
	transition: background-color 0.1s, border-color 0.1s;
}
.rm-active-module:hover
{
	background: var(--theme-color-background-secondary, rgba(255, 255, 255, 0.1));
	border-color: var(--brand-color-primary-mode, var(--theme-color-status-info, #1d6fbf));
	color: var(--brand-color-primary-mode, var(--theme-color-status-info, #1d6fbf));
}
.rm-active-module-label
{
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	white-space: nowrap;
}
/* Examples chip — third sibling.  Distinct purple/violet tint so it
   reads instantly different from docserve (green) and content-editor
   (blue). */
.rm-examples-chip
{
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 2px 4px 2px 10px;
	border-radius: 12px;
	background: var(--theme-color-status-purple-tint, rgba(140, 90, 200, 0.12));
	color: var(--theme-color-status-purple, #7a4dbf);
	border: 1px solid var(--theme-color-status-purple, #7a4dbf);
	font-size: 0.78em;
	line-height: 1.2;
	cursor: pointer;
	user-select: none;
	transition: background-color 0.1s, border-color 0.1s;
}
.rm-examples-chip:hover
{
	background: var(--theme-color-status-purple, #7a4dbf);
	color: var(--theme-color-background-panel, #ffffff);
}
.rm-examples-chip-dot
{
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--theme-color-status-purple, #7a4dbf);
	box-shadow: 0 0 0 2px rgba(140, 90, 200, 0.18);
	animation: rm-docserve-chip-pulse 1.6s infinite;
}
/* While npm install + the example build are running, the dot pulses
   amber so the user knows it's not "running" yet (clicking the chip
   would 404 until the port opens). */
.rm-examples-chip.is-building .rm-examples-chip-dot,
.rm-examples-chip.is-installing .rm-examples-chip-dot
{
	background: var(--theme-color-status-warning, #c98316);
	box-shadow: 0 0 0 2px rgba(201, 131, 22, 0.22);
}
.rm-examples-chip:hover .rm-examples-chip-dot
{
	background: var(--theme-color-background-panel, #ffffff);
	box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}
.rm-examples-chip-label
{
	white-space: nowrap;
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.rm-examples-chip-stop
{
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	margin-left: 2px;
	padding: 0;
	background: transparent;
	color: inherit;
	border: none;
	border-radius: 50%;
	cursor: pointer;
	font-size: 1.1em;
	line-height: 1;
}
.rm-examples-chip-stop:hover
{
	background: rgba(255, 255, 255, 0.25);
}`,
	CSSPriority: 500,

	Templates:
	[
		{
			Hash: 'Manager-TopBar-Nav-Template',
			// aria-current="{~D:Record.IsXxx~}" is computed in onBeforeRender —
			// renders as aria-current="page" on the button matching the
			// active /Ops/:script route, empty (the attribute is still
			// present but has no value, so the [aria-current="page"] CSS
			// selector in Theme-TopBar matches only the active one).
			Template: /*html*/`
<div class="rm-topbar-nav">
	{~TS:Manager-TopBar-Nav-ActiveModule-Template:Record.ActiveModuleSlot~}
	<span class="badge {~D:Record.Health.state~}" title="server health">{~D:Record.Health.text~}</span>
	{~TS:Manager-TopBar-Nav-DocserveChip-Template:Record.DocServeSlot~}
	{~TS:Manager-TopBar-Nav-ContentEditorChip-Template:Record.ContentEditorSlot~}
	{~TS:Manager-TopBar-Nav-ExamplesChip-Template:Record.ExamplesSlot~}
	<span class="rm-topbar-nav-divider"></span>
	<button class="action primary" title="Run modules/Status.sh across every module"
		aria-current="{~D:Record.IsStatus~}"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/status')">Status</button>
	<button class="action primary" title="Run modules/Update.sh across every module"
		aria-current="{~D:Record.IsUpdate~}"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/update')">Update</button>
	<button class="action primary" title="Run modules/Checkout.sh across every module"
		aria-current="{~D:Record.IsCheckout~}"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/checkout')">Checkout</button>
	<button class="action primary" title="Run modules/Install.sh — npm install in every cloned module so each one is runnable on its own"
		aria-current="{~D:Record.IsInstall~}"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/install')">Install</button>
		<button class="action action-more rm-cache-more" aria-label="npm cache utilities"
			title="npm cache utilities"
			onclick="_Pict.views['Manager-TopBar-Nav']._openCacheMenu(this); event.stopPropagation();">{~I:ChevronDown~}</button>
	<button class="action primary" title="Plan a ripple publish (no starting module required — pick producers in the planner)"
		onclick="{~P~}.views['Manager-Modal-RipplePlan'].open(null)">Ripple</button>
</div>
`
		},
		{
			Hash: 'Manager-TopBar-Nav-ActiveModule-Template',
			Template: /*html*/`<a class="rm-active-module" href="#/Module/{~D:Record.NameUrlEncoded~}" title="Active module: {~D:Record.Name~} — click to return to the module workspace"><span class="rm-active-module-label">{~D:Record.Name~}</span></a>`
		},
		{
			Hash: 'Manager-TopBar-Nav-DocserveChip-Template',
			Template: /*html*/`<span class="rm-docserve-chip" title="Local docuserve running for {~D:Record.ModuleName~} on port {~D:Record.Port~}. Click to reopen the docs in a new tab." onclick="{~P~}.views['Manager-TopBar-Nav']._openDocserveURL()"><span class="rm-docserve-chip-dot"></span><span class="rm-docserve-chip-label">docs: {~D:Record.ModuleName~}</span><button class="rm-docserve-chip-stop" title="Stop local docuserve" aria-label="Stop local docuserve" onclick="event.stopPropagation(); {~P~}.views['Manager-TopBar-Nav']._stopDocserve();">×</button></span>`
		},
		{
			Hash: 'Manager-TopBar-Nav-ContentEditorChip-Template',
			Template: /*html*/`<span class="rm-content-editor-chip" title="Content editor running for {~D:Record.ModuleName~} on port {~D:Record.Port~}. Click to reopen the editor in a new tab." onclick="{~P~}.views['Manager-TopBar-Nav']._openContentEditorURL()"><span class="rm-content-editor-chip-dot"></span><span class="rm-content-editor-chip-label">edit: {~D:Record.ModuleName~}</span><button class="rm-content-editor-chip-stop" title="Stop content editor" aria-label="Stop content editor" onclick="event.stopPropagation(); {~P~}.views['Manager-TopBar-Nav']._stopContentEditor();">×</button></span>`
		},
		{
			Hash: 'Manager-TopBar-Nav-ExamplesChip-Template',
			// While Phase is 'installing' / 'building', the chip click is
			// guarded — _openExamplesURL only opens if Phase is 'running'.
			Template: /*html*/`<span class="rm-examples-chip is-{~D:Record.Phase~}" title="Examples for {~D:Record.ModuleName~} on port {~D:Record.Port~} — {~D:Record.PhaseLabel~}. Click to open in a new tab." onclick="{~P~}.views['Manager-TopBar-Nav']._openExamplesURL()"><span class="rm-examples-chip-dot"></span><span class="rm-examples-chip-label">examples: {~D:Record.ModuleName~}{~D:Record.PhaseSuffix~}</span><button class="rm-examples-chip-stop" title="Stop examples server" aria-label="Stop examples server" onclick="event.stopPropagation(); {~P~}.views['Manager-TopBar-Nav']._stopExamples();">×</button></span>`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-TopBar-Nav-Content',
			TemplateHash:       'Manager-TopBar-Nav-Template',
			DestinationAddress: '#Theme-TopBar-Nav',
			RenderMethod:       'replace'
		}
	]
};

class ManagerTopBarNavView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onBeforeRender()
	{
		// Per-button active flags. AppData.Manager.OpsScript is set by
		// the router when the user navigates to /Ops/:script. We surface
		// matching strings on the data so the template can plant a
		// "page" string into aria-current on exactly the matching button
		// (empty string elsewhere — the [aria-current="page"] CSS
		// selector in Theme-TopBar matches only "page", not the empty
		// value, so non-active buttons stay un-styled).
		//
		// IMPORTANT: Pict resolves the template Record from
		// DefaultTemplateRecordAddress (AppData.Manager here) BEFORE
		// onBeforeRender runs, so the return value is IGNORED. The
		// only way to surface freshly-computed fields to the template
		// is to mutate the addressed AppData slot directly.
		let tmpManager = this.pict.AppData.Manager || {};
		let tmpScript = tmpManager.OpsScript || '';
		tmpManager.IsStatus   = (tmpScript === 'status')   ? 'page' : '';
		tmpManager.IsUpdate   = (tmpScript === 'update')   ? 'page' : '';
		tmpManager.IsCheckout = (tmpScript === 'checkout') ? 'page' : '';
		tmpManager.IsInstall  = (tmpScript === 'install')  ? 'page' : '';
		// Active-module pill — shown whenever a module is selected.
		// Sticks across navigations to /Ops/* routes; clicking it
		// returns to the module workspace.
		let tmpSelected = tmpManager.SelectedModule || null;
		tmpManager.ActiveModuleSlot = tmpSelected
			? [{ Name: tmpSelected, NameUrlEncoded: encodeURIComponent(tmpSelected) }]
			: [];

		// Docserve chip — single-element-array trick.  When a local
		// docuserve is running, render one chip; otherwise render none.
		let tmpDocServe = tmpManager.DocServe || {};
		tmpManager.DocServeSlot = tmpDocServe.Running ? [tmpDocServe] : [];
		// Content-editor chip — same pattern, distinct slot.
		let tmpContentEditor = tmpManager.ContentEditor || {};
		tmpManager.ContentEditorSlot = tmpContentEditor.Running ? [tmpContentEditor] : [];
		// Examples chip — running through Phase 'installing' →
		// 'building' → 'running'.  PhaseLabel / PhaseSuffix go into
		// the chip text so the user can see "installing..." or
		// "building..." while the long startup proceeds.
		let tmpExamples = tmpManager.Examples || {};
		if (tmpExamples.Running)
		{
			let tmpPhase = tmpExamples.Phase || 'running';
			let tmpPhaseLabel = (tmpPhase === 'installing') ? 'installing dependencies'
				: (tmpPhase === 'building') ? 'building'
				: (tmpPhase === 'running')  ? 'serving'
				: tmpPhase;
			let tmpPhaseSuffix = (tmpPhase === 'running' || tmpPhase === 'idle') ? '' : ' (' + tmpPhase + '…)';
			tmpManager.ExamplesSlot = [ Object.assign({}, tmpExamples,
				{
					Phase:        tmpPhase,
					PhaseLabel:   tmpPhaseLabel,
					PhaseSuffix:  tmpPhaseSuffix
				}) ];
		}
		else
		{
			tmpManager.ExamplesSlot = [];
		}
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	_openDocserveURL()
	{
		let tmpURL = this.pict.AppData.Manager && this.pict.AppData.Manager.DocServe
			? this.pict.AppData.Manager.DocServe.URL : null;
		if (tmpURL && typeof window !== 'undefined')
		{
			window.open(tmpURL, '_blank', 'noopener');
		}
	}

	_stopDocserve()
	{
		let tmpApi = this.pict.providers.ManagerAPI;
		this.pict.PictApplication.setStatus('Stopping local docuserve...');
		return tmpApi.docserveStop().then((pState) =>
		{
			this.pict.AppData.Manager.DocServe = pState || {
				Running: false, ModuleName: null, ModulePath: null,
				Port: 43210, URL: null, Pid: null, StartedAt: null
			};
			this.render();
			this.pict.PictApplication.setStatus('docuserve stopped.');
		}, (pError) =>
		{
			this.pict.PictApplication.setStatus('Failed to stop docuserve: ' + (pError && pError.message ? pError.message : pError));
		});
	}

	_openContentEditorURL()
	{
		let tmpURL = this.pict.AppData.Manager && this.pict.AppData.Manager.ContentEditor
			? this.pict.AppData.Manager.ContentEditor.URL : null;
		if (tmpURL && typeof window !== 'undefined')
		{
			window.open(tmpURL, '_blank', 'noopener');
		}
	}

	_stopContentEditor()
	{
		let tmpApi = this.pict.providers.ManagerAPI;
		this.pict.PictApplication.setStatus('Stopping content editor...');
		return tmpApi.contentEditorStop().then((pState) =>
		{
			this.pict.AppData.Manager.ContentEditor = pState || {
				Running: false, ModuleName: null, ModulePath: null, ContentPath: null,
				Port: 43211, URL: null, Pid: null, StartedAt: null
			};
			this.render();
			this.pict.PictApplication.setStatus('content editor stopped.');
		}, (pError) =>
		{
			this.pict.PictApplication.setStatus('Failed to stop content editor: ' + (pError && pError.message ? pError.message : pError));
		});
	}

	_openExamplesURL()
	{
		let tmpEx = this.pict.AppData.Manager && this.pict.AppData.Manager.Examples;
		if (!tmpEx) { return; }
		// Don't open until the server is actually serving — clicking
		// during install/build would hit a 404.  Surface a status hint
		// instead so the user understands the chip click is intentional
		// but currently a no-op.
		if (tmpEx.Phase && tmpEx.Phase !== 'running')
		{
			this.pict.PictApplication.setStatus('Examples still ' + tmpEx.Phase + '… give it a moment.');
			return;
		}
		if (tmpEx.URL && typeof window !== 'undefined')
		{
			window.open(tmpEx.URL, '_blank', 'noopener');
		}
	}

	_stopExamples()
	{
		let tmpApi = this.pict.providers.ManagerAPI;
		this.pict.PictApplication.setStatus('Stopping examples server...');
		return tmpApi.examplesStop().then((pState) =>
		{
			this.pict.AppData.Manager.Examples = pState || {
				Running: false, Phase: 'idle', ModuleName: null, ModulePath: null,
				ExamplesPath: null, Port: 43212, URL: null, Pid: null, StartedAt: null, LastError: null
			};
			this.render();
			this.pict.PictApplication.setStatus('examples stopped.');
		}, (pError) =>
		{
			this.pict.PictApplication.setStatus('Failed to stop examples: ' + (pError && pError.message ? pError.message : pError));
		});
	}

	// ─────────────────────────────────────────────
	//  npm cache utilities (anchor-positioned dropdown between Checkout / Ripple)
	//
	//  The local npm cache gets corrupted often during heavy publish work
	//  ("ripple a bunch of packages all morning" territory). These two
	//  ops are global (`npm cache clean --force` / `npm cache verify`),
	//  not per-module, but they stream through the same operations
	//  pipeline as every other action so the LogBar's Actions tab
	//  surfaces the run identically.
	// ─────────────────────────────────────────────

	_openCacheMenu(pAnchor)
	{
		let tmpModal = this.pict.views['Pict-Section-Modal'];
		if (!tmpModal || typeof tmpModal.dropdown !== 'function') { return; }
		tmpModal.dropdown(pAnchor,
			{
				align: 'right',
				className: 'rm-cache-menu',
				items:
				[
					{
						Hash:  'clean',
						Label: 'force clean npm cache',
						Title: 'Runs `npm cache clean --force` — wipes the local cache. Use when publishes are returning stale tarballs or integrity errors.'
					},
					{
						Hash:  'verify',
						Label: 'npm cache verify',
						Title: 'Runs `npm cache verify` — checks the local cache integrity and reports any orphaned/garbage entries.'
					}
				]
			}).then((pChoice) =>
			{
				if (!pChoice || !pChoice.Hash) { return; }
				this._runCacheOp(pChoice.Hash);
			});
	}

	_runCacheOp(pAction)
	{
		let tmpLabel = (pAction === 'clean')
			? 'npm cache clean --force'
			: 'npm cache verify';

		// Stamp the active op so the WS provider routes its frames into
		// AppData.Manager.ActiveOperation + pushes an Actions-tab history
		// entry. Scope 'all' / ModuleName null — this is a global utility,
		// not tied to any single module.
		this.pict.AppData.Manager.ActiveOperation =
			{
				OperationId: null,
				CommandTag:  null,
				Lines:       [],
				HeaderState: 'running',
				HeaderText:  tmpLabel,
				Scope:       'all',
				ModuleName:  null,
			};

		// Pop the LogBar so the user can watch the stream — same as
		// every other action button funnels through.
		let tmpLayout = this.pict.views['Manager-Layout'];
		if (tmpLayout && typeof tmpLayout.popLogPanel === 'function')
		{
			tmpLayout.popLogPanel();
		}

		this.pict.PictApplication.setStatus('Running ' + tmpLabel + '...');
		this.pict.providers.ManagerAPI.runNpmCacheOperation(pAction).then(
			(pResp) => { this.pict.PictApplication.setStatus('Started ' + tmpLabel + ' (' + pResp.OperationId + ')'); },
			(pError) => { this.pict.PictApplication.setStatus(tmpLabel + ' failed to start: ' + (pError && pError.message ? pError.message : pError)); });
	}
}

module.exports = ManagerTopBarNavView;
module.exports.default_configuration = _ViewConfiguration;
