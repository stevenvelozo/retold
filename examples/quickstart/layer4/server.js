// Simple static file server using Orator to serve the built Pict application
const libFable = require('fable');
const libOrator = require('orator');
const libOratorServiceServerRestify = require('orator-serviceserver-restify');

let _Fable = new libFable(
	{
		Product: 'BookStore-Server',
		ProductVersion: '1.0.0',
		APIServerPort: 8086
	});

_Fable.serviceManager.addServiceType('OratorServiceServer', libOratorServiceServerRestify);
_Fable.serviceManager.instantiateServiceProvider('OratorServiceServer');
_Fable.serviceManager.addServiceType('Orator', libOrator);
let _Orator = _Fable.serviceManager.instantiateServiceProvider('Orator');

_Orator.initialize(
	function ()
	{
		_Orator.addStaticRoute(`${__dirname}/dist/`, 'index.html');

		_Orator.startService(
			function ()
			{
				_Fable.log.info('Open http://localhost:8086 in your browser');
			});
	});
