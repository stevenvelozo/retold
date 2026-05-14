const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-LogViewer',

	DefaultRenderable:         'Manager-LogViewer-Content',
	DefaultDestinationAddress: '#RM-Workspace-Content',

	AutoRender: false,

	CSS: /*css*/`
		.log-viewer-pane
		{
			display: flex;
			flex-direction: column;
			height: 100%;
			min-height: 0;
		}
		.log-viewer-pane pre
		{
			flex: 1 1 auto;
			min-height: 0;
			overflow: auto;
			margin: 0;
			padding: 10px;
			background: var(--color-panel);
			border: 1px solid var(--color-border);
			border-radius: 6px;
			font-family: var(--font-mono);
			font-size: 12px;
			white-space: pre-wrap;
			word-break: break-word;
		}
	`,

	Templates:
	[
		{
			Hash: 'Manager-LogViewer-Template',
			Template: /*html*/`
<div class="log-viewer-pane">
	<h2>Operation log <span class="subtle" id="RM-LogPath" style="margin-left:12px;font-size:11px">loading...</span></h2>
	<div class="action-row" style="margin:0 0 10px">
		<button class="action" onclick="{~P~}.views['Manager-LogViewer'].refresh(500)">Refresh</button>
		<button class="action" onclick="{~P~}.views['Manager-LogViewer'].refresh(2000)">Last 2000 lines</button>
		<button class="action" onclick="{~P~}.views['Manager-LogViewer'].refresh(500)">Last 500 lines</button>
	</div>
	<pre id="RM-LogBody">fetching...</pre>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-LogViewer-Content',
			TemplateHash:       'Manager-LogViewer-Template',
			DestinationAddress: '#RM-Workspace-Content',
			RenderMethod:       'replace',
		}
	]
};

class ManagerLogViewerView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.refresh(500);
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	refresh(pTail)
	{
		this.pict.PictApplication.setStatus('Loading log...');
		this.pict.providers.ManagerAPI.get('/log?tail=' + (pTail || 500)).then(
			(pBody) =>
			{
				let tmpPath = document.getElementById('RM-LogPath');
				if (tmpPath)
				{
					tmpPath.textContent = pBody.Exists
						? pBody.Path + ' — showing last ' + pBody.Lines.length + ' of ' + pBody.Total + ' lines'
						: pBody.Path + ' — (not yet written; no ops run today)';
				}
				let tmpBody = document.getElementById('RM-LogBody');
				if (tmpBody)
				{
					tmpBody.textContent = (pBody.Lines || []).join('\n');
					tmpBody.scrollTop = tmpBody.scrollHeight;
				}
				this.pict.PictApplication.setStatus('Log loaded.');
			},
			(pError) =>
			{
				let tmpBody = document.getElementById('RM-LogBody');
				if (tmpBody) { tmpBody.textContent = 'Error loading log: ' + pError.message; }
				this.pict.PictApplication.setStatus('Log load failed.');
			});
	}
}

module.exports = ManagerLogViewerView;
module.exports.default_configuration = _ViewConfiguration;
