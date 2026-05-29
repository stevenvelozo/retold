const libPictApplication = require('pict-application');
const libPictRouter = require('pict-router');
const libPictSectionModal = require('pict-section-modal');
const libPictSectionTheme = require('pict-section-theme');
const libPictSectionContent = require('pict-section-content');
const libPictSectionFileBrowser = require('pict-section-filebrowser');
const libPictSectionFileBrowserListDetail = require('pict-section-filebrowser/source/views/Pict-View-FileBrowser-ListDetail.js');

const libRetoldManagerBrand = require('./RetoldManager-Brand.js');

// Providers (business logic, no UI)
const libProviderApi = require('./providers/Pict-Provider-Manager-API.js');
const libProviderOperationsWS = require('./providers/Pict-Provider-Manager-OperationsWS.js');

// Shell views (always present)
const libViewLayout       = require('./views/PictView-Manager-Layout.js');
const libViewTopBarNav    = require('./views/PictView-Manager-TopBar-Nav.js');
const libViewTopBarUser   = require('./views/PictView-Manager-TopBar-User.js');
const libViewSidebar      = require('./views/PictView-Manager-Sidebar.js');
const libViewStatusBar    = require('./views/PictView-Manager-StatusBar.js');
const libViewOutputPanel  = require('./views/PictView-Manager-OutputPanel.js');
const libViewLogModal     = require('./views/PictView-Manager-LogModal.js');
const libViewLogBar       = require('./views/PictView-Manager-LogBar.js');
const libViewFileViewer   = require('./views/PictView-Manager-FileViewer.js');

// Content views (swapped by the router)
const libViewHome            = require('./views/PictView-Manager-Home.js');
const libViewModuleWorkspace = require('./views/PictView-Manager-ModuleWorkspace.js');
const libViewManifestEditor  = require('./views/PictView-Manager-ManifestEditor.js');
const libViewLogViewer       = require('./views/PictView-Manager-LogViewer.js');
const libViewOpsRunner       = require('./views/PictView-Manager-OpsRunner.js');
const libViewRipple          = require('./views/PictView-Manager-Ripple.js');

// Modal views (render into #RM-ModalRoot)
const libModalCommit      = require('./views/modals/PictView-Manager-Modal-Commit.js');
const libModalNcu         = require('./views/modals/PictView-Manager-Modal-Ncu.js');
const libModalPublish     = require('./views/modals/PictView-Manager-Modal-Publish.js');
const libModalEditModule  = require('./views/modals/PictView-Manager-Modal-EditModule.js');
const libModalRipplePlan  = require('./views/modals/PictView-Manager-Modal-RipplePlan.js');
const libModalDiff         = require('./views/modals/PictView-Manager-Modal-Diff.js');
const libModalActionDetail = require('./views/modals/PictView-Manager-Modal-ActionDetail.js');
const libModalCreatePR     = require('./views/modals/PictView-Manager-Modal-CreatePR.js');

class RetoldManagerApplication extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		// The layout view calls resolve() explicitly after the DOM is ready.
		this.pict.settings.RouterSkipRouteResolveOnAdd = true;

		// Providers first so views can reach them during construction.
		this.pict.addProvider('ManagerAPI', libProviderApi.default_configuration, libProviderApi);
		this.pict.addProvider('ManagerOperationsWS', libProviderOperationsWS.default_configuration, libProviderOperationsWS);

		// Router
		this.pict.addProvider('PictRouter',
			require('./providers/PictRouter-RetoldManager-Configuration.json'), libPictRouter);

		// Shell views
		this.pict.addView('Manager-Layout',        libViewLayout.default_configuration,       libViewLayout);
		this.pict.addView('Manager-TopBar-Nav',    libViewTopBarNav.default_configuration,    libViewTopBarNav);
		this.pict.addView('Manager-TopBar-User',   libViewTopBarUser.default_configuration,   libViewTopBarUser);
		this.pict.addView('Manager-Sidebar',       libViewSidebar.default_configuration,      libViewSidebar);
		this.pict.addView('Manager-StatusBar',     libViewStatusBar.default_configuration,    libViewStatusBar);
		this.pict.addView('Manager-OutputPanel',   libViewOutputPanel.default_configuration,  libViewOutputPanel);
		this.pict.addView('Manager-FileViewer',    libViewFileViewer.default_configuration,   libViewFileViewer);

		// Modal section view (toasts, confirms, custom dialogs).
		this.pict.addView('Pict-Section-Modal', {}, libPictSectionModal);

		// Content viewer: a Pict-Content view + provider pair from
		// pict-section-content.  Used by Manager-FileViewer to render
		// markdown (parseMarkdown → displayContent) and to syntax-
		// highlight source files inside fenced code blocks.
		this.pict.addProvider('Pict-Content',
			libPictSectionContent.PictContentProvider.default_configuration,
			libPictSectionContent.PictContentProvider);
		this.pict.addView('Pict-Content',
			libPictSectionContent.default_configuration, libPictSectionContent);

		// File browser — registered with its default `list-only` layout
		// override so the section's compact (single-pane) mode is what
		// renders into the sidebar's Files tab.  The section's
		// constructor auto-registers its five sibling providers
		// (Browse/List/View/Layout/Icons), so we only need to register
		// the outer shell view + the ListDetail sub-view that fills the
		// list pane.  Rendered into #RM-Sidebar-FilesPane-Mount.
		let tmpFBConfig = Object.assign({},
			JSON.parse(JSON.stringify(libPictSectionFileBrowser.default_configuration)),
			{
				DefaultDestinationAddress: '#RM-Sidebar-FilesPane-Mount',
				AutoRender: false
			});
		// Default Layout to list-only so the section ships compact
		// inside the sidebar without the host having to flip it after
		// init.  RootLocation stays at '/' — we render relative paths.
		tmpFBConfig.DefaultState = Object.assign({}, tmpFBConfig.DefaultState || {},
			{ Layout: 'list-only' });
		this.pict.addView('Pict-FileBrowser', tmpFBConfig, libPictSectionFileBrowser);
		this.pict.addView('Pict-FileBrowser-ListDetail',
			libPictSectionFileBrowserListDetail.default_configuration,
			libPictSectionFileBrowserListDetail);

		// Theme section — added as a Pict provider, self-bootstraps
		// inside its constructor. That single addProvider call:
		//   - Registers the underlying pict-provider-theme runtime
		//   - Pushes every theme from the runtime registry (bundled
		//     starter set + anything host code added via Catalog.register)
		//   - Adds the picker / mode-toggle / scale-select / topbar-button
		//     views to pict.views[...]
		//   - Adds the shared chrome views (TopBar / BottomBar) with the
		//     host-supplied slot views wired in via ViewOptions
		//   - Applies pict-default in system mode at scale 1.0 — unless
		//     localStorage has a saved user pick, which wins
		//   - Wires the Brand block so --brand-color-* CSS vars are set
		//
		// TopBar's NavView slot gets Manager-TopBar-Nav (health badge +
		// Status/Update/Checkout/Ripple buttons); UserView gets
		// Manager-TopBar-User (Log toggle + Manifest button). BottomBar's
		// StatusView gets Manager-StatusBar.
		this.pict.addProvider('Theme-Section',
		{
			ApplyDefault: 'pict-default',
			DefaultMode:  'system',
			DefaultScale: 1.0,
			Brand:        libRetoldManagerBrand,
			// Picker/ModeToggle/ScaleSelect drive the popup, Button is
			// the topbar trigger, BrandMark is the brand mark Theme-TopBar
			// auto-mounts. TopBar / BottomBar are the standard chrome rows
			// pict-section-theme provides — the host fills the empty slots
			// via NavView / UserView / StatusView in ViewOptions below.
			Views: ['Picker', 'ModeToggle', 'ScaleSelect', 'Button', 'BrandMark', 'TopBar', 'BottomBar'],
			ViewOptions:
			{
				// Heights match the panel Sizes in Manager-Layout's
				// addPanel() calls — chrome and shell stay in sync so
				// align-items: center has the right room to centre into.
				TopBar:    { NavView: 'Manager-TopBar-Nav', UserView: 'Manager-TopBar-User', Height: 56 },
				BottomBar: { StatusView: 'Manager-StatusBar', Height: 32 }
			}
		}, libPictSectionTheme);

		// Content views
		this.pict.addView('Manager-Home',            libViewHome.default_configuration,            libViewHome);
		this.pict.addView('Manager-ModuleWorkspace', libViewModuleWorkspace.default_configuration, libViewModuleWorkspace);
		this.pict.addView('Manager-ManifestEditor',  libViewManifestEditor.default_configuration,  libViewManifestEditor);
		this.pict.addView('Manager-LogViewer',       libViewLogViewer.default_configuration,       libViewLogViewer);
		this.pict.addView('Manager-LogModal',        libViewLogModal.default_configuration,        libViewLogModal);
		this.pict.addView('Manager-LogBar',          libViewLogBar.default_configuration,          libViewLogBar);
		this.pict.addView('Manager-OpsRunner',       libViewOpsRunner.default_configuration,       libViewOpsRunner);
		this.pict.addView('Manager-Ripple',          libViewRipple.default_configuration,          libViewRipple);

		// Modal views
		this.pict.addView('Manager-Modal-Commit',     libModalCommit.default_configuration,     libModalCommit);
		this.pict.addView('Manager-Modal-Ncu',        libModalNcu.default_configuration,        libModalNcu);
		this.pict.addView('Manager-Modal-Publish',    libModalPublish.default_configuration,    libModalPublish);
		this.pict.addView('Manager-Modal-EditModule', libModalEditModule.default_configuration, libModalEditModule);
		this.pict.addView('Manager-Modal-RipplePlan', libModalRipplePlan.default_configuration, libModalRipplePlan);
		this.pict.addView('Manager-Modal-Diff',          libModalDiff.default_configuration,          libModalDiff);
		this.pict.addView('Manager-Modal-ActionDetail',  libModalActionDetail.default_configuration,  libModalActionDetail);
		this.pict.addView('Manager-Modal-CreatePR',      libModalCreatePR.default_configuration,      libModalCreatePR);
	}

	onAfterInitializeAsync(fCallback)
	{
		// Belt-and-braces alias so any pict-section module that assumes
		// the lowercase `pict` global (instead of going through the
		// canonical {~P~} template tag or this.pict.browserAddress)
		// still finds the running pict instance.  We expose `_Pict` by
		// default; this also exposes `pict` for inline-handler
		// compatibility.
		if (typeof window !== 'undefined' && !window.pict)
		{
			window.pict = this.pict;
		}

		// Single source of truth for all UI state.
		this.pict.AppData.Manager =
		{
			StatusMessage: 'Loading...',
			Health:        { state: 'connecting', text: 'connecting...' },
			CurrentRoute:  'Home',          // derived from pict-router path
			Modules:       [],              // [{Name, Group, GitHub, Documentation, ...}]
			ModulesByGroup: {},             // { Fable: [...], Meadow: [...], ... }
			Filter:
			{
				Query: '',
				DirtyOnly: false,
				SortByTime: false,
				IncludeExamples: false,        // hide manifest Type='example' entries by default
			},
			Scan:
			{
				Results: {},               // { moduleName: { Dirty, Ahead, Behind, Branch } }
				When:    null,
				Running: false,
			},
			SelectedModule:       null,    // module name
			SelectedModuleDetail: null,    // the /modules/:name payload
			ActiveOperation:
			{
				OperationId: null,
				CommandTag:  null,
				Lines:       [],           // [{Class, Text}]
				HeaderState: 'idle',       // 'idle' | 'running' | 'success' | 'error'
				HeaderText:  'idle',
			},
			OpsScript: null,               // 'status' | 'update' | 'checkout' — when on /Ops/:script
			RecentModules: [],             // ordered MRU list, persisted to localStorage
			ActionHistory: [],             // last N completed/running actions; powers the Log panel's Actions tab
			DocServe:
			{
				Running:    false,
				ModuleName: null,
				ModulePath: null,
				Port:       43210,
				URL:        null,
				Pid:        null,
				StartedAt:  null,
			},
			ContentEditor:
			{
				Running:     false,
				ModuleName:  null,
				ModulePath:  null,
				ContentPath: null,
				Port:        43211,
				URL:         null,
				Pid:         null,
				StartedAt:   null,
			},
			Examples:
			{
				Running:      false,
				Phase:        'idle',     // 'idle' | 'installing' | 'building' | 'running' | 'failed'
				ModuleName:   null,
				ModulePath:   null,
				ExamplesPath: null,
				Port:         43212,
				URL:          null,
				Pid:          null,
				StartedAt:    null,
				LastError:    null,
			},
		};

		this._loadRecentModules();

		// Parameterized routes are registered from JS so the handler gets the
		// navigo match object directly — template `:param` expressions don't
		// flow cleanly into `{~LV~}` closures.
		let tmpRouter = this.pict.providers.PictRouter;
		tmpRouter.addRoute('/Module/:name', (pMatch) =>
			{
				let tmpName = pMatch && pMatch.data ? pMatch.data.name : null;
				if (tmpName) { this.showModule(decodeURIComponent(tmpName)); }
			});
		tmpRouter.addRoute('/Ops/:script', (pMatch) =>
			{
				let tmpScript = pMatch && pMatch.data ? pMatch.data.script : null;
				if (tmpScript) { this.showOps(tmpScript); }
			});

		// Render the shell (Layout calls into TopBar/Sidebar/OutputPanel/StatusBar).
		this.pict.views['Manager-Layout'].render();

		// Resolve the router now that all routes are registered and the DOM is
		// ready; this picks up hash deep-links on first load.
		tmpRouter.resolve();

		// Kick off the initial data load + live WS stream.
		this.pict.providers.ManagerAPI.loadModules();
		this.pict.providers.ManagerAPI.pollHealth();
		this.pict.providers.ManagerOperationsWS.connect();

		// Reconcile the docserve chip with the supervisor's actual state
		// in case a docuserve is already running from a previous page
		// load.  AppData was just initialized as "not running"; the
		// supervisor on the backend may know otherwise.
		this.pict.providers.ManagerAPI.docserveStatus().then((pState) =>
		{
			if (pState && typeof pState === 'object')
			{
				this.pict.AppData.Manager.DocServe = pState;
				let tmpNav = this.pict.views['Manager-TopBar-Nav'];
				if (tmpNav && typeof tmpNav.render === 'function') { tmpNav.render(); }
			}
		}).catch(() => { /* manager may not have docserve route yet — silent */ });

		// Same boot-time reconcile for the content editor supervisor.
		this.pict.providers.ManagerAPI.contentEditorStatus().then((pState) =>
		{
			if (pState && typeof pState === 'object')
			{
				this.pict.AppData.Manager.ContentEditor = pState;
				let tmpNav = this.pict.views['Manager-TopBar-Nav'];
				if (tmpNav && typeof tmpNav.render === 'function') { tmpNav.render(); }
			}
		}).catch(() => { /* silent */ });

		// Same boot-time reconcile for the examples supervisor.
		this.pict.providers.ManagerAPI.examplesStatus().then((pState) =>
		{
			if (pState && typeof pState === 'object')
			{
				this.pict.AppData.Manager.Examples = pState;
				let tmpNav = this.pict.views['Manager-TopBar-Nav'];
				if (tmpNav && typeof tmpNav.render === 'function') { tmpNav.render(); }
			}
		}).catch(() => { /* silent */ });

		return super.onAfterInitializeAsync(fCallback);
	}

	// ─────────────────────────────────────────────
	//  Navigation helpers called from templates + buttons
	// ─────────────────────────────────────────────

	navigateTo(pPath)
	{
		this.pict.providers.PictRouter.navigate(pPath);
	}

	showView(pViewIdentifier)
	{
		let tmpView = this.pict.views[pViewIdentifier];
		if (!tmpView)
		{
			this.pict.log.warn('View [' + pViewIdentifier + '] not found; falling back to home.');
			this.pict.views['Manager-Home'].render();
			this.setActiveRoute('Home');
			return;
		}

		// Per-view entry hooks — a route change is a good moment for the
		// view to (re)fetch data instead of relying on a stale record.
		if (pViewIdentifier === 'Manager-ManifestEditor' && typeof tmpView.reload === 'function')
		{
			tmpView.reload();
		}
		else if (pViewIdentifier === 'Manager-Ripple' && typeof tmpView.showFromRoute === 'function')
		{
			tmpView.showFromRoute();
		}
		else
		{
			tmpView.render();
		}

		let tmpRoute = pViewIdentifier.replace('Manager-', '');
		this.setActiveRoute(tmpRoute);
	}

	showModule(pName)
	{
		this.pict.AppData.Manager.SelectedModule = pName;
		this._touchRecentModule(pName);
		this.pict.views['Manager-ModuleWorkspace'].loadModule(pName);
		this.setActiveRoute('Module:' + pName);
		// Refresh the topbar so the active-module pill picks up the
		// new selection without waiting for a router navigation event.
		let tmpNav = this.pict.views['Manager-TopBar-Nav'];
		if (tmpNav && typeof tmpNav.render === 'function') { tmpNav.render(); }
		// If the sidebar is sitting on the Files tab, swap its file
		// listing over to the new module — otherwise the user would
		// have to click off and back to refresh.
		let tmpSidebar = this.pict.views['Manager-Sidebar'];
		if (tmpSidebar && tmpSidebar._tab === 'files' && typeof tmpSidebar._syncFilesTab === 'function')
		{
			tmpSidebar._syncFilesTab();
		}
	}

	showOps(pScript)
	{
		this.pict.AppData.Manager.OpsScript = pScript;
		// OpsRunner now opens the streaming log modal rather than swapping the
		// workspace content area, so the user keeps their current context.
		this.pict.views['Manager-OpsRunner'].runScript(pScript);
		this.setActiveRoute('Ops:' + pScript);
	}

	// ─────────────────────────────────────────────
	//  Recent-module MRU (drives the "Sort by time" filter)
	// ─────────────────────────────────────────────

	_loadRecentModules()
	{
		try
		{
			let tmpRaw = window.localStorage.getItem('rm:recent:modules');
			if (!tmpRaw) { return; }
			let tmpList = JSON.parse(tmpRaw);
			if (Array.isArray(tmpList))
			{
				this.pict.AppData.Manager.RecentModules = tmpList.filter(
					(pName) => typeof pName === 'string').slice(0, 100);
			}
		}
		catch (e) { /* ignore */ }
	}

	_touchRecentModule(pName)
	{
		if (!pName) { return; }
		let tmpList = this.pict.AppData.Manager.RecentModules || [];
		// Move-to-front, dedupe, cap at 100.
		tmpList = [pName].concat(tmpList.filter((pN) => pN !== pName)).slice(0, 100);
		this.pict.AppData.Manager.RecentModules = tmpList;
		try { window.localStorage.setItem('rm:recent:modules', JSON.stringify(tmpList)); }
		catch (e) { /* quota */ }
		// Re-render the sidebar so "Sort by time" reflects the new ordering.
		if (this.pict.views['Manager-Sidebar']) { this.pict.views['Manager-Sidebar'].render(); }
	}

	setActiveRoute(pRoute)
	{
		this.pict.AppData.Manager.CurrentRoute = pRoute;

		// Re-render sidebar so the selected module row highlights correctly,
		// and the topbar nav so the health badge / active toggle styling
		// reflects the new state. The shared Theme-TopBar chrome itself
		// doesn't need a re-render (its template is data-free) — only the
		// Manager-TopBar-Nav slot view does.
		if (this.pict.views['Manager-Sidebar'])         { this.pict.views['Manager-Sidebar'].render(); }
		if (this.pict.views['Manager-TopBar-Nav'])      { this.pict.views['Manager-TopBar-Nav'].render(); }
	}

	setStatus(pMessage)
	{
		this.pict.AppData.Manager.StatusMessage = pMessage;
		if (this.pict.views['Manager-StatusBar']) { this.pict.views['Manager-StatusBar'].render(); }
	}
}

module.exports = RetoldManagerApplication;
module.exports.default_configuration = require('./Pict-Application-RetoldManager-Configuration.json');
