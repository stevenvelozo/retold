const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-TopBar',

	DefaultRenderable:            'Manager-TopBar-Content',
	DefaultDestinationAddress:    '#RM-TopBar',
	DefaultTemplateRecordAddress: 'AppData.Manager',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'Manager-TopBar-Template',
			Template: /*html*/`
<h1>Retold Manager</h1>
<span class="badge {~D:Record.Health.state~}" title="server health">{~D:Record.Health.text~}</span>
<div style="margin-left:auto;display:flex;gap:8px">
	<button class="action primary" title="Run modules/Status.sh across every module"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/status')">Status</button>
	<button class="action primary" title="Run modules/Update.sh across every module"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/update')">Update</button>
	<button class="action primary" title="Run modules/Checkout.sh across every module"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/checkout')">Checkout</button>
	<span style="width:1px;background:var(--color-border);margin:0 4px"></span>
	<button class="action" onclick="{~P~}.PictApplication.navigateTo('/Log')">Log</button>
	<button class="action" onclick="{~P~}.PictApplication.navigateTo('/Manifest')">Manifest</button>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-TopBar-Content',
			TemplateHash:       'Manager-TopBar-Template',
			DestinationAddress: '#RM-TopBar',
			RenderMethod:       'replace',
		}
	]
};

class ManagerTopBarView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onBeforeRender(pRenderable)
	{
		// Supply the top-level state object as the record so the template can
		// address Record.Health.* directly.
		pRenderable.DefaultRenderMethod = 'replace';
		return this.pict.AppData.Manager;
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = ManagerTopBarView;
module.exports.default_configuration = _ViewConfiguration;
