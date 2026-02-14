const libPictView = require('pict-view');

const _ViewConfiguration =
	{
		ViewIdentifier: 'BookStore-Layout',
		DefaultRenderable: 'BookStore-Layout-Shell',
		DefaultDestinationAddress: '#BookStore-Container',
		AutoRender: false,

		CSS: `
			body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
			.bs-nav { display: flex; align-items: center; justify-content: space-between; background: #2c3e50; color: #ecf0f1; padding: 0 1.5em; height: 50px; }
			.bs-nav a { color: #bdc3c7; text-decoration: none; padding: 0.5em 0.75em; cursor: pointer; }
			.bs-nav a:hover { color: #fff; }
			.bs-nav-brand { font-size: 1.2em; font-weight: 600; color: #ecf0f1; cursor: pointer; text-decoration: none; }
			#BookStore-Content { max-width: 800px; margin: 2em auto; padding: 0 1em; }
		`,

		Templates:
			[
				{
					Hash: 'BookStore-Layout-Template',
					Template: `<div class="bs-nav"><a class="bs-nav-brand" onclick="{~P~}.PictApplication.navigateTo('/Home')">Retold BookStore</a><div><a onclick="{~P~}.PictApplication.navigateTo('/Home')">Home</a><a onclick="{~P~}.PictApplication.navigateTo('/About')">About</a></div></div><div id="BookStore-Content"></div>`
				}
			],

		Renderables:
			[
				{
					RenderableHash: 'BookStore-Layout-Shell',
					TemplateHash: 'BookStore-Layout-Template',
					DestinationAddress: '#BookStore-Container',
					RenderMethod: 'replace'
				}
			]
	};

class BookStoreLayoutView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender()
	{
		this.pict.views['BookStore-Home'].render();
		this.pict.CSSMap.injectCSS();

		if (this.pict.providers.PictRouter)
		{
			this.pict.providers.PictRouter.resolve();
		}

		return super.onAfterRender();
	}
}

module.exports = BookStoreLayoutView;
module.exports.default_configuration = _ViewConfiguration;
