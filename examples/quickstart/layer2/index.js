const libFable = require('fable');
const libMeadow = require('meadow');
const libMeadowConnectionMySQL = require('meadow-connection-mysql');

// 1. Create Fable with MySQL configuration
let _Fable = new libFable(
	{
		Product: 'BookStore',
		ProductVersion: '1.0.0',
		MySQL:
			{
				Server: '127.0.0.1',
				Port: 3306,
				User: 'root',
				Password: '123456789',
				Database: 'retold_quickstart',
				ConnectionPoolLimit: 5
			},
		MeadowConnectionMySQLAutoConnect: true
	});

// 2. Register the MySQL connection provider
_Fable.serviceManager.addAndInstantiateServiceType('MeadowMySQLProvider', libMeadowConnectionMySQL);

// 3. Define the Meadow schema (column metadata for query generation)
let _BookSchema =
	[
		{ Column: 'IDBook', Type: 'AutoIdentity' },
		{ Column: 'GUIDBook', Type: 'AutoGUID' },
		{ Column: 'CreateDate', Type: 'CreateDate' },
		{ Column: 'CreatingIDUser', Type: 'CreateIDUser' },
		{ Column: 'UpdateDate', Type: 'UpdateDate' },
		{ Column: 'UpdatingIDUser', Type: 'UpdateIDUser' },
		{ Column: 'Deleted', Type: 'Deleted' },
		{ Column: 'DeletingIDUser', Type: 'DeleteIDUser' },
		{ Column: 'DeleteDate', Type: 'DeleteDate' },
		{ Column: 'Title', Type: 'String' },
		{ Column: 'Author', Type: 'String' },
		{ Column: 'YearPublished', Type: 'Numeric' }
	];

// 4. Define a JSON schema (for validation)
let _BookJsonSchema =
	{
		title: 'Book',
		type: 'object',
		properties:
			{
				IDBook: { type: 'integer' },
				Title: { type: 'string' },
				Author: { type: 'string' },
				YearPublished: { type: 'integer' }
			},
		required: ['IDBook']
	};

// 5. Define default values for new records
let _BookDefault =
	{
		IDBook: null,
		GUIDBook: '',
		CreateDate: false,
		CreatingIDUser: 0,
		UpdateDate: false,
		UpdatingIDUser: 0,
		Deleted: 0,
		DeleteDate: false,
		DeletingIDUser: 0,
		Title: 'Unknown',
		Author: 'Unknown',
		YearPublished: 0
	};

// 6. Create the Meadow entity
let _BookMeadow = libMeadow.new(_Fable, 'Book')
	.setProvider('MySQL')
	.setSchema(_BookSchema)
	.setJsonSchema(_BookJsonSchema)
	.setDefaultIdentifier('IDBook')
	.setDefault(_BookDefault)
	.setIDUser(1);

_Fable.log.info('--- Meadow CRUD Demo ---');

// 7. Create some books
let _CreatedIDs = [];

function createBooks(fCallback)
{
	let tmpBooks =
		[
			{ Title: 'The Hobbit', Author: 'J.R.R. Tolkien', YearPublished: 1937 },
			{ Title: 'Dune', Author: 'Frank Herbert', YearPublished: 1965 },
			{ Title: 'Neuromancer', Author: 'William Gibson', YearPublished: 1984 }
		];

	let tmpIndex = 0;

	function createNext()
	{
		if (tmpIndex >= tmpBooks.length)
		{
			return fCallback();
		}

		let tmpQuery = _BookMeadow.query.addRecord(tmpBooks[tmpIndex]);
		_BookMeadow.doCreate(tmpQuery,
			function (pError, pQuery, pQueryRead, pRecord)
			{
				if (pError)
				{
					_Fable.log.error(`Create error: ${pError}`);
					return fCallback(pError);
				}
				_Fable.log.info(`Created: [${pRecord.IDBook}] "${pRecord.Title}" by ${pRecord.Author} (${pRecord.YearPublished})`);
				_CreatedIDs.push(pRecord.IDBook);
				tmpIndex++;
				createNext();
			});
	}

	createNext();
}

// 8. Read a single book
function readBook(pID, fCallback)
{
	let tmpQuery = _BookMeadow.query.addFilter('IDBook', pID);
	_BookMeadow.doRead(tmpQuery,
		function (pError, pQuery, pRecord)
		{
			if (pError)
			{
				_Fable.log.error(`Read error: ${pError}`);
				return fCallback(pError);
			}
			_Fable.log.info(`Read: [${pRecord.IDBook}] "${pRecord.Title}" by ${pRecord.Author}`);
			return fCallback(null, pRecord);
		});
}

// 9. Read all books
function readAllBooks(fCallback)
{
	let tmpQuery = _BookMeadow.query;
	_BookMeadow.doReads(tmpQuery,
		function (pError, pQuery, pRecords)
		{
			if (pError)
			{
				_Fable.log.error(`Reads error: ${pError}`);
				return fCallback(pError);
			}
			_Fable.log.info(`All books (${pRecords.length}):`);
			for (let i = 0; i < pRecords.length; i++)
			{
				_Fable.log.info(`  [${pRecords[i].IDBook}] "${pRecords[i].Title}" by ${pRecords[i].Author}`);
			}
			return fCallback(null, pRecords);
		});
}

// 10. Update a book
function updateBook(pID, pChanges, fCallback)
{
	pChanges.IDBook = pID;
	let tmpQuery = _BookMeadow.query.addRecord(pChanges);
	_BookMeadow.doUpdate(tmpQuery,
		function (pError, pQuery, pQueryRead, pRecord)
		{
			if (pError)
			{
				_Fable.log.error(`Update error: ${pError}`);
				return fCallback(pError);
			}
			_Fable.log.info(`Updated: [${pRecord.IDBook}] "${pRecord.Title}" by ${pRecord.Author}`);
			return fCallback(null, pRecord);
		});
}

// 11. Count books
function countBooks(fCallback)
{
	let tmpQuery = _BookMeadow.query;
	_BookMeadow.doCount(tmpQuery,
		function (pError, pQuery, pCount)
		{
			if (pError)
			{
				_Fable.log.error(`Count error: ${pError}`);
				return fCallback(pError);
			}
			_Fable.log.info(`Total books: ${pCount}`);
			return fCallback(null, pCount);
		});
}

// 12. Delete a book (soft delete)
function deleteBook(pID, fCallback)
{
	let tmpQuery = _BookMeadow.query.addFilter('IDBook', pID);
	_BookMeadow.doDelete(tmpQuery,
		function (pError, pQuery, pAffected)
		{
			if (pError)
			{
				_Fable.log.error(`Delete error: ${pError}`);
				return fCallback(pError);
			}
			_Fable.log.info(`Deleted book ${pID} (${pAffected} row(s) affected)`);
			return fCallback();
		});
}

// Run the full demo sequence
createBooks(
	function ()
	{
		_Fable.log.info('--- Reading single book ---');
		readBook(_CreatedIDs[0],
			function ()
			{
				_Fable.log.info('--- Reading all books ---');
				readAllBooks(
					function ()
					{
						_Fable.log.info('--- Updating a book ---');
						updateBook(_CreatedIDs[1], { Title: 'Dune (Revised Edition)' },
							function ()
							{
								_Fable.log.info('--- Counting books ---');
								countBooks(
									function ()
									{
										_Fable.log.info('--- Deleting a book ---');
										deleteBook(_CreatedIDs[2],
											function ()
											{
												_Fable.log.info('--- Final book list ---');
												readAllBooks(
													function ()
													{
														_Fable.log.info('--- Meadow CRUD Demo Complete ---');
														process.exit(0);
													});
											});
									});
							});
					});
			});
	});
