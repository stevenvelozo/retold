const libFable = require('fable');
const libOrator = require('orator');
const libOratorServiceServerRestify = require('orator-serviceserver-restify');

// 1. Create Fable
let _Fable = new libFable(
	{
		Product: 'BookStore-API',
		ProductVersion: '1.0.0',
		APIServerPort: 8080
	});

// 2. Register the Restify service server, then Orator
_Fable.serviceManager.addServiceType('OratorServiceServer', libOratorServiceServerRestify);
_Fable.serviceManager.instantiateServiceProvider('OratorServiceServer');
_Fable.serviceManager.addServiceType('Orator', libOrator);
let _Orator = _Fable.serviceManager.instantiateServiceProvider('Orator');

// In-memory book store for this example
let _Books =
	[
		{ id: 1, title: 'The Hobbit', author: 'J.R.R. Tolkien', year: 1937 },
		{ id: 2, title: 'Dune', author: 'Frank Herbert', year: 1965 },
		{ id: 3, title: 'Neuromancer', author: 'William Gibson', year: 1984 }
	];
let _NextID = 4;

// 3. Initialize and start the server
_Orator.initialize(
	function ()
	{
		// 4. Define routes

		// Health check
		_Orator.serviceServer.get('/health',
			function (pRequest, pResponse, fNext)
			{
				pResponse.send({ status: 'ok', product: _Fable.settings.Product });
				return fNext();
			});

		// List all books
		_Orator.serviceServer.get('/api/books',
			function (pRequest, pResponse, fNext)
			{
				pResponse.send(_Books);
				return fNext();
			});

		// Get a single book by ID
		_Orator.serviceServer.get('/api/books/:id',
			function (pRequest, pResponse, fNext)
			{
				let tmpBook = _Books.find((b) => b.id === parseInt(pRequest.params.id));
				if (!tmpBook)
				{
					pResponse.send(404, { error: 'Book not found' });
					return fNext();
				}
				pResponse.send(tmpBook);
				return fNext();
			});

		// Create a book (with body parser for JSON)
		_Orator.serviceServer.postWithBodyParser('/api/books',
			function (pRequest, pResponse, fNext)
			{
				let tmpBook =
					{
						id: _NextID++,
						title: pRequest.body.title || 'Untitled',
						author: pRequest.body.author || 'Unknown',
						year: pRequest.body.year || 0
					};
				_Books.push(tmpBook);
				_Fable.log.info(`Created book: "${tmpBook.title}"`);
				pResponse.send(201, tmpBook);
				return fNext();
			});

		// 5. Start listening
		_Orator.startService(
			function ()
			{
				_Fable.log.info('Try these commands:');
				_Fable.log.info('  curl http://localhost:8080/health');
				_Fable.log.info('  curl http://localhost:8080/api/books');
				_Fable.log.info('  curl http://localhost:8080/api/books/1');
				_Fable.log.info('  curl -X POST http://localhost:8080/api/books -H "Content-Type: application/json" -d \'{"title":"Snow Crash","author":"Neal Stephenson","year":1992}\'');
			});
	});
