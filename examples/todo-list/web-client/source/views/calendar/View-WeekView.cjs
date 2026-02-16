const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TodoList-WeekView',
	DefaultRenderable: 'TodoList-WeekView-Content',
	DefaultDestinationAddress: '#TodoList-Content',
	AutoRender: false,

	Templates:
	[
		{
			Hash: 'TodoList-WeekView-Template',
			Template: /*html*/`
<div class="tl-cal-header">
	<h2>Week View</h2>
	<div class="tl-cal-nav">
		<button class="tl-btn tl-btn-default" onclick="{~P~}.PictApplication.calendarNavigate('week', -1)">&larr; Prev</button>
		<button class="tl-btn tl-btn-primary" onclick="{~P~}.PictApplication.calendarToday('week')">Today</button>
		<button class="tl-btn tl-btn-default" onclick="{~P~}.PictApplication.calendarNavigate('week', 1)">Next &rarr;</button>
	</div>
</div>
<p class="tl-cal-label">{~D:AppData.TodoList.CalendarState.WeekLabel~}</p>
<table class="tl-cal-table">
	<thead>
		<tr>
			<th>Day</th>
			<th>Date</th>
			<th>Completed</th>
			<th>Open</th>
			<th>Total</th>
		</tr>
	</thead>
	<tbody>
		{~TemplateSet:TodoList-WeekRow:AppData.TodoList.CalendarState.WeekRows~}
	</tbody>
</table>
`
		},
		{
			Hash: 'TodoList-WeekRow',
			Template: /*html*/`
<tr class="{~D:Record.TodayClass~}">
	<td>{~D:Record.DayName~}</td>
	<td>{~D:Record.DateLabel~}</td>
	<td><span class="tl-cal-badge {~D:Record.CompleteBadge~}">{~D:Record.Complete~}</span></td>
	<td><span class="tl-cal-badge {~D:Record.OpenBadge~}">{~D:Record.Open~}</span></td>
	<td><span class="tl-cal-badge {~D:Record.TotalBadge~}">{~D:Record.Total~}</span></td>
</tr>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash: 'TodoList-WeekView-Content',
			TemplateHash: 'TodoList-WeekView-Template',
			DestinationAddress: '#TodoList-Content',
			RenderMethod: 'replace'
		}
	]
};

const _DayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const _MonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

class TodoListWeekView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onBeforeRender()
	{
		let tmpCal = this.pict.AppData.TodoList.CalendarState;
		let tmpAnchor = new Date(tmpCal.AnchorDate + 'T00:00:00');

		// Find the Monday of the anchor's week
		let tmpDayOfWeek = tmpAnchor.getDay();
		let tmpMonday = new Date(tmpAnchor);
		tmpMonday.setDate(tmpMonday.getDate() - ((tmpDayOfWeek + 6) % 7));

		let tmpToday = new Date().toISOString().substring(0, 10);
		let tmpAllTasks = this.pict.AppData.TodoList.AllTasks;

		// Build a lookup: dateString -> { complete, open }
		let tmpTaskMap = {};
		for (let i = 0; i < tmpAllTasks.length; i++)
		{
			let tmpDate = (tmpAllTasks[i].DueDate || '').substring(0, 10);
			if (!tmpDate)
			{
				continue;
			}
			if (!tmpTaskMap[tmpDate])
			{
				tmpTaskMap[tmpDate] = { complete: 0, open: 0 };
			}
			if (tmpAllTasks[i].Status === 'Complete')
			{
				tmpTaskMap[tmpDate].complete++;
			}
			else
			{
				tmpTaskMap[tmpDate].open++;
			}
		}

		// Build 7 row objects (Mon–Sun)
		let tmpRows = [];
		for (let d = 0; d < 7; d++)
		{
			let tmpDay = new Date(tmpMonday);
			tmpDay.setDate(tmpMonday.getDate() + d);
			let tmpDateStr = tmpDay.toISOString().substring(0, 10);
			let tmpCounts = tmpTaskMap[tmpDateStr] || { complete: 0, open: 0 };
			let tmpTotal = tmpCounts.complete + tmpCounts.open;

			tmpRows.push(
			{
				DayName: _DayNames[tmpDay.getDay()],
				DateLabel: _MonthNames[tmpDay.getMonth()] + ' ' + tmpDay.getDate() + ', ' + tmpDay.getFullYear(),
				Complete: tmpCounts.complete,
				Open: tmpCounts.open,
				Total: tmpTotal,
				CompleteBadge: tmpCounts.complete > 0 ? 'tl-cal-badge-complete' : 'tl-cal-badge-zero',
				OpenBadge: tmpCounts.open > 0 ? 'tl-cal-badge-open' : 'tl-cal-badge-zero',
				TotalBadge: tmpTotal > 0 ? 'tl-cal-badge-complete' : 'tl-cal-badge-zero',
				TodayClass: tmpDateStr === tmpToday ? 'tl-cal-today' : ''
			});
		}

		tmpCal.WeekRows = tmpRows;

		// Build the header label
		let tmpSunday = new Date(tmpMonday);
		tmpSunday.setDate(tmpMonday.getDate() + 6);
		tmpCal.WeekLabel = _MonthNames[tmpMonday.getMonth()] + ' ' + tmpMonday.getDate()
			+ ' – ' + _MonthNames[tmpSunday.getMonth()] + ' ' + tmpSunday.getDate()
			+ ', ' + tmpSunday.getFullYear();

		return super.onBeforeRender();
	}
}

module.exports = TodoListWeekView;
module.exports.default_configuration = _ViewConfiguration;
