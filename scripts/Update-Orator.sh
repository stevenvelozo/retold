#!/bin/bash
echo "Updating Orator and Dependencies in currently working dictory: $(pwd)"

# Include the Checkout function.  This may not always work...
. ${BASH_SOURCE%/*}/Include-Update-Repository-In-Current-Folder.sh

update_repository "orator" "orator"
update_repository "orator" "orator-serviceserver-restify"
update_repository "orator" "tidings"

echo "--> Orator Update complete..."