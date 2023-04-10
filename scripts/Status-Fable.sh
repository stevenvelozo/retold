#!/bin/bash
echo "Status Checking Fable and Dependencies in currently working dictory: $(pwd)"

# Include the Checkout function.  This may not always work...
. ${BASH_SOURCE%/*}/Include-Status-Repository-In-Current-Folder.sh

status_repository "fable" "fable"
status_repository "fable" "fable-log"
status_repository "fable" "fable-settings"
status_repository "fable" "fable-uuid"

echo "--> Fable Status Check complete..."