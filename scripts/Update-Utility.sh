#!/bin/bash
echo "Updating Utility Libraries in currently working dictory: $(pwd)"

# Include the Checkout function.  This may not always work...
. ${BASH_SOURCE%/*}/Include-Update-Repository-In-Current-Folder.sh

update_repository "utility" "precedent"
update_repository "utility" "manyfest"
update_repository "utility" "choreographic"
update_repository "utility" "elucidator"
update_repository "utility" "cachetrax"
update_repository "utility" "cumulation"
update_repository "utility" "merquerial"
update_repository "utility" "quantifier"
update_repository "utility" "data-arithmatic"

echo "--> Utility module Update complete..."