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
		{
			Hash: 'Manager-Modal-Publish-Template',
			Template: /*html*/`
<div class="modal-backdrop" onclick="if(event.target===this){window._Pict.views['Manager-Modal-Publish'].close();}">
	<div class="modal" style="min-width:640px">
		<h3>Publish &mdash; {~D:Record.ModuleName~}</h3>
		<p style="color:var(--color-muted);font-size:12px;margin:0 0 6px">{~D:Record.SubTitle~}</p>
		<div class="preview-panel" id="RM-PreviewPanel">{~D:Record.PreviewHtml~}</div>
		<div class="modal-actions">
			<button class="action" onclick="{~P~}.views['Manager-Modal-Publish'].close()">Close</button>
			<button class="action success" id="RM-PublishSubmit"
				onclick="{~P~}.views['Manager-Modal-Publish'].submit()" disabled>Publish to npm</button>
		</div>
	</div>
</div>
`
		}
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
	}

	open(pModuleName)
	{
		this._moduleName = pModuleName;
		this._previewHash = null;
		this._ok = false;

		this._writeRecord(
			{
				ModuleName: pModuleName,
				SubTitle: 'Loading pre-publish validation...',
				PreviewHtml: '<em>running npm queries (parallel)...</em>',
			});
		this.render();

		this.pict.providers.ManagerAPI.loadPublishPreview(pModuleName).then(
			(pReport) =>
			{
				if (this._moduleName !== pModuleName) { return; }
				this._previewHash = pReport.PreviewHash;
				this._ok = !!pReport.OkToPublish;
				this._writeRecord(
					{
						ModuleName: pModuleName,
						SubTitle: pReport.OkToPublish
							? 'All pre-publish checks passed — review below, then confirm.'
							: 'Pre-publish validation blocked this publish. See below.',
						PreviewHtml: this._renderPreview(pReport),
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
						PreviewHtml: '<span style="color:var(--color-danger)">Preview failed: '
							+ this._escape(pError.message) + '</span>',
					});
				this.render();
			});
	}

	close()
	{
		this._moduleName = null;
		this.pict.ContentAssignment.assignContent('#RM-ModalRoot', '');
	}

	submit()
	{
		if (!this._previewHash || !this._ok || !this._moduleName) { return; }
		let tmpName = this._moduleName;
		let tmpHash = this._previewHash;

		let tmpBtn = document.getElementById('RM-PublishSubmit');
		if (tmpBtn) { tmpBtn.disabled = true; }

		this.pict.providers.ManagerAPI.publishModule(tmpName, tmpHash).then(
			() =>
			{
				this.close();
				this.pict.PictApplication.setStatus('Publishing ' + tmpName + '...');
			},
			(pError) =>
			{
				if (tmpBtn) { tmpBtn.disabled = false; }
				let tmpPanel = document.getElementById('RM-PreviewPanel');
				if (tmpPanel)
				{
					let tmpLine = document.createElement('div');
					tmpLine.style.marginTop = '8px';
					tmpLine.style.color = 'var(--color-danger)';
					tmpLine.textContent = 'error: ' + (pError.Info && pError.Info.Error ? pError.Info.Error + ': ' : '')
						+ pError.message;
					tmpPanel.appendChild(tmpLine);
				}
			});
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		// Enable the submit button only once preview says OkToPublish.
		let tmpBtn = document.getElementById('RM-PublishSubmit');
		if (tmpBtn) { tmpBtn.disabled = !this._ok; }
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// ─────────────────────────────────────────────

	_writeRecord(pRecord)
	{
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.PublishModal = pRecord;
	}

	_renderPreview(pReport)
	{
		let tmpHtml = '';
		let tmpVerdict = pReport.OkToPublish
			? '<span class="preview-verdict ok">Ready to publish</span>'
			: '<span class="preview-verdict block">Not publishable</span>';
		tmpHtml += tmpVerdict + '<br>';
		tmpHtml += '<strong>Package:</strong> ' + this._escape(pReport.Package) + '<br>';
		tmpHtml += '<strong>Local:</strong> v' + this._escape(pReport.LocalVersion) + '<br>';
		tmpHtml += pReport.PublishedVersion
			? '<strong>npm:</strong> v' + this._escape(pReport.PublishedVersion) + '<br>'
			: '<strong>npm:</strong> <em>(not yet published)</em><br>';

		if (pReport.Problems && pReport.Problems.length > 0)
		{
			tmpHtml += '<div style="margin-top:8px"><strong>Problems:</strong>';
			for (let i = 0; i < pReport.Problems.length; i++)
			{
				let tmpP = pReport.Problems[i];
				let tmpCls = tmpP.Severity === 'error' ? 'stale' : 'warn';
				tmpHtml += '<div class="dep ' + tmpCls + '">' + this._escape(tmpP.Message) + '</div>';
			}
			tmpHtml += '</div>';
		}

		if (pReport.EcosystemDeps && pReport.EcosystemDeps.length > 0)
		{
			tmpHtml += '<div style="margin-top:8px"><strong>Ecosystem deps ('
				+ pReport.EcosystemDeps.length + '):</strong>';
			for (let i = 0; i < pReport.EcosystemDeps.length; i++)
			{
				let tmpD = pReport.EcosystemDeps[i];
				let tmpCls, tmpMark;
				if (tmpD.LocalLink)          { tmpCls = 'link';  tmpMark = 'link'; }
				else if (tmpD.Error)         { tmpCls = 'warn';  tmpMark = 'warn'; }
				else if (tmpD.CoversLatest)  { tmpCls = 'ok';    tmpMark = 'ok'; }
				else                         { tmpCls = 'stale'; tmpMark = 'stale'; }
				let tmpSuffix = tmpD.LocalLink
					? '(local link)'
					: (tmpD.Error ? '(could not fetch from npm)' : ('latest: ' + (tmpD.LatestOnNpm || '—')));
				tmpHtml += '<div class="dep ' + tmpCls + '">'
					+ tmpMark + ' ' + this._escape(tmpD.Name)
					+ '  ' + this._escape(tmpD.Range)
					+ '  ' + tmpSuffix + '</div>';
			}
			tmpHtml += '</div>';
		}

		if (pReport.CommitsSincePublish && pReport.CommitsSincePublish.length > 0)
		{
			tmpHtml += '<div style="margin-top:8px"><strong>Recent commits:</strong>';
			for (let i = 0; i < pReport.CommitsSincePublish.length; i++)
			{
				let tmpC = pReport.CommitsSincePublish[i];
				tmpHtml += '<div class="dep link">' + this._escape(tmpC.Hash) + ' ' + this._escape(tmpC.Subject) + '</div>';
			}
			tmpHtml += '</div>';
		}

		return tmpHtml;
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

module.exports = ManagerModalPublishView;
module.exports.default_configuration = _ViewConfiguration;
