/**
 * Manager-TopBar-Nav — retold-manager's primary action buttons + health
 * badge, designed to drop into the Theme-TopBar nav slot.
 *
 * Renders into `#Theme-TopBar-Nav` (the destination Theme-TopBar
 * exposes for host-supplied nav content). Theme-TopBar handles the
 * brand mark, the user-area widgets, and the theme button — this view
 * owns only retold-manager's app-specific navigation.
 *
 * Mounted automatically by Theme-TopBar via `NavView: 'Manager-TopBar-Nav'`
 * in the Theme-Section provider's ViewOptions.
 */

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-TopBar-Nav',

	DefaultRenderable:            'Manager-TopBar-Nav-Content',
	DefaultDestinationAddress:    '#Theme-TopBar-Nav',
	DefaultTemplateRecordAddress: 'AppData.Manager',

	AutoRender: false,

	CSS: /*css*/`
.rm-topbar-nav
{
	display: flex;
	align-items: center;
	gap: 8px;
}
.rm-topbar-nav-divider
{
	width: 1px;
	background: var(--theme-color-border-default, #d0d4d8);
	margin: 0 4px;
	align-self: stretch;
}`,
	CSSPriority: 500,

	Templates:
	[
		{
			Hash: 'Manager-TopBar-Nav-Template',
			// aria-current="{~D:Record.IsXxx~}" is computed in onBeforeRender —
			// renders as aria-current="page" on the button matching the
			// active /Ops/:script route, empty (the attribute is still
			// present but has no value, so the [aria-current="page"] CSS
			// selector in Theme-TopBar matches only the active one).
			Template: /*html*/`
<div class="rm-topbar-nav">
	<span class="badge {~D:Record.Health.state~}" title="server health">{~D:Record.Health.text~}</span>
	<span class="rm-topbar-nav-divider"></span>
	<button class="action primary" title="Run modules/Status.sh across every module"
		aria-current="{~D:Record.IsStatus~}"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/status')">Status</button>
	<button class="action primary" title="Run modules/Update.sh across every module"
		aria-current="{~D:Record.IsUpdate~}"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/update')">Update</button>
	<button class="action primary" title="Run modules/Checkout.sh across every module"
		aria-current="{~D:Record.IsCheckout~}"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/checkout')">Checkout</button>
	<button class="action primary" title="Plan a ripple publish (no starting module required — pick producers in the planner)"
		onclick="{~P~}.views['Manager-Modal-RipplePlan'].open(null)">Ripple</button>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-TopBar-Nav-Content',
			TemplateHash:       'Manager-TopBar-Nav-Template',
			DestinationAddress: '#Theme-TopBar-Nav',
			RenderMethod:       'replace'
		}
	]
};

class ManagerTopBarNavView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onBeforeRender()
	{
		// Per-button active flags. AppData.Manager.OpsScript is set by
		// the router when the user navigates to /Ops/:script. We surface
		// matching strings on the data so the template can plant a
		// "page" string into aria-current on exactly the matching button
		// (empty string elsewhere — the [aria-current="page"] CSS
		// selector in Theme-TopBar matches only "page", not the empty
		// value, so non-active buttons stay un-styled).
		//
		// IMPORTANT: Pict resolves the template Record from
		// DefaultTemplateRecordAddress (AppData.Manager here) BEFORE
		// onBeforeRender runs, so the return value is IGNORED. The
		// only way to surface freshly-computed fields to the template
		// is to mutate the addressed AppData slot directly.
		let tmpManager = this.pict.AppData.Manager || {};
		let tmpScript = tmpManager.OpsScript || '';
		tmpManager.IsStatus   = (tmpScript === 'status')   ? 'page' : '';
		tmpManager.IsUpdate   = (tmpScript === 'update')   ? 'page' : '';
		tmpManager.IsCheckout = (tmpScript === 'checkout') ? 'page' : '';
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = ManagerTopBarNavView;
module.exports.default_configuration = _ViewConfiguration;
