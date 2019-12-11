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

export const newZeroFeeTendermintRpc = (): TendermintRpc => {
    return newTendermintRpc(
        'localhost',
        Number(process.env.TENDERMINT_ZEROFEE_RPC_PORT) || 16657,
    );
};

export const newWithFeeTendermintRpc = (): TendermintRpc => {
    return newTendermintRpc(
        'localhost',
        Number(process.env.TENDERMINT_RPC_PORT) || 26657,
    );
};

export const newZeroFeeWalletRpc = (): WalletRpc => {
    const rpcClient = newZeroFeeRpcClient();
    const tendermintRpc = newZeroFeeTendermintRpc();
    return new WalletRpc(rpcClient, tendermintRpc);
};

export const newWithFeeWalletRpc = (): WalletRpc => {
    const rpcClient = newWithFeeRpcClient();
    const tendermintRpc = newWithFeeTendermintRpc();
    return new WalletRpc(rpcClient, tendermintRpc);
};

export const sleep = (ms: number = 1000) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

export interface WalletRequest {
    name: string;
    passphrase: string;
}

export const generateWalletName = (prefix: string = 'NewWallet'): string => {
    return `${prefix}_${Date.now()}`;
};

export const newWalletRequest = (
    name: string,
    passphrase: string,
): WalletRequest => {
    return {
        name,
        passphrase,
    };
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
