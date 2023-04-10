#!/bin/bash
echo "Status Checking Orator and Dependencies in currently working dictory: $(pwd)"

# Include the Checkout function.  This may not always work...
. ${BASH_SOURCE%/*}/Include-Status-Repository-In-Current-Folder.sh

status_repository "orator" "orator"
status_repository "orator" "orator-serviceserver-restify"
status_repository "orator" "tidings"

echo "--> Orator Status Check complete..."