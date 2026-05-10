/**
 * Manager-Layout — the application's chrome.
 *
 * Built on pict-section-modal's `shell()` API which manages a viewport
 * with N panels per side + a center. The shell handles collapse /
 * resize chrome and persists state to localStorage per-host.
 *
 * Panel layout (in registration order — shell stacks each side from
 * the edge inward):
 *
 *   ┌────────────────────────────────────────────────────────────┐
 *   │ #RM-TopPanel-Content  (top, fixed)                         │
 *   │ — combined brand + topbar in one row, no dual-nav look —   │
 *   ├──────────┬─────────────────────────────────────────────────┤
 *   │ #RM-Side │ #RM-Workspace-Content   (center)                │
 *   │ -bar     │                                                 │
 *   │ -Content │                                                 │
 *   │ (left,   │                                                 │
 *   │ resiz-   │                                                 │
 *   │ able)    │                                                 │
 *   ├──────────┴─────────────────────────────────────────────────┤
 *   │ #RM-StatusPanel-Content  (bottom, fixed)                   │
 *   └────────────────────────────────────────────────────────────┘
 *
 * #RM-ModalRoot is appended outside the shell so dialogs / dropdowns
 * float over everything.
 */

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Layout',

	DefaultRenderable:         'Manager-Layout-Shell',
	DefaultDestinationAddress: '#RetoldManager-Application-Container',

	AutoRender: false,

	CSS: /*css*/`
		#RetoldManager-Application-Container
		{
			height: 100vh;
			min-height: 0;
			overflow: hidden;
		}
		/* Shell-managed panels apply --color-* themed surfaces. */
		.pict-modal-shell-panel { background: var(--color-panel); }
		.pict-modal-shell-center { background: var(--color-bg); }

		/* Sidebar inner: keep the original sidebar layout (filter row
		   sticky on top, scrollable list below). */
		#RM-Sidebar-Content
		{
			display: flex;
			flex-direction: column;
			height: 100%;
			min-height: 0;
		}
		/* Workspace inner: keep the original page padding (was on
		   #RM-Workspace before the shell migration). #RM-Workspace is
		   a shim wrapper kept for back-compat with views that look
		   it up by id (ModuleWorkspace + Ripple wire button handlers
		   off it). The shell-center handles scrolling; the workspace
		   just carries the padding the original stylesheet expected. */
		#RM-Workspace
		{
			padding: 16px 20px;
			box-sizing: border-box;
			min-height: 100%;
		}
	`,

	Templates:
	[
		{
			Hash: 'Manager-Layout-Shell-Template',
			// The template is intentionally minimal — the shell owns the
			// real DOM. We just provide a modal root sibling and a
			// placeholder so the renderable has somewhere to land.
			Template: /*html*/`
<div id="RM-Layout-Mount"></div>
<div id="RM-ModalRoot"></div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Layout-Shell',
			TemplateHash:       'Manager-Layout-Shell-Template',
			DestinationAddress: '#RetoldManager-Application-Container',
			RenderMethod:       'replace',
		}
	]
};

class ManagerLayoutView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._shell = null;
		this._shellPanelsBuilt = false;
	}

	onAfterRender(pRenderable, pRenderDestinationAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();

		// Build the shell on first render, then re-render the cascaded
		// views (which the router or top-of-app code will trigger anyway).
		if (!this._shellPanelsBuilt)
		{
			this._buildShell();
			this._shellPanelsBuilt = true;
		}

		// Cascade — re-renders into the existing destination ids the
		// shell created. These views render templates into
		// #RM-TopPanel-Content / #RM-Sidebar-Content / etc.
		// Manager-TopBar / Sidebar / StatusBar / LogBar are all bound
		// to their panels via `ContentView: <hash>` in addPanel — the
		// shell renders them automatically at panel creation and on
		// every expand transition, so no manual cascade is needed
		// here. Manager-Home is the workspace content (router-driven)
		// and remains the one explicit render at boot.
		this.pict.views['Manager-Home'].render();

		return super.onAfterRender(pRenderable, pRenderDestinationAddress, pRecord, pContent);
	}

	_buildShell()
	{
		let tmpModalSection = this.pict.views['Pict-Section-Modal'];
		if (!tmpModalSection || typeof tmpModalSection.shell !== 'function')
		{
			this.pict.log.warn('Manager-Layout: pict-section-modal.shell not available — cannot build chrome.');
			return;
		}

		let tmpMount = document.getElementById('RM-Layout-Mount');
		if (!tmpMount)
		{
			this.pict.log.warn('Manager-Layout: #RM-Layout-Mount not in DOM yet.');
			return;
		}

		this._shell = tmpModalSection.shell(tmpMount,
		{
			PersistenceKey: 'retold-manager'
		});

		// Top — combined brand + topbar row. Fixed: not collapsible
		// (always visible). Height tuned to fit a single-line row of
		// brand wordmark + action buttons + theme button.
		this._shell.addPanel(
		{
			Hash: 'topbar',
			Side: 'top',
			Mode: 'fixed',
			Size: 56,
			ContentDestinationId: 'RM-TopPanel-Content',
			ContentView: 'Manager-TopBar'
		});

		// Bottom — status bar. Fixed at 28px (matches the original
		// retold-manager.css `--statusbar-height` so the chrome density
		// stays compact). MinSize override needed because the shell's
		// default MinSize (40) would otherwise clamp it back up.
		// Added FIRST among bottom panels so the shell's "first-added =
		// at the edge" rule places it at the absolute viewport bottom.
		this._shell.addPanel(
		{
			Hash: 'statusbar',
			Side: 'bottom',
			Mode: 'fixed',
			Size: 28,
			MinSize: 20,
			ContentDestinationId: 'RM-StatusBar',
			ContentView: 'Manager-StatusBar'
		});

		// Bottom — log bar. Resizable + collapsible. Sits ABOVE the
		// status bar (one inward) and is the persistent home for log
		// output that used to live in a modal. The topbar Log button
		// toggles its collapsed state via Manager-Layout.getLogPanel()
		// (see _Pict.views['Manager-Layout'].getLogPanel().toggle()
		// in PictView-Manager-TopBar.js). Default height + collapsed
		// state are persisted across reloads by the shell.
		// Bottom — log bar. Resizable + collapsible. The shell's
		// ContentView binding handles auto-render at create + on every
		// expand transition; we only need OnExpand for the bonus
		// behaviour of re-fetching the file log when the panel was
		// already showing op output and the user re-opens it.
		this._shell.addPanel(
		{
			Hash: 'logbar',
			Side: 'bottom',
			Mode: 'resizable',
			Size: 200,
			MinSize: 80,
			MaxSize: 600,
			Collapsed: true,             // hidden by default; user opens via Log button
			Title: 'Log',
			ContentDestinationId: 'RM-LogBar-Content',
			ContentView: 'Manager-LogBar'
		});

		// Left — module sidebar. Resizable + collapsible. Default 280
		// like the original layout; persisted across reloads.
		// ContentView binding tells the shell to auto-render the
		// Manager-Sidebar view at creation + on every expand — no
		// per-panel render() bookkeeping in the cascade below.
		this._shell.addPanel(
		{
			Hash: 'sidebar',
			Side: 'left',
			Mode: 'resizable',
			Size: 280,
			MinSize: 200,
			MaxSize: 480,
			Title: 'Modules',
			ContentDestinationId: 'RM-Sidebar-Content',
			ContentView: 'Manager-Sidebar'
		});

		// Center — the workspace area. We mount the legacy nested
		// structure (#RM-Workspace > #RM-Workspace-Content) inside
		// the shell's center so:
		//   - #RM-Workspace-Content stays the routed-view destination
		//     (no per-view changes needed).
		//   - #RM-Workspace remains as the parent ModuleWorkspace +
		//     Ripple look up by id to wire action-bar button handlers.
		//   - #RM-Workspace carries the page padding the original
		//     stylesheet expected (16px 20px).
		this._shell.getCenterEl().innerHTML = ''
			+ '<div id="RM-Workspace">'
			+   '<div id="RM-Workspace-Content"></div>'
			+ '</div>';
	}

	// ─────────────────────────────────────────────
	//  Public helpers used by chrome views (TopBar, etc.) to drive
	//  panels they don't construct themselves.
	// ─────────────────────────────────────────────

	/**
	 * @returns {object|null} the shell handle for the persistent Log
	 * panel, or null if the shell hasn't been built yet (very early
	 * boot). Callers commonly chain .toggle() / .expand() / .collapse() /
	 * .popup().
	 */
	getLogPanel()
	{
		return this._shell ? this._shell.getPanel('logbar') : null;
	}

	/**
	 * @returns {object|null} the shell handle for the sidebar panel.
	 */
	getSidebarPanel()
	{
		return this._shell ? this._shell.getPanel('sidebar') : null;
	}

	/**
	 * Unified one-line trigger for "show the Log panel": expands if
	 * collapsed (firing OnExpand + auto-rendering the bound LogBar
	 * view), or flashes for attention if already open. Equivalent to
	 * `getLogPanel().popup()` but null-safe and self-documenting.
	 * Used from runAction / _bumpWithGuard so every action button
	 * funnels through the same shell codepath.
	 */
	popLogPanel()
	{
		if (this._shell) { this._shell.openPanel('logbar'); }
	}
}

module.exports = ManagerLayoutView;
module.exports.default_configuration = _ViewConfiguration;
