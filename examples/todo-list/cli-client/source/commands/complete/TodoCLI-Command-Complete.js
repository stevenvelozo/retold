const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class TodoCLICommandComplete extends libCommandLineCommand
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.options.CommandKeyword = 'complete';
		this.options.Description = 'Mark a task as complete by ID';

		this.options.Aliases.push('done');
		this.options.Aliases.push('finish');

		this.options.CommandArguments.push({ Name: '<id>', Description: 'The task ID to mark complete' });

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpAPI = this.services.TodoAPI;
		let tmpIDTask = parseInt(this.ArgumentString, 10);

		if (!tmpIDTask || isNaN(tmpIDTask))
		{
			this.log.error(`A valid task ID is required.  Usage: todo complete 42`);
			return fCallback();
		}

		// First, fetch the task so we have its current data
		this.log.info(`Fetching task ${tmpIDTask}...`);

		tmpAPI.request('GET', '/1.0/Task/' + tmpIDTask, null,
			(pError, pTask) =>
			{
				if (pError)
				{
					this.log.error(`Failed to fetch task: ${pError.message}`);
					return fCallback();
				}

				if (!pTask || !pTask.IDTask)
				{
					this.log.error(`Task ${tmpIDTask} not found.`);
					return fCallback();
				}

				if (pTask.Status === 'Complete')
				{
					this.log.info(`Task ${tmpIDTask} (${pTask.Name}) is already complete.`);
					return fCallback();
				}

				// Update the status to Complete
				let tmpUpdateData =
				{
					IDTask: pTask.IDTask,
					Name: pTask.Name,
					Description: pTask.Description,
					DueDate: pTask.DueDate,
					LengthInHours: pTask.LengthInHours,
					Status: 'Complete'
				};

				this.log.info(`Marking task "${pTask.Name}" as complete...`);

				tmpAPI.request('PUT', '/1.0/Task', tmpUpdateData,
					(pUpdateError, pResult) =>
					{
						if (pUpdateError)
						{
							this.log.error(`Failed to update task: ${pUpdateError.message}`);
							return fCallback();
						}

						this.log.info(`Task ${tmpIDTask} marked as complete.`);
						return fCallback();
					});
			});
	}
}

module.exports = TodoCLICommandComplete;
