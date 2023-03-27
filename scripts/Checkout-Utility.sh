#!/bin/bash
echo "Checking out Utility Libraries into currently working dictory: $(pwd)"

# Include the Checkout function.  This may not always work...
. ${BASH_SOURCE%/*}/Include-Checkout-Repository-To-Current-Folder.sh

check_out_repository "utility" "precedent"
check_out_repository "utility" "manyfest"
check_out_repository "utility" "choreographic"
check_out_repository "utility" "elucidator"
check_out_repository "utility" "cachetrax"
check_out_repository "utility" "cumulation"
check_out_repository "utility" "merquerial"
check_out_repository "utility" "quantifier"

echo "--> Utility module Checkout complete..."