#!/usr/bin/env bash
set -e
cd "$(dirname "${BASH_SOURCE[0]}")"

# cleanup first
../chain/integration-tests/cleanup.sh

# ensure dependencies for integration tests
# ../chain/integration-tests/deps.sh
./deps.sh
PYTHON_VENV_DIR=${PYTHON_VENV_DIR:-"../chain/integration-tests/bot/.venv"}
source $PYTHON_VENV_DIR/bin/activate

# prepare chain binaries
CARGO_TARGET_DIR=${CARGO_TARGET_DIR:-"../chian/target"}
BUILD_PROFILE=${BUILD_PROFILE:-debug}
BUILD_MODE=${BUILD_MODE:-sgx}
ln -sf $CARGO_TARGET_DIR/$BUILD_PROFILE/tx_query_enclave.signed.so .
ln -sf $CARGO_TARGET_DIR/$BUILD_PROFILE/tx_validation_enclave.signed.so .
export PATH=$CARGO_TARGET_DIR/$BUILD_PROFILE:$PATH

if [ $BUILD_MODE == "sgx" ]; then
    CHAINBOT_ARGS=
else
    CHAINBOT_ARGS="--mock-mode"
fi

# environment variables for integration tests
export PASSPHRASE=123456
export BASE_PORT=${BASE_PORT:-26650}
export CLIENT_RPC_PORT=$(($BASE_PORT + 9))
export TENDERMINT_RPC_PORT=$(($BASE_PORT + 7))
export CLIENT_RPC_ZEROFEE_PORT=$CLIENT_RPC_PORT
export TENDERMINT_ZEROFEE_RPC_PORT=$TENDERMINT_RPC_PORT

function wait_http() {
    echo "Wait for http port $1"
    for i in $(seq 0 20);
    do
        curl -s "http://127.0.0.1:$1" > /dev/null
        if [ $? -eq 0 ]; then
            echo "Http port $1 is available now"
            return 0
        fi
        echo "[`date`] Http port $1 not available yet, sleep 2 seconds and retry"
        sleep 2
    done
    return 1
}

function runtest() {
    echo "Preparing... $1"
    LOWERED_TYPE=`echo $1 | tr "[:upper:]" "[:lower:]"`
    chainbot.py prepare ../chain/integration-tests/${LOWERED_TYPE}_cluster.json --base_port $BASE_PORT $CHAINBOT_ARGS

    echo "Startup..."
    supervisord -n -c data/tasks.ini &
    if ! wait_http $CLIENT_RPC_PORT; then
        echo 'client-rpc still not ready, giveup.'
        RETCODE=1
    else
        set +e

        pushd ./
        npm install
        npm run build
        npm run ci:withdraw-all-stake
        npm run integration-tests
        RETCODE=$?
        popd

        set -e
    fi

    if [ $RETCODE -ne 0 ]; then
        tail -n 100 data/logs/*.log
    fi

    echo "Quit supervisord..."
    kill -QUIT `cat data/supervisord.pid`
    wait
    rm -r data
    rm supervisord.log

    return $RETCODE
}

if [ -d data ]; then
    echo "Last run doesn't quit cleanly, please quit supervisord daemon and remove integration-tests/data manually."
    exit 1;
fi

runtest "WITH_FEE"
# runtest "ZERO_FEE"

../chain/integration-tests/cleanup.sh
