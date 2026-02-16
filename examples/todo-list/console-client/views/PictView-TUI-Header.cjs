const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-Header',

	DefaultRenderable: 'TUI-Header-Content',
	DefaultDestinationAddress: '#TUI-Header',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-Header-Template',
			Template: [
				'{center}{bold}Todo List Console Client{/bold}{/center}',
				'{center}[Enter]View  [E]dit  [A]dd  [D]elete  [S]ort  [/]Search  [R]efresh  [Q]uit{/center}'
			].join('\n')
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-Header-Content',
			TemplateHash: 'TUI-Header-Template',
			ContentDestinationAddress: '#TUI-Header',
			RenderMethod: 'replace'
		}
	]
};

class TUIHeaderView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}
}

module.exports = TUIHeaderView;
module.exports.default_configuration = _ViewConfiguration;
