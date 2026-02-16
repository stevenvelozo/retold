const libCLIProgram = require('pict-service-commandlineutility');

let _Pict = new libCLIProgram(
	{
		Product: 'TodoCLI',
		Version: require('../package.json').version,

		Command: 'todo',
		Description: 'Manage tasks in the Retold Todo List from the command line.',

		DefaultProgramConfiguration:
		{
			ApiBaseURL: 'http://localhost:8086'
		},

		ProgramConfigurationFileName: '.todo-cli.json',
		AutoGatherProgramConfiguration: true,
		AutoAddConfigurationExplanationCommand: true
	},
	[
		require('./commands/list/TodoCLI-Command-List.js'),
		require('./commands/add/TodoCLI-Command-Add.js'),
		require('./commands/remove/TodoCLI-Command-Remove.js'),
		require('./commands/complete/TodoCLI-Command-Complete.js')
	]);

// Register the shared HTTP service for API communication
_Pict.addAndInstantiateServiceType('TodoAPI', require('./services/TodoCLI-Service-API.js'));

module.exports = _Pict;
