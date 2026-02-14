const libPictView = require('pict-view');

const _ViewConfiguration =
	{
		ViewIdentifier: 'BookStore-Home',
		DefaultRenderable: 'BookStore-Home-Content',
		DefaultDestinationAddress: '#BookStore-Content',
		AutoRender: false,

		CSS: `
			.bs-book-list { list-style: none; padding: 0; }
			.bs-book-item { padding: 0.75em 1em; margin: 0.5em 0; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #3498db; }
			.bs-book-title { font-weight: 600; }
			.bs-book-author { color: #666; }
			.bs-book-year { color: #999; font-size: 0.9em; }
		`,

		Templates:
			[
				{
					Hash: 'BookStore-Home-Template',
					Template: `<h1>{~D:AppData.BookStore.Title~}</h1><p>A simple Pict application demonstrating views, templates, and routing.</p><h2>Book Catalog</h2><ul class="bs-book-list">{~TemplateSet:BookStore-Home-BookRow:AppData.BookStore.Books~}</ul>`
				},
				{
					Hash: 'BookStore-Home-BookRow',
					Template: `<li class="bs-book-item"><span class="bs-book-title">{~D:Record.Title~}</span> <span class="bs-book-author">by {~D:Record.Author~}</span> <span class="bs-book-year">({~D:Record.Year~})</span></li>`
				}
			],

		Renderables:
			[
				{
					RenderableHash: 'BookStore-Home-Content',
					TemplateHash: 'BookStore-Home-Template',
					DestinationAddress: '#BookStore-Content',
					RenderMethod: 'replace'
				}
			]
	};

class BookStoreHomeView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}
}

module.exports = BookStoreHomeView;
module.exports.default_configuration = _ViewConfiguration;
