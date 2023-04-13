#!/bin/bash
echo "Status Checking Utility Libraries in currently working dictory: $(pwd)"

# Include the Checkout function.  This may not always work...
. ${BASH_SOURCE%/*}/Include-Status-Repository-In-Current-Folder.sh

status_repository "utility" "precedent"
status_repository "utility" "manyfest"
status_repository "utility" "choreographic"
status_repository "utility" "elucidator"
status_repository "utility" "cachetrax"
status_repository "utility" "cumulation"
status_repository "utility" "merquerial"
status_repository "utility" "quantifier"
status_repository "utility" "data-arithmatic"

echo "--> Utility module Status Check complete..."