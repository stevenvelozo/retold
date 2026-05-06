const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-ModuleWorkspace',

	DefaultRenderable:            'Manager-ModuleWorkspace-Content',
	DefaultDestinationAddress:    '#RM-Workspace-Content',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.ModuleWorkspace',

	AutoRender: false,

	Templates:
	[
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
		{
			Hash: 'Manager-ModuleWorkspace-Content-Template',
			Template: /*html*/`
<div id="RM-Mod-InfoBox" class="module-info-box collapsed"
	onclick="{~P~}.views['Manager-ModuleWorkspace'].toggleInfoBox()">
	{~D:Record.InfoBoxBody~}
</div>

<div class="workspace-header">
	<span class="module-name">{~D:Record.Manifest.Name~}</span>
	{~D:Record.PackageVersionBadge~}
	{~D:Record.GitBranchBadge~}
	<div class="workspace-header-right">
		{~D:Record.GitHubLink~}
		{~D:Record.NpmLink~}
		{~D:Record.DocsLink~}
	</div>
</div>
{~D:Record.DescriptionBlock~}

<div class="action-groups">
	<div class="action-group">
		<div class="action-group-label">npm</div>
		<div class="action-row">
			<button class="action" data-op="ncu">ncu</button>
			<button class="action" data-op="test">test</button>
			<button class="action action-more" data-overflow="npm" aria-label="More npm actions" title="More npm actions">{~D:Record.CaretIcon~}</button>
		</div>
	</div>
	<div class="action-group">
		<div class="action-group-label">version</div>
		<div class="action-row">
			<button class="action" data-op="bump-patch">+ patch</button>
			<button class="action action-more" data-overflow="version" aria-label="More version actions" title="More version actions">{~D:Record.CaretIcon~}</button>
		</div>
	</div>
	<div class="action-group">
		<div class="action-group-label">git</div>
		<div class="action-row">
			<button class="action" data-op="git-add">add -A</button>
			<button class="action" data-op="diff">diff</button>
			<button class="action" data-op="commit">commit</button>
			<button class="action" data-op="push">push</button>
			<button class="action action-more" data-overflow="git" aria-label="More git actions" title="More git actions">{~D:Record.CaretIcon~}</button>
		</div>
	</div>
	<div class="action-group">
		<div class="action-group-label">publish</div>
		<div class="action-row">
			<button class="action success" data-op="publish" title="Open the publish dialog (npm, npm + Docker image, or plan a ripple from here)">publish</button>
		</div>
	</div>
</div>

<!-- Live operation log for this module's most recent action -->
<div id="RM-OutputPanelContainer"></div>

<div id="RM-Mod-FilesArea">{~D:Record.GitFilesSection~}</div>

<div id="RM-Mod-DepsArea">
	{~D:Record.RetoldDepsSection~}
	{~D:Record.ExternalDepsSection~}
	{~D:Record.RetoldDevDepsSection~}
	{~D:Record.ExternalDevDepsSection~}
</div>
`
		}
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

	// Refresh the detail in the background and patch the dynamic sections of
	// the workspace (info box + deps + git files) without disturbing the
	// inline output panel. Used after a module-scoped operation completes so
	// stale data (like uncommitted files that just got committed) updates.
	refreshDetail()
	{
		if (!this._boundName) { return; }
		let tmpName = this._boundName;
		this.pict.providers.ManagerAPI.loadModuleDetail(tmpName).then(
			(pDetail) =>
			{
				if (this._boundName !== tmpName) { return; }
				this.pict.AppData.Manager.SelectedModuleDetail = pDetail;
				this._patchDynamicSections();
			},
			() => { /* swallow — not fatal */ });
	}

	_renderFromDetail()
	{
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.ModuleWorkspace = this._computeViewRecord();
		this.render();
	}

	// Replace just the info-box body and the deps area in place. Keeps the
	// output panel intact (its DOM container survives because we don't touch
	// #RM-OutputPanelContainer).
	_patchDynamicSections()
	{
		let tmpRecord = this._computeViewRecord();
		this.pict.AppData.Manager.ViewRecord.ModuleWorkspace = tmpRecord;

		let tmpInfo = document.getElementById('RM-Mod-InfoBox');
		if (tmpInfo) { tmpInfo.innerHTML = tmpRecord.InfoBoxBody; }

		let tmpFiles = document.getElementById('RM-Mod-FilesArea');
		if (tmpFiles) { tmpFiles.innerHTML = tmpRecord.GitFilesSection; }

		let tmpDeps = document.getElementById('RM-Mod-DepsArea');
		if (tmpDeps)
		{
			tmpDeps.innerHTML = ''
				+ tmpRecord.RetoldDepsSection
				+ tmpRecord.ExternalDepsSection
				+ tmpRecord.RetoldDevDepsSection
				+ tmpRecord.ExternalDevDepsSection;
		}

		this._wireFileButtons();
	}

	toggleInfoBox()
	{
		let tmpEl = document.getElementById('RM-Mod-InfoBox');
		if (!tmpEl) { return; }
		this._infoBoxCollapsed = !this._infoBoxCollapsed;
		tmpEl.classList.toggle('collapsed', this._infoBoxCollapsed);
	}

	_computeViewRecord()
	{
		let tmpDetail = this.pict.AppData.Manager.SelectedModuleDetail;
		if (!tmpDetail || !tmpDetail.Manifest)
		{
			return { Manifest: { Name: '(none)' }, InfoBoxBody: '' };
		}

		let tmpManifest = tmpDetail.Manifest;
		let tmpPkg  = tmpDetail.Package;
		let tmpGit  = tmpDetail.GitStatus;

		let tmpRecord = { Manifest: tmpManifest };

		tmpRecord.PackageVersionBadge = (tmpPkg && tmpPkg.Version)
			? '<span class="module-version">v' + this._escape(tmpPkg.Version) + '</span>'
			: '';

		tmpRecord.GitBranchBadge = (tmpGit && tmpGit.Branch)
			? '<span class="module-branch">' + this._escape(tmpGit.Branch) + '</span>'
			: '';

		tmpRecord.GitHubLink = tmpManifest.GitHub
			? '<a href="' + this._escape(tmpManifest.GitHub) + '" target="_blank">GitHub</a>'
			: '';

		tmpRecord.NpmLink = (tmpPkg && tmpPkg.Name)
			? '<a href="https://www.npmjs.com/package/' + encodeURIComponent(tmpPkg.Name)
				+ '" target="_blank">npm</a>'
			: '';

		tmpRecord.DocsLink = tmpManifest.Documentation
			? '<a href="' + this._escape(tmpManifest.Documentation) + '" target="_blank">Docs</a>'
			: '';

		tmpRecord.DescriptionBlock = tmpManifest.Description
			? '<p style="color:var(--color-muted);margin-top:0">' + this._escape(tmpManifest.Description) + '</p>'
			: '';

		// Floating info-box body (Package + Git status summary).
		tmpRecord.InfoBoxBody = this._renderInfoBoxBody(tmpManifest, tmpPkg, tmpGit);
		// Inline changed-files block (lives above the deps section).
		tmpRecord.GitFilesSection = this._renderInlineFilesSection(tmpGit);
		// Inline caret icon shared by all "more actions" triggers.
		tmpRecord.CaretIcon = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

		// Dependency tables (server already split retold vs external)
		let tmpCat = tmpDetail.CategorizedDeps || {};
		tmpRecord.RetoldDepsSection      = this._renderDepSection('Retold dependencies',      tmpCat.RetoldDeps || [],      true);
		tmpRecord.ExternalDepsSection    = this._renderDepSection('External dependencies',    tmpCat.ExternalDeps || [],    false);
		tmpRecord.RetoldDevDepsSection   = this._renderDepSection('Retold dev dependencies',  tmpCat.RetoldDevDeps || [],   true);
		tmpRecord.ExternalDevDepsSection = this._renderDepSection('External dev dependencies',tmpCat.ExternalDevDeps || [], false);

		return tmpRecord;
	}

	_renderInfoBoxBody(pManifest, pPkg, pGit)
	{
		let tmpVersion = (pPkg && pPkg.Version) ? 'v' + pPkg.Version : '';
		let tmpBranch  = (pGit && pGit.Branch)  ? pGit.Branch : '';
		// Color the dot by the most upstream pending step (matches the sidebar
		// badge convention): unstaged > staged > unpushed.
		let tmpAhead = (pGit && pGit.Ahead) || 0;
		let tmpHasStaged   = !!(pGit && pGit.HasStaged);
		let tmpHasUnstaged = !!(pGit && pGit.HasUnstaged);
		let tmpDirtyState = null;
		if      (tmpHasUnstaged) { tmpDirtyState = 'unstaged'; }
		else if (tmpHasStaged)   { tmpDirtyState = 'staged'; }
		else if (tmpAhead > 0)   { tmpDirtyState = 'unpushed'; }
		else if (pGit && pGit.Dirty) { tmpDirtyState = 'unstaged'; } // pre-upgrade fallback

		let tmpDirtyTip = '';
		if (tmpDirtyState)
		{
			let tmpParts = [];
			if (tmpHasUnstaged) { tmpParts.push('Unstaged changes'); }
			if (tmpHasStaged)   { tmpParts.push('Staged (uncommitted)'); }
			if (!tmpHasUnstaged && !tmpHasStaged && pGit && pGit.Dirty) { tmpParts.push('Uncommitted changes'); }
			if (tmpAhead > 0) { tmpParts.push(tmpAhead + ' unpushed commit' + (tmpAhead === 1 ? '' : 's')); }
			tmpDirtyTip = tmpParts.join(' · ');
		}

		// Header is always shown (drives both the collapsed and expanded forms).
		let tmpHtml = ''
			+ '<div class="info-header">'
			+ '<span class="ib-name">' + this._escape(pManifest.Name) + '</span>'
			+ (tmpVersion ? '<span class="ib-version">' + this._escape(tmpVersion) + '</span>' : '')
			+ (tmpBranch  ? '<span class="ib-branch">' + this._escape(tmpBranch) + '</span>'   : '')
			+ (tmpDirtyState
				? '<span class="ib-dirty ib-dirty--' + tmpDirtyState + '" title="'
					+ this._escape(tmpDirtyTip) + '">●</span>'
				: '')
			+ '<span class="ib-toggle"></span>'
			+ '</div>';

		// Expanded body — package and git details.
		tmpHtml += '<div class="info-body" onclick="event.stopPropagation()">';

		tmpHtml += '<div class="ib-section"><h4>Package</h4><dl class="kv">';
		tmpHtml += '<dt>name</dt><dd>' + this._escape((pPkg && pPkg.Name) || '—') + '</dd>';
		tmpHtml += '<dt>version</dt><dd>' + this._escape((pPkg && pPkg.Version) || '—') + '</dd>';
		tmpHtml += '<dt>dependencies</dt><dd>'
			+ (pPkg && pPkg.Dependencies ? Object.keys(pPkg.Dependencies).length : 0) + '</dd>';
		tmpHtml += '<dt>devDependencies</dt><dd>'
			+ (pPkg && pPkg.DevDependencies ? Object.keys(pPkg.DevDependencies).length : 0) + '</dd>';
		tmpHtml += '</dl></div>';

		tmpHtml += '<div class="ib-section"><h4>Git status</h4><dl class="kv">';
		tmpHtml += '<dt>branch</dt><dd>' + this._escape((pGit && pGit.Branch) || '—') + '</dd>';
		tmpHtml += '<dt>ahead / behind</dt><dd>'
			+ ((pGit && pGit.Ahead) || 0) + ' / ' + ((pGit && pGit.Behind) || 0) + '</dd>';
		tmpHtml += '<dt>dirty</dt><dd>' + (pGit && pGit.Dirty ? 'yes' : 'no') + '</dd>';
		tmpHtml += '</dl>';
		tmpHtml += '</div>';

		tmpHtml += '</div>';
		return tmpHtml;
	}

	// Inline list of changed files (above the deps tables). Renders nothing
	// when the working tree is clean.
	_renderInlineFilesSection(pGit)
	{
		let tmpFiles = (pGit && pGit.Files) || [];
		if (!tmpFiles.length) { return ''; }
		let tmpHtml = '<div class="workspace-section"><h3>Changed files (' + tmpFiles.length + ')</h3>';
		for (let i = 0; i < tmpFiles.length; i++)
		{
			let tmpFile = tmpFiles[i];
			let tmpIsUntracked = (tmpFile.Status === '??');
			tmpHtml += '<div class="git-file">'
				+ '<span class="st">' + this._escape(tmpFile.Status.trim() || '··') + '</span>'
				+ this._escape(tmpFile.Path);
			if (tmpIsUntracked)
			{
				tmpHtml += ' <button class="git-add-file" data-op="git-add-one" data-path="'
					+ this._escape(tmpFile.Path) + '">+ add</button>';
			}
			tmpHtml += '</div>';
		}
		tmpHtml += '</div>';
		return tmpHtml;
	}

	_renderDepSection(pLabel, pDeps, pIsRetold)
	{
		if (!pDeps.length) { return ''; }

		let tmpHtml = '<div class="workspace-section dep-section">';
		tmpHtml += '<h3>' + this._escape(pLabel) + ' (' + pDeps.length + ')</h3>';
		tmpHtml += '<table class="dep-table"><tbody>';
		for (let i = 0; i < pDeps.length; i++)
		{
			let tmpDep  = pDeps[i];
			let tmpLinks = '';
			if (pIsRetold)
			{
				if (tmpDep.GitHub)
				{
					tmpLinks += '<a href="' + this._escape(tmpDep.GitHub) + '" target="_blank" title="GitHub">gh</a>';
				}
				if (tmpDep.Documentation)
				{
					tmpLinks += '<a href="' + this._escape(tmpDep.Documentation) + '" target="_blank" title="Docs">docs</a>';
				}
			}
			else if (tmpDep.Repository)
			{
				// External deps: surface the repo URL that was harvested from
				// node_modules/<pkg>/package.json on the server.
				tmpLinks += '<a href="' + this._escape(tmpDep.Repository) + '" target="_blank" title="Repository">repo</a>';
			}
			if (tmpDep.Npm)
			{
				tmpLinks += '<a href="' + this._escape(tmpDep.Npm) + '" target="_blank" title="npm">npm</a>';
			}

			let tmpNameCls = pIsRetold ? 'dep-name retold' : 'dep-name';
			let tmpNameCell;
			if (pIsRetold)
			{
				// Click-through to the dep's workspace.
				tmpNameCell = '<a class="dep-name-link" href="#/Module/'
					+ encodeURIComponent(tmpDep.Name) + '" title="Open ' + this._escape(tmpDep.Name) + '">'
					+ this._escape(tmpDep.Name) + '</a>';
			}
			else
			{
				tmpNameCell = this._escape(tmpDep.Name);
			}

			tmpHtml += '<tr>';
			tmpHtml += '<td class="' + tmpNameCls + '">' + tmpNameCell + '</td>';
			tmpHtml += '<td class="dep-range">' + this._escape(tmpDep.Range) + '</td>';
			tmpHtml += '<td class="dep-links">' + tmpLinks + '</td>';
			tmpHtml += '</tr>';
		}
		tmpHtml += '</tbody></table>';
		tmpHtml += '</div>';
		return tmpHtml;
	}

	// Note: onBeforeRender is NOT the place to populate the record address —
	// pict-view reads from that address before onBeforeRender fires. See
	// loadModule() and runAction() for where ViewRecord.ModuleWorkspace gets
	// refreshed ahead of render().

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		// Wire action-bar buttons. Buttons without data-op are ignored.
		let tmpWorkspace = document.getElementById('RM-Workspace');
		if (tmpWorkspace)
		{
			let tmpButtons = tmpWorkspace.querySelectorAll('.action-groups button[data-op]');
			for (let i = 0; i < tmpButtons.length; i++)
			{
				tmpButtons[i].addEventListener('click', (pEvent) =>
					{
						let tmpOp = pEvent.currentTarget.getAttribute('data-op');
						this.runAction(tmpOp, null);
					});
			}
			let tmpOverflow = tmpWorkspace.querySelectorAll('.action-groups button[data-overflow]');
			for (let i = 0; i < tmpOverflow.length; i++)
			{
				tmpOverflow[i].addEventListener('click', (pEvent) =>
					{
						pEvent.stopPropagation();
						let tmpGroup = pEvent.currentTarget.getAttribute('data-overflow');
						this._openOverflow(tmpGroup, pEvent.currentTarget);
					});
			}
		}
		this._wireFileButtons();

		// Re-render the output panel into the freshly created anchor so any
		// in-flight operation lines stay visible after a refresh.
		if (this.pict.views['Manager-OutputPanel'])
		{
			this.pict.views['Manager-OutputPanel'].render();
		}

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

	// Wire up the per-file "+ add" buttons in the inline changed-files block.
	_wireFileButtons()
	{
		let tmpFiles = document.getElementById('RM-Mod-FilesArea');
		if (!tmpFiles) { return; }
		let tmpButtons = tmpFiles.querySelectorAll('button[data-op="git-add-one"]');
		for (let i = 0; i < tmpButtons.length; i++)
		{
			tmpButtons[i].addEventListener('click', (pEvent) =>
				{
					let tmpPath = pEvent.currentTarget.getAttribute('data-path');
					this.runAction('git-add-one', tmpPath);
				});
		}
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

		// Stamp the active operation so the WS layer can route its frames to
		// the inline output panel (vs. the cross-module modal).
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
			if (this.pict.views['Manager-OutputPanel'])
			{
				this.pict.views['Manager-OutputPanel'].render();
			}
		};

		switch (pOp)
		{
			case 'install':    tmpStartScopedOp('npm install');         return tmpApi.runModuleOperation(tmpName, 'npm', ['install'], 'npm install');
			case 'test':       tmpStartScopedOp('npm test');            return tmpApi.runModuleOperation(tmpName, 'npm', ['test'],    'npm test');
			case 'types':      tmpStartScopedOp('npm run types');       return tmpApi.runModuleOperation(tmpName, 'npm', ['run', 'types'], 'npm run types');
			case 'build':      tmpStartScopedOp('npm run build');       return tmpApi.runModuleOperation(tmpName, 'npm', ['run', 'build'], 'npm run build');
			case 'diff':       return this.pict.views['Manager-Modal-Diff'].open(tmpName);
			case 'git-add':    tmpStartScopedOp('git add -A');          return tmpApi.gitAddAll(tmpName);
			case 'git-add-one': tmpStartScopedOp('git add ' + (pPath || '')); return pPath ? tmpApi.gitAddPaths(tmpName, [pPath]) : null;
			case 'pull':       tmpStartScopedOp('git pull');            return tmpApi.runModuleOperation(tmpName, 'git', ['pull'], 'git pull');
			case 'push':       tmpStartScopedOp('git push');            return tmpApi.runModuleOperation(tmpName, 'git', ['push'], 'git push');
			case 'bump-patch': return this._bumpWithGuard('patch');
			case 'bump-minor': return this._bumpWithGuard('minor');
			case 'bump-major': return this._bumpWithGuard('major');
			case 'commit':     return this.pict.views['Manager-Modal-Commit'].open(tmpName);
			case 'ncu':        return this.pict.views['Manager-Modal-Ncu'].open(tmpName);
			case 'publish':    return this.pict.views['Manager-Modal-Publish'].open(tmpName);
			case 'ripple':     return this.pict.views['Manager-Modal-RipplePlan'].open(tmpName);
			default:
				this.pict.PictApplication.setStatus('Action not yet wired: ' + pOp);
		}
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

		let tmpProceed = () =>
		{
			// Optimistically advance local Version so a rapid second click is
			// computed against the projected post-bump state, not stale data.
			if (tmpLocal)
			{
				let tmpNext = this._projectBump(tmpLocal, pKind);
				tmpPkg.Version = tmpNext.Major + '.' + tmpNext.Minor + '.' + tmpNext.Patch;
			}
			// Stamp the operation for inline output + post-completion refresh.
			this.pict.AppData.Manager.ActiveOperation =
				{
					OperationId: null,
					CommandTag:  null,
					Lines:       [],
					HeaderState: 'running',
					HeaderText:  'npm version ' + pKind,
					Scope:       'module',
					ModuleName:  tmpName,
				};
			if (this.pict.views['Manager-OutputPanel']) { this.pict.views['Manager-OutputPanel'].render(); }
			return this.pict.providers.ManagerAPI.bumpVersion(tmpName, pKind);
		};

		// No guard possible without a parseable local version, or with
		// prerelease tags on either side — defer to the human.
		if (!tmpLocal || tmpLocal.Prerelease || (tmpPub && tmpPub.Prerelease))
		{
			return tmpProceed();
		}

		// If nothing is published yet, any bump is fine.
		if (!tmpPub) { return tmpProceed(); }

		let tmpProjected       = this._projectBump(tmpLocal, pKind);   // where local lands after the click
		let tmpExpectedFromPub = this._projectBump(tmpPub, pKind);     // where a fresh bump from npm would land

		// Sequential from the *published* baseline → safe, no prompt.
		if (this._eqSemver(tmpProjected, tmpExpectedFromPub)) { return tmpProceed(); }

		// Not sequential from npm → we're about to create a gap. Name the
		// skipped version explicitly in the prompt.
		let tmpProjectedStr = tmpProjected.Major + '.' + tmpProjected.Minor + '.' + tmpProjected.Patch;
		let tmpExpectedStr  = tmpExpectedFromPub.Major + '.' + tmpExpectedFromPub.Minor + '.' + tmpExpectedFromPub.Patch;

		let tmpMessage =
			'npm has v' + tmpPkg.PublishedVersion + '; local is v' + tmpPkg.Version + '.'
			+ '\n\nClicking "' + pKind + '" would set local to v' + tmpProjectedStr + ','
			+ ' but a ' + pKind + ' bump from npm would land on v' + tmpExpectedStr + '.'
			+ '\n\nYou are about to skip v' + tmpExpectedStr + ' (which is not published).'
			+ '\n\nContinue with ' + pKind + ' bump?';

		if (!window.confirm(tmpMessage)) { return; }
		return tmpProceed();
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

module.exports = ManagerModuleWorkspaceView;
module.exports.default_configuration = _ViewConfiguration;
