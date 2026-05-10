/**
 * Manager-TopBar — single-row chrome combining the brand wordmark
 * (icon + name in brand-primary color), the health badge, the bulk
 * action buttons, and the theme button.
 *
 * Renders into the shell's `#RM-TopPanel-Content` destination. The
 * panel itself draws a 2px brand-primary bottom border so the wordmark
 * doesn't need a separate stripe row beneath it — eliminates the
 * "two navigations" stacked look.
 */

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-TopBar',

	DefaultRenderable:            'Manager-TopBar-Content',
	DefaultDestinationAddress:    '#RM-TopPanel-Content',
	DefaultTemplateRecordAddress: 'AppData.Manager',

	AutoRender: false,

	CSS: /*css*/`
		/* Anchor the topbar layout INSIDE the shell-managed panel so the
		   panel's content area gets a real flex row with proper spacing. */
		#RM-TopPanel-Content
		{
			display: flex;
			align-items: center;
			gap: 12px;
			height: 100%;
			padding: 0 14px;
			border-bottom: 2px solid var(--brand-color-primary-mode, var(--theme-color-brand-primary, #2563eb));
			box-sizing: border-box;
		}
		.rm-topbar-brand
		{
			display: inline-flex;
			align-items: center;
			gap: 8px;
			color: var(--brand-color-primary-mode, var(--theme-color-text-primary, #1a1a1a));
		}
		.rm-topbar-brand-icon
		{
			width: 22px; height: 22px;
			display: inline-flex; align-items: center; justify-content: center;
		}
		.rm-topbar-brand-icon svg { width: 100%; height: 100%; display: block; }
		.rm-topbar-brand-name
		{
			font-size: 15px;
			font-weight: 600;
			letter-spacing: 0.4px;
			border-bottom: 2px solid var(--brand-color-secondary-mode, transparent);
			padding-bottom: 1px;
		}
		.rm-topbar-actions
		{
			margin-left: auto;
			display: flex;
			gap: 8px;
			align-items: center;
		}
		.rm-topbar-divider
		{
			width: 1px;
			background: var(--color-border);
			margin: 0 4px;
			align-self: stretch;
		}
	`,
	CSSPriority: 500,

	Templates:
	[
		{
			Hash: 'Manager-TopBar-Template',
			Template: /*html*/`
<div class="rm-topbar-brand" id="RM-TopBar-Brand"></div>
<div class="rm-topbar-actions">
	<span class="badge {~D:Record.Health.state~}" title="server health">{~D:Record.Health.text~}</span>
	<span class="rm-topbar-divider"></span>
	<button class="action primary" title="Run modules/Status.sh across every module"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/status')">Status</button>
	<button class="action primary" title="Run modules/Update.sh across every module"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/update')">Update</button>
	<button class="action primary" title="Run modules/Checkout.sh across every module"
		onclick="{~P~}.PictApplication.navigateTo('/Ops/checkout')">Checkout</button>
	<button class="action primary" title="Plan a ripple publish (no starting module required — pick producers in the planner)"
		onclick="{~P~}.views['Manager-Modal-RipplePlan'].open(null)">Ripple</button>
	<span class="rm-topbar-divider"></span>
	<button class="action" title="Toggle the persistent Log panel"
		onclick="{~P~}.views['Manager-Layout'].getLogPanel().toggle()">Log</button>
	<button class="action" onclick="{~P~}.PictApplication.navigateTo('/Manifest')">Manifest</button>
	<span class="rm-topbar-divider"></span>
	<div id="Theme-Button"></div>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-TopBar-Content',
			TemplateHash:       'Manager-TopBar-Template',
			DestinationAddress: '#RM-TopPanel-Content',
			RenderMethod:       'replace',
		}
	]
};

class ManagerTopBarView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onBeforeRender(pRenderable)
	{
		pRenderable.DefaultRenderMethod = 'replace';
		return this.pict.AppData.Manager;
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		// Pull brand info from the active brand (set by pict-section-theme
		// install({ Brand: ... })) and inline the icon + name. We drive
		// it directly here rather than mounting the BrandStrip view so
		// the wordmark sits inline with the action buttons in a single
		// row — matching the single-nav goal.
		this._renderBrandInline();

		// Mount the Theme-Button view into its slot.
		let tmpThemeButton = this.pict.views['Theme-Button'];
		if (tmpThemeButton) { tmpThemeButton.render(); }

		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	_renderBrandInline()
	{
		let tmpSlot = (typeof document !== 'undefined') ? document.getElementById('RM-TopBar-Brand') : null;
		if (!tmpSlot) return;

		// Ask pict-section-theme for the active brand. If none is
		// registered, fall back to the static "Retold Manager" text.
		let tmpBrand = null;
		try
		{
			let tmpSectionTheme = require('pict-section-theme');
			if (tmpSectionTheme && tmpSectionTheme.Brand && tmpSectionTheme.Brand.getActive)
			{
				tmpBrand = tmpSectionTheme.Brand.getActive();
			}
		}
		catch (pErr) { /* host without pict-section-theme — fine */ }

		let tmpIconHTML = (tmpBrand && tmpBrand.IconType === 'svg' && tmpBrand.Icon)
			? '<span class="rm-topbar-brand-icon">' + tmpBrand.Icon + '</span>'
			: (tmpBrand && tmpBrand.IconType === 'image' && tmpBrand.Icon)
				? '<span class="rm-topbar-brand-icon"><img src="' + this._escape(tmpBrand.Icon) + '" alt=""></span>'
				: '';
		let tmpName = (tmpBrand && tmpBrand.Name) ? tmpBrand.Name : 'Retold Manager';
		tmpSlot.innerHTML = tmpIconHTML
			+ '<span class="rm-topbar-brand-name">' + this._escape(tmpName) + '</span>';
		tmpSlot.title = (tmpBrand && tmpBrand.Tagline) ? tmpBrand.Tagline : '';
	}

	_escape(pText)
	{
		return String(pText || '')
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
	}
}

module.exports = ManagerTopBarView;
module.exports.default_configuration = _ViewConfiguration;
