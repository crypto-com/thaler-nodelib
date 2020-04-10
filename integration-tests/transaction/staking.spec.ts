import 'mocha';
import { expect } from 'chai';

import BigNumber from 'bignumber.js';
import * as cro from '../../lib/src';
import {
    newTendermintRPC,
    newWalletRPC,
    WalletRequest,
    sleep,
    waitForTime,
    waitForBlockCount,
} from '../common/utils';
import { TendermintRpc } from '../common/tendermint-rpc';
import { WalletRpc } from '../common/wallet-rpc';
import {
    expectTransactionShouldEq,
    TransactionChangeKind,
} from '../common/assertion';
import { RPCStakedState, parseStakedStateFromRPC } from '../common/staking';

const TENDERMINT_ADDRESS = process.env.TENDERMINT_RPC_PORT
    ? `ws://127.0.0.1:${process.env.TENDERMINT_RPC_PORT}/websocket`
    : 'ws://127.0.0.1:26657/websocket';
const CHAIN_HEX_ID = process.env.CHAIN_HEX_ID || 'AB';

describe('Staking Transaction', () => {
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
    it('can create deposit, unbond and withdraw stake', async function() {
        this.timeout(60000);

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
        console.log('[Log] Submitting deposit transaction');
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

        const {
            stakeStateAfterDeposit,
            actualBonded,
            // eslint-disable-next-line no-use-before-define
        } = await assertDepositShouldSucceed(
            walletRpc,
            stakingAddress,
            depositAmount,
        );

        // Unbond 50000000 basic unit from staking account
        console.log('[Log] Unbonding stake from staking account');
        const unbondAmount = '50000000';
        const unbondTxBuilder = new cro.transaction.staking.UnbondTransactionBuilder(
            {
                stakingAddress,
                nonce: stakeStateAfterDeposit.nonce.toNumber(),
                amount: cro.utils.toBigNumber(unbondAmount),
                network,
            },
        );
        const unbondTxHex = unbondTxBuilder.sign(stakingKeyPair).toHex();
        await tendermintRpc.broadcastTxCommit(unbondTxHex.toString('base64'));

        const unbondTxId = depositTxBuilder.txId();
        await tendermintRpc.waitTxIdConfirmation(unbondTxId);

        const {
            stakeStateAfterUnbond,
            bondedFromUnbond,
            // eslint-disable-next-line no-use-before-define
        } = await assertUnbondShouldSucceed(
            actualBonded,
            unbondAmount,
            stakingAddress,
            walletRpc,
        );

        // Withdraw 25000000 basic unit to transfer address
        console.log('[Log] Waiting for unbonded stake to be withdraw-able');
        // eslint-disable-next-line no-use-before-define
        await waitForTime(stakeStateAfterUnbond.unbondedFrom);

        // eslint-disable-next-line no-use-before-define
        await waitForBlockCount(5, tendermintRpc);

        console.log('[Log] Withdrawing stake from staking account');
        const withdrawAmount = '25000000';
        const feeConfig: cro.fee.FeeConfig = {
            algorithm: cro.fee.FeeAlgorithm.LinearFee,
            constant: cro.utils.toBigNumber('1100'),
            coefficient: cro.utils.toBigNumber('1250'),
        };
        const withdrawUnbondedTxBuilder = new cro.transaction.staking.WithdrawUnbondedTransactionBuilder(
            {
                stakedState: stakeStateAfterUnbond,
                feeConfig,
                network,
            },
        );
        const withdrawUnbondedTxHex = withdrawUnbondedTxBuilder
            .addOutput({
                address: transferAddress,
                value: cro.utils.toBigNumber(withdrawAmount),
                validFrom: cro.Timespec.fromSeconds(
                    stakeStateAfterUnbond.unbondedFrom,
                ),
            })
            .addViewKey(viewKeyPair.publicKey!)
            .sign(stakingKeyPair)
            .toHex(TENDERMINT_ADDRESS);
        await tendermintRpc.broadcastTxCommit(
            withdrawUnbondedTxHex.toString('base64'),
        );

        const withdrawUnbondedTxId = withdrawUnbondedTxBuilder.txId();
        await tendermintRpc.waitTxIdConfirmation(withdrawUnbondedTxId);

        // eslint-disable-next-line no-use-before-define
        await assertWithdrawShouldSucceed(
            stakingAddress,
            bondedFromUnbond,
            walletRpc,
            createdWallet,
            transferAddress,
            stakeStateAfterUnbond,
            withdrawAmount,
            withdrawUnbondedTxId,
        );
    });
});

const setupTestEnv = async (walletRpc: WalletRpc) => {
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

const waitForStakedState = async (
    stakingAddress: string,
    partialStakedState: {
        bonded?: string;
        unbonded?: string;
    },
    walletRpc: WalletRpc,
    maxTrials = 15,
) => {
    let trial = 1;
    let stakedState: RPCStakedState;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (trial === maxTrials) {
            throw new Error(
                `Staked state mismatch after exceeding trials: Expected: ${JSON.stringify(
                    partialStakedState,
                )})`,
            );
        }
        // eslint-disable-next-line no-await-in-loop
        stakedState = await walletRpc.request('staking_state', stakingAddress);
        if (
            partialStakedState.bonded &&
            stakedState.bonded !== partialStakedState.bonded
        ) {
            // eslint-disable-next-line no-console
            console.log(
                `Waiting for Bonded amount (Expected: ${partialStakedState.bonded} Actual: ${stakedState.bonded})`,
            );
            trial += 1;
            // eslint-disable-next-line no-await-in-loop
            await sleep(1000);
            // eslint-disable-next-line no-continue
            continue;
        }
        if (
            partialStakedState.unbonded &&
            stakedState.unbonded !== partialStakedState.unbonded
        ) {
            // eslint-disable-next-line no-console
            console.log(
                `Waiting for Unbonded amount (Expected: ${partialStakedState.unbonded} Actual: ${stakedState.unbonded})`,
            );
            trial += 1;
            // eslint-disable-next-line no-await-in-loop
            await sleep(1000);
            // eslint-disable-next-line no-continue
            continue;
        }

        break;
    }
};

const assertDepositShouldSucceed = async (
    walletRpc: WalletRpc,
    stakingAddress: string,
    depositAmount: string,
): Promise<{
    stakeStateAfterDeposit: RPCStakedState;
    actualBonded: BigNumber;
}> => {
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
    return { stakeStateAfterDeposit, actualBonded };
};

const assertUnbondShouldSucceed = async (
    actualBonded: BigNumber,
    unbondAmount: string,
    stakingAddress: string,
    walletRpc: WalletRpc,
) => {
    const remainingBonded = actualBonded.minus(unbondAmount).toString(10);
    await waitForStakedState(
        stakingAddress,
        {
            unbonded: unbondAmount,
        },
        walletRpc,
    );
    const stakeStateAfterUnbond = parseStakedStateFromRPC(
        await walletRpc.request('staking_state', stakingAddress),
    );
    const bondedFromUnbond = stakeStateAfterUnbond.bonded;
    expect(bondedFromUnbond.isLessThan(remainingBonded)).to.eq(
        true,
        'Unbond transaction should be charged with fee',
    );
    expect(stakeStateAfterUnbond.unbonded.toString(10)).to.eq(unbondAmount);
    return { stakeStateAfterUnbond, bondedFromUnbond };
};

const assertWithdrawShouldSucceed = async (
    stakingAddress: string,
    bondedFromUnbond: BigNumber,
    walletRpc: WalletRpc,
    createdWallet: WalletRequest,
    transferAddress: string,
    stakeStateAfterUnbond: cro.StakedState,
    withdrawAmount: string,
    withdrawUnbondedTxId: string,
) => {
    await waitForStakedState(
        stakingAddress,
        {
            bonded: bondedFromUnbond.toString(10),
            unbonded: '0',
        },
        walletRpc,
    );
    const stakeStateAfterWithdrew: RPCStakedState = await walletRpc.request(
        'staking_state',
        stakingAddress,
    );
    expect(stakeStateAfterWithdrew.bonded).to.eq(bondedFromUnbond.toString(10));
    expect(stakeStateAfterWithdrew.unbonded).to.eq('0');

    await walletRpc.sync(createdWallet);
    await sleep(5000);

    const offset = 0;
    const limit = 100;
    const reversed = false;
    const transactions = await walletRpc.request('wallet_transactions', [
        createdWallet,
        offset,
        limit,
        reversed,
    ]);
    expect(transactions.length).to.eq(
        2,
        'wallet should have one faucet transaction and one withdraw transaction',
    );
    expectTransactionShouldEq(
        {
            kind: TransactionChangeKind.Incoming,
            outputs: [
                {
                    address: transferAddress,
                    validFrom: stakeStateAfterUnbond.unbondedFrom,
                    value: withdrawAmount,
                },
            ],
            txId: withdrawUnbondedTxId,
            value: withdrawAmount,
        },
        transactions[1],
    );
};
