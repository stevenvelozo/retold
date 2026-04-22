const libPictView = require('pict-view');

const _ViewConfiguration =
{
	ViewIdentifier: 'Manager-ManifestEditor',

	DefaultRenderable:            'Manager-ManifestEditor-Content',
	DefaultDestinationAddress:    '#RM-Workspace-Content',
	DefaultTemplateRecordAddress: 'AppData.Manager.ViewRecord.ManifestEditor',

	AutoRender: false,

	Templates:
	[
		{
			Hash: 'Manager-ManifestEditor-Template',
			Template: /*html*/`
<div class="manifest-editor">
	<h2>Manifest editor <span class="audit-badge {~D:Record.AuditClass~}" id="RM-AuditBadge">{~D:Record.AuditLabel~}</span></h2>
	<p class="subtle">Edits save directly to <code>Retold-Modules-Manifest.json</code>.
	Every change rewrites the file atomically (tmp + rename) and the sidebar re-syncs.</p>
	<div id="RM-ManifestGroups">{~D:Record.GroupsHtml~}</div>
</div>
`
		}
	],

	Renderables:
	[
		{
			RenderableHash:     'Manager-ManifestEditor-Content',
			TemplateHash:       'Manager-ManifestEditor-Template',
			DestinationAddress: '#RM-Workspace-Content',
			RenderMethod:       'replace',
		}
	]
};

class ManagerManifestEditorView extends libPictView
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._manifest = null;
		this._audit    = null;
	}

	// Called on route → also after an edit/add/delete to refresh.
	reload()
	{
		this._writeRecord({
			AuditClass: '',
			AuditLabel: 'auditing...',
			GroupsHtml: '<p class="loading">Loading manifest...</p>',
		});
		this.render();

		this.pict.PictApplication.setStatus('Loading manifest...');

		Promise.all(
			[
				this.pict.providers.ManagerAPI.loadManifest(),
				this.pict.providers.ManagerAPI.loadManifestAudit(),
			]).then(
			(pResults) =>
			{
				this._manifest = pResults[0];
				this._audit    = pResults[1];
				this._writeRecord(this._buildRecord());
				this.render();
				this.pict.PictApplication.setStatus('Manifest loaded. '
					+ this._audit.Totals.Manifest + ' modules (disk: ' + this._audit.Totals.Disk + ').');
			},
			(pError) =>
			{
				this._writeRecord({
					AuditClass: 'drift',
					AuditLabel: 'load failed',
					GroupsHtml: '<p class="loading">Error loading manifest: '
						+ this._escape(pError.message) + '</p>',
				});
				this.render();
				this.pict.PictApplication.setStatus('Manifest load failed.');
			});
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this._wireButtons();
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// ─────────────────────────────────────────────

	_wireButtons()
	{
		let tmpButtons = document.querySelectorAll('#RM-ManifestGroups button[data-act]');
		for (let i = 0; i < tmpButtons.length; i++)
		{
			tmpButtons[i].addEventListener('click', (pEvent) =>
				{
					let tmpAct   = pEvent.currentTarget.getAttribute('data-act');
					let tmpGroup = pEvent.currentTarget.getAttribute('data-group');
					let tmpName  = pEvent.currentTarget.getAttribute('data-name');
					this._handleButton(tmpAct, tmpGroup, tmpName);
				});
		}
	}

	_handleButton(pAct, pGroup, pName)
	{
		let tmpEditView = this.pict.views['Manager-Modal-EditModule'];
		if (!tmpEditView) { return; }

		switch (pAct)
		{
			case 'edit-module':
			{
				let tmpExisting = this._findModule(pName);
				if (tmpExisting) { tmpEditView.open({ GroupName: tmpExisting.Group, ExistingEntry: tmpExisting.Entry }); }
				return;
			}
			case 'add-module':
				tmpEditView.open({ GroupName: pGroup });
				return;
			case 'add-from-disk':
				tmpEditView.open({ GroupName: pGroup, SeedName: pName });
				return;
			case 'delete-module':
				if (!window.confirm('Remove "' + pName + '" from the manifest?\n\nThe module directory on disk is NOT touched — only the manifest entry is removed.'))
				{
					return;
				}
				this.pict.providers.ManagerAPI.deleteManifestModule(pName).then(
					() =>
					{
						this.reload();
						this.pict.providers.ManagerAPI.loadModules();
					},
					(pError) => { window.alert('Delete failed: ' + pError.message); });
				return;
		}
	}

	_findModule(pName)
	{
		if (!this._manifest) { return null; }
		for (let i = 0; i < this._manifest.Groups.length; i++)
		{
			let tmpGroup = this._manifest.Groups[i];
			for (let j = 0; j < tmpGroup.Modules.length; j++)
			{
				if (tmpGroup.Modules[j].Name === pName)
				{
					return { Group: tmpGroup.Name, Entry: tmpGroup.Modules[j] };
				}
			}
		}
		return null;
	}

	_writeRecord(pRecord)
	{
		if (!this.pict.AppData.Manager.ViewRecord) { this.pict.AppData.Manager.ViewRecord = {}; }
		this.pict.AppData.Manager.ViewRecord.ManifestEditor = pRecord;
	}

	_buildRecord()
	{
		let tmpAudit = this._audit;
		let tmpAuditClass = tmpAudit.Clean ? 'ok' : 'drift';
		let tmpAuditLabel = tmpAudit.Clean
			? 'in sync with disk'
			: 'drift: ' + tmpAudit.Drift.ManifestMissing + ' missing, '
				+ tmpAudit.Drift.ManifestOrphaned + ' orphaned';

		return {
			AuditClass: tmpAuditClass,
			AuditLabel: tmpAuditLabel,
			GroupsHtml: this._renderGroups(),
		};
	}

	_renderGroups()
	{
		let tmpAuditByGroup = {};
		for (let i = 0; i < this._audit.Groups.length; i++)
		{
			tmpAuditByGroup[this._audit.Groups[i].Name] = this._audit.Groups[i];
		}

		let tmpHtml = '';
		for (let i = 0; i < this._manifest.Groups.length; i++)
		{
			let tmpGroup      = this._manifest.Groups[i];
			let tmpGroupAudit = tmpAuditByGroup[tmpGroup.Name] || { ManifestMissing: [], ManifestOrphaned: [] };
			let tmpOrphanSet  = new Set(tmpGroupAudit.ManifestOrphaned);

			tmpHtml += '<div class="group-card">';
			tmpHtml += '  <div class="group-card-header">';
			tmpHtml += '    <span class="name">' + this._escape(tmpGroup.Name) + '</span>';
			tmpHtml += '    <span class="desc">' + this._escape(tmpGroup.Description || '') + '</span>';
			tmpHtml += '    <button class="action" data-act="add-module" data-group="'
				+ this._escape(tmpGroup.Name) + '">+ Add module</button>';
			tmpHtml += '  </div>';

			tmpHtml += '<table class="module-table">';
			tmpHtml += '<thead><tr>'
				+ '<th style="width:28%">Name</th>'
				+ '<th style="width:44%">Description</th>'
				+ '<th>Status</th>'
				+ '<th></th>'
				+ '</tr></thead><tbody>';

			for (let j = 0; j < tmpGroup.Modules.length; j++)
			{
				let tmpModule   = tmpGroup.Modules[j];
				let tmpIsOrphan = tmpOrphanSet.has(tmpModule.Name);
				tmpHtml += '<tr' + (tmpIsOrphan ? ' class="orphan"' : '') + '>';
				tmpHtml += '<td>' + this._escape(tmpModule.Name) + '</td>';
				tmpHtml += '<td>' + this._escape(tmpModule.Description || '') + '</td>';
				tmpHtml += '<td>' + (tmpIsOrphan ? 'missing on disk' : '—') + '</td>';
				tmpHtml += '<td class="actions">'
					+ '<button data-act="edit-module" data-name="' + this._escape(tmpModule.Name) + '">edit</button>'
					+ '<button class="danger" data-act="delete-module" data-name="'
					+ this._escape(tmpModule.Name) + '">delete</button>'
					+ '</td>';
				tmpHtml += '</tr>';
			}

			for (let j = 0; j < tmpGroupAudit.ManifestMissing.length; j++)
			{
				let tmpDiskOnly = tmpGroupAudit.ManifestMissing[j];
				tmpHtml += '<tr class="orphan">';
				tmpHtml += '<td><em>' + this._escape(tmpDiskOnly) + '</em></td>';
				tmpHtml += '<td><em>not in manifest (present on disk)</em></td>';
				tmpHtml += '<td>disk-only</td>';
				tmpHtml += '<td class="actions">'
					+ '<button data-act="add-from-disk" data-group="' + this._escape(tmpGroup.Name)
					+ '" data-name="' + this._escape(tmpDiskOnly) + '">+ add to manifest</button>'
					+ '</td>';
				tmpHtml += '</tr>';
			}

			tmpHtml += '</tbody></table>';
			tmpHtml += '</div>';
		}
		return tmpHtml;
	}

	_escape(pText)
	{
		let tmpS = String(pText == null ? '' : pText);
		return tmpS
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}
}

module.exports = ManagerManifestEditorView;
module.exports.default_configuration = _ViewConfiguration;
