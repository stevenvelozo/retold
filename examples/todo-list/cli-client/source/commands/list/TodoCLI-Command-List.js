const libCommandLineCommand = require('pict-service-commandlineutility').ServiceCommandLineCommand;

class TodoCLICommandList extends libCommandLineCommand
{
	constructor(pFable, pManifest, pServiceHash)
	{
		super(pFable, pManifest, pServiceHash);

		this.options.CommandKeyword = 'list';
		this.options.Description = 'List tasks from the todo list';

		this.options.Aliases.push('ls');
		this.options.Aliases.push('l');

		this.options.CommandOptions.push({ Name: '-s, --search [text]', Description: 'Filter tasks by name or description', Default: '' });
		this.options.CommandOptions.push({ Name: '-c, --column [column]', Description: 'Sort column (DueDate, Name, Status, LengthInHours, IDTask)', Default: 'DueDate' });
		this.options.CommandOptions.push({ Name: '-d, --direction [direction]', Description: 'Sort direction (ASC or DESC)', Default: 'DESC' });
		this.options.CommandOptions.push({ Name: '-n, --limit [count]', Description: 'Maximum number of tasks to show', Default: '50' });
		this.options.CommandOptions.push({ Name: '--status [status]', Description: 'Filter by status (Pending, Complete, In Progress)', Default: '' });

		this.addCommand();
	}

	onRunAsync(fCallback)
	{
		let tmpAPI = this.services.TodoAPI;
		let tmpSearch = this.CommandOptions.search || '';
		let tmpColumn = this.CommandOptions.column || 'DueDate';
		let tmpDirection = this.CommandOptions.direction || 'DESC';
		let tmpLimit = parseInt(this.CommandOptions.limit, 10) || 50;
		let tmpStatusFilter = this.CommandOptions.status || '';

		let tmpPath = tmpAPI.buildFilteredPath(tmpColumn, tmpDirection, tmpSearch, tmpLimit);

		this.log.info(`Fetching tasks...`);

		tmpAPI.request('GET', tmpPath, null,
			(pError, pTasks) =>
			{
				if (pError)
				{
					this.log.error(`Failed to fetch tasks: ${pError.message}`);
					return fCallback();
				}

				if (!Array.isArray(pTasks))
				{
					this.log.error(`Unexpected response from server.`);
					return fCallback();
				}

				// Optional client-side status filter
				let tmpTasks = pTasks;
				if (tmpStatusFilter)
				{
					let tmpLower = tmpStatusFilter.toLowerCase();
					tmpTasks = tmpTasks.filter(
						(pTask) =>
						{
							return (pTask.Status || '').toLowerCase() === tmpLower;
						});
				}

				if (tmpTasks.length === 0)
				{
					this.log.info(`No tasks found.`);
					return fCallback();
				}

				this.log.info(`${tmpTasks.length} task(s):`);
				this.log.info('');

				// Table header
				let tmpHeader = this._padRight('ID', 6)
					+ this._padRight('Status', 14)
					+ this._padRight('Due Date', 13)
					+ this._padRight('Hours', 7)
					+ 'Name';
				this.log.info(tmpHeader);
				this.log.info('-'.repeat(78));

				for (let i = 0; i < tmpTasks.length; i++)
				{
					let tmpTask = tmpTasks[i];
					let tmpDueDate = (tmpTask.DueDate || '-').substring(0, 10);
					let tmpLine = this._padRight(String(tmpTask.IDTask), 6)
						+ this._padRight(tmpTask.Status || '-', 14)
						+ this._padRight(tmpDueDate, 13)
						+ this._padRight(String(tmpTask.LengthInHours || 0), 7)
						+ (tmpTask.Name || '(untitled)');
					this.log.info(tmpLine);
				}

				this.log.info('');
				return fCallback();
			});
	}

	_padRight(pString, pLength)
	{
		let tmpStr = String(pString);
		while (tmpStr.length < pLength)
		{
			tmpStr += ' ';
		}
		return tmpStr;
	}
}

module.exports = TodoCLICommandList;
