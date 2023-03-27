#!/bin/bash
echo "Updating Meadow and Dependencies in currently working dictory: $(pwd)"

# Include the Checkout function.  This may not always work...
. ${BASH_SOURCE%/*}/Include-Update-Repository-In-Current-Folder.sh

update_repository "meadow" "stricture"
update_repository "meadow" "foxhound"
update_repository "meadow" "meadow"
update_repository "meadow" "meadow-endpoints"
update_repository "meadow" "retold-data-service"

echo "--> Meadow Update complete..."