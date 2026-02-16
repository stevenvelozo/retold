const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TodoList-MonthView',
	DefaultRenderable: 'TodoList-MonthView-Content',
	DefaultDestinationAddress: '#TodoList-Content',
	AutoRender: false,

	CSS: /*css*/`
		.tl-month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #DDD6CA; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
		.tl-month-grid-header { background: #3D3229; color: #E8E0D4; text-align: center; padding: 0.6em 0.25em; font-weight: 600; font-size: 0.85em; }
		.tl-month-cell { background: #fff; min-height: 5em; padding: 0.4em; display: flex; flex-direction: column; }
		.tl-month-cell-outside { background: #EAE3D8; color: #B5ADA2; }
		.tl-month-cell-today { background: #E0EDEB; }
		.tl-month-day-num { font-size: 0.85em; font-weight: 600; margin-bottom: 0.3em; }
		.tl-month-counts { display: flex; gap: 0.3em; flex-wrap: wrap; margin-top: auto; }
		.tl-month-counts .tl-cal-badge { font-size: 0.75em; }
	`,

	Templates:
	[
		{
			Hash: 'TodoList-MonthView-Template',
			Template: /*html*/`
<div class="tl-cal-header">
	<h2>Month View</h2>
	<div class="tl-cal-nav">
		<button class="tl-btn tl-btn-default" onclick="{~P~}.PictApplication.calendarNavigate('month', -1)">&larr; Prev</button>
		<button class="tl-btn tl-btn-primary" onclick="{~P~}.PictApplication.calendarToday('month')">Today</button>
		<button class="tl-btn tl-btn-default" onclick="{~P~}.PictApplication.calendarNavigate('month', 1)">Next &rarr;</button>
	</div>
</div>
<p class="tl-cal-label">{~D:AppData.TodoList.CalendarState.MonthLabel~}</p>
<div id="TodoList-MonthGrid"></div>
<table class="tl-cal-table" style="margin-top:1.25em;">
	<thead>
		<tr>
			<th>Week</th>
			<th>Completed</th>
			<th>Open</th>
			<th>Total</th>
		</tr>
	</thead>
	<tbody>
		{~TemplateSet:TodoList-MonthWeekRow:AppData.TodoList.CalendarState.MonthRows~}
	</tbody>
</table>
`
		},
		{
			Hash: 'TodoList-MonthWeekRow',
			Template: /*html*/`
<tr class="{~D:Record.TotalClass~}">
	<td>{~D:Record.WeekLabel~}</td>
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
			RenderableHash: 'TodoList-MonthView-Content',
			TemplateHash: 'TodoList-MonthView-Template',
			DestinationAddress: '#TodoList-Content',
			RenderMethod: 'replace'
		}
	]
};

const _MonthNamesFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const _DayAbbr = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const _MonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

class TodoListMonthView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	/**
	 * Build the task-count lookup and summary rows before the template renders.
	 */
	onBeforeRender()
	{
		let tmpCal = this.pict.AppData.TodoList.CalendarState;
		let tmpAnchor = new Date(tmpCal.AnchorDate + 'T00:00:00');
		let tmpYear = tmpAnchor.getFullYear();
		let tmpMonth = tmpAnchor.getMonth();

		tmpCal.MonthLabel = _MonthNamesFull[tmpMonth] + ' ' + tmpYear;

		// Build a date->counts map from all tasks
		let tmpAllTasks = this.pict.AppData.TodoList.AllTasks;
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

		// Store for use in onAfterRender (the grid is rendered imperatively)
		this._taskMap = tmpTaskMap;
		this._gridYear = tmpYear;
		this._gridMonth = tmpMonth;

		// Build weekly summary rows for the table
		let tmpFirstDay = new Date(tmpYear, tmpMonth, 1);
		let tmpLastDay = new Date(tmpYear, tmpMonth + 1, 0);

		// Find the Monday on or before the 1st
		let tmpStartDow = tmpFirstDay.getDay();
		let tmpGridStart = new Date(tmpFirstDay);
		tmpGridStart.setDate(tmpGridStart.getDate() - ((tmpStartDow + 6) % 7));

		let tmpRows = [];
		let tmpWeekStart = new Date(tmpGridStart);
		let tmpTotalComplete = 0;
		let tmpTotalOpen = 0;

		while (tmpWeekStart <= tmpLastDay)
		{
			let tmpWeekComplete = 0;
			let tmpWeekOpen = 0;

			for (let d = 0; d < 7; d++)
			{
				let tmpDay = new Date(tmpWeekStart);
				tmpDay.setDate(tmpWeekStart.getDate() + d);
				let tmpDateStr = tmpDay.toISOString().substring(0, 10);

				if (tmpDay.getMonth() === tmpMonth)
				{
					let tmpCounts = tmpTaskMap[tmpDateStr] || { complete: 0, open: 0 };
					tmpWeekComplete += tmpCounts.complete;
					tmpWeekOpen += tmpCounts.open;
				}
			}

			let tmpWeekEnd = new Date(tmpWeekStart);
			tmpWeekEnd.setDate(tmpWeekStart.getDate() + 6);
			let tmpWeekTotal = tmpWeekComplete + tmpWeekOpen;

			tmpRows.push(
			{
				WeekLabel: _MonthNames[tmpWeekStart.getMonth()] + ' ' + tmpWeekStart.getDate()
					+ ' – ' + _MonthNames[tmpWeekEnd.getMonth()] + ' ' + tmpWeekEnd.getDate(),
				Complete: tmpWeekComplete,
				Open: tmpWeekOpen,
				Total: tmpWeekTotal,
				CompleteBadge: tmpWeekComplete > 0 ? 'tl-cal-badge-complete' : 'tl-cal-badge-zero',
				OpenBadge: tmpWeekOpen > 0 ? 'tl-cal-badge-open' : 'tl-cal-badge-zero',
				TotalBadge: tmpWeekTotal > 0 ? 'tl-cal-badge-complete' : 'tl-cal-badge-zero',
				TotalClass: ''
			});

			tmpTotalComplete += tmpWeekComplete;
			tmpTotalOpen += tmpWeekOpen;

			tmpWeekStart.setDate(tmpWeekStart.getDate() + 7);
		}

		// Add a totals row
		let tmpGrandTotal = tmpTotalComplete + tmpTotalOpen;
		tmpRows.push(
		{
			WeekLabel: 'Total',
			Complete: tmpTotalComplete,
			Open: tmpTotalOpen,
			Total: tmpGrandTotal,
			CompleteBadge: tmpTotalComplete > 0 ? 'tl-cal-badge-complete' : 'tl-cal-badge-zero',
			OpenBadge: tmpTotalOpen > 0 ? 'tl-cal-badge-open' : 'tl-cal-badge-zero',
			TotalBadge: tmpGrandTotal > 0 ? 'tl-cal-badge-complete' : 'tl-cal-badge-zero',
			TotalClass: 'tl-cal-total'
		});

		tmpCal.MonthRows = tmpRows;

		return super.onBeforeRender();
	}

	/**
	 * Render the calendar grid into the placeholder div after the template
	 * has been placed in the DOM.
	 */
	onAfterRender()
	{
		let tmpContainer = document.getElementById('TodoList-MonthGrid');
		if (!tmpContainer)
		{
			return super.onAfterRender();
		}

		let tmpYear = this._gridYear;
		let tmpMonth = this._gridMonth;
		let tmpTaskMap = this._taskMap;
		let tmpToday = new Date().toISOString().substring(0, 10);

		let tmpFirstDay = new Date(tmpYear, tmpMonth, 1);
		let tmpLastDay = new Date(tmpYear, tmpMonth + 1, 0);

		// Find the Monday on or before the 1st
		let tmpStartDow = tmpFirstDay.getDay();
		let tmpGridStart = new Date(tmpFirstDay);
		tmpGridStart.setDate(tmpGridStart.getDate() - ((tmpStartDow + 6) % 7));

		let tmpHTML = '<div class="tl-month-grid">';

		// Day-of-week headers (Mon–Sun)
		for (let h = 0; h < _DayAbbr.length; h++)
		{
			tmpHTML += '<div class="tl-month-grid-header">' + _DayAbbr[h] + '</div>';
		}

		// Calendar cells
		let tmpCurrent = new Date(tmpGridStart);
		let tmpSunday = new Date(tmpLastDay);
		// Extend to fill the last row (go to next Sunday)
		let tmpEndDow = tmpLastDay.getDay();
		if (tmpEndDow !== 0)
		{
			tmpSunday.setDate(tmpLastDay.getDate() + (7 - tmpEndDow));
		}

		while (tmpCurrent <= tmpSunday)
		{
			let tmpDateStr = tmpCurrent.toISOString().substring(0, 10);
			let tmpIsOutside = tmpCurrent.getMonth() !== tmpMonth;
			let tmpIsToday = tmpDateStr === tmpToday;

			let tmpCellClass = 'tl-month-cell';
			if (tmpIsOutside)
			{
				tmpCellClass += ' tl-month-cell-outside';
			}
			if (tmpIsToday)
			{
				tmpCellClass += ' tl-month-cell-today';
			}

			let tmpCounts = tmpTaskMap[tmpDateStr] || { complete: 0, open: 0 };

			tmpHTML += '<div class="' + tmpCellClass + '">';
			tmpHTML += '<div class="tl-month-day-num">' + tmpCurrent.getDate() + '</div>';

			if (!tmpIsOutside && (tmpCounts.complete > 0 || tmpCounts.open > 0))
			{
				tmpHTML += '<div class="tl-month-counts">';
				if (tmpCounts.complete > 0)
				{
					tmpHTML += '<span class="tl-cal-badge tl-cal-badge-complete">' + tmpCounts.complete + '</span>';
				}
				if (tmpCounts.open > 0)
				{
					tmpHTML += '<span class="tl-cal-badge tl-cal-badge-open">' + tmpCounts.open + '</span>';
				}
				tmpHTML += '</div>';
			}

			tmpHTML += '</div>';

			tmpCurrent.setDate(tmpCurrent.getDate() + 1);
		}

		tmpHTML += '</div>';
		tmpContainer.innerHTML = tmpHTML;

		return super.onAfterRender();
	}
}

module.exports = TodoListMonthView;
module.exports.default_configuration = _ViewConfiguration;
