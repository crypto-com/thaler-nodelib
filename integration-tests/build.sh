#!/usr/bin/env bash
set -e
cd "$(dirname "${BASH_SOURCE[0]}")"

pushd ./
cd ../
git -C chain pull || git clone https://github.com/crypto-com/chain
cd ./chain
git checkout release/v0.5
./docker/build.sh
popd
