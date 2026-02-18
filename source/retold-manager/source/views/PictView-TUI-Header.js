const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-Header',

	DefaultRenderable: 'TUI-Header-Content',
	DefaultDestinationAddress: '#TUI-Header',
	DefaultTemplateRecordAddress: 'AppData.Manager',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-Header-Template',
			Template: '{bold} Retold Manager{/bold}  |  [g] groups  [Tab] focus  [q] quit'
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
