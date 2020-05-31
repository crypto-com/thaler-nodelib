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

const TENDERMINT_ADDRESS = process.env.TENDERMINT_RPC_PORT
    ? `ws://127.0.0.1:${process.env.TENDERMINT_RPC_PORT}/websocket`
    : 'ws://127.0.0.1:26657/websocket';
const CHAIN_HEX_ID = process.env.CHAIN_HEX_ID || 'AB';

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
            // eslint-disable-next-line no-use-before-define
        } = await setupTestEnv();

        // Deposit 100000000 basic unit to staking account
        console.log('[Log] Requesting coin from faucet');
        const depositAmount = '100000000';
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
            .toHex(TENDERMINT_ADDRESS);
        await tendermintRpc.broadcastTxCommit(depositTxHex.toString('base64'));

        const depositTxId = depositTxBuilder.txId();
        await tendermintRpc.waitTxIdConfirmation(depositTxId);

        // eslint-disable-next-line no-use-before-define
        const stakeStateAfterDeposit = await assertDepositShouldSucceed(
            walletRpc,
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
                nonce: stakeStateAfterDeposit.nonce.toNumber(),
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
            stakingAddress,
            punishmentKind,
            nodeMetaData,
            walletRpc,
        );
    });
    /* eslint-enable no-console */
});

const setupTestEnv = async () => {
    const transferKeyPair = cro.KeyPair.generateRandom();
    const stakingKeyPair = cro.KeyPair.generateRandom();
    const viewKeyPair = cro.KeyPair.generateRandom();
    const network = cro.network.Devnet({
        chainHexId: CHAIN_HEX_ID,
    });
    const transferAddress = cro.address.transfer({
        keyPair: transferKeyPair,
        network,
    });
    const stakingAddress = cro.address.staking({
        keyPair: stakingKeyPair,
    });

    return {
        transferAddress,
        viewKeyPair,
        stakingAddress,
        network,
        transferKeyPair,
        stakingKeyPair,
    };
};

enum PunishmentKindAssertion {
    None = 'None',
    NonLive = 'NonLive',
    ByzantineFault = 'ByzantineFault',
}

const parseStakedStateFromRPC = (
    stakedState: RPCStakedState,
): cro.StakedState => {
    const nativeStakedState: cro.NativeStakedState = {
        ...stakedState,
        nonce: stakedState.nonce.toNumber(),
        unbonded_from: stakedState.unbonded_from.toNumber(),
        punishment: stakedState.punishment
            ? {
                  ...stakedState.punishment,
                  jailed_until: stakedState.punishment!.jailed_until.toNumber(),
              }
            : undefined,
    };

    return cro.parseStakedStateForNodelib(nativeStakedState);
};

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
    stakingAddress: string,
    depositAmount: string,
): Promise<RPCStakedState> => {
    const stakeStateAfterDeposit: RPCStakedState = await walletRpc.request(
        'staking_state',
        stakingAddress,
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
        stakedState = (await walletRpc.request(
            'staking_state',
            stakingAddress,
        )) as RPCStakedState;
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
                stakedState.council_node,
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
    stakingAddress: string,
    punishmentKind: PunishmentKindAssertion,
    councilNode: NodeMetaData,
    walletRpc: WalletRpc,
) => {
    const maxTrials = 15;
    const stakeStateAfterNodeJoin = await waitForStakedState(
        stakingAddress,
        {
            punishmentKind,
            councilNode,
        },
        walletRpc,
        maxTrials,
        'Expected staking address to become an council node',
    );

    return parseStakedStateFromRPC(stakeStateAfterNodeJoin);
};
