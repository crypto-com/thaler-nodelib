import { RpcClient } from './rpc-client';
import { WalletRpc } from './wallet-rpc';
import { TendermintRpc } from './tendermint-rpc';

export const newRpcClient = (
    host: string = 'localhost',
    port: number = 26659,
): RpcClient => {
    return new RpcClient(`http://${host}:${port}`);
};

export const newZeroFeeRpcClient = (): RpcClient => {
    return newRpcClient(
        'localhost',
        Number(process.env.CLIENT_RPC_ZEROFEE_PORT) || 16659,
    );
};

export const newWithFeeRpcClient = (): RpcClient => {
    return newRpcClient(
        'localhost',
        Number(process.env.CLIENT_RPC_PORT) || 26659,
    );
};

export const newTendermintRpc = (
    host: string = 'localhost',
    port: number = 26657,
): TendermintRpc => {
    return new TendermintRpc(`http://${host}:${port}`);
};

export const newTendermintRPC = (): TendermintRpc => {
    return newTendermintRpc(
        'localhost',
        Number(process.env.TENDERMINT_RPC_PORT) || 26657,
    );
};

export const newWalletRPC = (): WalletRpc => {
    const rpcClient = newWithFeeRpcClient();
    const tendermintRpc = newTendermintRPC();
    return new WalletRpc(rpcClient, tendermintRpc);
};

export const sleep = (ms: number = 1000) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

export interface WalletAuthRequest {
    name: string;
    passphrase: string;
}

export interface WalletRequest {
    name: string;
    enckey: string;
}

export const generateWalletName = (prefix: string = 'NewWallet'): string => {
    return `${prefix}_${Date.now()}`;
};

export const asyncMiddleman = async (
    promise: Promise<any>,
    errorMessage: String,
): Promise<any> => {
    try {
        return await promise;
    } catch (err) {
        throw Error(`${errorMessage}: ${err.message}`);
    }
};

export const waitForBlockCount = async (
    count = 1,
    tendermintRpc: TendermintRpc,
) => {
    const lastBlockHeight = await tendermintRpc.latestBlockHeight();

    // eslint-disable-next-line no-constant-condition
    while (true) {
        // eslint-disable-next-line no-await-in-loop
        const latestBlockHeight = await tendermintRpc.latestBlockHeight();

        if (latestBlockHeight - lastBlockHeight > count) {
            // eslint-disable-next-line no-console
            console.log(
                `${count} block produced since last recorded block height: ${lastBlockHeight}`,
            );

            return;
        }

        // eslint-disable-next-line no-console
        console.log(
            `Waiting for ${count} block since last recorded block height: ${lastBlockHeight}. Current block height: ${latestBlockHeight}`,
        );

        // eslint-disable-next-line no-await-in-loop
        await sleep(1000);
    }
};

export const waitForTime = async (unixTimestamp: number) => {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const now = Math.trunc(Date.now() / 1000);

        if (now >= unixTimestamp) {
            // eslint-disable-next-line no-console
            console.log(`Expected time arrived: ${unixTimestamp}`);
            return;
        }

        // eslint-disable-next-line no-console
        console.log(
            `Waiting for time arrived (Expected: ${unixTimestamp} Actual: ${now})`,
        );
        // eslint-disable-next-line no-await-in-loop
        await sleep(1000);
    }
};

export const JSONPrettyStringify = (value: any): string =>
    JSON.stringify(value, null, '    ');
