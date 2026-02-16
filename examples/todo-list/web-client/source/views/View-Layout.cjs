const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TodoList-Layout',
	DefaultRenderable: 'TodoList-Layout-Shell',
	DefaultDestinationAddress: '#TodoList-Container',
	AutoRender: false,

	CSS: /*css*/`
		.tl-nav { display: flex; align-items: center; justify-content: space-between; background: #3D3229; color: #E8E0D4; padding: 0 1.5em; height: 54px; }
		.tl-nav-brand { font-size: 1.25em; font-weight: 700; color: #E8E0D4; cursor: pointer; text-decoration: none; }
		.tl-nav-links { display: flex; align-items: center; gap: 0.5em; }
		.tl-nav-links a { color: #D4CCBE; text-decoration: none; padding: 0.4em 0.75em; cursor: pointer; border-radius: 4px; transition: color 0.15s; }
		.tl-nav-links a:hover { color: #fff; }
		.tl-nav-sep { color: #5E5549; margin: 0 0.15em; }
	`,

	Templates:
	[
		{
			Hash: 'TodoList-Layout-Template',
			Template: /*html*/`
<div class="tl-nav">
	<a class="tl-nav-brand" onclick="{~P~}.PictApplication.navigateTo('/TaskList')">Todo List</a>
	<div class="tl-nav-links">
		<a onclick="{~P~}.PictApplication.navigateTo('/TaskList')">Tasks</a>
		<span class="tl-nav-sep">|</span>
		<a onclick="{~P~}.PictApplication.navigateTo('/WeekView')">Week</a>
		<a onclick="{~P~}.PictApplication.navigateTo('/MonthView')">Month</a>
		<a onclick="{~P~}.PictApplication.navigateTo('/YearView')">Year</a>
		<span class="tl-nav-sep">|</span>
		<a class="tl-btn tl-btn-success" onclick="{~P~}.PictApplication.addTask()">+ New Task</a>
	</div>
</div>
<div id="TodoList-Content"></div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TodoList-Layout-Shell',
			TemplateHash: 'TodoList-Layout-Template',
			DestinationAddress: '#TodoList-Container',
			RenderMethod: 'replace'
		}
	]
};

class TodoListLayoutView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender()
	{
		// Render the task list as the default content view
		this.pict.views['TodoList-TaskList'].render();
		this.pict.CSSMap.injectCSS();

		if (this.pict.providers.PictRouter)
		{
			this.pict.providers.PictRouter.resolve();
		}

		return super.onAfterRender();
	}
}

module.exports = TodoListLayoutView;
module.exports.default_configuration = _ViewConfiguration;
