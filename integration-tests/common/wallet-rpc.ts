import BigNumber from 'bignumber.js';
import { RpcClient } from './rpc-client';
import { WalletRequest, asyncMiddleman, WalletAuthRequest } from './utils';
import { TendermintRpc } from './tendermint-rpc';

export class WalletRpc {
    private rpcClient: RpcClient;

    private tendermintRpc: TendermintRpc;

    constructor(rpcClient: RpcClient, tendermintRpc: TendermintRpc) {
        this.rpcClient = rpcClient;
        this.tendermintRpc = tendermintRpc;
    }

    public async getAuthToken(
        walletAuthRequest: WalletAuthRequest,
    ): Promise<string> {
        return asyncMiddleman(
            this.rpcClient.request('wallet_getEncKey', [walletAuthRequest]),
            'Error when querying auth token',
        );
    }

    public async sync(walletRequest: WalletRequest) {
        // eslint-disable-next-line no-console
        console.log(`[Log] Synchronizing wallet "${walletRequest.name}"`);
        await this.rpcClient.request('sync', [walletRequest]);
    }

    public async faucet(
        walletRequest: WalletRequest,
        options: {
            toAddress: string;
            value: BigNumber;
            viewKeys?: Buffer[];
        },
    ): Promise<UTXO> {
        const viewKeys = options.viewKeys?.map((viewKey) =>
            viewKey.toString('hex'),
        );

        await asyncMiddleman(
            this.sync(walletRequest),
            'Error when trying to sync wallet',
        );

        const txId = await asyncMiddleman(
            this.rpcClient.request('wallet_sendToAddress', [
                walletRequest,
                options.toAddress,
                options.value.toString(10),
                viewKeys || [],
            ]),
            'Error when transferring funds to address',
        );

        await this.tendermintRpc.waitTxIdConfirmation(txId);

        return {
            txId,
            index: 0,
            value: options.value,
        };
    }

    public async unbondAndWithdrawStake(walletRequest: WalletRequest) {
        await asyncMiddleman(
            this.sync(walletRequest),
            'Error when synchronizing Default wallet',
        );

        const stakingAddresses = await asyncMiddleman(
            this.request('wallet_listStakingAddresses', [walletRequest]),
            'Error when retrieving staking addresses',
        );
        const stakingAddress = stakingAddresses[1];

        const walletStakingState: WalletStakingState = await asyncMiddleman(
            this.request('staking_state', [stakingAddress]),
            'Error when retrieving Default wallet staking state',
        );
        // eslint-disable-next-line no-console
        console.info(
            `[Info] Wallet staking state: ${JSON.stringify(
                walletStakingState,
            )}`,
        );

        const walletBalance: WalletBalance = await asyncMiddleman(
            this.request('wallet_balance', [walletRequest]),
            'Error when retrieving Default wallet balance',
        );
        // eslint-disable-next-line no-console
        console.info(`[Info] Wallet balance: ${JSON.stringify(walletBalance)}`);
        if (new BigNumber(walletBalance.available).isGreaterThan('0')) {
            // eslint-disable-next-line no-console
            console.info('[Info] Bonded funds already withdrew');
            return;
        }
        // eslint-disable-next-line no-console
        console.log('Withdrawing bonded funds');

        const transferAddresses = await asyncMiddleman(
            this.request('wallet_listTransferAddresses', [walletRequest]),
            'Error when retrieving transfer addresses',
        );
        const transferAddress = transferAddresses[0];

        // eslint-disable-next-line no-console
        console.log(
            `Withdrawing bonded genesis funds from "${stakingAddress}" to "${transferAddress}"`,
        );
        const withdrawTxId = await asyncMiddleman(
            this.request('staking_withdrawAllUnbondedStake', [
                walletRequest,
                stakingAddress,
                transferAddress,
                [],
            ]),
            'Error when withdrawing all unbonded stake',
        );
        await asyncMiddleman(
            this.tendermintRpc.waitTxIdConfirmation(withdrawTxId),
            'Error when retrieving transaction confirmation',
        );

        await asyncMiddleman(
            this.sync(walletRequest),
            'Error when synchronizing Default wallet',
        );
    }

    public async request(method: string, params: string | any[]): Promise<any> {
        return this.rpcClient.request(method, params);
    }
}

export interface UTXO {
    txId: string;
    index: number;
    value: BigNumber;
}

export interface WalletStakingState {
    bonded: BigNumber;
    unbonded: BigNumber;
}

export interface WalletBalance {
    available: BigNumber;
    pending: BigNumber;
    total: BigNumber;
}
