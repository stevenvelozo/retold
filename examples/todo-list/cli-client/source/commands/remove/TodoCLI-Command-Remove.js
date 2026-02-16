const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class TodoCLICommandRemove extends libCommandLineCommand
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.options.CommandKeyword = 'remove';
		this.options.Description = 'Remove a task by ID';

		this.options.Aliases.push('rm');
		this.options.Aliases.push('delete');
		this.options.Aliases.push('del');

		this.options.CommandArguments.push({ Name: '<id>', Description: 'The task ID to remove' });

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpAPI = this.services.TodoAPI;
		let tmpIDTask = parseInt(this.ArgumentString, 10);

		if (!tmpIDTask || isNaN(tmpIDTask))
		{
			this.log.error(`A valid task ID is required.  Usage: todo remove 42`);
			return fCallback();
		}

		this.log.info(`Removing task ${tmpIDTask}...`);

		tmpAPI.request('DELETE', '/1.0/Task/' + tmpIDTask, null,
			(pError, pResult) =>
			{
				if (pError)
				{
					this.log.error(`Failed to remove task: ${pError.message}`);
					return fCallback();
				}

				this.log.info(`Task ${tmpIDTask} removed.`);
				return fCallback();
			});
	}
}

module.exports = TodoCLICommandRemove;
