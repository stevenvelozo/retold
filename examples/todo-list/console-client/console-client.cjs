#!/usr/bin/env node
/**
 * Retold Todo List -- Console Client
 *
 * Demonstrates pict-terminalui + blessed for a TUI that connects
 * to the same API server as the web client.
 *
 * Requires the server to be running: cd ../server && npm start
 *
 * Run:  node console-client.cjs
 * Quit: q or Ctrl-C
 *
 * Keys:
 *   Up/Down  Navigate task selection
 *   Enter    View selected task detail
 *   E        Edit selected task
 *   A        Add new task
 *   D        Delete selected task
 *   S        Sort order picker
 *   /        Search / filter tasks
 *   R        Refresh task list
 *   Q        Quit
 */

// Suppress blessed's Setulc stderr noise before anything loads
const _origStderrWrite = process.stderr.write;
process.stderr.write = function (pChunk)
{
	if (typeof pChunk === 'string' && pChunk.indexOf('Setulc') !== -1)
	{
		return true;
	}
	return _origStderrWrite.apply(process.stderr, arguments);
};

const libHttp = require('http');
const blessed = require('blessed');
const libPict = require('pict');
const libPictApplication = require('pict-application');

const libPictTerminalUI = require('pict-terminalui');

// Views
const libViewLayout = require('./views/PictView-TUI-Layout.cjs');
const libViewHeader = require('./views/PictView-TUI-Header.cjs');
const libViewTaskList = require('./views/PictView-TUI-TaskList.cjs');
const libViewStatusBar = require('./views/PictView-TUI-StatusBar.cjs');

const API_BASE = 'http://localhost:8086';

// ─────────────────────────────────────────────
//  Sort options available in the sort picker
// ─────────────────────────────────────────────
const SORT_OPTIONS =
[
	{ Label: 'Due Date (newest first)', Column: 'DueDate', Direction: 'DESC' },
	{ Label: 'Due Date (oldest first)', Column: 'DueDate', Direction: 'ASC' },
	{ Label: 'Name (A-Z)', Column: 'Name', Direction: 'ASC' },
	{ Label: 'Name (Z-A)', Column: 'Name', Direction: 'DESC' },
	{ Label: 'Status (A-Z)', Column: 'Status', Direction: 'ASC' },
	{ Label: 'Status (Z-A)', Column: 'Status', Direction: 'DESC' },
	{ Label: 'Hours (most first)', Column: 'LengthInHours', Direction: 'DESC' },
	{ Label: 'Hours (least first)', Column: 'LengthInHours', Direction: 'ASC' },
	{ Label: 'Recently added', Column: 'IDTask', Direction: 'DESC' },
	{ Label: 'Oldest added', Column: 'IDTask', Direction: 'ASC' }
];

// ─────────────────────────────────────────────
//  HTTP helper (uses Node.js http module)
// ─────────────────────────────────────────────
function httpRequest(pMethod, pPath, pBody, fCallback)
{
	let tmpURL = new URL(pPath, API_BASE);
	let tmpOptions =
	{
		method: pMethod,
		hostname: tmpURL.hostname,
		port: tmpURL.port,
		path: tmpURL.pathname + tmpURL.search,
		headers: { 'Content-Type': 'application/json' }
	};

	let tmpReq = libHttp.request(tmpOptions,
		(pResponse) =>
		{
			let tmpData = '';
			pResponse.on('data', (pChunk) => { tmpData += pChunk; });
			pResponse.on('end', () =>
			{
				try
				{
					let tmpParsed = JSON.parse(tmpData);
					return fCallback(null, tmpParsed);
				}
				catch (pParseError)
				{
					return fCallback(pParseError);
				}
			});
		});

	tmpReq.on('error', (pError) => { return fCallback(pError); });

	if (pBody)
	{
		tmpReq.write(JSON.stringify(pBody));
	}
	tmpReq.end();
}

// ─────────────────────────────────────────────
//  Application class
// ─────────────────────────────────────────────
class TodoListConsoleApplication extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.terminalUI = null;
		this._screen = null;
		this._contentBox = null;

		// Track whether a modal is currently open so we don't double-open
		this._modalOpen = false;

		// Add views
		this.pict.addView('TUI-Layout', libViewLayout.default_configuration, libViewLayout);
		this.pict.addView('TUI-Header', libViewHeader.default_configuration, libViewHeader);
		this.pict.addView('TUI-TaskList', libViewTaskList.default_configuration, libViewTaskList);
		this.pict.addView('TUI-StatusBar', libViewStatusBar.default_configuration, libViewStatusBar);
	}

	onAfterInitializeAsync(fCallback)
	{
		// Initialize shared application state
		this.pict.AppData.TodoList =
		{
			Tasks: [],
			SelectedIndex: 0,
			StatusMessage: 'Loading tasks...',
			TaskListDisplay: '',

			// List state drives server-side sort and search
			ListState:
			{
				SortColumn: 'DueDate',
				SortDirection: 'DESC',
				SearchText: ''
			}
		};

		// Create the terminal UI environment
		this.terminalUI = new libPictTerminalUI(this.pict,
			{
				Title: 'Todo List Console Client'
			});

		// Create the blessed screen
		this._screen = this.terminalUI.createScreen();

		// Build the blessed widget layout
		this._createBlessedLayout(this._screen);

		// Bind navigation keys
		this._bindNavigation(this._screen);

		// Load tasks from the API
		this._loadTasks(
			() =>
			{
				// Render the layout view (which triggers child view renders)
				this.pict.views['TUI-Layout'].render();

				// Do the initial blessed screen render
				this._screen.render();

				return super.onAfterInitializeAsync(fCallback);
			});
	}

	/**
	 * Create the blessed widget layout and register widgets.
	 */
	_createBlessedLayout(pScreen)
	{
		// Application container
		let tmpAppContainer = blessed.box(
			{
				parent: pScreen,
				top: 0,
				left: 0,
				width: '100%',
				height: '100%'
			});
		this.terminalUI.registerWidget('#TUI-Application-Container', tmpAppContainer);

		// Header bar
		let tmpHeader = blessed.box(
			{
				parent: pScreen,
				top: 0,
				left: 0,
				width: '100%',
				height: 3,
				tags: true,
				style:
				{
					fg: 'white',
					bg: 'blue',
					bold: true
				}
			});
		this.terminalUI.registerWidget('#TUI-Header', tmpHeader);

		// Main content area
		this._contentBox = blessed.box(
			{
				parent: pScreen,
				top: 3,
				left: 0,
				width: '100%',
				bottom: 1,
				tags: true,
				scrollable: true,
				mouse: true,
				keys: true,
				vi: true,
				scrollbar:
				{
					style: { bg: 'green' }
				},
				border:
				{
					type: 'line'
				},
				style:
				{
					border: { fg: 'cyan' }
				},
				label: ' Tasks ',
				padding:
				{
					left: 1,
					right: 1
				}
			});
		this.terminalUI.registerWidget('#TUI-Content', this._contentBox);

		// Status bar
		let tmpStatusBar = blessed.box(
			{
				parent: pScreen,
				bottom: 0,
				left: 0,
				width: '100%',
				height: 1,
				tags: true,
				style:
				{
					fg: 'white',
					bg: 'gray'
				}
			});
		this.terminalUI.registerWidget('#TUI-StatusBar', tmpStatusBar);
	}

	/**
	 * Bind keyboard shortcuts.
	 */
	_bindNavigation(pScreen)
	{
		let tmpSelf = this;

		pScreen.key(['up'],
			() =>
			{
				if (tmpSelf._modalOpen) return;
				if (tmpSelf.pict.AppData.TodoList.SelectedIndex > 0)
				{
					tmpSelf.pict.AppData.TodoList.SelectedIndex--;
					tmpSelf.pict.views['TUI-TaskList'].render();
					tmpSelf._screen.render();
				}
			});

		pScreen.key(['down'],
			() =>
			{
				if (tmpSelf._modalOpen) return;
				let tmpTasks = tmpSelf.pict.AppData.TodoList.Tasks;
				if (tmpSelf.pict.AppData.TodoList.SelectedIndex < tmpTasks.length - 1)
				{
					tmpSelf.pict.AppData.TodoList.SelectedIndex++;
					tmpSelf.pict.views['TUI-TaskList'].render();
					tmpSelf._screen.render();
				}
			});

		// Add task
		pScreen.key(['a'],
			() =>
			{
				if (tmpSelf._modalOpen) return;
				tmpSelf._showEditModal(null);
			});

		// View task detail (Enter)
		pScreen.key(['enter'],
			() =>
			{
				if (tmpSelf._modalOpen) return;
				let tmpTasks = tmpSelf.pict.AppData.TodoList.Tasks;
				if (tmpTasks.length > 0)
				{
					let tmpTask = tmpTasks[tmpSelf.pict.AppData.TodoList.SelectedIndex];
					tmpSelf._showViewModal(tmpTask);
				}
			});

		// Edit task
		pScreen.key(['e'],
			() =>
			{
				if (tmpSelf._modalOpen) return;
				let tmpTasks = tmpSelf.pict.AppData.TodoList.Tasks;
				if (tmpTasks.length > 0)
				{
					let tmpTask = tmpTasks[tmpSelf.pict.AppData.TodoList.SelectedIndex];
					tmpSelf._showEditModal(tmpTask);
				}
			});

		// Delete task
		pScreen.key(['d'],
			() =>
			{
				if (tmpSelf._modalOpen) return;
				let tmpTasks = tmpSelf.pict.AppData.TodoList.Tasks;
				if (tmpTasks.length > 0)
				{
					let tmpTask = tmpTasks[tmpSelf.pict.AppData.TodoList.SelectedIndex];
					tmpSelf._deleteTask(tmpTask.IDTask);
				}
			});

		// Sort picker
		pScreen.key(['s'],
			() =>
			{
				if (tmpSelf._modalOpen) return;
				tmpSelf._showSortModal();
			});

		// Search / filter
		pScreen.key(['/'],
			() =>
			{
				if (tmpSelf._modalOpen) return;
				tmpSelf._showSearchModal();
			});

		// Refresh
		pScreen.key(['r'],
			() =>
			{
				if (tmpSelf._modalOpen) return;
				tmpSelf._setStatus('Refreshing...');
				tmpSelf._loadTasks(
					() =>
					{
						tmpSelf._setStatus('Refreshed.');
						tmpSelf.pict.views['TUI-TaskList'].render();
						tmpSelf.pict.views['TUI-StatusBar'].render();
						tmpSelf._screen.render();
					});
			});

		// Quit
		pScreen.key(['q', 'C-c'],
			() =>
			{
				if (tmpSelf._modalOpen) return;
				process.exit(0);
			});
	}

	// ─────────────────────────────────────────
	//  API methods
	// ─────────────────────────────────────────

	/**
	 * Build the FilteredTo URL path based on the current ListState.
	 */
	_buildFilteredPath()
	{
		let tmpState = this.pict.AppData.TodoList.ListState;
		let tmpFilter = 'FSF~' + tmpState.SortColumn + '~' + tmpState.SortDirection + '~0';

		if (tmpState.SearchText)
		{
			let tmpSearchEncoded = encodeURIComponent('%' + tmpState.SearchText + '%');
			tmpFilter = 'FBV~Name~LK~' + tmpSearchEncoded
				+ '~FBVOR~Description~LK~' + tmpSearchEncoded
				+ '~' + tmpFilter;
		}

		return '/1.0/Tasks/FilteredTo/' + tmpFilter + '/0/250';
	}

	/**
	 * Load tasks from the API using the current sort and filter.
	 */
	_loadTasks(fCallback)
	{
		let tmpSelf = this;
		let tmpPath = tmpSelf._buildFilteredPath();

		httpRequest('GET', tmpPath, null,
			(pError, pTasks) =>
			{
				if (pError)
				{
					tmpSelf._setStatus('Error: ' + pError.message);
					if (fCallback) return fCallback();
					return;
				}

				if (Array.isArray(pTasks))
				{
					tmpSelf.pict.AppData.TodoList.Tasks = pTasks;
					// Keep selected index in bounds
					if (tmpSelf.pict.AppData.TodoList.SelectedIndex >= pTasks.length)
					{
						tmpSelf.pict.AppData.TodoList.SelectedIndex = Math.max(0, pTasks.length - 1);
					}
					tmpSelf._setStatus(pTasks.length + ' task(s) loaded.');
				}
				else
				{
					tmpSelf._setStatus('Unexpected response from server.');
				}

				if (fCallback) return fCallback();
			});
	}

	/**
	 * Delete a task.
	 */
	_deleteTask(pIDTask)
	{
		let tmpSelf = this;
		tmpSelf._setStatus('Deleting task ' + pIDTask + '...');

		httpRequest('DELETE', '/1.0/Task/' + pIDTask, null,
			(pError) =>
			{
				if (pError)
				{
					tmpSelf._setStatus('Delete error: ' + pError.message);
					tmpSelf.pict.views['TUI-StatusBar'].render();
					tmpSelf._screen.render();
					return;
				}
				tmpSelf._loadTasks(
					() =>
					{
						tmpSelf._setStatus('Task deleted.');
						tmpSelf.pict.views['TUI-TaskList'].render();
						tmpSelf.pict.views['TUI-StatusBar'].render();
						tmpSelf._screen.render();
					});
			});
	}

	/**
	 * Save a task (create or update).
	 */
	_saveTask(pExistingTask, pFieldData)
	{
		let tmpSelf = this;
		let tmpIsEdit = !!pExistingTask;

		let tmpTaskData =
		{
			Name: pFieldData.Name,
			Description: pFieldData.Description,
			DueDate: pFieldData.DueDate,
			LengthInHours: parseFloat(pFieldData.LengthInHours) || 0,
			Status: pFieldData.Status
		};

		if (tmpIsEdit)
		{
			tmpTaskData.IDTask = pExistingTask.IDTask;
			tmpSelf._setStatus('Updating task ' + tmpTaskData.IDTask + '...');
			httpRequest('PUT', '/1.0/Task', tmpTaskData,
				(pError) =>
				{
					if (pError)
					{
						tmpSelf._setStatus('Update error: ' + pError.message);
					}
					else
					{
						tmpSelf._setStatus('Task updated.');
					}
					tmpSelf._loadTasks(
						() =>
						{
							tmpSelf.pict.views['TUI-TaskList'].render();
							tmpSelf.pict.views['TUI-StatusBar'].render();
							tmpSelf._screen.render();
						});
				});
		}
		else
		{
			tmpSelf._setStatus('Creating task...');
			httpRequest('POST', '/1.0/Task', tmpTaskData,
				(pError) =>
				{
					if (pError)
					{
						tmpSelf._setStatus('Create error: ' + pError.message);
					}
					else
					{
						tmpSelf._setStatus('Task created.');
					}
					tmpSelf._loadTasks(
						() =>
						{
							tmpSelf.pict.views['TUI-TaskList'].render();
							tmpSelf.pict.views['TUI-StatusBar'].render();
							tmpSelf._screen.render();
						});
				});
		}
	}

	// ─────────────────────────────────────────
	//  View Modal (read-only detail)
	// ─────────────────────────────────────────

	/**
	 * Show a read-only detail box for a task.
	 * Press Escape or Enter to close, E to jump to edit.
	 */
	_showViewModal(pTask)
	{
		let tmpSelf = this;
		tmpSelf._modalOpen = true;

		let tmpDueDate = (pTask.DueDate || '-');
		if (tmpDueDate.length > 10)
		{
			tmpDueDate = tmpDueDate.substring(0, 10);
		}

		let tmpContent = [
			'{bold}' + (pTask.Name || '(untitled)') + '{/bold}',
			'',
			'{bold}Status:{/bold}      ' + (pTask.Status || '-'),
			'{bold}Due Date:{/bold}    ' + tmpDueDate,
			'{bold}Hours:{/bold}       ' + (pTask.LengthInHours || 0),
			'',
			'{bold}Description:{/bold}',
			(pTask.Description || '(none)'),
			'',
			'{center}{gray-fg}[Esc] Close   [E] Edit{/gray-fg}{/center}'
		].join('\n');

		let tmpBox = blessed.box(
			{
				parent: tmpSelf._screen,
				top: 'center',
				left: 'center',
				width: '70%',
				height: 'shrink',
				padding: 1,
				border: { type: 'line' },
				style:
				{
					border: { fg: 'cyan' },
					bg: 'black',
					fg: 'white'
				},
				tags: true,
				keys: true,
				label: ' Task Detail ',
				content: tmpContent
			});

		tmpBox.focus();

		tmpBox.key(['escape', 'q'],
			() =>
			{
				tmpBox.destroy();
				tmpSelf._modalOpen = false;
				tmpSelf._screen.render();
			});

		tmpBox.key(['e'],
			() =>
			{
				tmpBox.destroy();
				tmpSelf._modalOpen = false;
				tmpSelf._showEditModal(pTask);
			});

		tmpSelf._screen.render();
	}

	// ─────────────────────────────────────────
	//  Edit Modal (sequential field prompts)
	// ─────────────────────────────────────────

	/**
	 * Prompt the user for task fields (add or edit).
	 *
	 * @param {Object|null} pExistingTask - If non-null, edit this task. Otherwise create new.
	 */
	_showEditModal(pExistingTask)
	{
		let tmpSelf = this;
		tmpSelf._modalOpen = true;

		let tmpIsEdit = !!pExistingTask;
		let tmpDefaults =
		{
			Name: tmpIsEdit ? (pExistingTask.Name || '') : '',
			Description: tmpIsEdit ? (pExistingTask.Description || '') : '',
			DueDate: tmpIsEdit ? (pExistingTask.DueDate || '') : '',
			LengthInHours: tmpIsEdit ? (pExistingTask.LengthInHours || 0) : 0,
			Status: tmpIsEdit ? (pExistingTask.Status || 'Pending') : 'Pending'
		};

		// Truncate DueDate to just the date portion for editing
		if (tmpDefaults.DueDate.length > 10)
		{
			tmpDefaults.DueDate = tmpDefaults.DueDate.substring(0, 10);
		}

		let tmpFields = ['Name', 'Description', 'DueDate', 'LengthInHours', 'Status'];
		let tmpResults = {};
		let tmpFieldIndex = 0;

		let tmpPrompt = blessed.prompt(
			{
				parent: tmpSelf._screen,
				top: 'center',
				left: 'center',
				width: '60%',
				height: 'shrink',
				border: { type: 'line' },
				style:
				{
					border: { fg: 'yellow' },
					bg: 'black',
					fg: 'white'
				},
				tags: true,
				keys: true,
				vi: true,
				label: tmpIsEdit ? ' Edit Task ' : ' New Task '
			});

		function promptNextField()
		{
			if (tmpFieldIndex >= tmpFields.length)
			{
				// All fields collected -- save the task
				tmpPrompt.destroy();
				tmpSelf._modalOpen = false;
				tmpSelf._saveTask(pExistingTask, tmpResults);
				return;
			}

			let tmpFieldName = tmpFields[tmpFieldIndex];
			let tmpDefault = String(tmpDefaults[tmpFieldName]);
			let tmpLabel = tmpFieldName + ' [' + tmpDefault + ']:';

			tmpPrompt.input(tmpLabel, tmpDefault,
				(pError, pValue) =>
				{
					if (pError || pValue === null || pValue === undefined)
					{
						// User cancelled (Escape)
						tmpPrompt.destroy();
						tmpSelf._modalOpen = false;
						tmpSelf._screen.render();
						return;
					}
					tmpResults[tmpFieldName] = pValue;
					tmpFieldIndex++;
					promptNextField();
				});
		}

		promptNextField();
	}

	// ─────────────────────────────────────────
	//  Sort Modal
	// ─────────────────────────────────────────

	/**
	 * Show a list picker for sort order.
	 */
	_showSortModal()
	{
		let tmpSelf = this;
		tmpSelf._modalOpen = true;

		let tmpLabels = [];
		for (let i = 0; i < SORT_OPTIONS.length; i++)
		{
			tmpLabels.push(SORT_OPTIONS[i].Label);
		}

		let tmpList = blessed.list(
			{
				parent: tmpSelf._screen,
				top: 'center',
				left: 'center',
				width: '50%',
				height: SORT_OPTIONS.length + 2,
				border: { type: 'line' },
				style:
				{
					border: { fg: 'green' },
					bg: 'black',
					fg: 'white',
					selected:
					{
						bg: 'green',
						fg: 'black',
						bold: true
					}
				},
				keys: true,
				vi: true,
				mouse: true,
				tags: true,
				label: ' Sort Order ',
				items: tmpLabels
			});

		// Pre-select the current sort
		let tmpState = tmpSelf.pict.AppData.TodoList.ListState;
		for (let i = 0; i < SORT_OPTIONS.length; i++)
		{
			if (SORT_OPTIONS[i].Column === tmpState.SortColumn && SORT_OPTIONS[i].Direction === tmpState.SortDirection)
			{
				tmpList.select(i);
				break;
			}
		}

		tmpList.focus();

		tmpList.on('select',
			(pItem, pIndex) =>
			{
				let tmpOption = SORT_OPTIONS[pIndex];
				tmpSelf.pict.AppData.TodoList.ListState.SortColumn = tmpOption.Column;
				tmpSelf.pict.AppData.TodoList.ListState.SortDirection = tmpOption.Direction;

				tmpList.destroy();
				tmpSelf._modalOpen = false;
				tmpSelf._setStatus('Sorting by ' + tmpOption.Label + '...');

				tmpSelf._loadTasks(
					() =>
					{
						tmpSelf.pict.views['TUI-TaskList'].render();
						tmpSelf.pict.views['TUI-StatusBar'].render();
						tmpSelf._screen.render();
					});
			});

		tmpList.key(['escape'],
			() =>
			{
				tmpList.destroy();
				tmpSelf._modalOpen = false;
				tmpSelf._screen.render();
			});

		tmpSelf._screen.render();
	}

	// ─────────────────────────────────────────
	//  Search Modal
	// ─────────────────────────────────────────

	/**
	 * Prompt for a search string, then reload the filtered list.
	 * An empty string clears the filter.
	 */
	_showSearchModal()
	{
		let tmpSelf = this;
		tmpSelf._modalOpen = true;

		let tmpCurrentSearch = tmpSelf.pict.AppData.TodoList.ListState.SearchText || '';

		let tmpPrompt = blessed.prompt(
			{
				parent: tmpSelf._screen,
				top: 'center',
				left: 'center',
				width: '60%',
				height: 'shrink',
				border: { type: 'line' },
				style:
				{
					border: { fg: 'magenta' },
					bg: 'black',
					fg: 'white'
				},
				tags: true,
				keys: true,
				vi: true,
				label: ' Search Tasks '
			});

		let tmpLabel = 'Search name/description (empty to clear):';
		tmpPrompt.input(tmpLabel, tmpCurrentSearch,
			(pError, pValue) =>
			{
				tmpPrompt.destroy();
				tmpSelf._modalOpen = false;

				if (pError || pValue === null || pValue === undefined)
				{
					// User cancelled
					tmpSelf._screen.render();
					return;
				}

				tmpSelf.pict.AppData.TodoList.ListState.SearchText = pValue;
				tmpSelf.pict.AppData.TodoList.SelectedIndex = 0;

				if (pValue)
				{
					tmpSelf._setStatus('Searching for "' + pValue + '"...');
				}
				else
				{
					tmpSelf._setStatus('Filter cleared.');
				}

				tmpSelf._loadTasks(
					() =>
					{
						tmpSelf.pict.views['TUI-TaskList'].render();
						tmpSelf.pict.views['TUI-StatusBar'].render();
						tmpSelf._screen.render();
					});
			});
	}

	// ─────────────────────────────────────────
	//  Helpers
	// ─────────────────────────────────────────

	/**
	 * Update the status message.
	 */
	_setStatus(pMessage)
	{
		this.pict.AppData.TodoList.StatusMessage = pMessage;
	}

	/**
	 * No-op for layout template expression.
	 */
	renderLayoutWidgets()
	{
		return '';
	}
}

// ─────────────────────────────────────────────
//  Bootstrap
// ─────────────────────────────────────────────
let _Pict = new libPict(
	{
		Product: 'TodoListConsole',
		LogNoisiness: 0
	});

let _App = _Pict.addApplication('TodoList-Console',
	{
		Name: 'TodoList-Console',
		MainViewportViewIdentifier: 'TUI-Layout',
		AutoRenderMainViewportViewAfterInitialize: false,
		AutoSolveAfterInitialize: false
	}, TodoListConsoleApplication);

_App.initializeAsync(
	(pError) =>
	{
		if (pError)
		{
			console.error('Application initialization failed:', pError);
			process.exit(1);
		}
	});
