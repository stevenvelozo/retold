const libPictApplication = require('pict-application');
const libPictRouter = require('pict-router');

const libProviderTaskData = require('./providers/Provider-TaskData.cjs');

const libViewLayout = require('./views/View-Layout.cjs');
const libViewTaskList = require('./views/View-TaskList.cjs');
const libViewTaskForm = require('./views/View-TaskForm.cjs');
const libViewWeekView = require('./views/calendar/View-WeekView.cjs');
const libViewMonthView = require('./views/calendar/View-MonthView.cjs');
const libViewYearView = require('./views/calendar/View-YearView.cjs');

class TodoListApplication extends libPictApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		// Register the router provider
		this.pict.addProvider('PictRouter', require('./providers/Router-Config.json'), libPictRouter);

		// Register the data provider
		this.pict.addProvider('TodoList-TaskData', libProviderTaskData.default_configuration, libProviderTaskData);

		// Register views
		this.pict.addView('TodoList-Layout', libViewLayout.default_configuration, libViewLayout);
		this.pict.addView('TodoList-TaskList', libViewTaskList.default_configuration, libViewTaskList);
		this.pict.addView('TodoList-TaskForm', libViewTaskForm.default_configuration, libViewTaskForm);
		this.pict.addView('TodoList-WeekView', libViewWeekView.default_configuration, libViewWeekView);
		this.pict.addView('TodoList-MonthView', libViewMonthView.default_configuration, libViewMonthView);
		this.pict.addView('TodoList-YearView', libViewYearView.default_configuration, libViewYearView);
	}

	onAfterInitializeAsync(fCallback)
	{
		// Initialize shared application state
		this.pict.AppData.TodoList =
		{
			Tasks: [],
			AllTasks: [],
			TotalCount: 0,
			FilteredCount: 0,
			SelectedTask: null,
			EditMode: false,
			FormTitle: 'New Task',

			// List state drives server-side sort and pagination
			ListState:
			{
				SortColumn: 'DueDate',
				SortDirection: 'DESC',
				SearchText: '',
				Begin: 0,
				Cap: 250
			},

			// Calendar view state for week/month/year views
			CalendarState:
			{
				// The anchor date for the current calendar view (ISO string YYYY-MM-DD)
				AnchorDate: new Date().toISOString().substring(0, 10),
				// Computed summary rows populated by the calendar views
				WeekRows: [],
				MonthRows: [],
				YearRows: [],
				// Labels for the navigation header
				WeekLabel: '',
				MonthLabel: '',
				YearLabel: ''
			}
		};

		// Load tasks from the API, then render the layout
		this.pict.providers['TodoList-TaskData'].loadTasks(
			(pError) =>
			{
				if (pError)
				{
					this.log.error('Failed to load tasks: ' + pError.message);
				}

				// Render the layout (which triggers child view renders)
				this.pict.views['TodoList-Layout'].render();

				return super.onAfterInitializeAsync(fCallback);
			});
	}

	/**
	 * Navigate to a hash route.
	 *
	 * @param {string} pRoute - The route path (e.g., '/TaskList').
	 */
	navigateTo(pRoute)
	{
		this.pict.providers.PictRouter.navigate(pRoute);
	}

	/**
	 * Render a named view into the content area.
	 *
	 * @param {string} pViewIdentifier - The view to render.
	 */
	showView(pViewIdentifier)
	{
		if (pViewIdentifier in this.pict.views)
		{
			this.pict.views[pViewIdentifier].render();
		}
	}

	/**
	 * Change the sort order from the toolbar dropdown and reload.
	 *
	 * Called from the sort <select> element in the TaskList filter bar.
	 * The value is a "Column~Direction" string (e.g. "DueDate~DESC").
	 *
	 * @param {string} pSortValue - "Column~Direction" from the dropdown.
	 */
	changeSortOrder(pSortValue)
	{
		let tmpParts = pSortValue.split('~');
		if (tmpParts.length === 2)
		{
			this.pict.AppData.TodoList.ListState.SortColumn = tmpParts[0];
			this.pict.AppData.TodoList.ListState.SortDirection = tmpParts[1];
		}

		let tmpProvider = this.pict.providers['TodoList-TaskData'];
		tmpProvider.loadTasks(
			() =>
			{
				this.pict.views['TodoList-TaskList'].render();
			});
	}

	/**
	 * Search tasks by name or description.
	 *
	 * Reads the search input value, stores it in ListState, and reloads.
	 * Called from the search input in the TaskList toolbar on Enter or
	 * from the search button click.
	 */
	searchTasks()
	{
		let tmpInput = document.getElementById('tl-search-input');
		this.pict.AppData.TodoList.ListState.SearchText = tmpInput ? tmpInput.value : '';

		let tmpProvider = this.pict.providers['TodoList-TaskData'];
		tmpProvider.loadTasks(
			() =>
			{
				this.pict.views['TodoList-TaskList'].render();
			});
	}

	/**
	 * Clear the search filter and reload the full list.
	 */
	clearSearch()
	{
		this.pict.AppData.TodoList.ListState.SearchText = '';

		let tmpProvider = this.pict.providers['TodoList-TaskData'];
		tmpProvider.loadTasks(
			() =>
			{
				this.pict.views['TodoList-TaskList'].render();
			});
	}

	/**
	 * Show the task form in "add" mode.
	 */
	addTask()
	{
		this.pict.AppData.TodoList.SelectedTask =
		{
			IDTask: 0,
			Name: '',
			Description: '',
			DueDate: '',
			LengthInHours: 0,
			Status: 'Pending'
		};
		this.pict.AppData.TodoList.EditMode = false;
		this.pict.AppData.TodoList.FormTitle = 'New Task';
		this.pict.views['TodoList-TaskForm'].render();
	}

	/**
	 * Show the task form in "edit" mode for a given task ID.
	 *
	 * @param {number|string} pIDTask - The task ID to edit.
	 */
	editTask(pIDTask)
	{
		let tmpIDTask = parseInt(pIDTask, 10);
		let tmpTasks = this.pict.AppData.TodoList.Tasks;
		let tmpTask = null;

		for (let i = 0; i < tmpTasks.length; i++)
		{
			if (tmpTasks[i].IDTask === tmpIDTask)
			{
				tmpTask = tmpTasks[i];
				break;
			}
		}

		if (!tmpTask)
		{
			this.log.warn('Task not found: ' + pIDTask);
			return;
		}

		// Clone the task so edits don't modify the list data directly
		this.pict.AppData.TodoList.SelectedTask = JSON.parse(JSON.stringify(tmpTask));
		this.pict.AppData.TodoList.EditMode = true;
		this.pict.AppData.TodoList.FormTitle = 'Edit Task';
		this.pict.views['TodoList-TaskForm'].render();
	}

	/**
	 * Save the task from the form (create or update based on EditMode).
	 */
	saveTask()
	{
		let tmpTaskData =
		{
			Name: document.getElementById('taskName').value,
			Description: document.getElementById('taskDescription').value,
			DueDate: document.getElementById('taskDueDate').value,
			LengthInHours: parseFloat(document.getElementById('taskHours').value) || 0,
			Status: document.getElementById('taskStatus').value
		};

		let tmpProvider = this.pict.providers['TodoList-TaskData'];
		let tmpSelf = this;

		let tmpAfterSave = (pError) =>
		{
			if (pError)
			{
				tmpSelf.log.error('Save failed: ' + pError.message);
				return;
			}
			// Reload tasks and show the list
			tmpProvider.loadTasks(
				() =>
				{
					tmpSelf.pict.views['TodoList-TaskList'].render();
				});
		};

		if (this.pict.AppData.TodoList.EditMode)
		{
			tmpTaskData.IDTask = this.pict.AppData.TodoList.SelectedTask.IDTask;
			tmpProvider.updateTask(tmpTaskData, tmpAfterSave);
		}
		else
		{
			tmpProvider.createTask(tmpTaskData, tmpAfterSave);
		}
	}

	// ──────────────────────────────────────────────────────────────
	// Calendar view helpers
	// ──────────────────────────────────────────────────────────────

	/**
	 * Show a calendar view.  Loads all tasks if they haven't been
	 * fetched yet, then renders the requested view.
	 *
	 * @param {string} pViewIdentifier - 'TodoList-WeekView', etc.
	 */
	showCalendarView(pViewIdentifier)
	{
		let tmpProvider = this.pict.providers['TodoList-TaskData'];
		let tmpSelf = this;

		// Only fetch once per session; subsequent navigations reuse the cache
		if (this.pict.AppData.TodoList.AllTasks.length > 0)
		{
			tmpSelf.pict.views[pViewIdentifier].render();
			return;
		}

		tmpProvider.loadAllTasks(
			(pError) =>
			{
				if (pError)
				{
					tmpSelf.log.error('Failed to load all tasks: ' + pError.message);
				}
				tmpSelf.pict.views[pViewIdentifier].render();
			});
	}

	/**
	 * Navigate the calendar anchor date by a delta and re-render the view.
	 *
	 * @param {string} pUnit   - 'week', 'month', or 'year'
	 * @param {number} pDelta  - Number of units to shift (negative = back, positive = forward)
	 */
	calendarNavigate(pUnit, pDelta)
	{
		let tmpCal = this.pict.AppData.TodoList.CalendarState;
		let tmpDate = new Date(tmpCal.AnchorDate + 'T00:00:00');

		if (pUnit === 'week')
		{
			tmpDate.setDate(tmpDate.getDate() + (pDelta * 7));
		}
		else if (pUnit === 'month')
		{
			tmpDate.setMonth(tmpDate.getMonth() + pDelta);
		}
		else if (pUnit === 'year')
		{
			tmpDate.setFullYear(tmpDate.getFullYear() + pDelta);
		}

		tmpCal.AnchorDate = tmpDate.toISOString().substring(0, 10);

		let tmpViewMap =
		{
			week: 'TodoList-WeekView',
			month: 'TodoList-MonthView',
			year: 'TodoList-YearView'
		};

		this.pict.views[tmpViewMap[pUnit]].render();
	}

	/**
	 * Jump the calendar anchor to today and re-render the current calendar view.
	 *
	 * @param {string} pUnit - 'week', 'month', or 'year'
	 */
	calendarToday(pUnit)
	{
		this.pict.AppData.TodoList.CalendarState.AnchorDate = new Date().toISOString().substring(0, 10);

		let tmpViewMap =
		{
			week: 'TodoList-WeekView',
			month: 'TodoList-MonthView',
			year: 'TodoList-YearView'
		};

		this.pict.views[tmpViewMap[pUnit]].render();
	}

	/**
	 * Delete a task and refresh the list.
	 *
	 * @param {number|string} pIDTask - The task ID to delete.
	 */
	deleteTask(pIDTask)
	{
		let tmpProvider = this.pict.providers['TodoList-TaskData'];
		let tmpSelf = this;

		tmpProvider.deleteTask(pIDTask,
			(pError) =>
			{
				if (pError)
				{
					tmpSelf.log.error('Delete failed: ' + pError.message);
					return;
				}
				tmpProvider.loadTasks(
					() =>
					{
						tmpSelf.pict.views['TodoList-TaskList'].render();
					});
			});
	}
}

module.exports = TodoListApplication;
module.exports.default_configuration = require('./TodoList-Application-Config.json');
