const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Modal-Publish',

	DefaultRenderable:            'Manager-Modal-Publish-Content',
	DefaultDestinationAddress:    '#RM-ModalRoot',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.PublishModal',

	AutoRender: false,

	Templates:
	[
		// ── Modal shell ───────────────────────────────────────────
		{
			Hash: 'Manager-Modal-Publish-Template',
			Template: /*html*/`
<div class="modal-backdrop" onclick="if(event.target===this){_Pict.views['Manager-Modal-Publish'].close();}">
	<div class="modal" style="min-width:640px">
		<h3>Publish &mdash; {~D:Record.ModuleName~}</h3>
		<p style="color:var(--color-muted);font-size:12px;margin:0 0 6px">{~D:Record.SubTitle~}</p>
		<div class="preview-panel" id="RM-PreviewPanel">
			{~TS:Manager-Modal-Publish-Loading-Template:Record.LoadingSlot~}
			{~TS:Manager-Modal-Publish-Error-Template:Record.ErrorSlot~}
			{~TS:Manager-Modal-Publish-Preview-Template:Record.PreviewSlot~}
		</div>
		<div class="modal-actions">
			<button class="action" onclick="_Pict.views['Manager-Modal-Publish'].close()">Close</button>
			<button class="action primary"
				onclick="_Pict.views['Manager-Modal-Publish'].planRipple()"
				title="Plan a ripple publish starting from this module (closes this dialog and opens the ripple planner with this module pre-selected)">Plan ripple...</button>
			<button class="action success" id="RM-PublishSubmit"
				onclick="_Pict.views['Manager-Modal-Publish'].submit(false)" disabled>Publish to npm</button>
			<button class="action success" id="RM-PublishSubmitDocker"
				onclick="_Pict.views['Manager-Modal-Publish'].submit(true)" disabled
				title="Also rebuild + push the GHCR docker image (multi-arch build, several minutes)">Publish + Docker image</button>
		</div>
	</div>
</div>
`
		},

		// ── States ─────────────────────────────────────────────────
		{
			Hash: 'Manager-Modal-Publish-Loading-Template',
			Template: /*html*/`<em>{~D:Record.Message~}</em>`
		},
		{
			Hash: 'Manager-Modal-Publish-Error-Template',
			Template: /*html*/`<span style="color:var(--color-danger)">Preview failed: {~D:Record.Message~}</span>`
		},

		// ── Preview report (verdict + sections) ───────────────────
		{
			Hash: 'Manager-Modal-Publish-Preview-Template',
			Template: /*html*/`
<span class="preview-verdict {~D:Record.VerdictClass~}">{~D:Record.VerdictLabel~}</span><br>
<strong>Package:</strong> {~D:Record.Package~}<br>
<strong>Local:</strong> v{~D:Record.LocalVersion~}<br>
{~TS:Manager-Modal-Publish-NpmYes-Template:Record.NpmYesSlot~}{~TS:Manager-Modal-Publish-NpmNo-Template:Record.NpmNoSlot~}
{~TS:Manager-Modal-Publish-Problems-Template:Record.ProblemsSlot~}
{~TS:Manager-Modal-Publish-Deps-Template:Record.DepsSlot~}
{~TS:Manager-Modal-Publish-Commits-Template:Record.CommitsSlot~}
{~TS:Manager-Modal-Publish-SubmitError-Template:Record.SubmitErrorSlot~}
`
		},
		{
			Hash: 'Manager-Modal-Publish-NpmYes-Template',
			Template: /*html*/`<strong>npm:</strong> v{~D:Record.Version~}<br>`
		},
		{
			Hash: 'Manager-Modal-Publish-NpmNo-Template',
			Template: /*html*/`<strong>npm:</strong> <em>(not yet published)</em><br>`
		},
		{
			Hash: 'Manager-Modal-Publish-Problems-Template',
			Template: /*html*/`
<div style="margin-top:8px"><strong>Problems:</strong>
	{~TS:Manager-Modal-Publish-ProblemRow-Template:Record.Items~}
</div>
`
		},
		{
			Hash: 'Manager-Modal-Publish-ProblemRow-Template',
			Template: /*html*/`<div class="dep {~D:Record.Cls~}">{~D:Record.Message~}</div>`
		},
		{
			Hash: 'Manager-Modal-Publish-Deps-Template',
			Template: /*html*/`
<div style="margin-top:8px"><strong>Ecosystem deps ({~D:Record.Count~}):</strong>
	{~TS:Manager-Modal-Publish-DepRow-Template:Record.Items~}
</div>
`
		},
		{
			Hash: 'Manager-Modal-Publish-DepRow-Template',
			Template: /*html*/`<div class="dep {~D:Record.Cls~}">{~D:Record.Mark~} {~D:Record.Name~}  {~D:Record.Range~}  {~D:Record.Suffix~}</div>`
		},
		{
			Hash: 'Manager-Modal-Publish-Commits-Template',
			Template: /*html*/`
<div style="margin-top:8px"><strong>Recent commits:</strong>
	{~TS:Manager-Modal-Publish-CommitRow-Template:Record.Items~}
</div>
`
		},
		{
			Hash: 'Manager-Modal-Publish-CommitRow-Template',
			Template: /*html*/`<div class="dep link">{~D:Record.Hash~} {~D:Record.Subject~}</div>`
		},
		{
			Hash: 'Manager-Modal-Publish-SubmitError-Template',
			Template: /*html*/`<div style="margin-top:8px;color:var(--color-danger)">{~D:Record.Message~}</div>`
		},
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Modal-Publish-Content',
			TemplateHash:       'Manager-Modal-Publish-Template',
			DestinationAddress: '#RM-ModalRoot',
			RenderMethod:       'replace',
		}
	]
};

class ManagerModalPublishView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._submitErrorMessage = null;
	}

	open(pModuleName)
	{
		this._moduleName = pModuleName;
		this._previewHash = null;
		this._ok = false;
		this._supportsDocker = false;
		this._submitErrorMessage = null;

		this._writeRecord(
			{
				ModuleName: pModuleName,
				SubTitle:   'Loading pre-publish validation...',
				LoadingSlot: [{ Message: 'running npm queries (parallel)...' }],
				ErrorSlot:   [],
				PreviewSlot: [],
			});
		this.render();

		this.pict.providers.ManagerAPI.loadPublishPreview(pModuleName).then(
			(pReport) =>
			{
				if (this._moduleName !== pModuleName) { return; }
				this._previewHash = pReport.PreviewHash;
				this._ok = !!pReport.OkToPublish;
				this._supportsDocker = !!pReport.SupportsDocker;
				this._writeRecord(
					{
						ModuleName: pModuleName,
						SubTitle: pReport.OkToPublish
							? 'All pre-publish checks passed — review below, then confirm.'
							: 'Pre-publish validation blocked this publish. See below.',
						LoadingSlot: [],
						ErrorSlot:   [],
						PreviewSlot: [this._buildPreviewRecord(pReport)],
					});
				this.render();
			},
			(pError) =>
			{
				if (this._moduleName !== pModuleName) { return; }
				this._writeRecord(
					{
						ModuleName: pModuleName,
						SubTitle: 'Preview failed.',
						LoadingSlot: [],
						ErrorSlot:   [{ Message: pError.message }],
						PreviewSlot: [],
					});
				this.render();
			});
	}

	close()
	{
		this._moduleName = null;
		this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
	}

	// Hand off to the ripple planner with this module pre-selected as the
	// originating producer. We close ourselves first so the ripple modal
	// owns #RM-ModalRoot — they share that single mount point.
	planRipple()
	{
		let tmpName = this._moduleName;
		this.close();
		let tmpRipple = this.pict.views['Manager-Modal-RipplePlan'];
		if (tmpRipple) { tmpRipple.open(tmpName); }
	}

	submit(pWithDocker)
	{
		if (!this._previewHash || !this._ok || !this._moduleName) { return; }
		let tmpName = this._moduleName;
		let tmpHash = this._previewHash;

		// Disable both submit buttons during the inflight publish so
		// the user can't double-click into a second concurrent run.
		let tmpBtn       = document.getElementById('RM-PublishSubmit');
		let tmpBtnDocker = document.getElementById('RM-PublishSubmitDocker');
		if (tmpBtn)       { tmpBtn.disabled = true; }
		if (tmpBtnDocker) { tmpBtnDocker.disabled = true; }

		let tmpStatusLabel = pWithDocker
			? 'Publishing ' + tmpName + ' + GHCR image...'
			: 'Publishing ' + tmpName + '...';

		this.pict.providers.ManagerAPI.publishModule(tmpName, tmpHash, !!pWithDocker).then(
			() =>
			{
				this.close();
				this.pict.PictApplication.setStatus(tmpStatusLabel);
			},
			(pError) =>
			{
				if (tmpBtn)       { tmpBtn.disabled = false; }
				if (tmpBtnDocker) { tmpBtnDocker.disabled = false; }
				this._submitErrorMessage = 'error: '
					+ (pError.Info && pError.Info.Error ? pError.Info.Error + ': ' : '')
					+ pError.message;
				// Re-shape the existing record with the new error slot.
				let tmpRec = this.pict.AppData.Manager.ViewRecord.PublishModal;
				if (tmpRec && tmpRec.PreviewSlot && tmpRec.PreviewSlot.length)
				{
					tmpRec.PreviewSlot[0].SubmitErrorSlot = [{ Message: this._submitErrorMessage }];
					this.render();
				}
			});
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		// Enable npm publish only once preview says OkToPublish.
		let tmpBtn       = document.getElementById('RM-PublishSubmit');
		let tmpBtnDocker = document.getElementById('RM-PublishSubmitDocker');
		if (tmpBtn) { tmpBtn.disabled = !this._ok; }
		// Docker variant additionally requires the module to declare an
		// `npm run publish:docker` script. Surface the reason in the title
		// attribute so the user understands why the button is disabled.
		if (tmpBtnDocker)
		{
			let tmpDockerOk = this._ok && this._supportsDocker;
			tmpBtnDocker.disabled = !tmpDockerOk;
			if (!this._supportsDocker)
			{
				tmpBtnDocker.classList.add('action-unavailable');
				tmpBtnDocker.title = 'This module\'s package.json does not define an "npm run publish:docker" script, so a Docker image build is not available.';
			}
			else
			{
				tmpBtnDocker.classList.remove('action-unavailable');
				tmpBtnDocker.title = 'Also rebuild + push the GHCR docker image (multi-arch build, several minutes)';
			}
		}
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// ─────────────────────────────────────────────

	_writeRecord(pRecord)
	{
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.PublishModal = pRecord;
	}

	_buildPreviewRecord(pReport)
	{
		let tmpVerdictClass = pReport.OkToPublish ? 'ok' : 'block';
		let tmpVerdictLabel = pReport.OkToPublish ? 'Ready to publish' : 'Not publishable';

		let tmpProblemsSlot = [];
		if (pReport.Problems && pReport.Problems.length > 0)
		{
			let tmpItems = [];
			for (let i = 0; i < pReport.Problems.length; i++)
			{
				let tmpP = pReport.Problems[i];
				tmpItems.push({
					Cls:     tmpP.Severity === 'error' ? 'stale' : 'warn',
					Message: tmpP.Message,
				});
			}
			tmpProblemsSlot = [{ Items: tmpItems }];
		}

		let tmpDepsSlot = [];
		if (pReport.EcosystemDeps && pReport.EcosystemDeps.length > 0)
		{
			let tmpItems = [];
			for (let i = 0; i < pReport.EcosystemDeps.length; i++)
			{
				let tmpD = pReport.EcosystemDeps[i];
				let tmpCls;
				let tmpMark;
				if (tmpD.LocalLink)         { tmpCls = 'link';  tmpMark = 'link'; }
				else if (tmpD.Error)        { tmpCls = 'warn';  tmpMark = 'warn'; }
				else if (tmpD.CoversLatest) { tmpCls = 'ok';    tmpMark = 'ok'; }
				else                        { tmpCls = 'stale'; tmpMark = 'stale'; }
				let tmpSuffix = tmpD.LocalLink
					? '(local link)'
					: (tmpD.Error ? '(could not fetch from npm)' : ('latest: ' + (tmpD.LatestOnNpm || '—')));
				tmpItems.push({
					Cls:    tmpCls,
					Mark:   tmpMark,
					Name:   tmpD.Name,
					Range:  tmpD.Range,
					Suffix: tmpSuffix,
				});
			}
			tmpDepsSlot = [{ Count: pReport.EcosystemDeps.length, Items: tmpItems }];
		}

		let tmpCommitsSlot = [];
		if (pReport.CommitsSincePublish && pReport.CommitsSincePublish.length > 0)
		{
			let tmpItems = [];
			for (let i = 0; i < pReport.CommitsSincePublish.length; i++)
			{
				let tmpC = pReport.CommitsSincePublish[i];
				tmpItems.push({ Hash: tmpC.Hash, Subject: tmpC.Subject });
			}
			tmpCommitsSlot = [{ Items: tmpItems }];
		}

		return {
			VerdictClass:  tmpVerdictClass,
			VerdictLabel:  tmpVerdictLabel,
			Package:       pReport.Package,
			LocalVersion:  pReport.LocalVersion,
			NpmYesSlot:    pReport.PublishedVersion ? [{ Version: pReport.PublishedVersion }] : [],
			NpmNoSlot:     pReport.PublishedVersion ? [] : [{}],
			ProblemsSlot:  tmpProblemsSlot,
			DepsSlot:      tmpDepsSlot,
			CommitsSlot:   tmpCommitsSlot,
			SubmitErrorSlot: this._submitErrorMessage ? [{ Message: this._submitErrorMessage }] : [],
		};
	}
}

module.exports = ManagerModalPublishView;
module.exports.default_configuration = _ViewConfiguration;
