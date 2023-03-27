#!/bin/bash
echo "Checking out Retold modules into: [$(pwd)/modulexs..."

./scripts/Checkout-Fable.sh
./scripts/Checkout-Orator.sh
./scripts/Checkout-Meadow.sh
./scripts/Checkout-Pict.sh
./scripts/Checkout-Utility.sh