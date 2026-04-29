const libPictProvider = require('pict-provider');

const API_BASE = '/api/manager';

const _Configuration =
{
	ProviderIdentifier: 'ManagerAPI',
	AutoInitialize: true,
	AutoInitializeOrdinal: 1,
};

class ManagerAPIProvider extends libPictProvider
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	// ─────────────────────────────────────────────
	//  Low-level fetch wrappers
	// ─────────────────────────────────────────────

	get(pPath)
	{
		return fetch(API_BASE + pPath, { headers: { Accept: 'application/json' } })
			.then((pResponse) => this._parseResponse(pResponse));
	}

	request(pMethod, pPath, pBody)
	{
		let tmpInit =
			{
				method: pMethod,
				headers: { Accept: 'application/json' },
			};
		if (pBody !== undefined && pBody !== null)
		{
			tmpInit.headers['Content-Type'] = 'application/json';
			tmpInit.body = JSON.stringify(pBody);
		}
		return fetch(API_BASE + pPath, tmpInit).then((pResponse) => this._parseResponse(pResponse));
	}

	post(pPath, pBody)   { return this.request('POST',   pPath, pBody || {}); }
	patch(pPath, pBody)  { return this.request('PATCH',  pPath, pBody || {}); }
	delete(pPath)        { return this.request('DELETE', pPath); }

	_parseResponse(pResponse)
	{
		return pResponse.text().then((pRaw) =>
			{
				let tmpBody;
				try { tmpBody = pRaw ? JSON.parse(pRaw) : {}; }
				catch (e) { tmpBody = { Message: pRaw }; }
				if (!pResponse.ok)
				{
					let tmpErr = new Error(tmpBody.Message || ('HTTP ' + pResponse.status));
					tmpErr.Status = pResponse.status;
					tmpErr.Info = tmpBody;
					throw tmpErr;
				}
				return tmpBody;
			});
	}

	// ─────────────────────────────────────────────
	//  Domain-specific loads
	// ─────────────────────────────────────────────

	loadModules()
	{
		this.pict.PictApplication.setStatus('Loading modules...');
		return this.get('/modules').then(
			(pModules) =>
			{
				this.pict.AppData.Manager.Modules = pModules;
				this.pict.AppData.Manager.ModulesByGroup = this._groupBy(pModules, 'Group');
				if (this.pict.views['Manager-Sidebar']) { this.pict.views['Manager-Sidebar'].render(); }
				this.pict.PictApplication.setStatus('Ready. ' + pModules.length + ' modules.');
				return pModules;
			},
			(pError) =>
			{
				this.pict.PictApplication.setStatus('Could not load modules: ' + pError.message);
				throw pError;
			});
	}

	loadModuleDetail(pName)
	{
		return this.get('/modules/' + encodeURIComponent(pName));
	}

	pollHealth()
	{
		let tmpSelf = this;
		let fTick = function ()
		{
			tmpSelf.get('/health').then(
				(pHealth) =>
				{
					tmpSelf.pict.AppData.Manager.Health =
						{
							state: 'ok',
							text: 'ok ' + (pHealth.ModuleCount || 0) + ' modules',
						};
					if (tmpSelf.pict.views['Manager-TopBar']) { tmpSelf.pict.views['Manager-TopBar'].render(); }
				},
				() =>
				{
					tmpSelf.pict.AppData.Manager.Health = { state: 'error', text: 'offline' };
					if (tmpSelf.pict.views['Manager-TopBar']) { tmpSelf.pict.views['Manager-TopBar'].render(); }
				});
		};
		fTick();
		setInterval(fTick, 30000);
	}

	runAllModulesScript(pScript)
	{
		return this.post('/all/operations/' + encodeURIComponent(pScript));
	}

	runModuleOperation(pModuleName, pCommand, pArgs, pLabel)
	{
		return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/run',
			{ Command: pCommand, Args: pArgs, Label: pLabel || null });
	}

	runModuleDiff(pModuleName)
	{
		return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/diff');
	}

	// Fetch unified git diff as plain text (dist/ excluded). Used by the diff
	// modal to render a syntax-highlighted view, separate from the streaming
	// run-diff that pushes raw lines through the output panel.
	fetchGitDiffText(pModuleName)
	{
		return fetch(API_BASE + '/modules/' + encodeURIComponent(pModuleName) + '/git/diff',
			{ headers: { Accept: 'text/plain' } }).then(
			(pResponse) =>
			{
				if (!pResponse.ok)
				{
					let tmpErr = new Error('HTTP ' + pResponse.status);
					tmpErr.Status = pResponse.status;
					throw tmpErr;
				}
				return pResponse.text();
			});
	}

	bumpVersion(pModuleName, pKind, pVersion)
	{
		let tmpBody = { Kind: pKind };
		if (pVersion) { tmpBody.Version = pVersion; }
		return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/version', tmpBody);
	}

	cancelOperation(pOperationId)
	{
		return this.post('/operations/' + encodeURIComponent(pOperationId) + '/cancel');
	}

	// Scan every module for dirty/ahead/behind state.
	scanAllModules()
	{
		return this.get('/modules/scan');
	}

	// Commit
	commitModule(pModuleName, pMessage)
	{
		return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/commit',
			{ Message: pMessage });
	}

	// Git add (stages untracked/new files)
	gitAddAll(pModuleName)
	{
		return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/git-add',
			{ All: true });
	}
	gitAddPaths(pModuleName, pPaths)
	{
		return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/git-add',
			{ Paths: pPaths });
	}

	// Publish preview + publish
	loadPublishPreview(pModuleName)
	{
		return this.get('/modules/' + encodeURIComponent(pModuleName) + '/publish/preview');
	}
	publishModule(pModuleName, pPreviewHash)
	{
		return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/publish',
			{ Confirm: true, PreviewHash: pPreviewHash });
	}

	// npm-check-updates
	runNcu(pModuleName, pApply, pScope)
	{
		return this.post('/modules/' + encodeURIComponent(pModuleName) + '/operations/ncu',
			{ Apply: !!pApply, Scope: pScope || 'retold' });
	}

	// Manifest CRUD
	loadManifest()     { return this.get('/manifest'); }
	loadManifestAudit(){ return this.get('/manifest/audit'); }
	createManifestModule(pEntry) { return this.post('/manifest/modules', pEntry); }
	updateManifestModule(pOriginalName, pEntry)
	{
		return this.patch('/manifest/modules/' + encodeURIComponent(pOriginalName), pEntry);
	}
	deleteManifestModule(pName)
	{
		return this.delete('/manifest/modules/' + encodeURIComponent(pName));
	}

	// Ripple
	planRipple(pOptions)                { return this.post('/ripple/plan', pOptions); }
	runRipple(pPlan)                    { return this.post('/ripple/run', { Plan: pPlan }); }
	cancelRipple(pRippleId)             { return this.post('/ripple/' + encodeURIComponent(pRippleId) + '/cancel'); }
	confirmRippleStep(pRippleId, pStepOrder, pPreviewHash)
	{
		return this.post('/ripple/' + encodeURIComponent(pRippleId) + '/confirm',
			{ StepOrder: pStepOrder, Action: 'publish', PreviewHash: pPreviewHash });
	}

	// ─────────────────────────────────────────────
	//  Internals
	// ─────────────────────────────────────────────

	_groupBy(pList, pKey)
	{
		let tmpResult = {};
		for (let i = 0; i < pList.length; i++)
		{
			let tmpEntry = pList[i];
			let tmpGroup = tmpEntry[pKey] || 'Other';
			if (!tmpResult[tmpGroup]) { tmpResult[tmpGroup] = []; }
			tmpResult[tmpGroup].push(tmpEntry);
		}
		return tmpResult;
	}
}

module.exports = ManagerAPIProvider;
module.exports.default_configuration = _Configuration;
