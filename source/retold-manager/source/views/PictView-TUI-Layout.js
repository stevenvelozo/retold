const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-Layout',

	DefaultRenderable: 'TUI-Layout-Main',
	DefaultDestinationAddress: '#TUI-Application-Container',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-Layout-Template',
			Template: ''
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-Layout-Main',
			TemplateHash: 'TUI-Layout-Template',
			ContentDestinationAddress: '#TUI-Application-Container',
			RenderMethod: 'replace'
		}
	]
};

class TUILayoutView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender(pRenderable)
	{
		if (this.pict.views['TUI-Header'])
		{
			this.pict.views['TUI-Header'].render();
		}
		if (this.pict.views['TUI-StatusBar'])
		{
			this.pict.views['TUI-StatusBar'].render();
		}
		return super.onAfterRender(pRenderable);
	}
}

module.exports = TUILayoutView;
module.exports.default_configuration = _ViewConfiguration;
