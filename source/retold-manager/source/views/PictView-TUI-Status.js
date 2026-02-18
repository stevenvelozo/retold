const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-Status',

	DefaultRenderable: 'TUI-Status-Content',
	DefaultDestinationAddress: '#TUI-TerminalOutput',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-Status-Template',
			Template: ''
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-Status-Content',
			TemplateHash: 'TUI-Status-Template',
			ContentDestinationAddress: '#TUI-TerminalOutput',
			RenderMethod: 'replace'
		}
	]
};

class TUIStatusView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	runScript(pProcessRunner, pModulesPath)
	{
		pProcessRunner.run('bash', ['./Status.sh'], pModulesPath);
	}
}

module.exports = TUIStatusView;
module.exports.default_configuration = _ViewConfiguration;
