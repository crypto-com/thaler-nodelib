#!/usr/bin/env bash

set -e

# Build and start chain Devnet
git clone https://github.com/crypto-com/chain || echo "`chain` folder already exists"
cd chain; git checkout master; git pull; git checkout 438b62c07a3d91760d1bebabc583af8c9242ca16 -b integratin-test; cd ..;

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
