/**
 * Database Initialization Service
 *
 * A Fable service provider that manages SQLite database setup:
 * creating tables from compiled Stricture DDL and seeding initial
 * data from a CSV file through the Meadow DAL.
 *
 * Table creation is delegated to the meadow-connection-sqlite provider.
 * Seeding is done by reading a CSV file and creating records through
 * the Meadow DAL, so all standard Meadow behaviors (GUID generation,
 * audit stamps, default values) are applied automatically.
 */

const libFS = require('fs');
const libPath = require('path');

const libFableServiceProviderBase = require('fable-serviceproviderbase');

class DatabaseInitializationService extends libFableServiceProviderBase
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.serviceType = 'DatabaseInitializationService';

		// The data directory where the SQLite file lives
		this.dataDirectory = this.options.DataDirectory || libPath.resolve(__dirname, 'data');
	}

	/**
	 * Ensure the data directory exists for the SQLite file.
	 */
	ensureDataDirectory()
	{
		if (!libFS.existsSync(this.dataDirectory))
		{
			libFS.mkdirSync(this.dataDirectory, { recursive: true });
			this.fable.log.info(`Created data directory: ${this.dataDirectory}`);
		}
	}

	/**
	 * Connect the SQLite provider and open the database.
	 *
	 * @param {function} fCallback - Callback(pError)
	 */
	connectDatabase(fCallback)
	{
		this.ensureDataDirectory();

		this.fable.MeadowSQLiteProvider.connectAsync(
			(pError) =>
			{
				if (pError)
				{
					this.fable.log.error('SQLite connection error: ' + pError.message);
					return fCallback(pError);
				}
				this.fable.log.info('SQLite database connected.');
				return fCallback();
			});
	}

	/**
	 * Create tables from a compiled Stricture model using the SQLite provider.
	 *
	 * The provider's createTables() method generates proper SQLite DDL from the
	 * Stricture compiled table format ({ TableName, Columns: [{ Column, DataType, Size }] }).
	 *
	 * @param {object} pCompiledModel - A compiled Stricture model (with .Tables array)
	 * @param {function} fCallback - Callback(pError)
	 */
	createTablesFromModel(pCompiledModel, fCallback)
	{
		this.fable.MeadowSQLiteProvider.createTables(pCompiledModel, fCallback);
	}

	/**
	 * Parse a CSV string into an array of objects using the header row as keys.
	 *
	 * Handles quoted fields (including fields with commas and escaped quotes).
	 *
	 * @param {string} pCSVContent - Raw CSV text
	 * @returns {Array} Array of row objects keyed by header column names
	 */
	parseCSV(pCSVContent)
	{
		let tmpRows = [];
		let tmpLines = pCSVContent.split('\n');

		if (tmpLines.length < 2)
		{
			return tmpRows;
		}

		let tmpHeaders = this._parseCSVLine(tmpLines[0]);

		for (let i = 1; i < tmpLines.length; i++)
		{
			let tmpLine = tmpLines[i].trim();
			if (!tmpLine)
			{
				continue;
			}

			let tmpValues = this._parseCSVLine(tmpLine);
			let tmpRow = {};

			for (let j = 0; j < tmpHeaders.length; j++)
			{
				tmpRow[tmpHeaders[j]] = (j < tmpValues.length) ? tmpValues[j] : '';
			}

			tmpRows.push(tmpRow);
		}

		return tmpRows;
	}

	/**
	 * Parse a single CSV line into an array of field values.
	 *
	 * @param {string} pLine - A single CSV line
	 * @returns {Array} Array of string values
	 */
	_parseCSVLine(pLine)
	{
		let tmpFields = [];
		let tmpCurrent = '';
		let tmpInQuotes = false;

		for (let i = 0; i < pLine.length; i++)
		{
			let tmpChar = pLine[i];

			if (tmpInQuotes)
			{
				if (tmpChar === '"')
				{
					// Check for escaped quote ("")
					if (i + 1 < pLine.length && pLine[i + 1] === '"')
					{
						tmpCurrent += '"';
						i++;
					}
					else
					{
						tmpInQuotes = false;
					}
				}
				else
				{
					tmpCurrent += tmpChar;
				}
			}
			else
			{
				if (tmpChar === '"')
				{
					tmpInQuotes = true;
				}
				else if (tmpChar === ',')
				{
					tmpFields.push(tmpCurrent.trim());
					tmpCurrent = '';
				}
				else
				{
					tmpCurrent += tmpChar;
				}
			}
		}

		tmpFields.push(tmpCurrent.trim());
		return tmpFields;
	}

	/**
	 * Seed a table from a CSV file if the table is currently empty.
	 *
	 * Reads the CSV, parses it, and creates records through the Meadow DAL
	 * so that GUID generation, audit stamps and default values are applied.
	 *
	 * @param {object} pMeadowDAL - A Meadow DAL instance for the target table
	 * @param {string} pCSVFilePath - Absolute path to the CSV seed file
	 * @param {function} fCallback - Callback(pError)
	 */
	seedFromCSV(pMeadowDAL, pCSVFilePath, fCallback)
	{
		let tmpTableName = pMeadowDAL.scope;

		// Check if the table already has data
		let tmpDB = this.fable.MeadowSQLiteProvider.db;
		let tmpCount = tmpDB.prepare(`SELECT COUNT(*) AS Count FROM ${tmpTableName}`).get();

		if (tmpCount.Count > 0)
		{
			this.fable.log.info(`Table [${tmpTableName}] already has ${tmpCount.Count} rows; skipping CSV seed.`);
			return fCallback();
		}

		// Read and parse the CSV
		if (!libFS.existsSync(pCSVFilePath))
		{
			this.fable.log.warn(`Seed file not found: ${pCSVFilePath}; skipping seed.`);
			return fCallback();
		}

		let tmpCSVContent = libFS.readFileSync(pCSVFilePath, 'utf8');
		let tmpRows = this.parseCSV(tmpCSVContent);

		if (tmpRows.length === 0)
		{
			this.fable.log.info(`Seed file ${pCSVFilePath} is empty; skipping seed.`);
			return fCallback();
		}

		this.fable.log.info(`Seeding [${tmpTableName}] with ${tmpRows.length} rows from CSV...`);

		// Use Fable's Anticipate service to queue each doCreate serially.
		// Anticipate handles synchronous callback chains (like better-sqlite3)
		// gracefully, with built-in call depth protection.
		let tmpAnticipate = this.fable.newAnticipate();

		for (let i = 0; i < tmpRows.length; i++)
		{
			tmpAnticipate.anticipate(
				(fNext) =>
				{
					let tmpRow = tmpRows[i];

					// Convert LengthInHours to a number if present
					if (tmpRow.hasOwnProperty('LengthInHours') && tmpRow.LengthInHours !== '')
					{
						tmpRow.LengthInHours = parseFloat(tmpRow.LengthInHours);
					}

					let tmpQuery = pMeadowDAL.query.addRecord(tmpRow);
					pMeadowDAL.doCreate(tmpQuery,
						(pError, pQuery, pQueryRead, pRecord) =>
						{
							if (pError)
							{
								this.fable.log.error(`Error seeding row ${i + 1}: ${pError}`);
							}

							// Log progress every 100 rows
							if ((i + 1) % 100 === 0)
							{
								this.fable.log.info(`  ... seeded ${i + 1} of ${tmpRows.length} rows`);
							}

							return fNext();
						});
				});
		}

		tmpAnticipate.wait(
			(pError) =>
			{
				if (pError)
				{
					this.fable.log.error(`Error during CSV seed: ${pError}`);
					return fCallback(pError);
				}
				this.fable.log.info(`Seeded ${tmpRows.length} rows into [${tmpTableName}].`);
				return fCallback();
			});
	}
}

module.exports = DatabaseInitializationService;
