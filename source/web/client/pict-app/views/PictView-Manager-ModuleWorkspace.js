const libPictView = require('pict-view');

// Caret glyph for the action-group "more" buttons comes from pict's
// built-in icon registry via {~I:ChevronDown~} in the templates below.
// No hand-rolled inline SVG, no per-record CaretIcon data binding.

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-ModuleWorkspace',

	DefaultRenderable:            'Manager-ModuleWorkspace-Content',
	DefaultDestinationAddress:    '#RM-Workspace-Content',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.ModuleWorkspace',

	AutoRender: false,

	Templates:
	[
		// ── Loading / error placeholders ──────────────────────────
		{
			Hash: 'Manager-ModuleWorkspace-Loading-Template',
			Template: /*html*/`
<div class="placeholder"><h2>Loading {~D:Record.Name~}...</h2></div>
`
		},
		{
			Hash: 'Manager-ModuleWorkspace-Error-Template',
			Template: /*html*/`
<div class="placeholder">
	<h2>Error loading {~D:Record.Name~}</h2>
	<p>{~D:Record.Message~}</p>
</div>
`
		},

		// ── Top-level workspace shell ─────────────────────────────
		{
			Hash: 'Manager-ModuleWorkspace-Content-Template',
			Template: /*html*/`
<div id="RM-Mod-InfoBox" class="module-info-box collapsed"
	onclick="_Pict.views['Manager-ModuleWorkspace'].toggleInfoBox()">
	{~T:Manager-ModuleWorkspace-InfoBox-Template:Record~}
</div>

<div class="workspace-header">
	<span class="module-name">{~D:Record.Manifest.Name~}</span>
	{~TS:Manager-ModuleWorkspace-VersionBadge-Template:Record.VersionBadgeSlot~}
	{~TS:Manager-ModuleWorkspace-BranchBadge-Template:Record.BranchBadgeSlot~}
	<div class="workspace-header-right">
		{~TS:Manager-ModuleWorkspace-GitHubLink-Template:Record.GitHubLinkSlot~}
		{~TS:Manager-ModuleWorkspace-NpmLink-Template:Record.NpmLinkSlot~}
		{~TS:Manager-ModuleWorkspace-DocsLink-Template:Record.DocsLinkSlot~}
	</div>
</div>
{~TS:Manager-ModuleWorkspace-Description-Template:Record.DescriptionSlot~}

<div class="action-groups">
	<div class="action-group">
		<div class="action-group-label">npm</div>
		<div class="action-row">
			<button class="action" onclick="_Pict.views['Manager-ModuleWorkspace'].runAction('ncu', null)">ncu</button>
			<button class="action" onclick="_Pict.views['Manager-ModuleWorkspace'].runAction('test', null)">test</button>
			<button class="action action-more" aria-label="More npm actions" title="More npm actions" onclick="_Pict.views['Manager-ModuleWorkspace']._openOverflow('npm', this); event.stopPropagation();">{~I:ChevronDown~}</button>
		</div>
	</div>
	<div class="action-group">
		<div class="action-group-label">version</div>
		<div class="action-row">
			<button class="action" onclick="_Pict.views['Manager-ModuleWorkspace'].runAction('bump-patch', null)">+ patch</button>
			<button class="action action-more" aria-label="More version actions" title="More version actions" onclick="_Pict.views['Manager-ModuleWorkspace']._openOverflow('version', this); event.stopPropagation();">{~I:ChevronDown~}</button>
		</div>
	</div>
	<div class="action-group">
		<div class="action-group-label">git</div>
		<div class="action-row">
			<button class="action" onclick="_Pict.views['Manager-ModuleWorkspace'].runAction('git-add', null)">add -A</button>
			<button class="action" onclick="_Pict.views['Manager-ModuleWorkspace'].runAction('diff', null)">diff</button>
			<button class="action" onclick="_Pict.views['Manager-ModuleWorkspace'].runAction('commit', null)">commit</button>
			<button class="action" onclick="_Pict.views['Manager-ModuleWorkspace'].runAction('push', null)">push</button>
			<button class="action action-more" aria-label="More git actions" title="More git actions" onclick="_Pict.views['Manager-ModuleWorkspace']._openOverflow('git', this); event.stopPropagation();">{~I:ChevronDown~}</button>
		</div>
	</div>
	<div class="action-group">
		<div class="action-group-label">publish</div>
		<div class="action-row">
			<button class="action success" title="Open the publish dialog (npm, npm + Docker image, or plan a ripple from here)" onclick="_Pict.views['Manager-ModuleWorkspace'].runAction('publish', null)">publish</button>
			<button class="action action-more" aria-label="More publish actions" title="More publish actions" onclick="_Pict.views['Manager-ModuleWorkspace']._openOverflow('publish', this); event.stopPropagation();">{~I:ChevronDown~}</button>
		</div>
	</div>
</div>

<div id="RM-Mod-FilesArea">
	{~TS:Manager-ModuleWorkspace-ChangedFiles-Template:Record.ChangedFilesSlot~}
</div>

<div id="RM-Mod-DepsArea">
	{~TS:Manager-ModuleWorkspace-DepSection-Template:Record.RetoldDepsSlot~}
	{~TS:Manager-ModuleWorkspace-DepSection-Template:Record.ExternalDepsSlot~}
	{~TS:Manager-ModuleWorkspace-DepSection-Template:Record.RetoldDevDepsSlot~}
	{~TS:Manager-ModuleWorkspace-DepSection-Template:Record.ExternalDevDepsSlot~}
</div>
`
		},

		// ── Header badges + links (single-element-array conditionals) ──
		{
			Hash: 'Manager-ModuleWorkspace-VersionBadge-Template',
			Template: /*html*/`<span class="module-version">v{~D:Record.Version~}</span>`
		},
		{
			Hash: 'Manager-ModuleWorkspace-BranchBadge-Template',
			Template: /*html*/`<span class="module-branch">{~D:Record.Branch~}</span>`
		},
		{
			Hash: 'Manager-ModuleWorkspace-GitHubLink-Template',
			Template: /*html*/`<a href="{~D:Record.Url~}" target="_blank">GitHub</a>`
		},
		{
			Hash: 'Manager-ModuleWorkspace-NpmLink-Template',
			Template: /*html*/`<a href="{~D:Record.Url~}" target="_blank">npm</a>`
		},
		{
			Hash: 'Manager-ModuleWorkspace-DocsLink-Template',
			Template: /*html*/`<a href="{~D:Record.Url~}" target="_blank">Docs</a>`
		},
		{
			Hash: 'Manager-ModuleWorkspace-Description-Template',
			Template: /*html*/`<p style="color:var(--color-muted);margin-top:0">{~D:Record.Description~}</p>`
		},

		// ── Floating info box (header + collapsible body) ─────────
		{
			Hash: 'Manager-ModuleWorkspace-InfoBox-Template',
			Template: /*html*/`
<div class="info-header">
	<span class="ib-name">{~D:Record.Manifest.Name~}</span>
	{~TS:Manager-ModuleWorkspace-InfoBox-Version-Template:Record.InfoBox.VersionSlot~}
	{~TS:Manager-ModuleWorkspace-InfoBox-Branch-Template:Record.InfoBox.BranchSlot~}
	{~TS:Manager-ModuleWorkspace-InfoBox-AheadBehind-Template:Record.InfoBox.AheadBehindSlot~}
	{~TS:Manager-ModuleWorkspace-InfoBox-Dirty-Template:Record.InfoBox.DirtySlot~}
	<span class="ib-toggle"></span>
</div>
<div class="info-body" onclick="event.stopPropagation()">
	<div class="ib-section">
		<h4>Package</h4>
		<dl class="kv">
			<dt>name</dt><dd>{~D:Record.InfoBox.PkgName~}</dd>
			<dt>version</dt><dd>{~D:Record.InfoBox.PkgVersion~}</dd>
			<dt>dependencies</dt><dd>{~D:Record.InfoBox.DepsCount~}</dd>
			<dt>devDependencies</dt><dd>{~D:Record.InfoBox.DevDepsCount~}</dd>
		</dl>
	</div>
	<div class="ib-section">
		<h4>Git status</h4>
		<dl class="kv">
			<dt>branch</dt><dd>{~D:Record.InfoBox.GitBranch~}</dd>
			<dt>ahead / behind</dt><dd>{~D:Record.InfoBox.AheadBehind~}</dd>
			<dt>dirty</dt><dd>{~D:Record.InfoBox.DirtyLabel~}</dd>
		</dl>
	</div>
</div>
`
		},
		{
			Hash: 'Manager-ModuleWorkspace-InfoBox-Version-Template',
			Template: /*html*/`<span class="ib-version">v{~D:Record.Version~}</span>`
		},
		{
			Hash: 'Manager-ModuleWorkspace-InfoBox-Branch-Template',
			Template: /*html*/`<span class="ib-branch">{~D:Record.Branch~}</span>`
		},
		{
			Hash: 'Manager-ModuleWorkspace-InfoBox-AheadBehind-Template',
			Template: /*html*/`<span class="ib-aheadbehind" title="{~D:Record.Tooltip~}"><span class="ib-ahead">{~D:Record.Ahead~}</span> / <span class="ib-behind">{~D:Record.Behind~}</span></span>`
		},
		{
			Hash: 'Manager-ModuleWorkspace-InfoBox-Dirty-Template',
			Template: /*html*/`<span class="ib-dirty ib-dirty--{~D:Record.State~}" title="{~D:Record.Tooltip~}">●</span>`
		},

		// ── Changed files block ───────────────────────────────────
		{
			Hash: 'Manager-ModuleWorkspace-ChangedFiles-Template',
			Template: /*html*/`
<div class="workspace-section">
	<h3>Changed files ({~D:Record.Count~})</h3>
	{~TS:Manager-ModuleWorkspace-ChangedFile-Row-Template:Record.Files~}
</div>
`
		},
		{
			Hash: 'Manager-ModuleWorkspace-ChangedFile-Row-Template',
			Template: /*html*/`
<div class="git-file">
	<span class="st">{~D:Record.StatusLabel~}</span>{~D:Record.Path~}{~TS:Manager-ModuleWorkspace-ChangedFile-AddBtn-Template:Record.AddBtnSlot~}
</div>
`
		},
		{
			Hash: 'Manager-ModuleWorkspace-ChangedFile-AddBtn-Template',
			Template: /*html*/` <button class="git-add-file" onclick="_Pict.views['Manager-ModuleWorkspace'].runAction('git-add-one', '{~D:Record.JsPath~}')">+ add</button>`
		},

		// ── Dependency sections ───────────────────────────────────
		{
			Hash: 'Manager-ModuleWorkspace-DepSection-Template',
			Template: /*html*/`
<div class="workspace-section dep-section">
	<h3>{~D:Record.Label~} ({~D:Record.Count~})</h3>
	<table class="dep-table"><tbody>
		{~TS:Manager-ModuleWorkspace-DepRow-Template:Record.Deps~}
	</tbody></table>
</div>
`
		},
		{
			Hash: 'Manager-ModuleWorkspace-DepRow-Template',
			Template: /*html*/`
<tr>
	<td class="{~D:Record.NameClass~}">{~TS:Manager-ModuleWorkspace-DepName-Link-Template:Record.NameLinkSlot~}{~TS:Manager-ModuleWorkspace-DepName-Plain-Template:Record.NamePlainSlot~}</td>
	<td class="dep-range">{~D:Record.Range~}</td>
	<td class="dep-links">{~TS:Manager-ModuleWorkspace-DepLink-Gh-Template:Record.GhSlot~}{~TS:Manager-ModuleWorkspace-DepLink-Docs-Template:Record.DocsSlot~}{~TS:Manager-ModuleWorkspace-DepLink-Repo-Template:Record.RepoSlot~}{~TS:Manager-ModuleWorkspace-DepLink-Npm-Template:Record.NpmSlot~}</td>
</tr>
`
		},
		{
			Hash: 'Manager-ModuleWorkspace-DepName-Link-Template',
			Template: /*html*/`<a class="dep-name-link" href="#/Module/{~D:Record.NameUrlEncoded~}" title="Open {~D:Record.Name~}">{~D:Record.Name~}</a>`
		},
		{
			Hash: 'Manager-ModuleWorkspace-DepName-Plain-Template',
			Template: /*html*/`{~D:Record.Name~}`
		},
		{
			Hash: 'Manager-ModuleWorkspace-DepLink-Gh-Template',
			Template: /*html*/`<a href="{~D:Record.Url~}" target="_blank" title="GitHub">gh</a>`
		},
		{
			Hash: 'Manager-ModuleWorkspace-DepLink-Docs-Template',
			Template: /*html*/`<a href="{~D:Record.Url~}" target="_blank" title="Docs">docs</a>`
		},
		{
			Hash: 'Manager-ModuleWorkspace-DepLink-Repo-Template',
			Template: /*html*/`<a href="{~D:Record.Url~}" target="_blank" title="Repository">repo</a>`
		},
		{
			Hash: 'Manager-ModuleWorkspace-DepLink-Npm-Template',
			Template: /*html*/`<a href="{~D:Record.Url~}" target="_blank" title="npm">npm</a>`
		},
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-ModuleWorkspace-Content',
			TemplateHash:       'Manager-ModuleWorkspace-Content-Template',
			DestinationAddress: '#RM-Workspace-Content',
			RenderMethod:       'replace',
		}
	]
};

class ManagerModuleWorkspaceView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._boundName = null;
		this._infoBoxCollapsed = true;
	}

	// External entry: the app routes /Module/:name here and calls loadModule.
	loadModule(pName)
	{
		this._boundName = pName;

		// Loading placeholder
		let tmpLoading = this.pict.parseTemplateByHash(
			'Manager-ModuleWorkspace-Loading-Template', { Name: pName });
		this.pict.ContentAssignment.assignContent('#RM-Workspace-Content', tmpLoading);

		this.pict.PictApplication.setStatus('Loading ' + pName + '...');

		this.pict.providers.ManagerAPI.loadModuleDetail(pName).then(
			(pDetail) =>
			{
				if (this._boundName !== pName) { return; }
				this.pict.AppData.Manager.SelectedModuleDetail = pDetail;
				this._renderFromDetail();
				this.pict.PictApplication.setStatus('Ready. ' + pName + '.');
			},
			(pError) =>
			{
				if (this._boundName !== pName) { return; }
				let tmpErr = this.pict.parseTemplateByHash(
					'Manager-ModuleWorkspace-Error-Template',
					{ Name: pName, Message: pError.message });
				this.pict.ContentAssignment.assignContent('#RM-Workspace-Content', tmpErr);
				this.pict.PictApplication.setStatus('Error loading ' + pName + '.');
			});
	}

	// Refresh the detail in the background and re-render the workspace.
	// Used after a module-scoped operation completes so stale data (like
	// uncommitted files that just got committed) updates.
	refreshDetail()
	{
		if (!this._boundName) { return; }
		let tmpName = this._boundName;
		this.pict.providers.ManagerAPI.loadModuleDetail(tmpName).then(
			(pDetail) =>
			{
				if (this._boundName !== tmpName) { return; }
				this.pict.AppData.Manager.SelectedModuleDetail = pDetail;
				this._renderFromDetail();
			},
			() => { /* swallow — not fatal */ });
	}

	_renderFromDetail()
	{
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.ModuleWorkspace = this._computeViewRecord();
		this.render();
	}

	toggleInfoBox()
	{
		let tmpEl = document.getElementById('RM-Mod-InfoBox');
		if (!tmpEl) { return; }
		this._infoBoxCollapsed = !this._infoBoxCollapsed;
		tmpEl.classList.toggle('collapsed', this._infoBoxCollapsed);
	}

	// ─────────────────────────────────────────────
	//  Data shaping for the templates — this is the only place that
	//  walks the API payload. Everything below is plain data; the
	//  templates above own all the markup.
	// ─────────────────────────────────────────────

	_computeViewRecord()
	{
		let tmpDetail = this.pict.AppData.Manager.SelectedModuleDetail;
		if (!tmpDetail || !tmpDetail.Manifest)
		{
			return this._emptyRecord();
		}

		let tmpManifest = tmpDetail.Manifest;
		let tmpPkg  = tmpDetail.Package  || {};
		let tmpGit  = tmpDetail.GitStatus || {};

		let tmpRecord =
		{
			Manifest:        tmpManifest,

			VersionBadgeSlot: tmpPkg.Version ? [{ Version: tmpPkg.Version }] : [],
			BranchBadgeSlot:  tmpGit.Branch  ? [{ Branch: tmpGit.Branch }]   : [],
			GitHubLinkSlot:   tmpManifest.GitHub        ? [{ Url: tmpManifest.GitHub }]        : [],
			NpmLinkSlot:      tmpPkg.Name               ? [{ Url: 'https://www.npmjs.com/package/' + encodeURIComponent(tmpPkg.Name) }] : [],
			DocsLinkSlot:     tmpManifest.Documentation ? [{ Url: tmpManifest.Documentation }] : [],
			DescriptionSlot:  tmpManifest.Description   ? [{ Description: tmpManifest.Description }] : [],

			InfoBox:          this._buildInfoBoxData(tmpManifest, tmpPkg, tmpGit),

			ChangedFilesSlot: this._buildChangedFilesSlot(tmpGit),

			RetoldDepsSlot:      this._buildDepSlot('Retold dependencies',       (tmpDetail.CategorizedDeps || {}).RetoldDeps,      true),
			ExternalDepsSlot:    this._buildDepSlot('External dependencies',     (tmpDetail.CategorizedDeps || {}).ExternalDeps,    false),
			RetoldDevDepsSlot:   this._buildDepSlot('Retold dev dependencies',   (tmpDetail.CategorizedDeps || {}).RetoldDevDeps,   true),
			ExternalDevDepsSlot: this._buildDepSlot('External dev dependencies', (tmpDetail.CategorizedDeps || {}).ExternalDevDeps, false),
		};

		return tmpRecord;
	}

	_emptyRecord()
	{
		return {
			Manifest:           { Name: '(none)' },
			VersionBadgeSlot:   [],
			BranchBadgeSlot:    [],
			GitHubLinkSlot:     [],
			NpmLinkSlot:        [],
			DocsLinkSlot:       [],
			DescriptionSlot:    [],
			InfoBox:            { Manifest: { Name: '(none)' }, VersionSlot: [], BranchSlot: [], AheadBehindSlot: [], DirtySlot: [],
				PkgName: '—', PkgVersion: '—', DepsCount: 0, DevDepsCount: 0,
				GitBranch: '—', AheadBehind: '0 / 0', DirtyLabel: 'no' },
			ChangedFilesSlot:    [],
			RetoldDepsSlot:      [],
			ExternalDepsSlot:    [],
			RetoldDevDepsSlot:   [],
			ExternalDevDepsSlot: [],
		};
	}

	_buildInfoBoxData(pManifest, pPkg, pGit)
	{
		let tmpAhead  = pGit.Ahead  || 0;
		let tmpBehind = pGit.Behind || 0;
		let tmpHasStaged   = !!pGit.HasStaged;
		let tmpHasUnstaged = !!pGit.HasUnstaged;

		// Color the dot by the most upstream pending step (matches the sidebar
		// badge convention): unstaged > staged > unpushed.
		let tmpDirtyState = null;
		if      (tmpHasUnstaged) { tmpDirtyState = 'unstaged'; }
		else if (tmpHasStaged)   { tmpDirtyState = 'staged'; }
		else if (tmpAhead > 0)   { tmpDirtyState = 'unpushed'; }
		else if (pGit.Dirty)     { tmpDirtyState = 'unstaged'; } // pre-upgrade fallback

		let tmpDirtyTip = '';
		if (tmpDirtyState)
		{
			let tmpParts = [];
			if (tmpHasUnstaged) { tmpParts.push('Unstaged changes'); }
			if (tmpHasStaged)   { tmpParts.push('Staged (uncommitted)'); }
			if (!tmpHasUnstaged && !tmpHasStaged && pGit.Dirty) { tmpParts.push('Uncommitted changes'); }
			if (tmpAhead > 0) { tmpParts.push(tmpAhead + ' unpushed commit' + (tmpAhead === 1 ? '' : 's')); }
			tmpDirtyTip = tmpParts.join(' · ');
		}

		// Surface the ahead / behind counts in the collapsed header so the
		// user can spot "needs push" / "behind upstream" at a glance. Only
		// rendered when we actually have git data — branchless modules
		// (orphan workdirs, fresh clones without an upstream) suppress the
		// pill since "0 / 0" is misleading there.
		let tmpAheadBehindSlot = pGit.Branch
			? [{
				Ahead:   tmpAhead,
				Behind:  tmpBehind,
				Tooltip: tmpAhead + ' commit' + (tmpAhead === 1 ? '' : 's') + ' ahead, '
					+ tmpBehind + ' commit' + (tmpBehind === 1 ? '' : 's') + ' behind upstream',
			}]
			: [];

		return {
			Manifest:        pManifest,
			VersionSlot:     pPkg.Version ? [{ Version: pPkg.Version }] : [],
			BranchSlot:      pGit.Branch  ? [{ Branch: pGit.Branch }]   : [],
			AheadBehindSlot: tmpAheadBehindSlot,
			DirtySlot:       tmpDirtyState ? [{ State: tmpDirtyState, Tooltip: tmpDirtyTip }] : [],

			PkgName:        pPkg.Name    || '—',
			PkgVersion:     pPkg.Version || '—',
			DepsCount:      pPkg.Dependencies    ? Object.keys(pPkg.Dependencies).length    : 0,
			DevDepsCount:   pPkg.DevDependencies ? Object.keys(pPkg.DevDependencies).length : 0,

			GitBranch:   pGit.Branch || '—',
			AheadBehind: tmpAhead + ' / ' + tmpBehind,
			DirtyLabel:  pGit.Dirty ? 'yes' : 'no',
		};
	}

	_buildChangedFilesSlot(pGit)
	{
		let tmpFiles = (pGit && pGit.Files) || [];
		if (!tmpFiles.length) { return []; }

		let tmpRows = [];
		for (let i = 0; i < tmpFiles.length; i++)
		{
			let tmpFile = tmpFiles[i];
			let tmpStatusTrim = (tmpFile.Status || '').trim() || '··';
			let tmpIsUntracked = (tmpFile.Status === '??');
			let tmpJsPath = (tmpFile.Path || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
			tmpRows.push({
				StatusLabel:  tmpStatusTrim,
				Path:         tmpFile.Path,
				JsPath:       tmpJsPath,
				AddBtnSlot:   tmpIsUntracked ? [{ JsPath: tmpJsPath }] : [],
			});
		}
		return [{ Count: tmpFiles.length, Files: tmpRows }];
	}

	_buildDepSlot(pLabel, pDeps, pIsRetold)
	{
		let tmpList = pDeps || [];
		if (!tmpList.length) { return []; }

		let tmpRows = [];
		for (let i = 0; i < tmpList.length; i++)
		{
			let tmpDep = tmpList[i];
			tmpRows.push({
				Name:            tmpDep.Name,
				Range:           tmpDep.Range,
				NameUrlEncoded:  encodeURIComponent(tmpDep.Name || ''),
				NameClass:       pIsRetold ? 'dep-name retold' : 'dep-name',
				NameLinkSlot:    pIsRetold ? [{ Name: tmpDep.Name, NameUrlEncoded: encodeURIComponent(tmpDep.Name || '') }] : [],
				NamePlainSlot:   pIsRetold ? [] : [{ Name: tmpDep.Name }],
				GhSlot:          (pIsRetold && tmpDep.GitHub)        ? [{ Url: tmpDep.GitHub }]        : [],
				DocsSlot:        (pIsRetold && tmpDep.Documentation) ? [{ Url: tmpDep.Documentation }] : [],
				RepoSlot:        (!pIsRetold && tmpDep.Repository)   ? [{ Url: tmpDep.Repository }]    : [],
				NpmSlot:         tmpDep.Npm                          ? [{ Url: tmpDep.Npm }]           : [],
			});
		}
		return [{ Label: pLabel, Count: tmpRows.length, Deps: tmpRows }];
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		// All buttons live in the templates with inline `onclick=_Pict.views[...].method(...)`
		// handlers that survive every re-render. No JS-side wiring here.

		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// Open the "more actions" dropdown for a given action group. Items per
	// group are kept here (next to the inline buttons in the template) so
	// the dispatch table is in one place.
	_openOverflow(pGroup, pAnchor)
	{
		let tmpModal = this.pict.views['Pict-Section-Modal'];
		if (!tmpModal) { return; }

		let tmpItems = [];
		switch (pGroup)
		{
			case 'npm':
				tmpItems =
				[
					{ Hash: 'install', Label: 'install' },
					{ Hash: 'types',   Label: 'types' },
					{ Hash: 'build',   Label: 'build' },
				];
				break;
			case 'version':
				tmpItems =
				[
					{ Hash: 'bump-minor', Label: '+ minor' },
					{ Hash: 'bump-major', Label: '+ major' },
				];
				break;
			case 'git':
				tmpItems =
				[
					{ Hash: 'pull', Label: 'pull' },
				];
				break;
			case 'publish':
				tmpItems =
				[
					{ Hash: 'serve-docs',           Label: 'serve docs locally' },
					{ Hash: 'edit-content',         Label: 'edit docs locally'  },
					{ Hash: 'build-serve-examples', Label: 'build and serve examples' },
					{ Hash: 'prepare-docs',         Label: 'prepare documentation index' },
				];
				break;
			default:
				return;
		}

		tmpModal.dropdown(pAnchor,
			{
				align: 'right',
				className: 'rm-overflow-menu',
				items: tmpItems,
			}).then((pChoice) =>
			{
				if (pChoice && pChoice.Hash) { this.runAction(pChoice.Hash, null); }
			});
	}

	// ─────────────────────────────────────────────
	//  Action dispatch
	// ─────────────────────────────────────────────

	runAction(pOp, pPath)
	{
		let tmpDetail = this.pict.AppData.Manager.SelectedModuleDetail;
		if (!tmpDetail || !tmpDetail.Manifest) { return; }
		let tmpName = tmpDetail.Manifest.Name;
		let tmpApi  = this.pict.providers.ManagerAPI;

		let tmpStartScopedOp = (pLabel) =>
		{
			this.pict.AppData.Manager.ActiveOperation =
				{
					OperationId: null,
					CommandTag:  null,
					Lines:       [],
					HeaderState: 'running',
					HeaderText:  pLabel,
					Scope:       'module',
					ModuleName:  tmpName,
				};
			let tmpLayout = this.pict.views['Manager-Layout'];
			if (tmpLayout && typeof tmpLayout.popLogPanel === 'function')
			{
				tmpLayout.popLogPanel();
			}
		};

		// Single-line helper: build the descriptor + close over the per-action
		// "stamp + popLogPanel + API call" sequence, then route through the
		// queue chokepoint. If nothing is running the work fires immediately;
		// otherwise it parks and runs after the current op completes — see
		// Pict-Provider-Manager-OperationsWS.enqueueOperation.
		let tmpEnqueue = (pLabel, pRunFn) =>
		{
			this.pict.providers.ManagerOperationsWS.enqueueOperation(
				() => { tmpStartScopedOp(pLabel); return pRunFn(); },
				{ Label: pLabel, ModuleName: tmpName });
		};

		switch (pOp)
		{
			case 'install':    return tmpEnqueue('npm install',     () => tmpApi.runModuleOperation(tmpName, 'npm', ['install'], 'npm install'));
			case 'test':       return tmpEnqueue('npm test',        () => tmpApi.runModuleOperation(tmpName, 'npm', ['test'],    'npm test'));
			case 'types':      return tmpEnqueue('npm run types',   () => tmpApi.runModuleOperation(tmpName, 'npm', ['run', 'types'], 'npm run types'));
			case 'build':      return tmpEnqueue('npm run build',   () => tmpApi.runModuleOperation(tmpName, 'npm', ['run', 'build'], 'npm run build'));
			case 'diff':       return this.pict.views['Manager-Modal-Diff'].open(tmpName);
			case 'git-add':    return tmpEnqueue('git add -A',      () => tmpApi.gitAddAll(tmpName));
			case 'git-add-one': return pPath
				? tmpEnqueue('git add ' + pPath, () => tmpApi.gitAddPaths(tmpName, [pPath]))
				: null;
			case 'pull':       return tmpEnqueue('git pull',        () => tmpApi.runModuleOperation(tmpName, 'git', ['pull'], 'git pull'));
			case 'push':       return tmpEnqueue('git push',        () => tmpApi.runModuleOperation(tmpName, 'git', ['push'], 'git push'));
			case 'bump-patch': return this._bumpWithGuard('patch');
			case 'bump-minor': return this._bumpWithGuard('minor');
			case 'bump-major': return this._bumpWithGuard('major');
			case 'commit':     return this.pict.views['Manager-Modal-Commit'].open(tmpName);
			case 'ncu':        return this.pict.views['Manager-Modal-Ncu'].open(tmpName);
			case 'publish':    return this.pict.views['Manager-Modal-Publish'].open(tmpName);
			case 'ripple':     return this.pict.views['Manager-Modal-RipplePlan'].open(tmpName);
			case 'prepare-docs': return tmpEnqueue('npx quack prepare-docs', () => tmpApi.runModuleOperation(tmpName, 'npx', ['quack', 'prepare-docs'], 'npx quack prepare-docs'));
			case 'serve-docs':           return this._startDocserve(tmpName);
			case 'edit-content':         return this._startContentEditor(tmpName);
			case 'build-serve-examples': return this._startExamples(tmpName);
			default:
				this.pict.PictApplication.setStatus('Action not yet wired: ' + pOp);
		}
	}

	// ─────────────────────────────────────────────
	//  Local docuserve spawn — kicks off a fresh pict-docuserve dev
	//  server (fixed port 43210) pointed at the selected module, then
	//  opens it in a new tab.  Single-instance: the backend supervisor
	//  kills any in-flight serve when this fires for a different
	//  module, so switching contexts is a one-click flow.
	// ─────────────────────────────────────────────

	// Run a supervisor-launch as a first-class action: the publish overflow
	// menu items "serve local docs" and "edit content" now flow through
	// the same ActiveOperation / ActionHistory machinery as build/test/
	// publish so the launch is visible in the persistent log bar with a
	// running -> success/error lifecycle.
	//
	// pParams = { Label, CommandLine, ModuleName, ApiCall, SuccessText, FailText }
	// ApiCall is a 0-arg fn returning a Promise<state>.
	_launchAsAction(pParams)
	{
		let tmpOpId  = 'launch_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36);
		let tmpLines = [
			{ Class: 'cmd',  Text: '$ ' + pParams.CommandLine },
			{ Class: 'meta', Text: '  ' + pParams.Label }
		];
		let tmpOp =
			{
				OperationId: tmpOpId,
				CommandTag:  'launch',
				Lines:       tmpLines,
				HeaderState: 'running',
				HeaderText:  pParams.Label,
				Scope:       'module',
				ModuleName:  pParams.ModuleName
			};
		this.pict.AppData.Manager.ActiveOperation = tmpOp;

		let tmpManager = this.pict.AppData.Manager;
		if (!tmpManager.ActionHistory) { tmpManager.ActionHistory = []; }
		tmpManager.ActionHistory.unshift(
			{
				OperationId: tmpOpId,
				Label:       pParams.Label,
				ModuleName:  pParams.ModuleName,
				Scope:       'module',
				StartedAt:   new Date().toISOString(),
				EndedAt:     null,
				State:       'running',
				Lines:       tmpLines
			});

		let tmpLayout = this.pict.views['Manager-Layout'];
		if (tmpLayout && typeof tmpLayout.popLogPanel === 'function') { tmpLayout.popLogPanel(); }
		let tmpLogBar = this.pict.views['Manager-LogBar'];
		if (tmpLogBar && typeof tmpLogBar.scheduleAppend === 'function') { tmpLogBar.scheduleAppend(); }

		let finalize = (pState, pErr) =>
			{
				if (pErr)
				{
					tmpLines.push({ Class: 'error', Text: pParams.FailText(pErr) });
					tmpOp.HeaderState = 'error';
					tmpOp.HeaderText  = pParams.Label + ' — failed';
				}
				else
				{
					tmpLines.push({ Class: 'success', Text: pParams.SuccessText(pState) });
					tmpOp.HeaderState = 'success';
					tmpOp.HeaderText  = pParams.Label + ' — running';
				}
				for (let i = 0; i < tmpManager.ActionHistory.length; i++)
				{
					if (tmpManager.ActionHistory[i].OperationId === tmpOpId)
					{
						tmpManager.ActionHistory[i].State   = tmpOp.HeaderState;
						tmpManager.ActionHistory[i].EndedAt = new Date().toISOString();
						break;
					}
				}
				if (tmpLogBar && typeof tmpLogBar.scheduleAppend === 'function') { tmpLogBar.scheduleAppend(); }
			};

		return pParams.ApiCall().then(
			(pState) => { finalize(pState, null); return pState; },
			(pErr)   => { finalize(null,   pErr);  throw pErr; });
	}

	_startDocserve(pModuleName)
	{
		let tmpApi = this.pict.providers.ManagerAPI;
		this.pict.PictApplication.setStatus('Starting local docuserve for ' + pModuleName + '...');
		return this._launchAsAction(
			{
				Label:       'documentation preview: ' + pModuleName,
				CommandLine: 'docuserve serve ' + pModuleName + ' --port 43210',
				ModuleName:  pModuleName,
				ApiCall:     () => tmpApi.docserveStart(pModuleName),
				SuccessText: (pState) => 'Listening at ' + pState.URL,
				FailText:    (pErr)   => 'docuserve failed: ' + (pErr && pErr.message ? pErr.message : pErr)
			}).then((pState) =>
		{
			if (pState && pState.Running)
			{
				this.pict.AppData.Manager.DocServe = pState;
				let tmpNav = this.pict.views['Manager-TopBar-Nav'];
				if (tmpNav && typeof tmpNav.render === 'function') { tmpNav.render(); }
				this.pict.PictApplication.setStatus('docuserve running on ' + pState.URL);
				if (typeof window !== 'undefined' && pState.URL)
				{
					window.open(pState.URL, '_blank', 'noopener');
				}
			}
			else
			{
				this.pict.PictApplication.setStatus('docuserve did not start.');
			}
		}, (pError) =>
		{
			this.pict.PictApplication.setStatus('docuserve failed: ' + (pError && pError.message ? pError.message : pError));
		});
	}

	_startContentEditor(pModuleName)
	{
		let tmpApi = this.pict.providers.ManagerAPI;
		this.pict.PictApplication.setStatus('Starting content editor for ' + pModuleName + '...');
		return this._launchAsAction(
			{
				Label:       'documentation edit: ' + pModuleName,
				CommandLine: 'retold-content-system serve ' + pModuleName + '/docs --port 43211',
				ModuleName:  pModuleName,
				ApiCall:     () => tmpApi.contentEditorStart(pModuleName),
				SuccessText: (pState) => 'Listening at ' + pState.URL,
				FailText:    (pErr)   => 'content editor failed: ' + (pErr && pErr.message ? pErr.message : pErr)
			}).then((pState) =>
		{
			if (pState && pState.Running)
			{
				this.pict.AppData.Manager.ContentEditor = pState;
				let tmpNav = this.pict.views['Manager-TopBar-Nav'];
				if (tmpNav && typeof tmpNav.render === 'function') { tmpNav.render(); }
				this.pict.PictApplication.setStatus('content editor running on ' + pState.URL);
				if (typeof window !== 'undefined' && pState.URL)
				{
					window.open(pState.URL, '_blank', 'noopener');
				}
			}
			else
			{
				this.pict.PictApplication.setStatus('content editor did not start.');
			}
		}, (pError) =>
		{
			this.pict.PictApplication.setStatus('content editor failed: ' + (pError && pError.message ? pError.message : pError));
		});
	}

	_startExamples(pModuleName)
	{
		let tmpApi = this.pict.providers.ManagerAPI;
		this.pict.PictApplication.setStatus('Building examples for ' + pModuleName + ' (this may take a minute)...');
		return this._launchAsAction(
			{
				Label:       'build & serve examples: ' + pModuleName,
				CommandLine: 'npm install && npx quack examples --port 43212',
				ModuleName:  pModuleName,
				ApiCall:     () => tmpApi.examplesStart(pModuleName),
				SuccessText: (pState) => 'Listening at ' + pState.URL + ' (phase: ' + (pState.Phase || 'running') + ')',
				FailText:    (pErr)   => 'examples failed: ' + (pErr && pErr.message ? pErr.message : pErr)
			}).then((pState) =>
		{
			if (pState && pState.Running)
			{
				this.pict.AppData.Manager.Examples = pState;
				let tmpNav = this.pict.views['Manager-TopBar-Nav'];
				if (tmpNav && typeof tmpNav.render === 'function') { tmpNav.render(); }
				this.pict.PictApplication.setStatus('examples running on ' + pState.URL);
				if (typeof window !== 'undefined' && pState.URL)
				{
					window.open(pState.URL, '_blank', 'noopener');
				}
			}
			else
			{
				this.pict.PictApplication.setStatus('examples did not start.');
			}
		}, (pError) =>
		{
			this.pict.PictApplication.setStatus('examples failed: ' + (pError && pError.message ? pError.message : pError));
		});
	}

	// ─────────────────────────────────────────────
	//  Bump guard — prevent accidentally skipping a version
	// ─────────────────────────────────────────────

	_bumpWithGuard(pKind)
	{
		let tmpDetail = this.pict.AppData.Manager.SelectedModuleDetail;
		if (!tmpDetail || !tmpDetail.Package) { return; }

		let tmpPkg = tmpDetail.Package;
		let tmpName = tmpDetail.Manifest.Name;
		let tmpLocal = this._parseSemver(tmpPkg.Version);
		let tmpPub   = this._parseSemver(tmpPkg.PublishedVersion);

		let tmpLabel = 'npm version ' + pKind;
		let tmpProceed = () =>
		{
			// Optimistically advance local Version so a rapid second click is
			// computed against the projected post-bump state, not stale data.
			if (tmpLocal)
			{
				let tmpNext = this._projectBump(tmpLocal, pKind);
				tmpPkg.Version = tmpNext.Major + '.' + tmpNext.Minor + '.' + tmpNext.Patch;
			}
			// Route through the operation queue so a bump click landing
			// while another op is running (the common ncu-apply + patch
			// misclick) parks the bump instead of corrupting state.
			this.pict.providers.ManagerOperationsWS.enqueueOperation(
				() =>
				{
					this.pict.AppData.Manager.ActiveOperation =
						{
							OperationId: null,
							CommandTag:  null,
							Lines:       [],
							HeaderState: 'running',
							HeaderText:  tmpLabel,
							Scope:       'module',
							ModuleName:  tmpName,
						};
					let tmpLayout = this.pict.views['Manager-Layout'];
					if (tmpLayout && typeof tmpLayout.popLogPanel === 'function')
					{
						tmpLayout.popLogPanel();
					}
					return this.pict.providers.ManagerAPI.bumpVersion(tmpName, pKind);
				},
				{ Label: tmpLabel, ModuleName: tmpName });
		};

		// No guard possible without a parseable local version, or with
		// prerelease tags on either side — defer to the human.
		if (!tmpLocal || tmpLocal.Prerelease || (tmpPub && tmpPub.Prerelease))
		{
			return tmpProceed();
		}

		// If nothing is published yet, any bump is fine.
		if (!tmpPub) { return tmpProceed(); }

		let tmpProjected       = this._projectBump(tmpLocal, pKind);
		let tmpExpectedFromPub = this._projectBump(tmpPub, pKind);

		// Sequential from the *published* baseline → safe, no prompt.
		if (this._eqSemver(tmpProjected, tmpExpectedFromPub)) { return tmpProceed(); }

		let tmpProjectedStr = tmpProjected.Major + '.' + tmpProjected.Minor + '.' + tmpProjected.Patch;
		let tmpExpectedStr  = tmpExpectedFromPub.Major + '.' + tmpExpectedFromPub.Minor + '.' + tmpExpectedFromPub.Patch;

		let tmpMessage =
			'npm has v' + tmpPkg.PublishedVersion + '; local is v' + tmpPkg.Version + '.'
			+ ' Clicking "' + pKind + '" would set local to v' + tmpProjectedStr + ','
			+ ' but a ' + pKind + ' bump from npm would land on v' + tmpExpectedStr + '.'
			+ ' You are about to skip v' + tmpExpectedStr + ' (which is not published).';

		let tmpModal = this.pict.views['Pict-Section-Modal'];
		if (!tmpModal || typeof tmpModal.confirm !== 'function')
		{
			this.pict.PictApplication.setStatus('Skip-version guard cannot prompt; aborting bump.');
			return;
		}
		return tmpModal.confirm(tmpMessage,
			{
				title:        'Skip version v' + tmpExpectedStr + '?',
				confirmLabel: 'Bump to v' + tmpProjectedStr,
				cancelLabel:  'Cancel',
				dangerous:    true
			}).then((pOk) => { if (pOk) { tmpProceed(); } });
	}

	_parseSemver(pVersion)
	{
		if (typeof pVersion !== 'string') { return null; }
		let tmpMatch = pVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
		if (!tmpMatch) { return null; }
		return {
			Major: parseInt(tmpMatch[1], 10),
			Minor: parseInt(tmpMatch[2], 10),
			Patch: parseInt(tmpMatch[3], 10),
			Prerelease: tmpMatch[4] || null,
		};
	}

	_projectBump(pBase, pKind)
	{
		if (pKind === 'major') { return { Major: pBase.Major + 1, Minor: 0, Patch: 0 }; }
		if (pKind === 'minor') { return { Major: pBase.Major, Minor: pBase.Minor + 1, Patch: 0 }; }
		return { Major: pBase.Major, Minor: pBase.Minor, Patch: pBase.Patch + 1 };
	}

	_eqSemver(pA, pB)
	{
		return pA.Major === pB.Major && pA.Minor === pB.Minor && pA.Patch === pB.Patch;
	}
}

module.exports = ManagerModuleWorkspaceView;
module.exports.default_configuration = _ViewConfiguration;
