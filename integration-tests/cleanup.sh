#!/usr/bin/env bash
set -e
cd "$(dirname "${BASH_SOURCE[0]}")"

pushd ./
cd ../chain
./integration-tests/cleanup.sh
popd

rm -r ../chain
