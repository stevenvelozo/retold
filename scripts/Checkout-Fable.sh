#!/bin/bash
echo "Checking out Fable and Dependencies into currently working dictory: $(pwd)"

# Include the Checkout function.  This may not always work...
. ${BASH_SOURCE%/*}/Include-Checkout-Repository-To-Current-Folder.sh

check_out_repository "fable" "fable"
check_out_repository "fable" "fable-log"
check_out_repository "fable" "fable-settings"
check_out_repository "fable" "fable-uuid"

echo "--> Fable Checkout complete..."