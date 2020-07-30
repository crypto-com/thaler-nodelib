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
    JSONPrettyStringify,
} from '../common/utils';
import { TendermintRpc } from '../common/tendermint-rpc';
import { WalletRpc } from '../common/wallet-rpc';
import {
    expectTransactionShouldEq,
    TransactionChangeKind,
} from '../common/assertion';
import { RPCStakedState, parseStakedStateFromRPC } from '../common/staking';
import { DEVNET_TX_TENDERMINT_ADDRESS, DEVNET } from '../common/constant';

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
    it('can create deposit, unbond and withdraw stake', async function () {
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
        // The actual amount deposited will be deducted with a fee
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

        const {
            stakeStateAfterDeposit,
            actualBonded,
            // eslint-disable-next-line no-use-before-define
        } = await assertDepositShouldSucceed(
            createdWallet,
            walletRpc,
            stakingAddress,
            depositTxId,
            depositAmount,
        );

        // Unbond 50000000 basic unit from staking account
        console.log('[Log] Unbonding stake from staking account');
        const unbondAmount = '50000000';
        const unbondTxBuilder = new cro.transaction.staking.UnbondTransactionBuilder(
            {
                stakingAddress,
                nonce: stakeStateAfterDeposit.nonce,
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
            createdWallet,
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
        const withdrawAllAmount = stakeStateAfterUnbond.unbonded.toString(10);
        const withdrawUnbondedTxBuilder = new cro.transaction.staking.WithdrawUnbondedTransactionBuilder(
            {
                nonce: stakeStateAfterUnbond.nonce,
                network,
            },
        );

        withdrawUnbondedTxBuilder.addViewKey(viewKeyPair.publicKey!);

        // Starting from Crypto.com Chain v0.5.0, transaction fee has to be
        // exact.
        // This is an over-simplified strategy to estimate the fee and include
        // the change. In production system you will need to cover more cases.
        const feeEstimationBuilder = withdrawUnbondedTxBuilder.clone();
        const estimatedFee = feeEstimationBuilder
            .addOutput({
                address: transferAddress,
                value: cro.utils.toBigNumber(withdrawAllAmount),
                validFrom: cro.Timespec.fromSeconds(
                    stakeStateAfterUnbond.unbondedFrom,
                ),
            })
            .estimateFee();

        const withdrawAmount = cro.utils
            .toBigNumber(withdrawAllAmount)
            .minus(estimatedFee);
        const withdrawUnbondedTxHex = withdrawUnbondedTxBuilder
            .addOutput({
                address: transferAddress,
                value: withdrawAmount,
                validFrom: cro.Timespec.fromSeconds(
                    stakeStateAfterUnbond.unbondedFrom,
                ),
            })
            .sign(stakingKeyPair)
            .toHex(DEVNET_TX_TENDERMINT_ADDRESS);
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
            stakeStateAfterUnbond.unbondedFrom,
            withdrawAmount.toString(10),
            withdrawUnbondedTxId,
        );
    });
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

const waitForStakedState = async (
    walletRequest: WalletRequest,
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
        await walletRpc.sync(walletRequest);

        // eslint-disable-next-line no-await-in-loop
        stakedState = await walletRpc.request('staking_state', [
            walletRequest.name,
            stakingAddress,
        ]);
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
    walletRequest: WalletRequest,
    walletRpc: WalletRpc,
    stakingAddress: string,
    depositTxId: string,
    depositAmount: string,
): Promise<{
    stakeStateAfterDeposit: RPCStakedState;
    actualBonded: BigNumber;
}> => {
    await walletRpc.sync(walletRequest);

    const stakeStateAfterDeposit: RPCStakedState = await walletRpc.request(
        'staking_state',
        [walletRequest.name, stakingAddress],
    );
    const actualBonded = new BigNumber(stakeStateAfterDeposit.bonded);
    expect(actualBonded.isGreaterThan('0')).to.eq(true);
    expect(actualBonded.isLessThan(depositAmount)).to.eq(
        true,
        `Deposit amount should be deducted by some fee: Expected: ${depositAmount} - fee, ${JSONPrettyStringify(
            stakeStateAfterDeposit,
        )}`,
    );

    const offset = 0;
    const limit = 100;
    const reversed = false;
    const transactions = await walletRpc.request('wallet_transactions', [
        walletRequest,
        offset,
        limit,
        reversed,
    ]);
    expect(transactions.length).to.eq(
        2,
        `wallet should have one faucet transaction and one deposit transaction: ${JSONPrettyStringify(
            transactions,
        )}`,
    );
    // Deposit transaction amount is 0
    const depositTransactionAmount = '0';
    expectTransactionShouldEq(
        {
            kind: TransactionChangeKind.Outgoing,
            outputs: [],
            txId: depositTxId,
            value: depositTransactionAmount,
        },
        transactions[1],
    );

    return { stakeStateAfterDeposit, actualBonded };
};

const assertUnbondShouldSucceed = async (
    walletRequest: WalletRequest,
    actualBonded: BigNumber,
    unbondAmount: string,
    stakingAddress: string,
    walletRpc: WalletRpc,
) => {
    const remainingBonded = actualBonded.minus(unbondAmount).toString(10);
    await waitForStakedState(
        walletRequest,
        stakingAddress,
        {
            unbonded: unbondAmount,
        },
        walletRpc,
    );
    const stakeStateAfterUnbond = parseStakedStateFromRPC(
        await walletRpc.request('staking_state', [
            walletRequest.name,
            stakingAddress,
        ]),
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
    unbondedFrom: number,
    withdrawAmount: string,
    withdrawUnbondedTxId: string,
) => {
    await waitForStakedState(
        createdWallet,
        stakingAddress,
        {
            bonded: bondedFromUnbond.toString(10),
            unbonded: '0',
        },
        walletRpc,
    );
    const stakeStateAfterWithdrew: RPCStakedState = await walletRpc.request(
        'staking_state',
        [createdWallet.name, stakingAddress],
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
        3,
        `wallet should have one faucet transaction, one deposit transaction and one withdraw transaction: ${JSONPrettyStringify(
            transactions,
        )}`,
    );
    expectTransactionShouldEq(
        {
            kind: TransactionChangeKind.Incoming,
            outputs: [
                {
                    address: transferAddress,
                    validFrom: unbondedFrom,
                    value: withdrawAmount,
                },
            ],
            txId: withdrawUnbondedTxId,
            value: withdrawAmount,
        },
        transactions[2],
    );
};
