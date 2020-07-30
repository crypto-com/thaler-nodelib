import 'mocha';
import { expect } from 'chai';
import deepEqual from 'deep-equal';
import BigNumber from 'bignumber.js';

import * as cro from '../../lib/src';
import {
    newTendermintRPC,
    newWalletRPC,
    WalletRequest,
    sleep,
    JSONPrettyStringify,
} from '../common/utils';
import { TendermintRpc } from '../common/tendermint-rpc';
import { WalletRpc } from '../common/wallet-rpc';
import { NodePublicKeyType } from '../../lib/src/transaction/council_node';
import { NodeMetaData } from '../../lib/src/transaction/council_node/types';
import {
    RPCStakedState,
    parseRPCCouncilNodeFromNodeMetaData,
} from '../common/staking';
import { DEVNET_TX_TENDERMINT_ADDRESS, DEVNET } from '../common/constant';

describe('Council Node Transaction', () => {
    let tendermintRpc: TendermintRpc;
    let walletRpc: WalletRpc;
    let defaultWallet: WalletRequest;

    before(async () => {
        tendermintRpc = newTendermintRPC();
        walletRpc = newWalletRPC();
        const walletAuthRequest = {
            name: 'Default',
            passphrase: process.env.WALLET_PASSPHRASE || '123456',
        };
        const enckey = await walletRpc.getAuthToken(walletAuthRequest);

        defaultWallet = {
            name: 'Default',
            enckey,
        };
    });

    /* eslint-disable no-console */
    // eslint-disable-next-line func-names
    it('can submit NodeJoin transaction', async function () {
        this.timeout(60000);

        const abciInfo = await tendermintRpc.abciInfo();
        // eslint-disable-next-line no-use-before-define
        console.log(`abci_info: ${JSONPrettyStringify(abciInfo)}`);

        const {
            transferAddress,
            viewKeyPair,
            stakingAddress,
            network,
            transferKeyPair,
            stakingKeyPair,
            createdWallet,
            // eslint-disable-next-line no-use-before-define
        } = await setupTestEnv(walletRpc);

        // Deposit 100000000 basic unit to staking account
        console.log('[Log] Requesting coin from faucet');
        const depositAmount = '1000000000';
        const utxo = await walletRpc.faucet(defaultWallet, {
            toAddress: transferAddress,
            value: cro.utils.toBigNumber(depositAmount),
            viewKeys: [viewKeyPair.publicKey!],
        });

        console.log('[Log] Depositing stake to staking account');
        const depositTxBuilder = new cro.transaction.staking.DepositTransactionBuilder(
            {
                stakingAddress,
                network,
            },
        );
        const depositTxHex = depositTxBuilder
            .addInput({
                prevTxId: utxo.txId,
                prevIndex: utxo.index,
            })
            .signInput(0, transferKeyPair)
            .toHex(DEVNET_TX_TENDERMINT_ADDRESS);
        await tendermintRpc.broadcastTxCommit(depositTxHex.toString('base64'));

        const depositTxId = depositTxBuilder.txId();
        await tendermintRpc.waitTxIdConfirmation(depositTxId);

        // eslint-disable-next-line no-use-before-define
        const stakeStateAfterDeposit = await assertDepositShouldSucceed(
            walletRpc,
            createdWallet,
            stakingAddress,
            depositAmount,
        );

        // Build NodeJoin transaction
        console.log('[Log] Submitting NodeJoin transaction');
        const nodeMetaData: NodeMetaData = {
            name: 'Council Node',
            securityContact: 'security@councilnode.com',
            consensusPublicKey: {
                type: NodePublicKeyType.Ed25519,
                value: 'KylIfqEtEoUcP9KS3lgFY0YNz7qbUuW5vT+sJitknLM=',
            },
        };
        const nodeJoinTxBuilder = new cro.transaction.councilNode.NodeJoinTransactionBuilder(
            {
                stakingAddress,
                nonce: stakeStateAfterDeposit.nonce,
                nodeMetaData,
                network,
            },
        );
        const nodeJoinTxHex = nodeJoinTxBuilder.sign(stakingKeyPair).toHex();
        await tendermintRpc.broadcastTxCommit(nodeJoinTxHex.toString('base64'));

        const nodeJoinTxId = nodeJoinTxBuilder.txId();
        await tendermintRpc.waitTxIdConfirmation(nodeJoinTxId);

        // eslint-disable-next-line no-use-before-define
        const punishmentKind = PunishmentKindAssertion.None;
        // eslint-disable-next-line no-use-before-define
        await assertNodeJoinShouldSucceed(
            createdWallet,
            stakingAddress,
            punishmentKind,
            nodeMetaData,
            walletRpc,
        );
    });
    /* eslint-enable no-console */
});

const setupTestEnv = async (walletRpc: WalletRpc) => {
    const transferKeyPair = cro.KeyPair.generateRandom();
    const stakingKeyPair = cro.KeyPair.generateRandom();
    const viewKeyPair = cro.KeyPair.generateRandom();
    const network = DEVNET;
    const transferAddress = cro.address.transfer({
        keyPair: transferKeyPair,
        network,
    });
    const stakingAddress = cro.address.staking({
        keyPair: stakingKeyPair,
    });
    // eslint-disable-next-line no-use-before-define
    const createdWallet = await createWallet(
        viewKeyPair,
        stakingKeyPair,
        transferKeyPair,
        walletRpc,
    );

    return {
        transferAddress,
        viewKeyPair,
        stakingAddress,
        network,
        transferKeyPair,
        stakingKeyPair,
        createdWallet,
    };
};

const createWallet = async (
    viewKeyPair: cro.KeyPair,
    stakingKeyPair: cro.KeyPair,
    transferKeyPair: cro.KeyPair,
    walletRpc: WalletRpc,
): Promise<WalletRequest> => {
    const walletName = Date.now().toString();
    const walletAuthRequest = {
        name: walletName,
        passphrase: '123456',
    };
    await walletRpc.request('wallet_restoreBasic', [
        walletAuthRequest,
        viewKeyPair.privateKey!.toString('hex'),
    ]);
    const walletEnckey = await walletRpc.getAuthToken(walletAuthRequest);

    const walletRequest = {
        name: walletName,
        enckey: walletEnckey,
    };
    await walletRpc.request('wallet_createWatchStakingAddress', [
        walletRequest,
        stakingKeyPair.publicKey!.toString('hex'),
    ]);
    await walletRpc.request('wallet_createWatchTransferAddress', [
        walletRequest,
        transferKeyPair.publicKey!.toString('hex'),
    ]);

    return walletRequest;
};

enum PunishmentKindAssertion {
    None = 'None',
    NonLive = 'NonLive',
    ByzantineFault = 'ByzantineFault',
}

const isPunishmentKindEq = (
    stakedState: RPCStakedState,
    expectedPunishmentKind: PunishmentKindAssertion,
): boolean => {
    const actualPunishmentKind = stakedState.punishment?.kind;

    if (!actualPunishmentKind) {
        if (expectedPunishmentKind === PunishmentKindAssertion.None) {
            return true;
        }
        return false;
    }

    return actualPunishmentKind === expectedPunishmentKind;
};

const assertDepositShouldSucceed = async (
    walletRpc: WalletRpc,
    walletRequest: WalletRequest,
    stakingAddress: string,
    depositAmount: string,
): Promise<RPCStakedState> => {
    await walletRpc.sync(walletRequest);

    const stakeStateAfterDeposit: RPCStakedState = await walletRpc.request(
        'staking_state',
        [walletRequest.name, stakingAddress],
    );
    const actualBonded = new BigNumber(stakeStateAfterDeposit.bonded);
    expect(actualBonded.isGreaterThan('0')).to.eq(true);
    expect(actualBonded.isLessThan(depositAmount)).to.eq(
        true,
        'Deposit transaction should be charged with fee',
    );
    return stakeStateAfterDeposit;
};

/* eslint-disable no-console */
const waitForStakedState = async (
    walletRequest: WalletRequest,
    stakingAddress: string,
    partialStakedState: {
        punishmentKind?: PunishmentKindAssertion;
        councilNode?: NodeMetaData;
    },
    walletRpc: WalletRpc,
    maxTrials = 15,
    message = 'staked state mismatch',
): Promise<RPCStakedState> => {
    let trial = 1;
    let stakedState: RPCStakedState | undefined;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (trial === maxTrials) {
            throw new Error(
                `${message}: Staked state mismatch after exceeding trials. Expected: ${JSONPrettyStringify(
                    partialStakedState,
                )} Actual: ${
                    stakedState ? JSONPrettyStringify(stakedState) : 'N/A'
                })`,
            );
        }

        // eslint-disable-next-line no-await-in-loop
        await walletRpc.sync(walletRequest);

        // eslint-disable-next-line no-await-in-loop
        stakedState = (await walletRpc.request('staking_state', [
            walletRequest.name,
            stakingAddress,
        ])) as RPCStakedState;
        if (
            partialStakedState.punishmentKind &&
            !isPunishmentKindEq(stakedState, partialStakedState.punishmentKind)
        ) {
            console.log(
                `Waiting for staked state punishment kind (Expected: ${partialStakedState.punishmentKind} Actual: ${stakedState.punishment})`,
            );
            trial += 1;
            // eslint-disable-next-line no-await-in-loop
            await sleep(1000);
            // eslint-disable-next-line no-continue
            continue;
        }

        if (
            partialStakedState.councilNode &&
            !deepEqual(
                // eslint-disable-next-line camelcase
                stakedState.validator?.council_node,
                parseRPCCouncilNodeFromNodeMetaData(
                    partialStakedState.councilNode,
                ),
            )
        ) {
            console.log(
                `Waiting for staked state council node update (Expected: ${JSONPrettyStringify(
                    partialStakedState.councilNode,
                )} Actual: ${JSONPrettyStringify(stakedState.unbonded)})`,
            );
            trial += 1;
            // eslint-disable-next-line no-await-in-loop
            await sleep(1000);
            // eslint-disable-next-line no-continue
            continue;
        }

        console.log(
            `Expected staked state found: ${JSONPrettyStringify(stakedState)}`,
        );

        return stakedState;
    }
};
/* eslint-enable no-console */

const assertNodeJoinShouldSucceed = async (
    walletRequest: WalletRequest,
    stakingAddress: string,
    punishmentKind: PunishmentKindAssertion,
    councilNode: NodeMetaData,
    walletRpc: WalletRpc,
) => {
    const maxTrials = 15;
    await waitForStakedState(
        walletRequest,
        stakingAddress,
        {
            punishmentKind,
            councilNode,
        },
        walletRpc,
        maxTrials,
        'Expected staking address to become an council node',
    );
};
