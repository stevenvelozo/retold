#!/bin/bash
echo "Status Checking Pict and Dependencies in currently working dictory: $(pwd)"

# Include the Checkout function.  This may not always work...
. ${BASH_SOURCE%/*}/Include-Status-Repository-In-Current-Folder.sh

status_repository "pict" "pict"
status_repository "pict" "cryptbrau"
status_repository "pict" "informary"

echo "--> Pict Status Check complete..."