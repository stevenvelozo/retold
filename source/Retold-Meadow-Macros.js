// ##### Part of the **[retold](https://stevenvelozo.github.io/retold/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

/**
* Meadow Macro Functions
*
* @class MeadowMacros
*/
var MeadowMacros = function()
{
	function createNew(pFable)
	{
		// If a valid Fable object isn't passed in, return a constructor
		if (typeof(pFable) !== 'object')
		{
			return {new: createNew};
		}

		var _Fable = pFable;


		var libMeadow = require('meadow').new(pFable);
		var libMeadowEndpoints = require('meadow-endpoints');

		// The DAL cache object
		var _DALCache = {};
		var _MeadowEndpointCache = false;

		/**
		 * Get a DAL for a particular schema.
		 *
		 * @method getDAL
		 * @param {String} pSchemaName The string schema to get
		 */
		var getDAL = function(pSchemaName)
		{
			var tmpSchemaJSONPath = _Fable.settings.MeadowSchemaFilePrefix+pSchemaName+'.json';
			if (_DALCache.hasOwnProperty(pSchemaName))
			{
				return _DALCache[pSchemaName];
			}
			else
			{
				try
				{
					// TODO: These need to be cached so we aren't loading them every request.  Maybe?
					return libMeadow.loadFromPackage(tmpSchemaJSONPath);
				}
				catch(pError)
				{
					_Fable.log.error('Schema Load Error: '+pError, {Schema:pSchemaName});
					return false;
				}
			}
		};

		/**
		 * Get the Meadow Endpoints for a particular DAL.
		 *
		 * @method getMeadowEndpoints
		 * @param {Object} pDAL A Meadow DAL (or a string for a DAL to load)
		 */
		var getMeadowEndpoints = function(pDAL, pOrator)
		{
			var tmpDAL = pDAL;
			if (typeof(tmpDAL) === 'string')
			{
				// Automatically try to load the DAL if a string was passed in
				tmpDAL = getDAL(pDAL);
			}

			if (typeof(tmpDAL) !== 'object')
			{
				_Fable.log.error('Meadow Endpoint Load Error: DAL was not a valid object', {DAL: pDAL});
				return false;
			}

			try
			{
				var tmpEndPoints = libMeadowEndpoints.new(tmpDAL);

				if ((typeof(pOrator) === 'object') && pOrator.hasOwnProperty('webServer'))
				{
					// Automatically connect the routes, since orator was passed in
					tmpEndPoints.connectRoutes(pOrator.webServer);
				}

				return tmpEndPoints;
			}
			catch(pError)
			{
				_Fable.log.error('Schema Load Error: '+pError, {Schema:pSchema});
				return false;
			}
		};


		/**
		 * Create a record.
		 *
		 * A one-line create:
		 *    _CommonServices.doDALCreate({SchemaName:'ObservationTag', IDUser:15, Record:{Tag:'Accident',TagType:'User',IDCustomer:1}}, function(){});
		 */
		var doDALCreate = function(pBundle, fCallBack)
		{
			// pBundle has: SchemaName, Record, IDUser
			// TODO: Validate pBundle
			var tmpDAL = getDAL(pBundle.SchemaName)
							.setIDUser(pBundle.IDUser);
			tmpDAL.doCreate(tmpDAL.query.addRecord(pBundle.Record), fCallBack);
		};

		/**
		 * Read a record.
		 *
		 * A one-line read (do something with pRecord eh):
		 *    _CommonServices.doDALRead({SchemaName:'ObservationTag', IDRecord:3, IDUser:15}, function(pError, pQuery, pRecord){});
		 */
		var doDALRead = function(pBundle, fCallBack)
		{
			// pBundle has: SchemaName, IDRecord
			// TODO: Validate pBundle
			var tmpDAL = getDAL(pBundle.SchemaName);

			var tmpQuery = tmpDAL.query;

			var tmpFilterString = (typeof(pBundle.Filter) === 'string') ? pBundle.Filter : null;
			if (tmpFilterString !== null)
			{
				// Lazily create an endpoint object with an empty DAL to use for parseFilter
				if (!_MeadowEndpointCache)
				{
					_MeadowEndpointCache = libMeadowEndpoints.new(libMeadow);
				}
				// Parse the filter
				_MeadowEndpointCache.parseFilter(tmpFilterString, tmpQuery);
			}
			else
			{
				// Expect an IDRecord otherwise.
				tmpQuery.addFilter(tmpDAL.defaultIdentifier, pBundle.IDRecord);
			}

			tmpDAL.doRead(tmpQuery, fCallBack);
		};

		/**
		 * Read multiple records.
		 *
		 * A one-line read (do something with pRecords eh):
		 *    		 _CommonServices.doDALReads({SchemaName:'ObservationTag', Cap:25, Begin:0, Filter:''}, function(pError, pQuery, pRecords){});
		 */
		var doDALReads = function(pBundle, fCallBack)
		{
			// pBundle has: SchemaName, Cap, Begin, FilterString
			// TODO: Validate pBundle
			var tmpDAL = getDAL(pBundle.SchemaName);

			var tmpQuery = tmpDAL.query;

			if (0 === pBundle.Cap % (!isNaN(parseFloat(pBundle.Cap)) && 0 <= ~~pBundle.Cap))
				tmpQuery.setCap(pBundle.Cap);

			if (0 === pBundle.Begin % (!isNaN(parseFloat(pBundle.Begin)) && 0 <= ~~pBundle.Begin))
				tmpQuery.setBegin(pBundle.Begin);

			var tmpFilterString = (typeof(pBundle.Filter) === 'string') ? pBundle.Filter : null;
			if (tmpFilterString !== null)
			{
				// Lazily create an endpoint object with an empty DAL to use for parseFilter
				if (!_MeadowEndpointCache)
				{
					_MeadowEndpointCache = libMeadowEndpoints.new(libMeadow);
				}
				// Parse the filter
				_MeadowEndpointCache.parseFilter(tmpFilterString, tmpQuery);
			}

			tmpDAL.doReads(tmpQuery, fCallBack);
		};

		/**
		 * Update a record.
		 *
		 * A one-line Update (pRecord will have the updated record in it):
		 *    		 _CommonServices.doDALUpdate({SchemaName:'ObservationTag', IDUser:15, Record:{IDObservationTag:2,Tag:'ABC Contracting'}}, function(pError, pQuery, pReadQuery, pRecord){});
		 */
		var doDALUpdate = function(pBundle, fCallBack)
		{
			// pBundle has: SchemaName, IDUser, Record
			// TODO: Validate pBundle
			var tmpDAL = getDAL(pBundle.SchemaName)
							.setIDUser(pBundle.IDUser);

			var tmpQuery = tmpDAL.query
							.addRecord(pBundle.Record);

			tmpDAL.doUpdate(tmpQuery, fCallBack);
		};

		/**
		 * Delete a record.
		 *
		 * A one-line Delete (pRecord will have the updated record in it):
		 *    		 _CommonServices.doDALDelete({SchemaName:'ObservationTag', IDUser:15, IDRecord:2}, function(pError, pQuery, pCount){});
		 */
		var doDALDelete = function(pBundle, fCallBack)
		{
			// pBundle has: SchemaName, IDUser, Record
			// TODO: Validate pBundle
			var tmpDAL = getDAL(pBundle.SchemaName)
							.setIDUser(pBundle.IDUser);
			var tmpQuery = tmpDAL.query.addFilter(tmpDAL.defaultIdentifier, pBundle.IDRecord);
			tmpDAL.doDelete(tmpQuery, fCallBack);
		};

		/**
		 * Count records
		 *
		 * A one-line count (do something with pRecords eh):
		 *    		 _CommonServices.doDALCount({SchemaName:'ObservationTag', Filter:''}, function(pError, pQuery, pCount){});
		 */
		var doDALCount = function(pBundle, fCallBack)
		{
			// pBundle has: SchemaName, Cap, Begin, FilterString
			// TODO: Validate pBundle
			var tmpDAL = getDAL(pBundle.SchemaName);

			var tmpQuery = tmpDAL.query;

			var tmpFilterString = (typeof(pBundle.Filter) === 'string') ? pBundle.Filter : null;
			if (tmpFilterString !== null)
			{
				// Lazily create an endpoint object with an empty DAL to use for parseFilter
				if (!_MeadowEndpointCache)
				{
					_MeadowEndpointCache = libMeadowEndpoints.new(libMeadow);
				}
				// Parse the filter
				_MeadowEndpointCache.parseFilter(tmpFilterString, tmpQuery);
			}

			tmpDAL.doCount(tmpQuery, fCallBack);
		};

		var oMeadowMacros = (
		{

			getDAL: getDAL,
			getMeadowEndpoints: getMeadowEndpoints,

			doDALCreate: doDALCreate,
			doDALRead: doDALRead,
			doDALReads: doDALReads,
			doDALUpdate: doDALUpdate,
			doDALDelete: doDALDelete,
			doDALCount: doDALCount
		});

		return oMeadowMacros;
	}

	return createNew();
};

module.exports = new MeadowMacros();
