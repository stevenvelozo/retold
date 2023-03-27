#!/bin/bash
echo "Updating Pict and Dependencies in currently working dictory: $(pwd)"

# Include the Checkout function.  This may not always work...
. ${BASH_SOURCE%/*}/Include-Update-Repository-In-Current-Folder.sh

update_repository "pict" "pict"
update_repository "pict" "cryptbrau"
update_repository "pict" "informary"

echo "--> Pict Update complete..."