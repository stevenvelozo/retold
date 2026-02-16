const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class TodoCLICommandAdd extends libCommandLineCommand
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.options.CommandKeyword = 'add';
		this.options.Description = 'Add a new task to the todo list';

		this.options.Aliases.push('new');
		this.options.Aliases.push('create');

		this.options.CommandArguments.push({ Name: '<name>', Description: 'The task name' });

		this.options.CommandOptions.push({ Name: '-D, --description [text]', Description: 'Task description', Default: '' });
		this.options.CommandOptions.push({ Name: '-d, --due [date]', Description: 'Due date (YYYY-MM-DD)', Default: '' });
		this.options.CommandOptions.push({ Name: '-h, --hours [hours]', Description: 'Estimated length in hours', Default: '0' });
		this.options.CommandOptions.push({ Name: '-s, --status [status]', Description: 'Initial status (Pending, In Progress, Complete)', Default: 'Pending' });

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpAPI = this.services.TodoAPI;
		let tmpName = this.ArgumentString;

		if (!tmpName)
		{
			this.log.error(`Task name is required.  Usage: todo add "My new task"`);
			return fCallback();
		}

		let tmpTaskData =
		{
			Name: tmpName,
			Description: this.CommandOptions.description || '',
			DueDate: this.CommandOptions.due || '',
			LengthInHours: parseFloat(this.CommandOptions.hours) || 0,
			Status: this.CommandOptions.status || 'Pending'
		};

		this.log.info(`Creating task: ${tmpName}`);

		tmpAPI.request('POST', '/1.0/Task', tmpTaskData,
			(pError, pResult) =>
			{
				if (pError)
				{
					this.log.error(`Failed to create task: ${pError.message}`);
					return fCallback();
				}

				if (pResult && pResult.IDTask)
				{
					this.log.info(`Task created successfully (ID: ${pResult.IDTask})`);
				}
				else if (pResult && pResult.Error)
				{
					this.log.error(`Server error: ${pResult.Error}`);
				}
				else
				{
					this.log.info(`Task created.`);
				}

				return fCallback();
			});
	}
}

module.exports = TodoCLICommandAdd;
