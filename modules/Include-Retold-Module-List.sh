#!/bin/bash

echo "### Building list of modules..."

repositoriesFable=("fable" "fable-log" "fable-settings" "fable-uuid" "fable-serviceproviderbase" "fable-log-logger-bunyan")

repositoriesMeadow=("stricture" "foxhound" "bibliograph" "bibliograph-storage-meadow" "meadow" "parime" "meadow-endpoints" "meadow-connection-mysql" "meadow-connection-mssql" "meadow-connection-sqlite" "meadow-connection-postgresql" "meadow-connection-mongodb" "meadow-connection-dgraph" "meadow-connection-solr" "meadow-connection-rocksdb" "meadow-graph-client" "retold-data-service" "retold-harness" "retold-harness-consistency-proxy" "meadow-integration" "meadow-migrationmanager")

repositoriesOrator=("orator" "orator-serviceserver-restify" "orator-static-server" "orator-http-proxy" "orator-endpoint" "tidings" "orator-conversion")

repositoriesPict=("pict" "pict-template" "pict-view" "pict-provider" "pict-application" "pict-panel" "pict-nonlinearconfig" "pict-section-flow" "pict-docuserve" "cryptbrau" "informary" "pict-service-commandlineutility" "pict-section-recordset" "pict-section-code" "pict-section-content" "pict-section-objecteditor" "pict-section-formeditor" "pict-section-form" "pict-section-tuigrid" "pict-router" "pict-serviceproviderbase" "pict-terminalui" "pict-sessionmanager" "pict-section-markdowneditor")

repositoriesUtility=("indoctrinate" "manyfest" "cachetrax" "precedent" "quackage" "ultravisor")

repositoriesApps=("retold-content-system" "retold-remote")

echo "### ... Module lists built!"
