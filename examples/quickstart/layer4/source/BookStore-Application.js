const libPictApplication = require('pict-application');
const libPictRouter = require('pict-router');

const libViewLayout = require('./views/View-Layout.js');
const libViewHome = require('./views/View-Home.js');
const libViewAbout = require('./views/View-About.js');

class BookStoreApplication extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.pict.addProvider('PictRouter', require('./providers/Router-Config.json'), libPictRouter);

		this.pict.addView('BookStore-Layout', libViewLayout.default_configuration, libViewLayout);
		this.pict.addView('BookStore-Home', libViewHome.default_configuration, libViewHome);
		this.pict.addView('BookStore-About', libViewAbout.default_configuration, libViewAbout);
	}

	onAfterInitializeAsync(fCallback)
	{
		this.pict.AppData.BookStore =
			{
				Title: 'Retold BookStore',
				Books:
					[
						{ Title: 'The Hobbit', Author: 'J.R.R. Tolkien', Year: 1937 },
						{ Title: 'Dune', Author: 'Frank Herbert', Year: 1965 },
						{ Title: 'Neuromancer', Author: 'William Gibson', Year: 1984 }
					]
			};

		this.pict.views['BookStore-Layout'].render();

		return super.onAfterInitializeAsync(fCallback);
	}

	navigateTo(pRoute)
	{
		this.pict.providers.PictRouter.navigate(pRoute);
	}

	showView(pViewIdentifier)
	{
		if (pViewIdentifier in this.pict.views)
		{
			this.pict.views[pViewIdentifier].render();
		}
	}
}

module.exports = BookStoreApplication;
module.exports.default_configuration = require('./BookStore-Application-Config.json');
