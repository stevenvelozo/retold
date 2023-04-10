#!/bin/bash
echo "Status Checking Meadow and Dependencies in currently working dictory: $(pwd)"

# Include the Checkout function.  This may not always work...
. ${BASH_SOURCE%/*}/Include-Status-Repository-In-Current-Folder.sh

status_repository "meadow" "stricture"
status_repository "meadow" "foxhound"
status_repository "meadow" "meadow"
status_repository "meadow" "meadow-endpoints"
status_repository "meadow" "retold-data-service"

echo "--> Meadow Status Check complete..."