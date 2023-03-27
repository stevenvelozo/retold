#!/bin/bash
echo "Checking out Retold modules into: [$(pwd)/modulexs..."

./scripts/Update-Fable.sh
./scripts/Update-Orator.sh
./scripts/Update-Meadow.sh
./scripts/Update-Pict.sh
./scripts/Update-Utility.sh