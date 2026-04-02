#!/bin/bash

echo "### Building list of modules..."

repositoriesFable=("fable" "fable-log" "fable-settings" "fable-uuid" "fable-serviceproviderbase" "fable-log-logger-bunyan" "ultravisor-beacon" "ultravisor-beacon-capability")

repositoriesMeadow=("stricture" "foxhound" "bibliograph" "bibliograph-storage-meadow" "meadow" "parime" "meadow-endpoints" "meadow-connection-mysql" "meadow-connection-mssql" "meadow-connection-sqlite" "meadow-connection-sqlite-browser" "meadow-connection-postgresql" "meadow-connection-mongodb" "meadow-connection-dgraph" "meadow-connection-solr" "meadow-connection-rocksdb" "meadow-graph-client" "retold-data-service" "retold-harness" "retold-harness-consistency-proxy" "meadow-integration" "meadow-migrationmanager" "meadow-provider-offline")

repositoriesOrator=("orator" "orator-serviceserver-restify" "orator-static-server" "orator-http-proxy" "orator-endpoint" "tidings" "orator-conversion" "orator-authentication")

repositoriesPict=("pict" "pict-template" "pict-template-preprocessor" "pict-view" "pict-section-inlinedocumentation" "pict-section-histogram" "pict-provider" "pict-application" "pict-panel" "pict-nonlinearconfig" "pict-section-modal" "pict-section-flow" "pict-docuserve" "cryptbrau" "informary" "pict-service-commandlineutility" "pict-section-openseadragon" "pict-section-recordset" "pict-section-code" "pict-section-content" "pict-section-objecteditor" "pict-section-formeditor" "pict-section-form" "pict-section-tuigrid" "pict-section-login" "pict-router" "pict-serviceproviderbase" "pict-terminalui" "pict-sessionmanager" "pict-section-markdowneditor")

repositoriesUtility=("indoctrinate" "manyfest" "cachetrax" "precedent" "quackage" "retold-sample-data")

repositoriesApps=("retold-content-system" "retold-remote" "retold-remote-desktop" "retold-remote-ios" "ultravisor" "retold-facto" "ultravisor-suite-harness" "retold-databeacon")

echo "### ... Module lists built!"
