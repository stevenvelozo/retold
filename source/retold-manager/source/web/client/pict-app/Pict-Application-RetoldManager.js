const libPictApplication = require('pict-application');
const libPictRouter = require('pict-router');

// Providers (business logic, no UI)
const libProviderApi = require('./providers/Pict-Provider-Manager-API.js');
const libProviderOperationsWS = require('./providers/Pict-Provider-Manager-OperationsWS.js');

// Shell views (always present)
const libViewLayout     = require('./views/PictView-Manager-Layout.js');
const libViewTopBar     = require('./views/PictView-Manager-TopBar.js');
const libViewSidebar    = require('./views/PictView-Manager-Sidebar.js');
const libViewStatusBar  = require('./views/PictView-Manager-StatusBar.js');
const libViewOutputPanel = require('./views/PictView-Manager-OutputPanel.js');

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
const libModalDiff        = require('./views/modals/PictView-Manager-Modal-Diff.js');

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
		this.pict.addView('Manager-Layout',      libViewLayout.default_configuration,      libViewLayout);
		this.pict.addView('Manager-TopBar',      libViewTopBar.default_configuration,      libViewTopBar);
		this.pict.addView('Manager-Sidebar',     libViewSidebar.default_configuration,     libViewSidebar);
		this.pict.addView('Manager-StatusBar',   libViewStatusBar.default_configuration,   libViewStatusBar);
		this.pict.addView('Manager-OutputPanel', libViewOutputPanel.default_configuration, libViewOutputPanel);

		// Content views
		this.pict.addView('Manager-Home',            libViewHome.default_configuration,            libViewHome);
		this.pict.addView('Manager-ModuleWorkspace', libViewModuleWorkspace.default_configuration, libViewModuleWorkspace);
		this.pict.addView('Manager-ManifestEditor',  libViewManifestEditor.default_configuration,  libViewManifestEditor);
		this.pict.addView('Manager-LogViewer',       libViewLogViewer.default_configuration,       libViewLogViewer);
		this.pict.addView('Manager-OpsRunner',       libViewOpsRunner.default_configuration,       libViewOpsRunner);
		this.pict.addView('Manager-Ripple',          libViewRipple.default_configuration,          libViewRipple);

		// Modal views
		this.pict.addView('Manager-Modal-Commit',     libModalCommit.default_configuration,     libModalCommit);
		this.pict.addView('Manager-Modal-Ncu',        libModalNcu.default_configuration,        libModalNcu);
		this.pict.addView('Manager-Modal-Publish',    libModalPublish.default_configuration,    libModalPublish);
		this.pict.addView('Manager-Modal-EditModule', libModalEditModule.default_configuration, libModalEditModule);
		this.pict.addView('Manager-Modal-RipplePlan', libModalRipplePlan.default_configuration, libModalRipplePlan);
		this.pict.addView('Manager-Modal-Diff',       libModalDiff.default_configuration,       libModalDiff);
	}

	onAfterInitializeAsync(fCallback)
	{
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
		};

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
		this.pict.views['Manager-ModuleWorkspace'].loadModule(pName);
		this.setActiveRoute('Module:' + pName);
	}

	showOps(pScript)
	{
		this.pict.AppData.Manager.OpsScript = pScript;
		this.pict.views['Manager-OpsRunner'].runScript(pScript);
		this.setActiveRoute('Ops:' + pScript);
	}

	setActiveRoute(pRoute)
	{
		this.pict.AppData.Manager.CurrentRoute = pRoute;

		// Re-render sidebar so the selected module row highlights correctly,
		// and the top bar so the active toggle styling updates.
		if (this.pict.views['Manager-Sidebar'])   { this.pict.views['Manager-Sidebar'].render(); }
		if (this.pict.views['Manager-TopBar'])    { this.pict.views['Manager-TopBar'].render(); }
	}

	setStatus(pMessage)
	{
		this.pict.AppData.Manager.StatusMessage = pMessage;
		if (this.pict.views['Manager-StatusBar']) { this.pict.views['Manager-StatusBar'].render(); }
	}
}

module.exports = RetoldManagerApplication;
module.exports.default_configuration = require('./Pict-Application-RetoldManager-Configuration.json');
