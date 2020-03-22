import 'mocha';
import { expect } from 'chai';

import * as cro from '../../lib/src';
import { newTendermintRPC, newWalletRPC, WalletRequest } from '../common/utils';
import { TendermintRpc } from '../common/tendermint-rpc';
import { WalletRpc } from '../common/wallet-rpc';

const TENDERMINT_ADDRESS = process.env.TENDERMINT_RPC_PORT
    ? `ws://127.0.0.1:${process.env.TENDERMINT_RPC_PORT}/websocket`
    : 'ws://127.0.0.1:26657/websocket';
const CHAIN_HEX_ID = process.env.CHAIN_HEX_ID || 'AB';

describe('Staking Transaction', () => {
    let tendermintRpc: TendermintRpc;
    let walletRpc: WalletRpc;
    let defaultWallet: WalletRequest;

    async function createWallet(viewKey: cro.KeyPair): Promise<WalletRequest> {
        const walletName = Date.now().toString();
        const walletAuthRequest = {
            name: walletName,
            passphrase: '123456',
        };
        await walletRpc.request('wallet_restoreBasic', [
            walletAuthRequest,
            viewKey.privateKey,
        ]);
        const walletEnckey = await walletRpc.getAuthToken(walletAuthRequest);

        return {
            name: walletName,
            enckey: walletEnckey,
        };
    }

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
    it('can create deposit, unbond and withdraw stake using Tendermint WebSocket RPC', async function() {
        this.timeout(60000);

        const transferKeyPair = cro.KeyPair.generateRandom();
        const stakingKeyPair = cro.KeyPair.generateRandom();

        const viewKey = cro.KeyPair.generateRandom();

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

        const createdWallet = await createWallet(viewKey);

        // Deposit 100000000 basic unit to staking account
        const depositAmount = '100000000';
        const utxo = await walletRpc.faucet(defaultWallet, {
            toAddress: transferAddress,
            value: cro.utils.toBigNumber(depositAmount),
            viewKeys: [viewKey.publicKey!],
        });

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
        await tendermintRpc.broadcastTx(depositTxHex.toString('base64'));

        const depositTxId = depositTxBuilder.txId();
        await tendermintRpc.waitTxIdConfirmation(depositTxId);

        const stakeStateAfterDeposit = await walletRpc.request(
            'staking_state',
            stakingAddress,
        );

        const actualBonded: cro.utils.BigNumber = stakeStateAfterDeposit.bonded;
        expect(actualBonded.isGreaterThan('0')).to.eq(true);
        expect(actualBonded.isLessThan(depositAmount)).to.eq(
            true,
            'Deposit transaction should be charged with fee',
        );

        // Unbond 50000000 basic unit from staking account
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
        await tendermintRpc.broadcastTx(unbondTxHex.toString('base64'));

        const unbondTxId = depositTxBuilder.txId();
        await tendermintRpc.waitTxIdConfirmation(unbondTxId);

        const stakeStateAfterUnbond = await walletRpc.request(
            'staking_state',
            stakingAddress,
        );
        console.log(1);

        const remainingBonded = actualBonded.minus(unbondAmount).toString(10);
        expect(stakeStateAfterUnbond.bonded.toString(10)).to.eq(
            remainingBonded,
        );
        expect(stakeStateAfterUnbond.unbonded.toString(10)).to.eq(unbondAmount);

        // Withdraw 25000000 basic unit to transfer address
        const withdrawAmount = '25000000';
        const feeConfig: cro.fee.FeeConfig = {
            algorithm: cro.fee.FeeAlgorithm.LinearFee,
            constant: cro.utils.toBigNumber('1100'),
            coefficient: cro.utils.toBigNumber('1250'),
        };
        console.log(2);
        const withdrawUnbondedTxBuilder = new cro.transaction.staking.WithdrawUnbondedTransactionBuilder(
            {
                stakedState: cro.parseStakedStateFromNative(
                    stakeStateAfterUnbond,
                ),
                feeConfig,
                network,
            },
        );
        console.log(3);

        const withdrawUnbondedTxHex = withdrawUnbondedTxBuilder
            .addOutput({
                address: transferAddress,
                value: cro.utils.toBigNumber(withdrawAmount),
            })
            .addViewKey(viewKey.publicKey!)
            .sign(stakingKeyPair)
            .toHex(TENDERMINT_ADDRESS);
        await tendermintRpc.broadcastTx(
            withdrawUnbondedTxHex.toString('base64'),
        );
        console.log(4);

        const withdrawUnbondedTxId = withdrawUnbondedTxBuilder.txId();
        await tendermintRpc.waitTxIdConfirmation(withdrawUnbondedTxId);

        const stakeStateAfterWithdrew = await walletRpc.request(
            'staking_state',
            stakingAddress,
        );
        expect(stakeStateAfterWithdrew.bonded.toString(10)).to.eq(
            remainingBonded,
        );
        expect(stakeStateAfterWithdrew.unbonded.toString(10)).to.eq('0');

        console.log(5);
        await walletRpc.sync(createdWallet);
        console.log(6);
        const transactions = await walletRpc.request('wallet_transactions', [
            createdWallet,
        ]);
        expect(transactions.length).to.eq(1);
        console.log(transactions); // eslint-disable-line no-console
    });
});
