#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

IS_DEV=0
if [[ "x${CI:-false}" == "xtrue" ]]; then
    echo "Running in CI"
    IS_DEV=1
elif [[ "x${NODE_ENV:-production}" == "xdevelopment" ]]; then
    echo "Development mode"
    IS_DEV=1
fi

if [[ $IS_DEV == 0 ]]; then
    echo "Installing from prebuild"
    npm run install:prebuild || npm run build
fi
