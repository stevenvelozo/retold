#!/bin/bash
echo "Checking out Orator and Dependencies into currently working dictory: $(pwd)"

# Include the Checkout function.  This may not always work...
. ${BASH_SOURCE%/*}/Include-Checkout-Repository-To-Current-Folder.sh

check_out_repository "orator" "orator"
check_out_repository "orator" "orator-serviceserver-restify"
check_out_repository "orator" "tidings"

echo "--> Orator Checkout complete..."