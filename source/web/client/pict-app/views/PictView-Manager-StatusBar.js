/**
 * Manager-StatusBar — retold-manager's status text, mounted into the
 * Theme-BottomBar Status slot.
 *
 * Renders into `#Theme-BottomBar-Status`. Mounted automatically by
 * Theme-BottomBar via `StatusView: 'Manager-StatusBar'` in the
 * Theme-Section provider's ViewOptions.
 */
const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-StatusBar',

	DefaultRenderable:            'Manager-StatusBar-Content',
	DefaultDestinationAddress:    '#Theme-BottomBar-Status',
	DefaultTemplateRecordAddress: 'AppData.Manager',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'Manager-StatusBar-Template',
			Template: /*html*/`
<span id="RM-StatusMessage">{~D:Record.StatusMessage~}</span>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-StatusBar-Content',
			TemplateHash:       'Manager-StatusBar-Template',
			DestinationAddress: '#Theme-BottomBar-Status',
			RenderMethod:       'replace',
		}
	]
};

class ManagerStatusBarView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onBeforeRender() { return this.pict.AppData.Manager; }

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}
}

module.exports = ManagerStatusBarView;
module.exports.default_configuration = _ViewConfiguration;
