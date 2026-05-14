const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-Update',

	DefaultRenderable: 'TUI-Update-Content',
	DefaultDestinationAddress: '#TUI-TerminalOutput',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-Update-Template',
			Template: ''
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-Update-Content',
			TemplateHash: 'TUI-Update-Template',
			ContentDestinationAddress: '#TUI-TerminalOutput',
			RenderMethod: 'replace'
		}
	]
};

class TUIUpdateView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	runScript(pProcessRunner, pModulesPath)
	{
		pProcessRunner.run('bash', ['./Update.sh'], pModulesPath);
	}
}

module.exports = TUIUpdateView;
module.exports.default_configuration = _ViewConfiguration;
