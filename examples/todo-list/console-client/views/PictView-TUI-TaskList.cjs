const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TUI-TaskList',

	DefaultRenderable: 'TUI-TaskList-Content',
	DefaultDestinationAddress: '#TUI-Content',
	DefaultTemplateRecordAddress: 'AppData.TodoList',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TUI-TaskList-Template',
			Template: '{~D:Record.TaskListDisplay~}'
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TUI-TaskList-Content',
			TemplateHash: 'TUI-TaskList-Template',
			ContentDestinationAddress: '#TUI-Content',
			RenderMethod: 'replace'
		}
	]
};

class TUITaskListView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onBeforeRender()
	{
		// Build a formatted text display of tasks for the blessed widget
		let tmpTasks = this.pict.AppData.TodoList.Tasks;
		let tmpSelectedIndex = this.pict.AppData.TodoList.SelectedIndex;
		let tmpLines = [];

		if (!tmpTasks || tmpTasks.length === 0)
		{
			tmpLines.push('');
			tmpLines.push('  No tasks found. Press [A] to add one.');
			this.pict.AppData.TodoList.TaskListDisplay = tmpLines.join('\n');
			return super.onBeforeRender();
		}

		// Column header
		let tmpHeader = '  ' + _padRight('#', 4) + _padRight('Name', 30) + _padRight('Due Date', 14) + _padRight('Hours', 8) + _padRight('Status', 14);
		tmpLines.push('{bold}' + tmpHeader + '{/bold}');
		tmpLines.push('  ' + '-'.repeat(68));

		for (let i = 0; i < tmpTasks.length; i++)
		{
			let tmpTask = tmpTasks[i];
			let tmpDueDate = tmpTask.DueDate || '-';
			// Truncate date to just the date part if it has a time component
			if (tmpDueDate.length > 10)
			{
				tmpDueDate = tmpDueDate.substring(0, 10);
			}

			let tmpLine = '  ' +
				_padRight(String(tmpTask.IDTask), 4) +
				_padRight((tmpTask.Name || '').substring(0, 28), 30) +
				_padRight(tmpDueDate, 14) +
				_padRight(String(tmpTask.LengthInHours || 0), 8) +
				_padRight(tmpTask.Status || '-', 14);

			if (i === tmpSelectedIndex)
			{
				tmpLine = '{inverse}' + tmpLine + '{/inverse}';
			}

			tmpLines.push(tmpLine);
		}

		this.pict.AppData.TodoList.TaskListDisplay = tmpLines.join('\n');

		return super.onBeforeRender();
	}
}

/**
 * Pad a string to a fixed width (right-padded with spaces).
 */
function _padRight(pString, pWidth)
{
	let tmpStr = String(pString || '');
	if (tmpStr.length >= pWidth)
	{
		return tmpStr.substring(0, pWidth);
	}
	return tmpStr + ' '.repeat(pWidth - tmpStr.length);
}

module.exports = TUITaskListView;
module.exports.default_configuration = _ViewConfiguration;
