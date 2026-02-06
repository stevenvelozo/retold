#!/bin/bash

echo "### Building list of modules..."

repositoriesFable=("fable" "fable-log" "fable-settings" "fable-uuid" "fable-serviceproviderbase" "fable-log-logger-bunyan")

repositoriesMeadow=("stricture" "foxhound" "bibliograph" "meadow" "parime" "meadow-endpoints" "meadow-connection-mysql" "meadow-connection-mssql" "meadow-connection-sqlite" "retold-data-service" "retold-harness" "meadow-integration" "meadow-graph-client")

repositoriesOrator=("orator" "orator-serviceserver-restify" "orator-static-server" "orator-http-proxy" "tidings" "orator-endpoint")

repositoriesPict=("pict" "pict-template" "pict-view" "pict-provider" "pict-application" "pict-panel" "cryptbrau" "informary" "pict-service-commandlineutility" "pict-section-recordset" "pict-section-content" "pict-section-form" "pict-section-tuigrid" "pict-router" "pict-serviceproviderbase")

repositoriesUtility=("indoctrinate" "manyfest" "choreographic" "quackage" "ultravisor")

echo "### ... Module lists built!"
