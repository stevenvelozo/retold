const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'TodoList-YearView',
	DefaultRenderable: 'TodoList-YearView-Content',
	DefaultDestinationAddress: '#TodoList-Content',
	AutoRender: false,

	CSS: /*css*/`
		.tl-year-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1em; margin-bottom: 1.25em; }
		.tl-year-month-card { background: #fff; border-radius: 6px; padding: 1em; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
		.tl-year-month-card-current { border: 2px solid #2E7D74; }
		.tl-year-month-name { font-weight: 700; font-size: 1em; margin-bottom: 0.5em; }
		.tl-year-month-stats { display: flex; gap: 0.5em; flex-wrap: wrap; }
		.tl-year-month-stat { font-size: 0.85em; color: #8A7F72; }
		.tl-year-month-stat strong { font-weight: 700; }
	`,

	Templates:
	[
		{
			Hash: 'TodoList-YearView-Template',
			Template: /*html*/`
<div class="tl-cal-header">
	<h2>Year View</h2>
	<div class="tl-cal-nav">
		<button class="tl-btn tl-btn-default" onclick="{~P~}.PictApplication.calendarNavigate('year', -1)">&larr; Prev</button>
		<button class="tl-btn tl-btn-primary" onclick="{~P~}.PictApplication.calendarToday('year')">Today</button>
		<button class="tl-btn tl-btn-default" onclick="{~P~}.PictApplication.calendarNavigate('year', 1)">Next &rarr;</button>
	</div>
</div>
<p class="tl-cal-label">{~D:AppData.TodoList.CalendarState.YearLabel~}</p>
<div id="TodoList-YearGrid"></div>
<table class="tl-cal-table">
	<thead>
		<tr>
			<th>Month</th>
			<th>Completed</th>
			<th>Open</th>
			<th>Total</th>
		</tr>
	</thead>
	<tbody>
		{~TemplateSet:TodoList-YearRow:AppData.TodoList.CalendarState.YearRows~}
	</tbody>
</table>
`
		},
		{
			Hash: 'TodoList-YearRow',
			Template: /*html*/`
<tr class="{~D:Record.TotalClass~}">
	<td>{~D:Record.MonthLabel~}</td>
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
			RenderableHash: 'TodoList-YearView-Content',
			TemplateHash: 'TodoList-YearView-Template',
			DestinationAddress: '#TodoList-Content',
			RenderMethod: 'replace'
		}
	]
};

const _MonthNamesFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

class TodoListYearView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onBeforeRender()
	{
		let tmpCal = this.pict.AppData.TodoList.CalendarState;
		let tmpAnchor = new Date(tmpCal.AnchorDate + 'T00:00:00');
		let tmpYear = tmpAnchor.getFullYear();
		let tmpCurrentMonth = new Date().getMonth();
		let tmpCurrentYear = new Date().getFullYear();

		tmpCal.YearLabel = String(tmpYear);

		// Build month->counts map
		let tmpAllTasks = this.pict.AppData.TodoList.AllTasks;
		let tmpMonthMap = {};
		for (let i = 0; i < tmpAllTasks.length; i++)
		{
			let tmpDate = (tmpAllTasks[i].DueDate || '').substring(0, 10);
			if (!tmpDate)
			{
				continue;
			}
			// Only count tasks in this year
			if (tmpDate.substring(0, 4) !== String(tmpYear))
			{
				continue;
			}
			let tmpMonthKey = parseInt(tmpDate.substring(5, 7), 10) - 1;
			if (!tmpMonthMap[tmpMonthKey])
			{
				tmpMonthMap[tmpMonthKey] = { complete: 0, open: 0 };
			}
			if (tmpAllTasks[i].Status === 'Complete')
			{
				tmpMonthMap[tmpMonthKey].complete++;
			}
			else
			{
				tmpMonthMap[tmpMonthKey].open++;
			}
		}

		// Store for the grid
		this._monthMap = tmpMonthMap;
		this._gridYear = tmpYear;
		this._currentMonth = tmpCurrentMonth;
		this._isCurrentYear = tmpYear === tmpCurrentYear;

		// Build 12 month rows + total
		let tmpRows = [];
		let tmpTotalComplete = 0;
		let tmpTotalOpen = 0;

		for (let m = 0; m < 12; m++)
		{
			let tmpCounts = tmpMonthMap[m] || { complete: 0, open: 0 };
			let tmpTotal = tmpCounts.complete + tmpCounts.open;

			tmpTotalComplete += tmpCounts.complete;
			tmpTotalOpen += tmpCounts.open;

			tmpRows.push(
			{
				MonthLabel: _MonthNamesFull[m],
				Complete: tmpCounts.complete,
				Open: tmpCounts.open,
				Total: tmpTotal,
				CompleteBadge: tmpCounts.complete > 0 ? 'tl-cal-badge-complete' : 'tl-cal-badge-zero',
				OpenBadge: tmpCounts.open > 0 ? 'tl-cal-badge-open' : 'tl-cal-badge-zero',
				TotalBadge: tmpTotal > 0 ? 'tl-cal-badge-complete' : 'tl-cal-badge-zero',
				TotalClass: (this._isCurrentYear && m === tmpCurrentMonth) ? 'tl-cal-today' : ''
			});
		}

		let tmpGrandTotal = tmpTotalComplete + tmpTotalOpen;
		tmpRows.push(
		{
			MonthLabel: 'Total',
			Complete: tmpTotalComplete,
			Open: tmpTotalOpen,
			Total: tmpGrandTotal,
			CompleteBadge: tmpTotalComplete > 0 ? 'tl-cal-badge-complete' : 'tl-cal-badge-zero',
			OpenBadge: tmpTotalOpen > 0 ? 'tl-cal-badge-open' : 'tl-cal-badge-zero',
			TotalBadge: tmpGrandTotal > 0 ? 'tl-cal-badge-complete' : 'tl-cal-badge-zero',
			TotalClass: 'tl-cal-total'
		});

		tmpCal.YearRows = tmpRows;

		return super.onBeforeRender();
	}

	/**
	 * Render the 4×3 month card grid after the template is in the DOM.
	 */
	onAfterRender()
	{
		let tmpContainer = document.getElementById('TodoList-YearGrid');
		if (!tmpContainer)
		{
			return super.onAfterRender();
		}

		let tmpMonthMap = this._monthMap;
		let tmpHTML = '<div class="tl-year-grid">';

		for (let m = 0; m < 12; m++)
		{
			let tmpCounts = tmpMonthMap[m] || { complete: 0, open: 0 };
			let tmpTotal = tmpCounts.complete + tmpCounts.open;
			let tmpIsCurrent = this._isCurrentYear && m === this._currentMonth;

			let tmpCardClass = 'tl-year-month-card';
			if (tmpIsCurrent)
			{
				tmpCardClass += ' tl-year-month-card-current';
			}

			tmpHTML += '<div class="' + tmpCardClass + '">';
			tmpHTML += '<div class="tl-year-month-name">' + _MonthNamesFull[m] + '</div>';
			tmpHTML += '<div class="tl-year-month-stats">';

			if (tmpTotal > 0)
			{
				tmpHTML += '<span class="tl-year-month-stat"><strong>' + tmpTotal + '</strong> tasks</span>';
				tmpHTML += '<span class="tl-year-month-stat">(<span class="tl-cal-badge tl-cal-badge-complete">' + tmpCounts.complete + '</span> done';
				tmpHTML += ', <span class="tl-cal-badge tl-cal-badge-open">' + tmpCounts.open + '</span> open)</span>';
			}
			else
			{
				tmpHTML += '<span class="tl-year-month-stat" style="color:#B5ADA2;">No tasks</span>';
			}

			tmpHTML += '</div>';
			tmpHTML += '</div>';
		}

		tmpHTML += '</div>';
		tmpContainer.innerHTML = tmpHTML;

		return super.onAfterRender();
	}
}

module.exports = TodoListYearView;
module.exports.default_configuration = _ViewConfiguration;
