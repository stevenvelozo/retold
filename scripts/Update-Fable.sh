#!/bin/bash
echo "Updating Fable and Dependencies in currently working dictory: $(pwd)"

# Include the Checkout function.  This may not always work...
. ${BASH_SOURCE%/*}/Include-Update-Repository-In-Current-Folder.sh

update_repository "fable" "fable"
update_repository "fable" "fable-log"
update_repository "fable" "fable-settings"
update_repository "fable" "fable-uuid"

echo "--> Fable Update complete..."