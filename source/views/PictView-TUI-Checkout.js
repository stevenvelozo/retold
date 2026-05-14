const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-Checkout',

	DefaultRenderable: 'TUI-Checkout-Content',
	DefaultDestinationAddress: '#TUI-TerminalOutput',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-Checkout-Template',
			Template: ''
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-Checkout-Content',
			TemplateHash: 'TUI-Checkout-Template',
			ContentDestinationAddress: '#TUI-TerminalOutput',
			RenderMethod: 'replace'
		}
	]
};

class TUICheckoutView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	runScript(pProcessRunner, pModulesPath)
	{
		pProcessRunner.run('bash', ['./Checkout.sh'], pModulesPath);
	}
}

module.exports = TUICheckoutView;
module.exports.default_configuration = _ViewConfiguration;
