import 'mocha';
import BigNumber from 'bignumber.js';
import * as cro from '../../lib/src';
import { FeeAlgorithm } from '../../lib/src/transaction/transfer';
import {
    newWalletRequest,
    newWithFeeTendermintRpc,
    newWithFeeWalletRpc,
    WalletRequest,
} from '../common/utils';
import { TendermintRpc } from '../common/tendermint-rpc';
import { WalletRpc } from '../common/wallet-rpc';

const TX_TENDERMINT_ADDRESS = process.env.TENDERMINT_RPC_PORT
    ? `ws://127.0.0.1:${process.env.TENDERMINT_RPC_PORT}/websocket`
    : 'ws://127.0.0.1:26657/websocket';

describe('Transfer Transaction', () => {
    let tendermintRpc: TendermintRpc;
    let walletRpc: WalletRpc;
    let defaultWallet: WalletRequest;

    before(() => {
        tendermintRpc = newWithFeeTendermintRpc();
        walletRpc = newWithFeeWalletRpc();
        defaultWallet = newWalletRequest(
            'Default',
            process.env.WALLET_PASSPHRASE || '123456',
        );
    });

    // eslint-disable-next-line func-names
    it('can create Transfer transaction on Devnet using Tendermint WebSocket RPC', async function() {
        this.timeout(60000);

        const keyPair = cro.KeyPair.generateRandom();

        const viewKey = cro.KeyPair.generateRandom();

        const transferAddress = cro.address.transfer({
            keyPair,
            network: cro.Network.Devnet,
        });

        const utxo = await walletRpc.transferToAddress(defaultWallet, {
            toAddress: transferAddress,
            value: new BigNumber(10000000),
            viewKeys: [viewKey.publicKey!],
        });
        const utxo2 = await walletRpc.transferToAddress(defaultWallet, {
            toAddress: transferAddress,
            value: new BigNumber(20000000),
            viewKeys: [viewKey.publicKey!],
        });

        const builder = new cro.TransferTransactionBuilder({
            network: cro.Network.Devnet,
            chainId: process.env.CHAIN_HEX_ID || 'AB',
            feeConfig: {
                algorithm: FeeAlgorithm.LinearFee,
                constant: new BigNumber(1000),
                coefficient: new BigNumber(1001),
            },
        });

        builder
            .addInput({
                prevTxId: utxo.txId,
                prevIndex: utxo.index,
                prevOutput: {
                    address: transferAddress,
                    value: utxo.value,
                },
            })
            .addInput({
                prevTxId: utxo2.txId,
                prevIndex: utxo2.index,
                prevOutput: {
                    address: transferAddress,
                    value: utxo2.value,
                },
            })
            .addOutput({
                address: transferAddress,
                value: new BigNumber(25000000),
            })
            .addViewKey(viewKey.publicKey!);

        builder.signInput(0, keyPair);
        builder.signInput(1, keyPair);

        const hex = builder.toHex(TX_TENDERMINT_ADDRESS);

        await tendermintRpc.broadcastTx(hex.toString('base64'));

        const txId = builder.txId();

        await tendermintRpc.waitTxIdConfirmation(txId);
    });

    // eslint-disable-next-line func-names
    it('can create Transfer transaction on Devnet using Tendermint HTTP RPC', async function() {
        this.timeout(60000);

        const keyPair = cro.KeyPair.generateRandom();

        const viewKey = cro.KeyPair.generateRandom();

        const transferAddress = cro.address.transfer({
            keyPair,
            network: cro.Network.Devnet,
        });

        const utxo = await walletRpc.transferToAddress(defaultWallet, {
            toAddress: transferAddress,
            value: new BigNumber(10000000),
            viewKeys: [viewKey.publicKey!],
        });
        const utxo2 = await walletRpc.transferToAddress(defaultWallet, {
            toAddress: transferAddress,
            value: new BigNumber(20000000),
            viewKeys: [viewKey.publicKey!],
        });

        const builder = new cro.TransferTransactionBuilder({
            network: cro.Network.Devnet,
            chainId: process.env.CHAIN_HEX_ID || 'AB',
            feeConfig: {
                algorithm: FeeAlgorithm.LinearFee,
                constant: new BigNumber(1000),
                coefficient: new BigNumber(1001),
            },
        });

        builder
            .addInput({
                prevTxId: utxo.txId,
                prevIndex: utxo.index,
                prevOutput: {
                    address: transferAddress,
                    value: utxo.value,
                },
            })
            .addInput({
                prevTxId: utxo2.txId,
                prevIndex: utxo2.index,
                prevOutput: {
                    address: transferAddress,
                    value: utxo2.value,
                },
            })
            .addOutput({
                address: transferAddress,
                value: new BigNumber(25000000),
            })
            .addViewKey(viewKey.publicKey!);

        builder.signInput(0, keyPair);
        builder.signInput(1, keyPair);

        const hex = builder.toHex(TX_TENDERMINT_ADDRESS);

        await tendermintRpc.broadcastTx(hex.toString('base64'));

        const txId = builder.txId();

        await tendermintRpc.waitTxIdConfirmation(txId);
    });
});
