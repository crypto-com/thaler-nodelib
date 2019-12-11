#!/usr/bin/env bash

set -e

# Build and start chain Devnet
git clone https://github.com/calvinlauco/chain || echo "`chain` folder already exists"
cd chain; git checkout feature/cro-629-travis-integration-tests; git pull; cd ..;

cd chain/integration-tests
./prepare.sh || exit 1
. ./env.sh
docker-compose down
docker-compose up -d || exit 1;
./wait-for-setup.sh || (docker-compose ps; docker-compose logs -t --tail="all"; exit 1) || exit 1;

# Run integratin tests
cd ../..
npm run ci:withdraw-all-stake || (docker-compose ps; docker-compose logs -t --tail="all"; exit 1) || exit 1;
npm run integration-tests || (docker-compose ps; docker-compose logs -t --tail="all"; exit 1) || exit 1;
