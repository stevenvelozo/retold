/**
 * Manager-TopBar-User — retold-manager's user-area chrome: Log toggle
 * and Manifest navigation. Sits between the nav-action buttons and the
 * theme button on the right side of the topbar.
 *
 * Renders into `#Theme-TopBar-User` (Theme-TopBar's user-area slot).
 * Mounted automatically by Theme-TopBar via
 * `UserView: 'Manager-TopBar-User'` in the Theme-Section provider's
 * ViewOptions.
 */

const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-TopBar-User',

	DefaultRenderable:         'Manager-TopBar-User-Content',
	DefaultDestinationAddress: '#Theme-TopBar-User',

	AutoRender: false,

	CSS: /*css*/`
.rm-topbar-user
{
	display: flex;
	align-items: center;
	gap: 8px;
}`,
	CSSPriority: 500,

	Templates:
	[
		{
			Hash: 'Manager-TopBar-User-Template',
			Template: /*html*/`
<div class="rm-topbar-user">
	<button class="action" title="Toggle the persistent Log panel"
		onclick="{~P~}.views['Manager-Layout'].getLogPanel().toggle()">Log</button>
	<button class="action" onclick="{~P~}.PictApplication.navigateTo('/Manifest')">Manifest</button>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-TopBar-User-Content',
			TemplateHash:       'Manager-TopBar-User-Template',
			DestinationAddress: '#Theme-TopBar-User',
			RenderMethod:       'replace'
		}
	]
};

class ManagerTopBarUserView extends libPictView
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

module.exports = ManagerTopBarUserView;
module.exports.default_configuration = _ViewConfiguration;
