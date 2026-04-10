# Retold In-Ecosystem Dependency Graph

This document maps the internal dependency relationships between all modules in the Retold ecosystem. It covers production and development dependencies where both the consumer and the dependency are Retold modules.

Generated: 2026-02-27

## Visual Graph

Core modules (10+ dependents) are shown with stadium-shaped nodes. The number in parentheses indicates how many other modules depend on it. Solid arrows are production dependencies; dotted arrows are development dependencies.

```mermaid
flowchart TD

	subgraph sg_fable["Fable -- Core Ecosystem"]
		n_fable([fable (23)])
		n_fable_log[fable-log (2)]
		n_fable_log_logger_bunyan[fable-log-logger-bunyan]
		n_fable_operationstep[fable-operationstep]
		n_fable_serviceproviderbase([fable-serviceproviderbase (31)])
		n_fable_settings[fable-settings (1)]
		n_fable_uuid[fable-uuid (1)]
	end

	subgraph sg_utility["Utility -- Build & Ops"]
		n_cachetrax[cachetrax (3)]
		n_cumulation[cumulation]
		n_indoctrinate[indoctrinate (2)]
		n_manyfest[manyfest (1)]
		n_pict_cruisecontrol[pict-cruisecontrol]
		n_precedent[precedent (1)]
		n_quackage([quackage (64)])
	end

	subgraph sg_meadow["Meadow -- Data Access"]
		n_bibliograph[bibliograph (3)]
		n_bibliograph_storage_lmdb[bibliograph-storage-lmdb]
		n_bibliograph_storage_rocksdb[bibliograph-storage-rocksdb]
		n_foxhound[foxhound (1)]
		n_meadow[meadow (2)]
		n_meadow_connection_mssql[meadow-connection-mssql (1)]
		n_meadow_connection_mysql[meadow-connection-mysql (2)]
		n_meadow_connection_sqlite[meadow-connection-sqlite (4)]
		n_meadow_endpoints[meadow-endpoints (1)]
		n_meadow_graph_client[meadow-graph-client]
		n_meadow_integration[meadow-integration]
		n_parime[parime]
		n_retold_data_service[retold-data-service (1)]
		n_retold_harness[retold-harness (1)]
		n_stricture[stricture (3)]
	end

	subgraph sg_orator["Orator -- API Server"]
		n_orator([orator (14)])
		n_orator_conversion[orator-conversion]
		n_orator_http_proxy[orator-http-proxy (2)]
		n_orator_serviceserver_base[orator-serviceserver-base (3)]
		n_orator_serviceserver_restify([orator-serviceserver-restify (11)])
		n_orator_static_server[orator-static-server (2)]
		n_tidings[tidings]
	end

	subgraph sg_apps["Apps -- Full Stack"]
		n_retold_content_system[retold-content-system (2)]
		n_retold_remote[retold-remote]
		n_ultravisor[ultravisor]
	end

	subgraph sg_pict["Pict -- MVC & UI"]
		n_cryptbrau[cryptbrau]
		n_informary[informary]
		n_pict([pict (27)])
		n_pict_application[pict-application (9)]
		n_pict_chance[pict-chance]
		n_pict_docuserve[pict-docuserve (3)]
		n_pict_nonlinearconfig[pict-nonlinearconfig]
		n_pict_panel[pict-panel]
		n_pict_provider([pict-provider (14)])
		n_pict_router[pict-router (3)]
		n_pict_section_code[pict-section-code (4)]
		n_pict_section_content[pict-section-content (4)]
		n_pict_section_entitymanagement[pict-section-entitymanagement]
		n_pict_section_filebrowser[pict-section-filebrowser (2)]
		n_pict_section_flow[pict-section-flow]
		n_pict_section_form[pict-section-form (4)]
		n_pict_section_formeditor[pict-section-formeditor]
		n_pict_section_markdowneditor[pict-section-markdowneditor (2)]
		n_pict_section_objecteditor[pict-section-objecteditor (1)]
		n_pict_section_recordset[pict-section-recordset]
		n_pict_section_tuigrid[pict-section-tuigrid (1)]
		n_pict_service_commandlineutility([pict-service-commandlineutility (10)])
		n_pict_serviceproviderbase[pict-serviceproviderbase (1)]
		n_pict_template[pict-template (4)]
		n_pict_terminalui[pict-terminalui (1)]
		n_pict_view([pict-view (20)])
	end

	subgraph sg_root["Root -- Meta & Examples"]
		n_retold[retold]
	end

	%% Production dependencies (solid arrows)
	n_retold --> n_retold_content_system
	n_orator_serviceserver_restify --> n_orator_serviceserver_base
	n_orator_http_proxy --> n_orator_serviceserver_base
	n_orator --> n_fable_serviceproviderbase
	n_orator --> n_orator_serviceserver_base
	n_orator --> n_orator_static_server
	n_orator_static_server --> n_fable_serviceproviderbase
	n_orator_conversion --> n_fable_serviceproviderbase
	n_orator_serviceserver_base --> n_fable_serviceproviderbase
	n_tidings --> n_fable
	n_tidings --> n_orator
	n_pict_panel --> n_fable_serviceproviderbase
	n_pict_panel --> n_pict_provider
	n_pict_panel --> n_pict_template
	n_pict_panel --> n_pict_view
	n_pict_section_filebrowser --> n_fable
	n_pict_section_filebrowser --> n_fable_serviceproviderbase
	n_pict_section_filebrowser --> n_orator
	n_pict_section_filebrowser --> n_orator_serviceserver_restify
	n_pict_section_filebrowser --> n_pict_provider
	n_pict_section_filebrowser --> n_pict_view
	n_pict_application --> n_fable_serviceproviderbase
	n_pict_view --> n_fable
	n_pict_view --> n_fable_serviceproviderbase
	n_pict_nonlinearconfig --> n_pict
	n_pict_nonlinearconfig --> n_pict_application
	n_pict_nonlinearconfig --> n_pict_router
	n_pict_nonlinearconfig --> n_pict_view
	n_pict_nonlinearconfig --> n_pict_provider
	n_pict_router --> n_pict_provider
	n_pict_section_objecteditor --> n_pict_view
	n_pict_section_formeditor --> n_pict_section_code
	n_pict_section_formeditor --> n_pict_section_content
	n_pict_section_formeditor --> n_pict_section_form
	n_pict_section_formeditor --> n_pict_section_markdowneditor
	n_pict_section_formeditor --> n_pict_section_objecteditor
	n_pict_section_formeditor --> n_pict_view
	n_pict_serviceproviderbase --> n_fable_serviceproviderbase
	n_pict_serviceproviderbase --> n_pict
	n_pict --> n_cachetrax
	n_pict --> n_fable
	n_pict --> n_pict_application
	n_pict --> n_pict_provider
	n_pict --> n_pict_template
	n_pict --> n_pict_view
	n_pict_section_flow --> n_pict_view
	n_pict_section_flow --> n_pict_provider
	n_pict_section_flow --> n_fable_serviceproviderbase
	n_pict_section_entitymanagement --> n_pict_router
	n_pict_section_entitymanagement --> n_pict_section_form
	n_pict_section_recordset --> n_fable_serviceproviderbase
	n_pict_section_recordset --> n_pict_provider
	n_pict_section_recordset --> n_pict_router
	n_pict_section_recordset --> n_pict_section_form
	n_pict_section_recordset --> n_pict_template
	n_pict_section_recordset --> n_pict_view
	n_pict_section_content --> n_pict_provider
	n_pict_section_content --> n_pict_section_code
	n_pict_section_content --> n_pict_view
	n_pict_service_commandlineutility --> n_fable_serviceproviderbase
	n_pict_service_commandlineutility --> n_pict
	n_pict_section_markdowneditor --> n_pict_section_content
	n_pict_section_markdowneditor --> n_pict_view
	n_informary --> n_cachetrax
	n_pict_template --> n_fable_serviceproviderbase
	n_pict_section_form --> n_fable_serviceproviderbase
	n_pict_section_form --> n_pict_provider
	n_pict_section_form --> n_pict_section_tuigrid
	n_pict_section_form --> n_pict_template
	n_pict_section_form --> n_pict_view
	n_pict_provider --> n_fable_serviceproviderbase
	n_pict_chance --> n_fable_serviceproviderbase
	n_pict_terminalui --> n_fable
	n_pict_terminalui --> n_fable_serviceproviderbase
	n_pict_terminalui --> n_pict
	n_pict_terminalui --> n_pict_application
	n_pict_terminalui --> n_pict_view
	n_pict_section_tuigrid --> n_pict_view
	n_pict_docuserve --> n_pict
	n_pict_docuserve --> n_pict_application
	n_pict_docuserve --> n_pict_provider
	n_pict_docuserve --> n_pict_section_content
	n_pict_docuserve --> n_pict_service_commandlineutility
	n_pict_docuserve --> n_pict_view
	n_pict_section_code --> n_pict_view
	n_fable_log --> n_fable_serviceproviderbase
	n_fable_operationstep --> n_fable_serviceproviderbase
	n_fable_settings --> n_fable_serviceproviderbase
	n_fable_settings --> n_precedent
	n_fable_uuid --> n_fable_serviceproviderbase
	n_fable --> n_cachetrax
	n_fable --> n_fable_log
	n_fable --> n_fable_serviceproviderbase
	n_fable --> n_fable_settings
	n_fable --> n_fable_uuid
	n_fable --> n_manyfest
	n_fable_log_logger_bunyan --> n_fable_log
	n_retold_harness --> n_meadow_connection_sqlite
	n_retold_harness --> n_retold_data_service
	n_meadow_graph_client --> n_fable_serviceproviderbase
	n_meadow_connection_mysql --> n_fable_serviceproviderbase
	n_stricture --> n_pict
	n_stricture --> n_pict_application
	n_stricture --> n_pict_service_commandlineutility
	n_stricture --> n_pict_terminalui
	n_stricture --> n_pict_view
	n_meadow_connection_sqlite --> n_fable_serviceproviderbase
	n_meadow_connection_mssql --> n_fable_serviceproviderbase
	n_meadow_endpoints --> n_fable
	n_meadow_endpoints --> n_meadow
	n_meadow_endpoints --> n_orator
	n_foxhound --> n_fable
	n_meadow_integration --> n_fable
	n_meadow_integration --> n_fable_serviceproviderbase
	n_meadow_integration --> n_orator
	n_meadow_integration --> n_orator_serviceserver_restify
	n_meadow_integration --> n_pict_service_commandlineutility
	n_parime --> n_bibliograph
	n_parime --> n_orator
	n_parime --> n_orator_serviceserver_restify
	n_parime --> n_pict
	n_bibliograph_storage_rocksdb --> n_bibliograph
	n_meadow --> n_foxhound
	n_retold_data_service --> n_fable
	n_retold_data_service --> n_fable_serviceproviderbase
	n_retold_data_service --> n_meadow
	n_retold_data_service --> n_meadow_connection_mysql
	n_retold_data_service --> n_meadow_endpoints
	n_retold_data_service --> n_orator
	n_retold_data_service --> n_orator_http_proxy
	n_retold_data_service --> n_orator_serviceserver_restify
	n_retold_data_service --> n_orator_static_server
	n_bibliograph --> n_pict
	n_bibliograph --> n_pict_provider
	n_retold_content_system --> n_fable
	n_retold_content_system --> n_orator
	n_retold_content_system --> n_orator_serviceserver_restify
	n_retold_content_system --> n_pict
	n_retold_content_system --> n_pict_application
	n_retold_content_system --> n_pict_docuserve
	n_retold_content_system --> n_pict_provider
	n_retold_content_system --> n_pict_section_code
	n_retold_content_system --> n_pict_section_content
	n_retold_content_system --> n_pict_section_filebrowser
	n_retold_content_system --> n_pict_section_markdowneditor
	n_retold_content_system --> n_pict_service_commandlineutility
	n_retold_content_system --> n_pict_view
	n_retold_remote --> n_fable
	n_retold_remote --> n_fable_serviceproviderbase
	n_retold_remote --> n_orator
	n_retold_remote --> n_orator_serviceserver_restify
	n_retold_remote --> n_pict
	n_retold_remote --> n_pict_application
	n_retold_remote --> n_pict_provider
	n_retold_remote --> n_pict_section_code
	n_retold_remote --> n_pict_section_filebrowser
	n_retold_remote --> n_pict_service_commandlineutility
	n_retold_remote --> n_pict_view
	n_retold_remote --> n_retold_content_system
	n_quackage --> n_indoctrinate
	n_quackage --> n_pict_docuserve
	n_quackage --> n_pict_service_commandlineutility
	n_indoctrinate --> n_pict_service_commandlineutility
	n_cachetrax --> n_fable_serviceproviderbase
	n_manyfest --> n_fable_serviceproviderbase
	n_pict_cruisecontrol --> n_pict_view
	n_ultravisor --> n_orator
	n_ultravisor --> n_orator_serviceserver_restify
	n_ultravisor --> n_pict
	n_ultravisor --> n_pict_service_commandlineutility
	n_ultravisor --> n_pict_serviceproviderbase

	%% Development dependencies (dotted arrows)
	n_retold -.-> n_indoctrinate
	n_retold -.-> n_pict_docuserve
	n_retold -.-> n_quackage
	n_orator_serviceserver_restify -.-> n_fable
	n_orator_serviceserver_restify -.-> n_orator
	n_orator_serviceserver_restify -.-> n_quackage
	n_orator_http_proxy -.-> n_fable
	n_orator_http_proxy -.-> n_orator
	n_orator_http_proxy -.-> n_orator_serviceserver_restify
	n_orator_http_proxy -.-> n_quackage
	n_orator -.-> n_fable
	n_orator -.-> n_quackage
	n_orator_static_server -.-> n_fable
	n_orator_static_server -.-> n_orator
	n_orator_static_server -.-> n_orator_serviceserver_restify
	n_orator_static_server -.-> n_quackage
	n_orator_conversion -.-> n_fable
	n_orator_conversion -.-> n_orator
	n_orator_conversion -.-> n_orator_serviceserver_restify
	n_orator_conversion -.-> n_quackage
	n_orator_serviceserver_base -.-> n_fable
	n_orator_serviceserver_base -.-> n_orator
	n_orator_serviceserver_base -.-> n_quackage
	n_tidings -.-> n_quackage
	n_pict_panel -.-> n_pict
	n_pict_panel -.-> n_pict_section_form
	n_pict_panel -.-> n_quackage
	n_pict_section_filebrowser -.-> n_pict
	n_pict_section_filebrowser -.-> n_quackage
	n_pict_application -.-> n_pict
	n_pict_application -.-> n_pict_provider
	n_pict_application -.-> n_pict_view
	n_pict_application -.-> n_quackage
	n_pict_view -.-> n_pict
	n_pict_view -.-> n_quackage
	n_pict_nonlinearconfig -.-> n_quackage
	n_pict_router -.-> n_quackage
	n_pict_section_objecteditor -.-> n_pict
	n_pict_section_objecteditor -.-> n_quackage
	n_cryptbrau -.-> n_quackage
	n_pict_section_formeditor -.-> n_pict
	n_pict_section_formeditor -.-> n_quackage
	n_pict_serviceproviderbase -.-> n_quackage
	n_pict -.-> n_quackage
	n_pict_section_flow -.-> n_pict
	n_pict_section_flow -.-> n_quackage
	n_pict_section_entitymanagement -.-> n_quackage
	n_pict_section_recordset -.-> n_pict
	n_pict_section_recordset -.-> n_pict_application
	n_pict_section_recordset -.-> n_pict_service_commandlineutility
	n_pict_section_recordset -.-> n_quackage
	n_pict_section_content -.-> n_pict
	n_pict_section_content -.-> n_quackage
	n_pict_service_commandlineutility -.-> n_quackage
	n_pict_section_markdowneditor -.-> n_pict
	n_pict_section_markdowneditor -.-> n_quackage
	n_informary -.-> n_quackage
	n_pict_template -.-> n_pict
	n_pict_template -.-> n_quackage
	n_pict_section_form -.-> n_pict
	n_pict_section_form -.-> n_pict_application
	n_pict_section_form -.-> n_pict_service_commandlineutility
	n_pict_section_form -.-> n_quackage
	n_pict_provider -.-> n_pict
	n_pict_provider -.-> n_quackage
	n_pict_chance -.-> n_quackage
	n_pict_terminalui -.-> n_quackage
	n_pict_section_tuigrid -.-> n_pict
	n_pict_section_tuigrid -.-> n_quackage
	n_pict_docuserve -.-> n_quackage
	n_pict_section_code -.-> n_pict
	n_pict_section_code -.-> n_quackage
	n_fable_serviceproviderbase -.-> n_fable
	n_fable_serviceproviderbase -.-> n_quackage
	n_fable_log -.-> n_quackage
	n_fable_operationstep -.-> n_fable
	n_fable_operationstep -.-> n_quackage
	n_fable_settings -.-> n_quackage
	n_fable_uuid -.-> n_quackage
	n_fable -.-> n_quackage
	n_fable_log_logger_bunyan -.-> n_fable
	n_fable_log_logger_bunyan -.-> n_quackage
	n_retold_harness -.-> n_quackage
	n_retold_harness -.-> n_stricture
	n_meadow_graph_client -.-> n_quackage
	n_meadow_graph_client -.-> n_stricture
	n_meadow_connection_mysql -.-> n_fable
	n_meadow_connection_mysql -.-> n_quackage
	n_stricture -.-> n_quackage
	n_meadow_connection_sqlite -.-> n_quackage
	n_meadow_connection_sqlite -.-> n_retold_harness
	n_meadow_connection_mssql -.-> n_fable
	n_meadow_connection_mssql -.-> n_quackage
	n_meadow_endpoints -.-> n_meadow_connection_sqlite
	n_meadow_endpoints -.-> n_orator_serviceserver_restify
	n_meadow_endpoints -.-> n_quackage
	n_foxhound -.-> n_quackage
	n_meadow_integration -.-> n_quackage
	n_parime -.-> n_orator_http_proxy
	n_parime -.-> n_quackage
	n_bibliograph_storage_rocksdb -.-> n_quackage
	n_meadow -.-> n_fable
	n_meadow -.-> n_meadow_connection_mssql
	n_meadow -.-> n_meadow_connection_mysql
	n_meadow -.-> n_meadow_connection_sqlite
	n_meadow -.-> n_quackage
	n_retold_data_service -.-> n_meadow_connection_sqlite
	n_retold_data_service -.-> n_quackage
	n_retold_data_service -.-> n_stricture
	n_bibliograph -.-> n_quackage
	n_retold_content_system -.-> n_quackage
	n_retold_remote -.-> n_quackage
	n_precedent -.-> n_quackage
	n_indoctrinate -.-> n_quackage
	n_cachetrax -.-> n_quackage
	n_manyfest -.-> n_quackage
	n_pict_cruisecontrol -.-> n_pict
	n_pict_cruisecontrol -.-> n_quackage
	n_ultravisor -.-> n_quackage

	%% Group styling
	style sg_fable fill:#EBF2FA,stroke:#4A90D9,stroke-width:2px
	style sg_utility fill:#EBEDEF,stroke:#2C3E50,stroke-width:2px
	style sg_meadow fill:#E8F8EF,stroke:#27AE60,stroke-width:2px
	style sg_orator fill:#FDF2E9,stroke:#E67E22,stroke-width:2px
	style sg_apps fill:#FDEDEC,stroke:#C0392B,stroke-width:2px
	style sg_pict fill:#F4ECF7,stroke:#8E44AD,stroke-width:2px
	style sg_root fill:#F2F3F4,stroke:#7F8C8D,stroke-width:2px
```

## Summary

| Metric | Value |
|---|---|
| Total ecosystem modules | 77 |
| Module-category nodes | 67 |
| Example/internal nodes | 10 |
| Production dependency edges | 212 |
| Development dependency edges | 122 |
| Total in-ecosystem edges | 334 |
| Dependency depth (max groups) | 9 (groups 0-8) |

## Module Groups

| Group | Count | Role |
|---|---|---|
| **Fable** | 7 | Core: dependency injection, config, logging, UUID, expression parsing, REST client, templates |
| **Meadow** | 16 | Data: ORM, query DSL, schema definitions, DB connectors, REST endpoint generation |
| **Orator** | 7 | API: server framework, static files, HTTP proxy, WebSocket |
| **Pict** | 26 | MVC/UI: views, templates, providers, application lifecycle, form builders, TUI, CLI |
| **Utility** | 7 | Build/ops: build tools, manifest management, docs, caching |
| **Apps** | 3 | Full-stack: content management, remote access, process supervision |
| **Root** | 11 | Meta-package, examples, quickstarts |

## Core Modules (Most Depended Upon)

These modules form the critical path of the ecosystem. Changes here have the widest blast radius.

| Module | Group | Dependents | Role |
|---|---|---|---|
| **quackage** | utility | 66 | Build tool (devDep in nearly every module) |
| **fable-serviceproviderbase** | fable | 32 | Base class for all service providers |
| **fable** | fable | 31 | Core framework with DI container |
| **pict** | pict | 31 | Main MVC framework package |
| **pict-view** | pict | 24 | View base class |
| **orator** | orator | 17 | API server framework |
| **pict-provider** | pict | 16 | Provider base class |
| **orator-serviceserver-restify** | orator | 14 | Restify server implementation |
| **pict-application** | pict | 13 | Application lifecycle |
| **pict-service-commandlineutility** | pict | 11 | CLI framework |

## Topological Groups (Dependency Depth)

Modules at Group 0 have no ecosystem production dependencies. Each subsequent group depends on modules from lower groups. This ordering defines the safe update sequence: update from the bottom up.

### Group 0 -- Foundations (5 modules)

No ecosystem production dependencies. These are leaf nodes.

| Module | Group |
|---|---|
| bibliograph-storage-lmdb | meadow |
| cryptbrau | pict |
| cumulation | utility |
| **fable-serviceproviderbase** | fable |
| precedent | utility |

### Group 1 -- Base Services (17 modules)

Depend only on Group 0 modules.

| Module | Group | Depends On |
|---|---|---|
| cachetrax | utility | fable-serviceproviderbase |
| fable-log | fable | fable-serviceproviderbase |
| fable-operationstep | fable | fable-serviceproviderbase |
| fable-settings | fable | fable-serviceproviderbase, precedent |
| fable-uuid | fable | fable-serviceproviderbase |
| manyfest | utility | fable-serviceproviderbase |
| meadow-connection-mssql | meadow | fable-serviceproviderbase |
| meadow-connection-mysql | meadow | fable-serviceproviderbase |
| meadow-connection-sqlite | meadow | fable-serviceproviderbase |
| meadow-graph-client | meadow | fable-serviceproviderbase |
| orator-conversion | orator | fable-serviceproviderbase |
| orator-serviceserver-base | orator | fable-serviceproviderbase |
| orator-static-server | orator | fable-serviceproviderbase |
| pict-application | pict | fable-serviceproviderbase |
| pict-chance | pict | fable-serviceproviderbase |
| pict-provider | pict | fable-serviceproviderbase |
| pict-template | pict | fable-serviceproviderbase |

### Group 2 -- Framework Core (7 modules)

| Module | Group | Depends On |
|---|---|---|
| **fable** | fable | cachetrax, fable-log, fable-serviceproviderbase, fable-settings, fable-uuid, manyfest |
| fable-log-logger-bunyan | fable | fable-log |
| informary | pict | cachetrax |
| **orator** | orator | fable-serviceproviderbase, orator-serviceserver-base, orator-static-server |
| orator-http-proxy | orator | orator-serviceserver-base |
| orator-serviceserver-restify | orator | orator-serviceserver-base |
| pict-router | pict | pict-provider |

### Group 3 -- Derived Services (6 modules)

| Module | Group | Depends On |
|---|---|---|
| foxhound | meadow | fable |
| **pict-view** | pict | fable, fable-serviceproviderbase |
| tidings | orator | fable, orator |

### Group 4 -- Composite Modules (9 modules)

| Module | Group | Depends On |
|---|---|---|
| **meadow** | meadow | foxhound |
| **pict** | pict | cachetrax, fable, pict-application, pict-provider, pict-template, pict-view |
| pict-cruisecontrol | utility | pict-view |
| pict-panel | pict | fable-serviceproviderbase, pict-provider, pict-template, pict-view |
| pict-section-code | pict | pict-view |
| pict-section-filebrowser | pict | fable, fable-serviceproviderbase, orator, orator-serviceserver-restify, pict-provider, pict-view |
| pict-section-flow | pict | fable-serviceproviderbase, pict-provider, pict-view |
| pict-section-objecteditor | pict | pict-view |
| pict-section-tuigrid | pict | pict-view |

### Group 5 -- Higher-Level Sections (11 modules)

| Module | Group | Depends On |
|---|---|---|
| bibliograph | meadow | pict, pict-provider |
| meadow-endpoints | meadow | fable, meadow, orator |
| pict-nonlinearconfig | pict | pict, pict-application, pict-provider, pict-router, pict-view |
| pict-section-content | pict | pict-provider, pict-section-code, pict-view |
| pict-section-form | pict | fable-serviceproviderbase, pict-provider, pict-section-tuigrid, pict-template, pict-view |
| pict-service-commandlineutility | pict | fable-serviceproviderbase, pict |
| pict-serviceproviderbase | pict | fable-serviceproviderbase, pict |
| pict-terminalui | pict | fable, fable-serviceproviderbase, pict, pict-application, pict-view |

### Group 6 -- Integration Modules (15 modules)

| Module | Group | Depends On |
|---|---|---|
| bibliograph-storage-rocksdb | meadow | bibliograph |
| indoctrinate | utility | pict-service-commandlineutility |
| meadow-integration | meadow | fable, fable-serviceproviderbase, orator, orator-serviceserver-restify, pict-service-commandlineutility |
| parime | meadow | bibliograph, orator, orator-serviceserver-restify, pict |
| pict-docuserve | pict | pict, pict-application, pict-provider, pict-section-content, pict-service-commandlineutility, pict-view |
| pict-section-entitymanagement | pict | pict-router, pict-section-form |
| pict-section-markdowneditor | pict | pict-section-content, pict-view |
| pict-section-recordset | pict | fable-serviceproviderbase, pict-provider, pict-router, pict-section-form, pict-template, pict-view |
| retold-data-service | meadow | fable, fable-serviceproviderbase, meadow, meadow-connection-mysql, meadow-endpoints, orator, orator-http-proxy, orator-serviceserver-restify, orator-static-server |
| stricture | meadow | pict, pict-application, pict-service-commandlineutility, pict-terminalui, pict-view |
| ultravisor | apps | orator, orator-serviceserver-restify, pict, pict-service-commandlineutility, pict-serviceproviderbase |

### Group 7 -- Application Components (4 modules)

| Module | Group | Depends On |
|---|---|---|
| pict-section-formeditor | pict | pict-section-code, pict-section-content, pict-section-form, pict-section-markdowneditor, pict-section-objecteditor, pict-view |
| quackage | utility | indoctrinate, pict-docuserve, pict-service-commandlineutility |
| retold-content-system | apps | fable, orator, orator-serviceserver-restify, pict, pict-application, pict-docuserve, pict-provider, pict-section-code, pict-section-content, pict-section-filebrowser, pict-section-markdowneditor, pict-service-commandlineutility, pict-view |
| retold-harness | meadow | meadow-connection-sqlite, retold-data-service |

### Group 8 -- Top-Level Applications (2 modules)

| Module | Group | Depends On |
|---|---|---|
| retold | root | retold-content-system |
| retold-remote | apps | fable, fable-serviceproviderbase, orator, orator-serviceserver-restify, pict, pict-application, pict-provider, pict-section-code, pict-section-filebrowser, pict-service-commandlineutility, pict-view, retold-content-system |

## Architectural Dependency Flow

The general dependency flow follows the Retold architectural groups:

```
 Group 0   fable-serviceproviderbase, precedent, cryptbrau, cumulation
              |
 Group 1   fable-log, fable-settings, fable-uuid, cachetrax, manyfest
           meadow-connection-*, orator-serviceserver-base, orator-static-server
           pict-application, pict-provider, pict-template
              |
 Group 2   fable, orator, orator-serviceserver-restify, orator-http-proxy
           pict-router
              |
 Group 3   foxhound, pict-view, tidings
              |
 Group 4   meadow, pict, pict-section-* (basic)
              |
 Group 5   meadow-endpoints, pict-section-form, pict-service-commandlineutility
           pict-terminalui, bibliograph
              |
 Group 6   retold-data-service, stricture, indoctrinate, pict-docuserve
           pict-section-recordset, ultravisor
              |
 Group 7   quackage, retold-content-system, retold-harness
              |
 Group 8   retold, retold-remote
```

## Update Order

When performing ecosystem-wide updates, follow the topological group order (bottom-up):

1. **Group 0** first -- `fable-serviceproviderbase`, `precedent`
2. **Group 1** -- `fable-log`, `fable-settings`, `fable-uuid`, `cachetrax`, `manyfest`, connection modules, `pict-application`, `pict-provider`, `pict-template`
3. **Group 2** -- `fable`, `orator`, `orator-serviceserver-restify`
4. **Group 3** -- `foxhound`, `pict-view`
5. **Group 4** -- `meadow`, `pict`, basic pict-section modules
6. **Group 5** -- `meadow-endpoints`, `pict-section-form`, `pict-service-commandlineutility`
7. **Group 6** -- `retold-data-service`, `stricture`, `indoctrinate`, `pict-docuserve`
8. **Group 7** -- `quackage`, `retold-content-system`, `retold-harness`
9. **Group 8** -- `retold`, `retold-remote`

## Data Files

- **[in-ecosystem-dependency-graph.json](in-ecosystem-dependency-graph.json)** -- Machine-readable graph with nodes, edges, groups, and analytics
- **[_generate-graph.js](_generate-graph.js)** -- Script to regenerate the JSON from package.json files
- **[_generate-mermaid.js](_generate-mermaid.js)** -- Script to regenerate the Mermaid diagram from the JSON
