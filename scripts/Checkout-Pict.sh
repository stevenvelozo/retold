#!/bin/bash
echo "Checking out Pict and Dependencies into currently working dictory: $(pwd)"

# Include the Checkout function.  This may not always work...
. ${BASH_SOURCE%/*}/Include-Checkout-Repository-To-Current-Folder.sh

check_out_repository "pict" "pict"
check_out_repository "pict" "cryptbrau"
check_out_repository "pict" "informary"

echo "--> Pict Checkout complete..."