#!/bin/bash
echo "Checking out Meadow and Dependencies into currently working dictory: $(pwd)"

# Include the Checkout function.  This may not always work...
. ${BASH_SOURCE%/*}/Include-Checkout-Repository-To-Current-Folder.sh

check_out_repository "meadow" "stricture"
check_out_repository "meadow" "foxhound"
check_out_repository "meadow" "meadow"
check_out_repository "meadow" "meadow-endpoints"
check_out_repository "meadow" "retold-data-service"

echo "--> Meadow Checkout complete..."