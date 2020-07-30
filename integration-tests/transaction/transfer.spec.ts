import 'mocha';
import * as cro from '../../lib/src';
import { newTendermintRPC, newWalletRPC, WalletRequest } from '../common/utils';
import { TendermintRpc } from '../common/tendermint-rpc';
import { WalletRpc } from '../common/wallet-rpc';
import { DEVNET_TX_TENDERMINT_ADDRESS, DEVNET } from '../common/constant';

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
            network: DEVNET,
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
            network: DEVNET,
        });

        builder
            .addInput({
                prevTxId: utxo.txId,
                prevIndex: utxo.index,
                prevOutput: {
                    address: transferAddress,
                    value: utxo.value,
                },
                addressParams: cro.address.SINGLE_SIGN_ADDRESS,
            })
            .addInput({
                prevTxId: utxo2.txId,
                prevIndex: utxo2.index,
                prevOutput: {
                    address: transferAddress,
                    value: utxo2.value,
                },
                addressParams: cro.address.SINGLE_SIGN_ADDRESS,
            })
            .addOutput({
                address: transferAddress,
                value: cro.utils.toBigNumber('25000000'),
            })
            .addViewKey(viewKey.publicKey!);

        // Starting from Crypto.com Chain v0.5.0, transaction fee has to be
        // exact.
        // This is an over-simplified strategy to estimate the fee and include
        // the change. In production system you will need to cover more cases.
        const noFeeChange = '5000000';
        const feeEstimationBuilder = builder.clone();
        feeEstimationBuilder.addOutput({
            address: transferAddress,
            value: cro.utils.toBigNumber(noFeeChange),
        });
        const estimatedFee = feeEstimationBuilder.estimateFee();

        const changeAmount = cro.utils
            .toBigNumber(noFeeChange)
            .minus(estimatedFee);
        builder.addOutput({
            address: transferAddress,
            value: changeAmount,
        });

        builder.signInput(0, keyPair);
        builder.signInput(1, keyPair);

        const hex = builder.toHex(DEVNET_TX_TENDERMINT_ADDRESS);
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
            network: DEVNET,
        });

        const toTransferAddressKeyPair = wallet.derive("m/44'/0'/0'/0/0");
        const toTransferAddress = cro.address.transfer({
            keyPair: toTransferAddressKeyPair,
            network: DEVNET,
        });

        const utxo = await walletRpc.faucet(defaultWallet, {
            toAddress: fromTransferAddress,
            value: cro.utils.toBigNumber('30000000'),
            viewKeys: [viewKey.publicKey!],
        });

        const builder = new cro.TransferTransactionBuilder({
            network: DEVNET,
        });

        builder
            .addInput({
                prevTxId: utxo.txId,
                prevIndex: utxo.index,
                prevOutput: {
                    address: fromTransferAddress,
                    value: utxo.value,
                },
                addressParams: cro.address.SINGLE_SIGN_ADDRESS,
            })
            .addOutput({
                address: toTransferAddress,
                value: cro.utils.toBigNumber('25000000'),
            })
            .addViewKey(viewKey.publicKey!);
        const noFeeChange = '5000000';
        const feeEstimationBuilder = builder.clone();
        feeEstimationBuilder.addOutput({
            address: toTransferAddress,
            value: cro.utils.toBigNumber(noFeeChange),
        });
        const estimatedFee = feeEstimationBuilder.estimateFee();

        const changeAmount = cro.utils
            .toBigNumber(noFeeChange)
            .minus(estimatedFee);
        builder.addOutput({
            address: toTransferAddress,
            value: changeAmount,
        });

        builder.signInput(0, fromTransferAddressKeyPair);

        const hex = builder.toHex(DEVNET_TX_TENDERMINT_ADDRESS);
        await tendermintRpc.broadcastTxCommit(hex.toString('base64'));

        const txId = builder.txId();
        await tendermintRpc.waitTxIdConfirmation(txId);
    });
});
