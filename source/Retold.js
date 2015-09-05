// ##### Part of the **[retold](https://stevenvelozo.github.io/retold/)** system
/**
* @license MIT
* @author <steven@velozo.com>
*/

/**
* Retold Common Services Library
*
* @class Retold
*/
var Retold = function()
{
	function createNew(pFable)
	{
		// If a valid Fable object isn't passed in, return a constructor
		if (typeof(pFable) !== 'object')
		{
			return {new: createNew};
		}
		var _Fable = pFable;

		// Setup the Meadow macro functions
		var _MeadowMacros = require('./Retold-Meadow-Macros.js').new(_Fable);

		var oRetold = (
		{
			new: createNew
		});

		/**
		 * Meadow Macros
		 *
		 * @property DALMacros
		 */
		Object.defineProperty(oRetold, 'DALMacros',
			{
				get: function() { return _MeadowMacros; },
				enumerable: false
			});

		return oRetold;
	}

	return createNew();
};

module.exports = new Retold();