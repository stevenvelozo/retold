const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Home',

	DefaultRenderable:         'Manager-Home-Content',
	DefaultDestinationAddress: '#RM-Workspace-Content',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'Manager-Home-Template',
			Template: /*html*/`
<div class="placeholder">
	<h2>Select a module</h2>
	<p>Pick a module from the sidebar to review its status, bump, commit, and publish.</p>
	<p class="hint">Pict migration in progress — additional flows land over the next few sessions.</p>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Home-Content',
			TemplateHash:       'Manager-Home-Template',
			DestinationAddress: '#RM-Workspace-Content',
			RenderMethod:       'replace',
		}
	]
};

class ManagerHomeView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = ManagerHomeView;
module.exports.default_configuration = _ViewConfiguration;
