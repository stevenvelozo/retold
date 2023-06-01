/**
* Unit tests for Retold
* @author Steven Velozo <steven@velozo.com>
*/

const Chai = require("chai");
const Expect = Chai.expect;

const libRetold = require('../source/Retold.js');

suite
	(
		'Retold',
		() =>
		{
			setup(() => { });


			suite
				(
					'Object Sanity',
					() =>
					{
						test
							(
								'The class should initialize itself into a happy little object.',
								function ()
								{
									testRetold = new libRetold();
									Expect(testRetold).to.be.an('object', 'Go class go.');
								}
							);
					}
				);
		}
	);