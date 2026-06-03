const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-Home',

	DefaultRenderable:         'Manager-Home-Content',
	DefaultDestinationAddress: '#RM-Workspace-Content',

	AutoRender: false,

	CSS: /*css*/`
.rm-home-guide
{
	max-width: 760px;
	margin: 0 auto 28px;
	padding: 18px 22px 22px;
	border: 1px solid var(--color-border);
	border-radius: 8px;
	background: var(--color-panel-alt);
	color: var(--color-text);
}
.rm-home-guide h3
{
	margin: 0 0 12px;
	font-size: 13px;
	font-weight: 600;
	letter-spacing: 0.4px;
	text-transform: uppercase;
	color: var(--color-muted);
}
.rm-home-guide-list
{
	margin: 0;
	display: grid;
	grid-template-columns: 160px 1fr;
	gap: 8px 18px;
	font-size: 13px;
	line-height: 1.5;
}
.rm-home-guide-list dt
{
	font-weight: 600;
	color: var(--color-text);
}
.rm-home-guide-list dd
{
	margin: 0;
	color: var(--color-muted);
}
.rm-home-guide-list dd strong
{
	color: var(--color-text);
	font-weight: 600;
}
.rm-home-guide-list dd code
{
	font-family: var(--font-mono);
	font-size: 12px;
	color: var(--color-accent);
}
.rm-home-guide-foot
{
	margin: 14px 0 0;
	padding-top: 12px;
	border-top: 1px solid var(--color-border);
	font-size: 12px;
	color: var(--color-muted);
}
.rm-home-guide-foot code
{
	font-family: var(--font-mono);
	color: var(--color-accent);
}
@media (max-width: 640px)
{
	.rm-home-guide-list
	{
		grid-template-columns: 1fr;
		gap: 4px 0;
	}
	.rm-home-guide-list dt { margin-top: 8px; }
}
`,
	CSSPriority: 500,

	Templates:
	[
		{
			Hash: 'Manager-Home-Template',
			Template: /*html*/`
<div class="placeholder">
	<h2>Select a module</h2>
	<p>Pick a module from the sidebar to review its status, bump, commit, and publish.</p>
</div>

<div class="rm-home-guide">
	<h3>Quick guide</h3>

	<dl class="rm-home-guide-list">
		<dt>Sidebar</dt>
		<dd>
			Modules are grouped by family (Fable, Meadow, Orator, Pict, Utility, Apps).
			<strong>Filter</strong> narrows by name. <strong>Dirty only</strong> hides modules
			with no uncommitted work after the last <em>Scan</em>. <strong>Sort by time</strong>
			reorders to most-recently-opened first.
		</dd>

		<dt>Top bar — bulk operations</dt>
		<dd>
			<strong>Status</strong> / <strong>Update</strong> / <strong>Checkout</strong> run
			the matching <code>modules/*.sh</code> script across every repo and stream output
			into the log modal. <strong>Ripple</strong> opens the producer planner for a
			coordinated multi-module publish. <strong>Manifest</strong> opens the bulk
			manifest editor.
		</dd>

		<dt>Module workspace</dt>
		<dd>
			Click a sidebar entry to open it. From the workspace you can bump
			(<em>patch</em> / <em>minor</em> / <em>major</em>), commit with a guarded textarea,
			diff before publishing, and trigger a single-module publish.
		</dd>

		<dt>Theme &amp; scale</dt>
		<dd>
			The theme button at the top right opens a small menu with a <strong>Theme</strong>
			picker (every bundled palette), a <strong>Mode</strong> toggle
			(Light / Dark / System), and a <strong>Scale</strong> selector
			(Tiny to Massive). Your selections are autosaved to this browser per host
			and restored on reload — no settings page, no sync needed.
		</dd>

		<dt>Live operations</dt>
		<dd>
			Long-running commands stream into the log modal in real time over a WebSocket.
			Closing the modal does <em>not</em> cancel the operation; reopening from the
			top bar's <strong>Log</strong> button reattaches to the running stream.
		</dd>
	</dl>

	<p class="rm-home-guide-foot">
		Server health is shown next to the title in the top bar.
		Ports and listen address are configurable via <code>--port</code> / <code>--host</code>.
	</p>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-Home-Content',
			TemplateHash:       'Manager-Home-Template',
			DestinationAddress: '#RM-Workspace-Content',
			RenderMethod:       'replace',
		}
	]
};

class ManagerHomeView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = ManagerHomeView;
module.exports.default_configuration = _ViewConfiguration;
