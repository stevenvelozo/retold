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
		// ── Top-level shell ───────────────────────────────────────
		{
			Hash: 'Manager-ManifestEditor-Template',
			Template: /*html*/`
<div class="manifest-editor">
	<h2>Manifest editor <span class="audit-badge {~D:Record.AuditClass~}" id="RM-AuditBadge">{~D:Record.AuditLabel~}</span></h2>
	<p class="subtle">Edits save directly to <code>Retold-Modules-Manifest.json</code>.
	Every change rewrites the file atomically (tmp + rename) and the sidebar re-syncs.</p>
	<div id="RM-ManifestGroups">
		{~TS:Manager-ManifestEditor-Loading-Template:Record.LoadingSlot~}
		{~TS:Manager-ManifestEditor-Group-Template:Record.Groups~}
	</div>
</div>
`
		},
		{
			Hash: 'Manager-ManifestEditor-Loading-Template',
			Template: /*html*/`<p class="loading">{~D:Record.Message~}</p>`
		},

		// ── Per-group card ────────────────────────────────────────
		{
			Hash: 'Manager-ManifestEditor-Group-Template',
			Template: /*html*/`
<div class="group-card">
	<div class="group-card-header">
		<span class="name">{~D:Record.Name~}</span>
		<span class="desc">{~D:Record.Description~}</span>
		<button class="action" onclick="_Pict.views['Manager-ManifestEditor'].handleButton('add-module', '{~D:Record.NameJs~}', null)">+ Add module</button>
	</div>
	<table class="module-table">
		<thead><tr>
			<th style="width:28%">Name</th>
			<th style="width:44%">Description</th>
			<th>Status</th>
			<th></th>
		</tr></thead>
		<tbody>
			{~TS:Manager-ManifestEditor-Module-Template:Record.Modules~}
			{~TS:Manager-ManifestEditor-DiskOnly-Template:Record.DiskOnly~}
		</tbody>
	</table>
</div>
`
		},

		// ── Module row (manifest entry, possibly orphaned) ────────
		{
			Hash: 'Manager-ManifestEditor-Module-Template',
			Template: /*html*/`
<tr class="{~D:Record.RowClass~}">
	<td>{~D:Record.Name~}</td>
	<td>{~D:Record.Description~}</td>
	<td>{~D:Record.StatusLabel~}</td>
	<td class="actions">
		<button onclick="_Pict.views['Manager-ManifestEditor'].handleButton('edit-module', null, '{~D:Record.NameJs~}')">edit</button>
		<button class="danger" onclick="_Pict.views['Manager-ManifestEditor'].handleButton('delete-module', null, '{~D:Record.NameJs~}')">delete</button>
	</td>
</tr>
`
		},

		// ── Disk-only row (present on disk but not in manifest) ──
		{
			Hash: 'Manager-ManifestEditor-DiskOnly-Template',
			Template: /*html*/`
<tr class="orphan">
	<td><em>{~D:Record.Name~}</em></td>
	<td><em>not in manifest (present on disk)</em></td>
	<td>disk-only</td>
	<td class="actions">
		<button onclick="_Pict.views['Manager-ManifestEditor'].handleButton('add-from-disk', '{~D:Record.GroupNameJs~}', '{~D:Record.NameJs~}')">+ add to manifest</button>
	</td>
</tr>
`
		},
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

function jsString(pText)
{
	return String(pText == null ? '' : pText)
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'");
}

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
			AuditClass:  '',
			AuditLabel:  'auditing...',
			LoadingSlot: [{ Message: 'Loading manifest...' }],
			Groups:      [],
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
					AuditClass:  'drift',
					AuditLabel:  'load failed',
					LoadingSlot: [{ Message: 'Error loading manifest: ' + pError.message }],
					Groups:      [],
				});
				this.render();
				this.pict.PictApplication.setStatus('Manifest load failed.');
			});
	}

	onAfterRender(pRenderable, pAddress, pRecord, pContent)
	{
		this.pict.CSSMap.injectCSS();
		return super.onAfterRender(pRenderable, pAddress, pRecord, pContent);
	}

	// ─────────────────────────────────────────────

	// Public — invoked from the inline onclick handlers in the templates above.
	handleButton(pAct, pGroup, pName)
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
			{
				let tmpModal = this.pict.views['Pict-Section-Modal'];
				if (!tmpModal || typeof tmpModal.confirm !== 'function')
				{
					this.pict.PictApplication.setStatus('Cannot prompt for confirmation; aborting delete.');
					return;
				}
				tmpModal.confirm(
					'Remove "' + pName + '" from the manifest? '
					+ 'The module directory on disk is NOT touched — only the manifest entry is removed.',
					{
						title:        'Remove from manifest?',
						confirmLabel: 'Remove',
						cancelLabel:  'Cancel',
						dangerous:    true
					}).then((pOk) =>
					{
						if (!pOk) { return; }
						this.pict.providers.ManagerAPI.deleteManifestModule(pName).then(
							() =>
							{
								this.reload();
								this.pict.providers.ManagerAPI.loadModules();
							},
							(pError) =>
							{
								if (typeof tmpModal.toast === 'function')
								{
									tmpModal.toast('Delete failed: ' + pError.message, { type: 'error', duration: 6000 });
								}
								else
								{
									this.pict.PictApplication.setStatus('Delete failed: ' + pError.message);
								}
							});
					});
				return;
			}
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

	// ─────────────────────────────────────────────
	//  Data shaping — only place that walks the audit + manifest
	//  payloads. Templates above own all the markup.
	// ─────────────────────────────────────────────

	_buildRecord()
	{
		let tmpAudit = this._audit;
		let tmpAuditClass = tmpAudit.Clean ? 'ok' : 'drift';
		let tmpAuditLabel = tmpAudit.Clean
			? 'in sync with disk'
			: 'drift: ' + tmpAudit.Drift.ManifestMissing + ' missing, '
				+ tmpAudit.Drift.ManifestOrphaned + ' orphaned';

		let tmpAuditByGroup = {};
		for (let i = 0; i < tmpAudit.Groups.length; i++)
		{
			tmpAuditByGroup[tmpAudit.Groups[i].Name] = tmpAudit.Groups[i];
		}

		let tmpGroups = [];
		for (let i = 0; i < this._manifest.Groups.length; i++)
		{
			let tmpGroup      = this._manifest.Groups[i];
			let tmpGroupAudit = tmpAuditByGroup[tmpGroup.Name] || { ManifestMissing: [], ManifestOrphaned: [] };
			let tmpOrphanSet  = new Set(tmpGroupAudit.ManifestOrphaned);
			let tmpGroupNameJs = jsString(tmpGroup.Name);

			let tmpModules = [];
			for (let j = 0; j < tmpGroup.Modules.length; j++)
			{
				let tmpModule   = tmpGroup.Modules[j];
				let tmpIsOrphan = tmpOrphanSet.has(tmpModule.Name);
				tmpModules.push({
					Name:        tmpModule.Name,
					NameJs:      jsString(tmpModule.Name),
					Description: tmpModule.Description || '',
					RowClass:    tmpIsOrphan ? 'orphan' : '',
					StatusLabel: tmpIsOrphan ? 'missing on disk' : '—',
				});
			}

			let tmpDiskOnly = [];
			for (let j = 0; j < tmpGroupAudit.ManifestMissing.length; j++)
			{
				let tmpName = tmpGroupAudit.ManifestMissing[j];
				tmpDiskOnly.push({
					Name:        tmpName,
					NameJs:      jsString(tmpName),
					GroupNameJs: tmpGroupNameJs,
				});
			}

			tmpGroups.push({
				Name:        tmpGroup.Name,
				NameJs:      tmpGroupNameJs,
				Description: tmpGroup.Description || '',
				Modules:     tmpModules,
				DiskOnly:    tmpDiskOnly,
			});
		}

		return {
			AuditClass:  tmpAuditClass,
			AuditLabel:  tmpAuditLabel,
			LoadingSlot: [],
			Groups:      tmpGroups,
		};
	}
}

module.exports = ManagerManifestEditorView;
module.exports.default_configuration = _ViewConfiguration;
