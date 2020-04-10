import 'mocha';
import * as cro from '../../lib/src';
import { newTendermintRPC, newWalletRPC, WalletRequest } from '../common/utils';
import { TendermintRpc } from '../common/tendermint-rpc';
import { WalletRpc } from '../common/wallet-rpc';

const TX_TENDERMINT_ADDRESS = process.env.TENDERMINT_RPC_PORT
    ? `ws://127.0.0.1:${process.env.TENDERMINT_RPC_PORT}/websocket`
    : 'ws://127.0.0.1:26657/websocket';
const CHAIN_HEX_ID = process.env.CHAIN_HEX_ID || 'AB';

describe('Transfer Transaction', () => {
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

    // eslint-disable-next-line func-names
    it('can create Transfer transaction on Devnet using Tendermint WebSocket RPC', async function () {
        this.timeout(60000);

        const keyPair = cro.KeyPair.generateRandom();

        const viewKey = cro.KeyPair.generateRandom();

        const transferAddress = cro.address.transfer({
            keyPair,
            network: cro.network.Devnet({
                chainHexId: CHAIN_HEX_ID,
            }),
        });

        const utxo = await walletRpc.faucet(defaultWallet, {
            toAddress: transferAddress,
            value: cro.utils.toBigNumber('10000000'),
            viewKeys: [viewKey.publicKey!],
        });
        const utxo2 = await walletRpc.faucet(defaultWallet, {
            toAddress: transferAddress,
            value: cro.utils.toBigNumber('20000000'),
            viewKeys: [viewKey.publicKey!],
        });

        const builder = new cro.TransferTransactionBuilder({
            network: cro.network.Devnet({
                chainHexId: CHAIN_HEX_ID,
            }),
            feeConfig: {
                algorithm: cro.fee.FeeAlgorithm.LinearFee,
                constant: cro.utils.toBigNumber(1000),
                coefficient: cro.utils.toBigNumber(1001),
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
                value: cro.utils.toBigNumber(25000000),
            })
            .addViewKey(viewKey.publicKey!);

        builder.signInput(0, keyPair);
        builder.signInput(1, keyPair);

        const hex = builder.toHex(TX_TENDERMINT_ADDRESS);
        await tendermintRpc.broadcastTxCommit(hex.toString('base64'));

        const txId = builder.txId();
        await tendermintRpc.waitTxIdConfirmation(txId);
    });

    // eslint-disable-next-line func-names
    it('can create Transfer transaction on Devnet using Tendermint HTTP RPC', async function () {
        this.timeout(60000);

        const keyPair = cro.KeyPair.generateRandom();

        const viewKey = cro.KeyPair.generateRandom();

        const transferAddress = cro.address.transfer({
            keyPair,
            network: cro.network.Devnet({
                chainHexId: CHAIN_HEX_ID,
            }),
        });

        const utxo = await walletRpc.faucet(defaultWallet, {
            toAddress: transferAddress,
            value: cro.utils.toBigNumber(10000000),
            viewKeys: [viewKey.publicKey!],
        });
        const utxo2 = await walletRpc.faucet(defaultWallet, {
            toAddress: transferAddress,
            value: cro.utils.toBigNumber(20000000),
            viewKeys: [viewKey.publicKey!],
        });

        const builder = new cro.TransferTransactionBuilder({
            network: cro.network.Devnet({
                chainHexId: CHAIN_HEX_ID,
            }),
            feeConfig: {
                algorithm: cro.fee.FeeAlgorithm.LinearFee,
                constant: cro.utils.toBigNumber(1000),
                coefficient: cro.utils.toBigNumber(1001),
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
                value: cro.utils.toBigNumber(25000000),
            })
            .addViewKey(viewKey.publicKey!);

        builder.signInput(0, keyPair);
        builder.signInput(1, keyPair);

        const hex = builder.toHex(TX_TENDERMINT_ADDRESS);
        await tendermintRpc.broadcastTxCommit(hex.toString('base64'));

        const txId = builder.txId();
        await tendermintRpc.waitTxIdConfirmation(txId);
    });

    // eslint-disable-next-line func-names
    it('can spend UTXO of transfer address derived from HD wallet', async function () {
        this.timeout(60000);

        const mnemonic = cro.HDWallet.generateMnemonic();
        const wallet = cro.HDWallet.fromMnemonic(mnemonic);

        const viewKey = wallet.derive("m/44'/2'/0'/0/0");

        const fromTransferAddressKeyPair = wallet.derive("m/44'/0'/0'/0/0");
        const fromTransferAddress = cro.address.transfer({
            keyPair: fromTransferAddressKeyPair,
            network: cro.network.Devnet({
                chainHexId: CHAIN_HEX_ID,
            }),
        });

        const toTransferAddressKeyPair = wallet.derive("m/44'/0'/0'/0/0");
        const toTransferAddress = cro.address.transfer({
            keyPair: toTransferAddressKeyPair,
            network: cro.network.Devnet({
                chainHexId: CHAIN_HEX_ID,
            }),
        });

        const utxo = await walletRpc.faucet(defaultWallet, {
            toAddress: fromTransferAddress,
            value: cro.utils.toBigNumber('30000000'),
            viewKeys: [viewKey.publicKey!],
        });

        const builder = new cro.TransferTransactionBuilder({
            network: cro.network.Devnet({
                chainHexId: CHAIN_HEX_ID,
            }),
            feeConfig: {
                algorithm: cro.fee.FeeAlgorithm.LinearFee,
                constant: cro.utils.toBigNumber(1000),
                coefficient: cro.utils.toBigNumber(1001),
            },
        });

        builder
            .addInput({
                prevTxId: utxo.txId,
                prevIndex: utxo.index,
                prevOutput: {
                    address: fromTransferAddress,
                    value: utxo.value,
                },
            })
            .addOutput({
                address: toTransferAddress,
                value: cro.utils.toBigNumber('25000000'),
            })
            .addViewKey(viewKey.publicKey!);

        builder.signInput(0, fromTransferAddressKeyPair);

        const hex = builder.toHex(TX_TENDERMINT_ADDRESS);
        await tendermintRpc.broadcastTxCommit(hex.toString('base64'));

        const txId = builder.txId();
        await tendermintRpc.waitTxIdConfirmation(txId);
    });
});
