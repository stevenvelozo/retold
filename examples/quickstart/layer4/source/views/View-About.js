const libPictView = require('pict-view');

const _ViewConfiguration =
	{
		ViewIdentifier: 'BookStore-About',
		DefaultRenderable: 'BookStore-About-Content',
		DefaultDestinationAddress: '#BookStore-Content',
		AutoRender: false,

		Templates:
			[
				{
					Hash: 'BookStore-About-Template',
					Template: `<h1>About</h1><p>This is a quickstart example for Retold Layer 4: Pict.</p><p>Pict provides browser-side MVC with views, templates, providers, and an application lifecycle. It uses Fable for dependency injection and service management.</p><p><a style="color:#3498db;cursor:pointer" onclick="{~P~}.PictApplication.navigateTo('/Home')">Back to Home</a></p>`
				}
			],

		Renderables:
			[
				{
					RenderableHash: 'BookStore-About-Content',
					TemplateHash: 'BookStore-About-Template',
					DestinationAddress: '#BookStore-Content',
					RenderMethod: 'replace'
				}
			]
	};

class BookStoreAboutView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}
}

module.exports = BookStoreAboutView;
module.exports.default_configuration = _ViewConfiguration;
