const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TodoList-TaskForm',
	DefaultRenderable: 'TodoList-TaskForm-Content',
	DefaultDestinationAddress: '#TodoList-Content',
	DefaultTemplateRecordAddress: 'AppData.TodoList',
	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TodoList-TaskForm-Template',
			Template: /*html*/`
<h2 class="tl-heading">{~D:Record.FormTitle~}</h2>
<div class="tl-form">
	<div class="tl-form-group">
		<label for="taskName">Name</label>
		<input type="text" id="taskName" value="{~D:Record.SelectedTask.Name~}" placeholder="Task name" />
	</div>
	<div class="tl-form-group">
		<label for="taskDescription">Description</label>
		<textarea id="taskDescription" rows="3" placeholder="Task description">{~D:Record.SelectedTask.Description~}</textarea>
	</div>
	<div class="tl-form-group">
		<label for="taskDueDate">Due Date</label>
		<input type="date" id="taskDueDate" value="{~D:Record.SelectedTask.DueDate~}" />
	</div>
	<div class="tl-form-group">
		<label for="taskHours">Estimated Hours</label>
		<input type="number" id="taskHours" step="0.5" min="0" value="{~D:Record.SelectedTask.LengthInHours~}" />
	</div>
	<div class="tl-form-group">
		<label for="taskStatus">Status</label>
		<select id="taskStatus">
			<option value="Pending">Pending</option>
			<option value="In Progress">In Progress</option>
			<option value="Complete">Complete</option>
		</select>
	</div>
	<div class="tl-form-actions">
		<button class="tl-btn tl-btn-primary" onclick="{~P~}.PictApplication.saveTask()">Save</button>
		<button class="tl-btn tl-btn-default" onclick="{~P~}.PictApplication.navigateTo('/TaskList')">Cancel</button>
	</div>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TodoList-TaskForm-Content',
			TemplateHash: 'TodoList-TaskForm-Template',
			DestinationAddress: '#TodoList-Content',
			RenderMethod: 'replace'
		}
	]
};

class TodoListTaskFormView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender()
	{
		// Set the select element to match the current task status
		let tmpSelectedTask = this.pict.AppData.TodoList.SelectedTask;
		if (tmpSelectedTask && tmpSelectedTask.Status)
		{
			let tmpSelect = document.getElementById('taskStatus');
			if (tmpSelect)
			{
				tmpSelect.value = tmpSelectedTask.Status;
			}
		}

		return super.onAfterRender();
	}
}

module.exports = TodoListTaskFormView;
module.exports.default_configuration = _ViewConfiguration;
