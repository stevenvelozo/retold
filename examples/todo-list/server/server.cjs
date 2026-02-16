/**
 * Retold Todo List -- API Server
 *
 * Demonstrates Fable + Orator + Meadow + MeadowEndpoints + SQLite
 * working together to serve a full CRUD REST API and static web files.
 *
 * The Task table DDL is defined in model/Task.mddl (Stricture MicroDDL),
 * compiled to model/Task-Compiled.json, and created at startup using the
 * meadow-connection-sqlite provider's built-in table creation.
 *
 * Seed data is loaded from model/data/seeded_todo_events.csv through
 * the Meadow DAL, so GUIDs, audit stamps and defaults are applied
 * automatically on first run.
 *
 * Run:  node server.cjs
 * API:  http://localhost:8086/1.0/Task (CRUD endpoints)
 * Web:  http://localhost:8086/ (static files from ../web-client/dist/)
 */

const libPath = require('path');
const libFS = require('fs');

const libFable = require('fable');
const libOrator = require('orator');
const libOratorServiceServerRestify = require('orator-serviceserver-restify');
const libMeadow = require('meadow');
const libMeadowEndpoints = require('meadow-endpoints');
const libMeadowConnectionSQLite = require('meadow-connection-sqlite');

const libDatabaseInitializationService = require('./database-initialization-service.cjs');

const _TaskSchema = require('../model/MeadowSchema-Task.json');
const _CompiledModel = require('../model/Task-Compiled.json');

let tmpDataDir = libPath.resolve(__dirname, 'data');
let tmpSeedCSV = libPath.resolve(__dirname, '..', 'model', 'data', 'seeded_todo_events.csv');

let _Settings =
{
	Product: 'TodoList-Server',
	ProductVersion: '1.0.0',
	APIServerPort: 8086,
	SQLite:
	{
		SQLiteFilePath: libPath.resolve(tmpDataDir, 'todo.sqlite')
	},
	MeadowEndpointsSessionDataSource: 'None'
};

let _Fable = new libFable(_Settings);

// Register service types
_Fable.serviceManager.addServiceType('OratorServiceServer', libOratorServiceServerRestify);
_Fable.serviceManager.addServiceType('MeadowSQLiteProvider', libMeadowConnectionSQLite);
_Fable.serviceManager.addServiceType('DatabaseInitializationService', libDatabaseInitializationService);

// Instantiate the SQLite provider and our database initialization service
_Fable.serviceManager.instantiateServiceProvider('MeadowSQLiteProvider');
let _DatabaseService = _Fable.serviceManager.instantiateServiceProvider('DatabaseInitializationService', { DataDirectory: tmpDataDir });

_DatabaseService.connectDatabase(
	(pError) =>
	{
		if (pError)
		{
			return process.exit(1);
		}

		// Create tables from the compiled Stricture DDL using the provider's built-in table creation
		_DatabaseService.createTablesFromModel(_CompiledModel,
			(pCreateError) =>
			{
				if (pCreateError)
				{
					_Fable.log.error('Table creation error: ' + pCreateError.message);
					return process.exit(1);
				}

				// Create the Meadow DAL for the Task entity
				let _TaskDAL = libMeadow.new(_Fable, 'Task')
					.setProvider('SQLite')
					.setSchema(_TaskSchema.Schema)
					.setJsonSchema(_TaskSchema.JsonSchema)
					.setDefaultIdentifier(_TaskSchema.DefaultIdentifier)
					.setDefault(_TaskSchema.DefaultObject);

				// Seed from CSV through the Meadow DAL (skips if table already has data)
				_DatabaseService.seedFromCSV(_TaskDAL, tmpSeedCSV,
					(pSeedError) =>
					{
						if (pSeedError)
						{
							_Fable.log.error('Seed error: ' + pSeedError.message);
						}

						_startServer(_TaskDAL);
					});
			});
	});

function _startServer(pTaskDAL)
{
	// Create meadow endpoints (auto-generates REST routes)
	let _TaskEndpoints = libMeadowEndpoints.new(pTaskDAL);

	// Initialize Orator and wire up routes
	let _Orator = new libOrator(_Fable, {});
	_Orator.initialize(
		() =>
		{
			// Connect the auto-generated CRUD endpoints
			_TaskEndpoints.connectRoutes(_Orator.serviceServer);

			// Serve static files from the web client dist folder
			let tmpDistPath = libPath.resolve(__dirname, '..', 'web-client', 'dist');
			if (libFS.existsSync(tmpDistPath))
			{
				_Orator.addStaticRoute(tmpDistPath + '/', 'index.html');
			}
			else
			{
				_Fable.log.warn('Web client dist/ not found. Build it with: cd ../web-client && npm run build');
			}

			// Start the server
			_Orator.startService(
				(pStartError) =>
				{
					if (pStartError)
					{
						_Fable.log.error('Server start error: ' + pStartError.message);
						return process.exit(1);
					}
					_Fable.log.info('Todo List server running on http://localhost:' + _Settings.APIServerPort);
					_Fable.log.info('API endpoints at /1.0/Task (CRUD)');
				});
		});
}
