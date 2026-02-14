const libFable = require('fable');

// 1. Create a Fable instance with configuration
let _Fable = new libFable(
	{
		Product: 'BookStore',
		ProductVersion: '1.0.0'
	});

// 2. Logging
_Fable.log.info('BookStore starting up...');
_Fable.log.info(`Product: ${_Fable.settings.Product} v${_Fable.settings.ProductVersion}`);

// 3. UUID generation
_Fable.log.info(`Generated UUID: ${_Fable.getUUID()}`);

// 4. Service Provider pattern: create a custom service
class BookService extends libFable.ServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this.serviceType = 'BookService';
		this._Books = [];
	}

	addBook(pTitle, pAuthor)
	{
		let tmpBook = { id: this.fable.getUUID(), title: pTitle, author: pAuthor };
		this._Books.push(tmpBook);
		this.fable.log.info(`Added book: "${pTitle}" by ${pAuthor}`);
		return tmpBook;
	}

	listBooks()
	{
		return this._Books;
	}
}

// 5. Register and use the service
_Fable.serviceManager.addServiceType('BookService', BookService);
_Fable.serviceManager.instantiateServiceProvider('BookService');

_Fable.BookService.addBook('The Hobbit', 'J.R.R. Tolkien');
_Fable.BookService.addBook('Dune', 'Frank Herbert');

_Fable.log.info(`Total books: ${_Fable.BookService.listBooks().length}`);
_Fable.log.info('Layer 1 example complete.');
