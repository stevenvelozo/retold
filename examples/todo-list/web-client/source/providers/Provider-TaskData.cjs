const libPictProvider = require('pict-provider');

const _ProviderConfiguration =
{
	ProviderIdentifier: 'TodoList-TaskData',
	AutoInitialize: true,
	AutoInitializeOrdinal: 0
};

class TaskDataProvider extends libPictProvider
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	/**
	 * Build the Meadow Reads URL from the current ListState.
	 *
	 * Uses the FSF (Filter Sort Field) instruction in the FilteredTo path
	 * segment so the sort happens server-side in SQL.
	 *
	 * @returns {string} The API URL for the Reads endpoint.
	 */
	buildReadsURL()
	{
		let tmpListState = this.pict.AppData.TodoList.ListState;

		let tmpSortColumn = tmpListState.SortColumn || 'IDTask';
		let tmpSortDirection = tmpListState.SortDirection || 'DESC';
		let tmpBegin = tmpListState.Begin || 0;
		let tmpCap = tmpListState.Cap || 250;

		// Build the filter stanzas -- search first, then sort
		let tmpFilterParts = [];

		// If a search term is present, add LIKE filters on Name and Description (OR-connected)
		let tmpSearchText = (tmpListState.SearchText || '').trim();
		if (tmpSearchText.length > 0)
		{
			// Encode % for the LIKE wildcards around the search term
			let tmpEncodedTerm = encodeURIComponent(tmpSearchText);
			tmpFilterParts.push('FBVOR~Name~LK~%25' + tmpEncodedTerm + '%25');
			tmpFilterParts.push('FBVOR~Description~LK~%25' + tmpEncodedTerm + '%25');
		}

		// Always add the sort stanza last
		tmpFilterParts.push('FSF~' + tmpSortColumn + '~' + tmpSortDirection + '~0');

		let tmpFilter = tmpFilterParts.join('~');

		return '/1.0/Tasks/FilteredTo/' + tmpFilter + '/' + tmpBegin + '/' + tmpCap;
	}

	/**
	 * Build the filter-only portion (no sort, no pagination) for the Count endpoint.
	 *
	 * @returns {string|null} The filter stanza string, or null if no search is active.
	 */
	buildSearchFilter()
	{
		let tmpListState = this.pict.AppData.TodoList.ListState;
		let tmpSearchText = (tmpListState.SearchText || '').trim();

		if (tmpSearchText.length === 0)
		{
			return null;
		}

		let tmpEncodedTerm = encodeURIComponent(tmpSearchText);
		let tmpFilterParts = [];
		tmpFilterParts.push('FBVOR~Name~LK~%25' + tmpEncodedTerm + '%25');
		tmpFilterParts.push('FBVOR~Description~LK~%25' + tmpEncodedTerm + '%25');

		return tmpFilterParts.join('~');
	}

	/**
	 * Load tasks from the API using current sort and pagination state.
	 *
	 * Also fetches the total record count (unfiltered) and, when a search
	 * is active, the filtered count so the toolbar can display
	 * "showing X of Y records".
	 *
	 * @param {Function} fCallback - Callback(pError, pTasks)
	 */
	loadTasks(fCallback)
	{
		let tmpURL = this.buildReadsURL();
		let tmpSearchFilter = this.buildSearchFilter();

		// Always fetch the overall total count
		let tmpCountURL = '/1.0/Tasks/Count';

		// When a search filter is active, also fetch the filtered count
		let tmpFilteredCountURL = tmpSearchFilter
			? '/1.0/Tasks/Count/FilteredTo/' + tmpSearchFilter
			: null;

		let tmpFetches = [fetch(tmpURL), fetch(tmpCountURL)];
		if (tmpFilteredCountURL)
		{
			tmpFetches.push(fetch(tmpFilteredCountURL));
		}

		Promise.all(tmpFetches)
			.then(
				(pResponses) =>
				{
					return Promise.all(pResponses.map((pR) => { return pR.json(); }));
				})
			.then(
				(pResults) =>
				{
					let tmpTasks = pResults[0];
					let tmpTotalCount = pResults[1];
					let tmpFilteredCount = pResults[2];

					if (Array.isArray(tmpTasks))
					{
						this.pict.AppData.TodoList.Tasks = tmpTasks;
					}

					// Store the total record count
					if (tmpTotalCount && typeof tmpTotalCount.Count === 'number')
					{
						this.pict.AppData.TodoList.TotalCount = tmpTotalCount.Count;
					}

					// Store the filtered count (or fall back to total when not searching)
					if (tmpFilteredCount && typeof tmpFilteredCount.Count === 'number')
					{
						this.pict.AppData.TodoList.FilteredCount = tmpFilteredCount.Count;
					}
					else
					{
						this.pict.AppData.TodoList.FilteredCount = this.pict.AppData.TodoList.TotalCount;
					}

					return fCallback(null, tmpTasks);
				})
			.catch(
				(pError) =>
				{
					this.log.error('Error loading tasks: ' + pError.message);
					return fCallback(pError);
				});
	}

	/**
	 * Load ALL tasks sorted by DueDate ascending.
	 *
	 * Used by the calendar views (week, month, year) which need the full
	 * data set to compute per-period summaries.  Stores the result in
	 * AppData.TodoList.AllTasks.
	 *
	 * @param {Function} fCallback - Callback(pError, pTasks)
	 */
	loadAllTasks(fCallback)
	{
		let tmpURL = '/1.0/Tasks/FilteredTo/FSF~DueDate~ASC~0/0/10000';

		fetch(tmpURL)
			.then(
				(pResponse) =>
				{
					return pResponse.json();
				})
			.then(
				(pTasks) =>
				{
					if (Array.isArray(pTasks))
					{
						this.pict.AppData.TodoList.AllTasks = pTasks;
					}
					return fCallback(null, pTasks);
				})
			.catch(
				(pError) =>
				{
					this.log.error('Error loading all tasks: ' + pError.message);
					return fCallback(pError);
				});
	}

	/**
	 * Create a new task.
	 *
	 * @param {Object} pTaskData - The task record to create.
	 * @param {Function} fCallback - Callback(pError, pRecord)
	 */
	createTask(pTaskData, fCallback)
	{
		fetch('/1.0/Task',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(pTaskData)
			})
			.then((pResponse) => { return pResponse.json(); })
			.then((pRecord) => { return fCallback(null, pRecord); })
			.catch((pError) => { return fCallback(pError); });
	}

	/**
	 * Update an existing task.
	 *
	 * @param {Object} pTaskData - The task record to update (must include IDTask).
	 * @param {Function} fCallback - Callback(pError, pRecord)
	 */
	updateTask(pTaskData, fCallback)
	{
		fetch('/1.0/Task',
			{
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(pTaskData)
			})
			.then((pResponse) => { return pResponse.json(); })
			.then((pRecord) => { return fCallback(null, pRecord); })
			.catch((pError) => { return fCallback(pError); });
	}

	/**
	 * Delete a task by ID.
	 *
	 * @param {number} pIDTask - The ID of the task to delete.
	 * @param {Function} fCallback - Callback(pError, pResult)
	 */
	deleteTask(pIDTask, fCallback)
	{
		fetch('/1.0/Task/' + pIDTask,
			{
				method: 'DELETE'
			})
			.then((pResponse) => { return pResponse.json(); })
			.then((pResult) => { return fCallback(null, pResult); })
			.catch((pError) => { return fCallback(pError); });
	}
}

module.exports = TaskDataProvider;
module.exports.default_configuration = _ProviderConfiguration;
