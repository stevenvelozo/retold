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
			<button class="action" data-op="install">install</button>
			<button class="action" data-op="test">test</button>
			<button class="action" data-op="types">types</button>
			<button class="action" data-op="build">build</button>
		</div>
	</div>
	<div class="action-group">
		<div class="action-group-label">version</div>
		<div class="action-row">
			<button class="action" data-op="bump-patch">+ patch</button>
			<button class="action" data-op="bump-minor">+ minor</button>
			<button class="action" data-op="bump-major">+ major</button>
		</div>
	</div>
	<div class="action-group">
		<div class="action-group-label">git</div>
		<div class="action-row">
			<button class="action" data-op="diff">diff</button>
			<button class="action" data-op="git-add">add -A</button>
			<button class="action" data-op="commit">commit</button>
			<button class="action" data-op="pull">pull</button>
			<button class="action" data-op="push">push</button>
		</div>
	</div>
	<div class="action-group">
		<div class="action-group-label">npm extras</div>
		<div class="action-row">
			<button class="action" data-op="ncu">ncu...</button>
		</div>
	</div>
	<div class="action-group">
		<div class="action-group-label">publish</div>
		<div class="action-row">
			<button class="action success" data-op="publish">publish to npm</button>
			<button class="action primary" data-op="ripple">Ripple</button>
		</div>
	</div>
</div>

<div class="workspace-section">
	<h3>Package</h3>
	<dl class="kv">
		<dt>name</dt><dd>{~D:Record.Pkg.Name~}</dd>
		<dt>version</dt><dd>{~D:Record.Pkg.Version~}</dd>
		<dt>dependencies</dt><dd>{~D:Record.Pkg.DepsCount~}</dd>
		<dt>devDependencies</dt><dd>{~D:Record.Pkg.DevDepsCount~}</dd>
	</dl>
</div>

<div class="workspace-section">
	<h3>Git status</h3>
	<dl class="kv">
		<dt>branch</dt><dd>{~D:Record.Git.Branch~}</dd>
		<dt>ahead / behind</dt><dd>{~D:Record.Git.AheadBehind~}</dd>
		<dt>dirty</dt><dd>{~D:Record.Git.DirtyText~}</dd>
	</dl>
</div>

{~D:Record.RetoldDepsSection~}
{~D:Record.ExternalDepsSection~}
{~D:Record.RetoldDevDepsSection~}
{~D:Record.ExternalDevDepsSection~}
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
				// If the user navigated away, drop the result.
				if (this._boundName !== pName) { return; }
				this.pict.AppData.Manager.SelectedModuleDetail = pDetail;
				// Populate the record address BEFORE triggering render(); pict-view
				// fetches the record from DefaultTemplateRecordAddress up-front, so
				// the data must be in place when render() starts.
				if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
				this.pict.AppData.Manager.ViewRecord.ModuleWorkspace = this._computeViewRecord();
				this.render();
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

	_computeViewRecord()
	{
		let tmpDetail = this.pict.AppData.Manager.SelectedModuleDetail;
		if (!tmpDetail || !tmpDetail.Manifest)
		{
			return { Manifest: { Name: '(none)' } };
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

		// Package summary block
		tmpRecord.Pkg =
			{
				Name:         tmpPkg && tmpPkg.Name ? tmpPkg.Name : '—',
				Version:      tmpPkg && tmpPkg.Version ? tmpPkg.Version : '—',
				DepsCount:    tmpPkg && tmpPkg.Dependencies    ? Object.keys(tmpPkg.Dependencies).length    : 0,
				DevDepsCount: tmpPkg && tmpPkg.DevDependencies ? Object.keys(tmpPkg.DevDependencies).length : 0,
			};

		// Git status block
		if (tmpGit)
		{
			tmpRecord.Git =
				{
					Branch:      tmpGit.Branch || '—',
					AheadBehind: (tmpGit.Ahead || 0) + ' / ' + (tmpGit.Behind || 0),
					DirtyText:   tmpGit.Dirty ? 'yes' : 'no',
				};
		}
		else
		{
			tmpRecord.Git = { Branch: '—', AheadBehind: '—', DirtyText: '—' };
		}

		// Dependency tables (server already split retold vs external)
		let tmpCat = tmpDetail.CategorizedDeps || {};
		tmpRecord.RetoldDepsSection      = this._renderDepSection('Retold dependencies',      tmpCat.RetoldDeps || [],      true);
		tmpRecord.ExternalDepsSection    = this._renderDepSection('External dependencies',    tmpCat.ExternalDeps || [],    false);
		tmpRecord.RetoldDevDepsSection   = this._renderDepSection('Retold dev dependencies',  tmpCat.RetoldDevDeps || [],   true);
		tmpRecord.ExternalDevDepsSection = this._renderDepSection('External dev dependencies',tmpCat.ExternalDevDeps || [], false);

		return tmpRecord;
	}

	_renderDepSection(pLabel, pDeps, pIsRetold)
	{
		if (!pDeps.length) { return ''; }

		let tmpHtml = '<div class="workspace-section">';
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
			if (tmpDep.Npm)
			{
				tmpLinks += '<a href="' + this._escape(tmpDep.Npm) + '" target="_blank" title="npm">npm</a>';
			}

			let tmpNameCls = pIsRetold ? 'dep-name retold' : 'dep-name';
			tmpHtml += '<tr>';
			tmpHtml += '<td class="' + tmpNameCls + '">' + this._escape(tmpDep.Name) + '</td>';
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
			let tmpButtons = tmpWorkspace.querySelectorAll('button[data-op]');
			for (let i = 0; i < tmpButtons.length; i++)
			{
				tmpButtons[i].addEventListener('click', (pEvent) =>
					{
						let tmpOp = pEvent.currentTarget.getAttribute('data-op');
						this.runAction(tmpOp);
					});
			}
		}

		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// ─────────────────────────────────────────────
	//  Action dispatch
	// ─────────────────────────────────────────────

	runAction(pOp)
	{
		let tmpDetail = this.pict.AppData.Manager.SelectedModuleDetail;
		if (!tmpDetail || !tmpDetail.Manifest) { return; }
		let tmpName = tmpDetail.Manifest.Name;
		let tmpApi  = this.pict.providers.ManagerAPI;

		switch (pOp)
		{
			case 'install': return tmpApi.runModuleOperation(tmpName, 'npm', ['install'], 'npm install');
			case 'test':    return tmpApi.runModuleOperation(tmpName, 'npm', ['test'],    'npm test');
			case 'types':   return tmpApi.runModuleOperation(tmpName, 'npm', ['run', 'types'], 'npm run types');
			case 'build':   return tmpApi.runModuleOperation(tmpName, 'npm', ['run', 'build'], 'npm run build');
			case 'diff':    return this.pict.views['Manager-Modal-Diff'].open(tmpName);
			case 'git-add': return tmpApi.gitAddAll(tmpName);
			case 'pull':    return tmpApi.runModuleOperation(tmpName, 'git', ['pull'], 'git pull');
			case 'push':    return tmpApi.runModuleOperation(tmpName, 'git', ['push'], 'git push');
			case 'bump-patch': return this._bumpWithGuard('patch');
			case 'bump-minor': return this._bumpWithGuard('minor');
			case 'bump-major': return this._bumpWithGuard('major');
			case 'commit':  return this.pict.views['Manager-Modal-Commit'].open(tmpName);
			case 'ncu':     return this.pict.views['Manager-Modal-Ncu'].open(tmpName);
			case 'publish': return this.pict.views['Manager-Modal-Publish'].open(tmpName);
			case 'ripple':  return this.pict.views['Manager-Modal-RipplePlan'].open(tmpName);
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
