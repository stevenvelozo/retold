const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-StatusBar',

	DefaultRenderable: 'TUI-StatusBar-Content',
	DefaultDestinationAddress: '#TUI-StatusBar',
	DefaultTemplateRecordAddress: 'AppData.TodoList',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-StatusBar-Template',
			Template: ' Tasks: {~D:Record.Tasks.length~} | {~D:Record.StatusMessage~} | Sort: {~D:Record.ListState.SortColumn~} {~D:Record.ListState.SortDirection~}'
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-StatusBar-Content',
			TemplateHash: 'TUI-StatusBar-Template',
			ContentDestinationAddress: '#TUI-StatusBar',
			RenderMethod: 'replace'
		}
	]
};

class TUIStatusBarView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}
}

module.exports = TUIStatusBarView;
module.exports.default_configuration = _ViewConfiguration;
