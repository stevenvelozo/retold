/**
 * Retold Manager -- Module Catalog
 *
 * Static definitions of the retold module groups and their modules.
 * Drives the file browser's top-level navigation.
 */

const libPath = require('path');

module.exports =
{
	BasePath: libPath.resolve(__dirname, '..', '..', '..', 'modules'),

	Groups:
	[
		{
			Name: 'fable',
			Label: 'Fable',
			Description: 'Core ecosystem: DI, config, logging, UUID',
			Modules:
			[
				'fable', 'fable-log', 'fable-log-logger-bunyan', 'fable-operationstep',
				'fable-serviceproviderbase', 'fable-settings', 'fable-uuid'
			]
		},
		{
			Name: 'meadow',
			Label: 'Meadow',
			Description: 'Data access: ORM, query DSL, schema, DB connectors',
			Modules:
			[
				'bibliograph', 'bibliograph-storage-leveldb', 'bibliograph-storage-lmdb',
				'bibliograph-storage-rocksdb', 'foxhound', 'meadow', 'meadow-connection-mssql',
				'meadow-connection-mysql', 'meadow-connection-sqlite', 'meadow-endpoints',
				'meadow-graph-client', 'meadow-integration', 'parime', 'retold-data-service',
				'retold-harness', 'stricture'
			]
		},
		{
			Name: 'orator',
			Label: 'Orator',
			Description: 'API server: Restify, static files, HTTP proxy, WebSocket',
			Modules:
			[
				'orator', 'orator-conversion', 'orator-endpoint', 'orator-http-proxy',
				'orator-serviceserver-base', 'orator-serviceserver-restify',
				'orator-static-server', 'tidings'
			]
		},
		{
			Name: 'pict',
			Label: 'Pict',
			Description: 'MVC: views, templates, forms, TUI, CLI, router',
			Modules:
			[
				'cryptbrau', 'informary', 'pict', 'pict-application', 'pict-chance',
				'pict-docuserve', 'pict-nonlinearconfig', 'pict-panel', 'pict-provider',
				'pict-router', 'pict-section-content', 'pict-section-entitymanagement',
				'pict-section-flow', 'pict-section-form', 'pict-section-recordset',
				'pict-section-tuigrid', 'pict-service-commandlineutility',
				'pict-serviceproviderbase', 'pict-template', 'pict-terminalui', 'pict-view'
			]
		},
		{
			Name: 'utility',
			Label: 'Utility',
			Description: 'Build tools, manifests, docs, supervision',
			Modules:
			[
				'cachetrax', 'cumulation', 'indoctrinate', 'manyfest',
				'pict-cruisecontrol', 'precedent', 'quackage', 'ultravisor'
			]
		}
	]
};
