/**
* Unit tests for Retold
*
* @license     MIT
*
* @author      Steven Velozo <steven@velozo.com>
*/

var Chai = require("chai");
var Expect = Chai.expect;
var Assert = Chai.assert;


var _MockSettings = (
{
	Product: 'MockRetold',
	ProductVersion: '0.0.0'
});

suite
(
	'Retold',
	function()
	{
		var _Fable;

		setup
		(
			function()
			{
				_Fable = require('fable').new(_MockSettings);
			}
		);


		suite
		(
			'Object Sanity',
			function()
			{
				test
				(
					'The class should initialize itself into a happy little object.',
					function()
					{
						testFable = require('../source/Retold.js').new();
						// Instantiate the logger
						Expect(testFable).to.be.an('object', 'Retold should initialize as an object directly from the require statement.');
					}
				);
			}
		);
	}
);