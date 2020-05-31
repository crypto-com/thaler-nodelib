#!/usr/bin/env bash
set -e
cd "$(dirname "${BASH_SOURCE[0]}")"

rustup default nightly-2019-11-25
rustc --version
cargo version

pushd ./
cd ../
git -C chain pull || git clone https://github.com/crypto-com/chain
cd ./chain
git checkout release/v0.3
./docker/build.sh
popd
