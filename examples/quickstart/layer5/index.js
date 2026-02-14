const libFable = require('fable');
const libManyfest = require('manyfest');

let _Fable = new libFable(
	{
		Product: 'ManyfestDemo',
		ProductVersion: '1.0.0'
	});

// 1. Define a schema with descriptors
let _BookManifest = new libManyfest(
	{
		Scope: 'Book',
		Descriptors:
			{
				'IDBook':
					{
						Name: 'Book ID',
						Hash: 'ID',
						DataType: 'Integer',
						Default: 0
					},
				'Title':
					{
						Name: 'Title',
						Hash: 'Title',
						DataType: 'String',
						Default: 'Untitled'
					},
				'Author.Name':
					{
						Name: 'Author Name',
						Hash: 'AuthorName',
						DataType: 'String',
						Default: 'Unknown'
					},
				'Author.BirthYear':
					{
						Name: 'Author Birth Year',
						Hash: 'AuthorBirthYear',
						DataType: 'Integer',
						Default: 0
					},
				'Genre':
					{
						Name: 'Genre',
						Hash: 'Genre',
						DataType: 'String',
						Default: 'Fiction'
					}
			}
	});

// 2. Create a book object
let tmpBook =
	{
		IDBook: 1,
		Title: 'The Hobbit',
		Author:
			{
				Name: 'J.R.R. Tolkien',
				BirthYear: 1892
			},
		Genre: 'Fantasy'
	};

_Fable.log.info('--- Manyfest Object Navigation Demo ---');

// 3. Read values by address (dot notation)
_Fable.log.info(`Title: ${_BookManifest.getValueAtAddress(tmpBook, 'Title')}`);
_Fable.log.info(`Author: ${_BookManifest.getValueAtAddress(tmpBook, 'Author.Name')}`);
_Fable.log.info(`Birth Year: ${_BookManifest.getValueAtAddress(tmpBook, 'Author.BirthYear')}`);

// 4. Read values by hash (aliases)
_Fable.log.info(`By hash 'AuthorName': ${_BookManifest.getValueByHash(tmpBook, 'AuthorName')}`);
_Fable.log.info(`By hash 'ID': ${_BookManifest.getValueByHash(tmpBook, 'ID')}`);

// 5. Write values by address
_BookManifest.setValueAtAddress(tmpBook, 'Title', 'The Hobbit (Revised Edition)');
_Fable.log.info(`Updated title: ${_BookManifest.getValueAtAddress(tmpBook, 'Title')}`);

// 6. Write nested values that don't exist yet
_BookManifest.setValueAtAddress(tmpBook, 'Publisher.Name', 'Allen & Unwin');
_Fable.log.info(`Publisher: ${_BookManifest.getValueAtAddress(tmpBook, 'Publisher.Name')}`);

// 7. Populate defaults for missing fields
let tmpEmptyBook = { IDBook: 42 };
_Fable.log.info('\nBefore populate defaults:');
_Fable.log.info(`  Has Title property: ${'Title' in tmpEmptyBook}`);
_Fable.log.info(`  Has Author.Name property: ${tmpEmptyBook.Author !== undefined}`);

_BookManifest.populateDefaults(tmpEmptyBook);
_Fable.log.info('After populate defaults:');
_Fable.log.info(`  Title: ${tmpEmptyBook.Title}`);
_Fable.log.info(`  Author.Name: ${tmpEmptyBook.Author ? tmpEmptyBook.Author.Name : 'N/A'}`);
_Fable.log.info(`  Genre: ${tmpEmptyBook.Genre}`);

// 8. Validate an object
let tmpValidation = _BookManifest.validate(tmpBook);
_Fable.log.info(`\nValidation of full book: ${tmpValidation.Error ? 'INVALID' : 'VALID'}`);
if (tmpValidation.Errors.length > 0)
{
	_Fable.log.info(`  Errors: ${tmpValidation.Errors.join(', ')}`);
}

// 9. Manyfest is also available as a Fable service
let tmpManifest = _Fable.newManyfest(
	{
		Scope: 'Config',
		Descriptors:
			{
				'Database.Host': { Name: 'DB Host', DataType: 'String', Default: 'localhost' },
				'Database.Port': { Name: 'DB Port', DataType: 'Integer', Default: 3306 }
			}
	});
let tmpConfig = {};
tmpManifest.populateDefaults(tmpConfig);
_Fable.log.info(`\nFable Manyfest service - DB Host: ${tmpManifest.getValueAtAddress(tmpConfig, 'Database.Host')}`);
_Fable.log.info(`Fable Manyfest service - DB Port: ${tmpManifest.getValueAtAddress(tmpConfig, 'Database.Port')}`);

_Fable.log.info('\n--- Manyfest Demo Complete ---');
