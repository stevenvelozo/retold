const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Layout',

	DefaultRenderable:         'Manager-Layout-Shell',
	DefaultDestinationAddress: '#RetoldManager-Application-Container',

	AutoRender: false,

	CSS: /*css*/`
		/* The pict layout shell renders inside #RetoldManager-Application-Container,
		   NOT directly under <body>. Make that container a viewport-sized flex
		   column so #RM-Main gets a bounded height and the workspace can scroll. */
		#RetoldManager-Application-Container
		{
			display: flex;
			flex-direction: column;
			height: 100vh;
			min-height: 0;
			overflow: hidden;
		}
		#RM-TopBar    { flex: 0 0 var(--topbar-height); }
		#RM-StatusBar { flex: 0 0 var(--statusbar-height); }
		#RM-Main      { flex: 1 1 0; min-height: 0; }

		#RM-Main > aside,
		#RM-Main > section { min-height: 0; }

		#RM-Workspace
		{
			display: flex;
			flex-direction: column;
			min-height: 0;
			overflow-y: auto;
		}
		#RM-Workspace-Content    { flex: 0 0 auto; }
		#RM-OutputPanelContainer { flex: 0 0 auto; margin-top: auto; }
	`,

	Templates:
	[
		{
			Hash: 'Manager-Layout-Shell-Template',
			Template: /*html*/`
<header id="RM-TopBar"></header>
<main id="RM-Main">
	<aside id="RM-Sidebar"></aside>
	<section id="RM-Workspace">
		<div id="RM-Workspace-Content"></div>
		<div id="RM-OutputPanelContainer"></div>
	</section>
</main>
<footer id="RM-StatusBar"></footer>
<div id="RM-ModalRoot"></div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Layout-Shell',
			TemplateHash:       'Manager-Layout-Shell-Template',
			DestinationAddress: '#RetoldManager-Application-Container',
			RenderMethod:       'replace',
		}
	]
};

class ManagerLayoutView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender(pRenderable, pRenderDestinationAddress, pRecord, pContent)
	{
		// Cascade into the fixed shell views.
		this.pict.views['Manager-TopBar'].render();
		this.pict.views['Manager-Sidebar'].render();
		this.pict.views['Manager-StatusBar'].render();
		this.pict.views['Manager-OutputPanel'].render();

		// Default workspace content — the router will override on resolve().
		this.pict.views['Manager-Home'].render();

		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pRenderDestinationAddress, pRecord, pContent);
	}
}

module.exports = ManagerLayoutView;
module.exports.default_configuration = _ViewConfiguration;
