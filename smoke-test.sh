#!/bin/bash
set -e

echo "=== Contract smoke tests ==="
forge test

echo "=== Deploying to local anvil for smoke test ==="
anvil --fork-url $RPC_URL &
ANVIL_PID=$!
sleep 5
forge script script/Deploy.s.sol --fork-url http://127.0.0.1:8545 --broadcast
kill $ANVIL_PID

echo "=== DApp smoke test ==="
cd dapp
npm install
npm run build
npm run preview &
PREVIEW_PID=$!
sleep 5
curl -I http://localhost:4173
kill $PREVIEW_PID
