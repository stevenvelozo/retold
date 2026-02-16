const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TodoList-TaskList',
	DefaultRenderable: 'TodoList-TaskList-Content',
	DefaultDestinationAddress: '#TodoList-Content',
	AutoRender: false,

	CSS: /*css*/`
		.tl-toolbar .tl-btn { font-size: 0.8em; padding: 0.35em 0.65em; }
		.tl-actions { white-space: nowrap; }
		.tl-actions .tl-btn { margin-right: 0.35em; font-size: 0.8em; padding: 0.3em 0.7em; }
	`,

	Templates:
	[
		{
			Hash: 'TodoList-TaskList-Template',
			Template: /*html*/`
<h2 class="tl-heading">Tasks</h2>
{~T:TodoList-TaskList-Toolbar~}
<table class="tl-table">
	<thead>
		<tr>
			<th>Name</th>
			<th>Due Date</th>
			<th>Hours</th>
			<th>Status</th>
			<th>Actions</th>
		</tr>
	</thead>
	<tbody>
		{~TemplateSet:TodoList-TaskRow:AppData.TodoList.Tasks~}
	</tbody>
</table>
`
		},
		{
			Hash: 'TodoList-TaskList-Toolbar',
			Template: /*html*/`
<div class="tl-toolbar">
	<div class="tl-toolbar-group">
		<input type="text" id="tl-search-input" placeholder="Search name or description…" onkeydown="if(event.key==='Enter'){~P~}.PictApplication.searchTasks()" />
		<button class="tl-btn tl-btn-primary" onclick="{~P~}.PictApplication.searchTasks()">Search</button>
		<button class="tl-btn tl-btn-default" onclick="{~P~}.PictApplication.clearSearch()">Clear</button>
	</div>
	<div class="tl-toolbar-group">
		<span class="tl-toolbar-label">Sort by</span>
		<select id="tl-sort-order" onchange="{~P~}.PictApplication.changeSortOrder(this.value)">
			<option value="DueDate~DESC">Due Date (newest first)</option>
			<option value="DueDate~ASC">Due Date (oldest first)</option>
			<option value="Name~ASC">Name (A–Z)</option>
			<option value="Name~DESC">Name (Z–A)</option>
			<option value="Status~ASC">Status (A–Z)</option>
			<option value="Status~DESC">Status (Z–A)</option>
			<option value="LengthInHours~DESC">Hours (most first)</option>
			<option value="LengthInHours~ASC">Hours (least first)</option>
			<option value="IDTask~DESC">Recently added</option>
			<option value="IDTask~ASC">Oldest added</option>
		</select>
	</div>
	<div class="tl-toolbar-group">
		<span class="tl-record-count">{~D:AppData.TodoList.Tasks.length~} of {~D:AppData.TodoList.FilteredCount~} records</span>
	</div>
</div>
`
		},
		{
			Hash: 'TodoList-TaskRow',
			Template: /*html*/`
<tr>
	<td>{~D:Record.Name~}</td>
	<td>{~D:Record.DueDate~}</td>
	<td>{~D:Record.LengthInHours~}</td>
	<td><span class="tl-status">{~D:Record.Status~}</span></td>
	<td class="tl-actions">
		<button class="tl-btn tl-btn-primary" onclick="{~P~}.PictApplication.editTask({~D:Record.IDTask~})">Edit</button>
		<button class="tl-btn tl-btn-danger" onclick="{~P~}.PictApplication.deleteTask({~D:Record.IDTask~})">Delete</button>
	</td>
</tr>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TodoList-TaskList-Content',
			TemplateHash: 'TodoList-TaskList-Template',
			DestinationAddress: '#TodoList-Content',
			RenderMethod: 'replace'
		}
	]
};

class TodoListTaskListView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender()
	{
		let tmpListState = this.pict.AppData.TodoList.ListState;

		// Restore the sort dropdown to reflect the current ListState
		let tmpSortSelect = document.getElementById('tl-sort-order');
		if (tmpSortSelect && tmpListState)
		{
			tmpSortSelect.value = tmpListState.SortColumn + '~' + tmpListState.SortDirection;
		}

		// Restore the search input text so it survives re-renders
		let tmpSearchInput = document.getElementById('tl-search-input');
		if (tmpSearchInput && tmpListState)
		{
			tmpSearchInput.value = tmpListState.SearchText || '';
		}

		return super.onAfterRender();
	}
}

module.exports = TodoListTaskListView;
module.exports.default_configuration = _ViewConfiguration;
