import 'mocha';
import { expect } from 'chai';
import * as cro from '../../lib/src';

import { newTendermintRPC, newWalletRPC, WalletRequest } from '../common/utils';
import { UTXO } from '../common/wallet-rpc';
import { DEVNET_TX_TENDERMINT_ADDRESS, DEVNET } from '../common/constant';
import { PublicKey } from '../../lib/src/types';

// global RPC instances
const walletRpc = newWalletRPC();
const tendermintRpc = newTendermintRPC();

// amounts for testing
const FEE_ESTIMATION_AMOUNT = '5000000';
const CUSTOMER_INIT_BALANCE = '30000000';
const MERCHANT_INIT_BALANCE = '30000000';
const CUSTOMER_PAYMENT = '10000000';
const CUSTOMER_DEPOSIT = '10000000';

describe('MultiSig flow (2-of-3):', () => {
    let customer: MutilSigTestWallet,
        merchant: MutilSigTestWallet,
        escrow: MutilSigTestWallet;
    let customerTxId: string;

    before(async () => {
        // setupTestEnv will create the three multisig parties' wallets
        // and prepare the inital fund for customer and merchant
        const t = await setupTestEnv();
        customer = t.customer;
        merchant = t.merchant;
        escrow = t.escrow;
    });

    // eslint-disable-next-line func-names
    it('can complete 2-of-3 MultiSig normal flow of PoGSD between customer and merchant', async function () {
        /// 1. create multisig addresses for both customer and merchant
        let customerMultiSigBuilder = new cro.MultiSigBuilder(
            customer.transferKeyPair,
            [
                merchant.transferKeyPair.publicKey!,
                escrow.transferKeyPair.publicKey!,
            ],
            cro.network.NetworkEnum.Devnet,
            2, // require at least 2 signer out of 3
        );
        const customerMultiSigAddr = customerMultiSigBuilder.createMultiSigAddress();

        let merchantMultiSigBuilder = new cro.MultiSigBuilder(
            merchant.transferKeyPair,
            [
                customer.transferKeyPair.publicKey!,
                escrow.transferKeyPair.publicKey!,
            ],
            cro.network.NetworkEnum.Devnet,
            2, // require at least 2 signer out of 3
        );
        const merchantMultiSigAddr = merchantMultiSigBuilder.createMultiSigAddress();

        // two multisig addresses should be the same
        expect(customerMultiSigAddr).to.equal(merchantMultiSigAddr);
        console.log(
            '[LOG] successfully created MultiSig Address:',
            customerMultiSigAddr,
        );

        /// 2. customer send payment and deposit to multisig address
        const totalAmount = (
            parseInt(CUSTOMER_PAYMENT) + parseInt(CUSTOMER_DEPOSIT)
        ).toString();
        try {
            customerTxId = await sendFundsFromCustomerToMultiSigAddress(
                customer,
                [
                    merchant.viewKeyPair.publicKey!,
                    escrow.viewKeyPair.publicKey!,
                ],
                customerMultiSigAddr,
                totalAmount,
            );
        } catch (error) {
            console.error('ERR sendFundsFromCustomerToMultiSigAddress:', error);
        }
        console.log(
            '[LOG] customer successfully sent funds to MultiSig address, txid:',
            customerTxId,
        );

        /// 3. NORMAL FLOW: the customer receives goods offline and the order could be closed normally.
        ///    A tx of sending payment to merchant and sending deposit back to customer will be created;
        ///    then the raw tx will be signed by both customer and merchant to make the agreement.
        let rawTxId: string;
        try {
            rawTxId = await createRawTxForMultiSig(
                customerTxId,
                merchant,
                CUSTOMER_PAYMENT, // merchat receive payment
                customer,
                CUSTOMER_DEPOSIT, // customer get back deposit
                [
                    customer.viewKeyPair.publicKey!,
                    merchant.viewKeyPair.publicKey!,
                    escrow.viewKeyPair.publicKey!,
                ],
            );
        } catch (error) {
            console.error('ERR createRawTxForMultiSig:', error);
        }
        console.log('[LOG] construct rawTx successfully:', rawTxId);

        /// 4. co-sign the tx together between customer and merchant
        /// 4.1 create customer and merchant multiSig session
        ///     noticed that session state keeps updated in the Builder instance
        customerMultiSigBuilder.createNewSession(rawTxId);
        merchantMultiSigBuilder.createNewSession(rawTxId);

        /// 4.2 generate nonce commitment
        let customerNC = customerMultiSigBuilder.generateNonceCommitment();
        let merchantNC = merchantMultiSigBuilder.generateNonceCommitment();

        /// 4.3 add nonce commitment
        customerMultiSigBuilder.addNonceCommitment(
            merchant.transferKeyPair.publicKey!,
            merchantNC,
        );
        merchantMultiSigBuilder.addNonceCommitment(
            customer.transferKeyPair.publicKey,
            customerNC,
        );

        /// 4.4 generate nonce
        let customerNonce = customerMultiSigBuilder.generateNonce();
        let merchantNonce = merchantMultiSigBuilder.generateNonce();

        /// 4.5 add nonce
        customerMultiSigBuilder.addNonce(
            merchant.transferKeyPair.publicKey!,
            merchantNonce,
        );
        merchantMultiSigBuilder.addNonce(
            customer.transferKeyPair.publicKey,
            customerNonce,
        );

        /// 4.6 partial sign
        let customerPS = customerMultiSigBuilder.partialSign();
        let merchantPS = merchantMultiSigBuilder.partialSign();

        /// 4.7 add partial signature
        customerMultiSigBuilder.addPartialSignature(
            merchant.transferKeyPair.publicKey!,
            merchantPS,
        );
        merchantMultiSigBuilder.addPartialSignature(
            customer.transferKeyPair.publicKey,
            customerPS,
        );

        const customerSig = customerMultiSigBuilder.sign();
        const merchantSig = merchantMultiSigBuilder.sign();

        // two final signature should be the same
        expect(customerSig).to.equal(merchantSig);

        // broadcast the signed tx
        try {
            await tendermintRpc.broadcastTx(customerSig!.toString('hex'));
        } catch (error) {
            console.error('ERR broadcast the final signature:', error);
        }
        console.log( '[LOG] complete normal flow of 2 out of 3 multiSig successfully');
    });
});

/**
 * Create raw tx for multiSig flow of sending back funds to different parties
 * @param customerTxId txId of customer sending fund to multiSig addr
 * @param firstParty one of the party base on senario
 * @param firstPartyAmount the amount of fund getting back for the 1st party
 * @param secondParty the other party base on senario, normally secondParty is customer
 * @param secondPartyAmount the amount of fund getting back for the 2nd party
 * @param viewKeys viewkeys of all parties including escrow
 * @return txId string of raw Tx ID that waiting for signing by involved signers
 */
const createRawTxForMultiSig = async (
    customerTxId: string,
    firstParty: MutilSigTestWallet,
    firstPartyAmount: string,
    secondParty: MutilSigTestWallet, // normally it's customer
    secondPartyAmount: string,
    viewKeys: Array<PublicKey>,
) => {
    // clientRPC transaction_createRaw params
    const params = [
        [
            {
                id: customerTxId,
                index: 0,
            },
        ],
        [
            {
                address: firstParty.transferAddress,
                value: firstPartyAmount,
            },
            {
                address: secondParty.transferAddress,
                value: secondPartyAmount,
            },
        ],
        viewKeys,
    ];

    let txId;
    try {
        const data = await walletRpc.request('transaction_createRaw', params);
        txId = data['result']['tx_id'];
    } catch (error) {
        console.error('ERR transaction_createRaw:', error);
    }

    return txId;
};

/**
 * prepare the test env for multisig flow
 */
const setupTestEnv = async () => {
    const customer = await createWallet('customer');
    const merchant = await createWallet('merchant');
    const escrow = await createWallet('escrow');

    await getFundsFromFaucet(customer, CUSTOMER_INIT_BALANCE);
    await getFundsFromFaucet(merchant, MERCHANT_INIT_BALANCE);

    return {
        customer,
        merchant,
        escrow,
    };
};

type MutilSigTestWallet = {
    transferKeyPair: cro.KeyPair;
    transferAddress: string; // TODO: TransferAddress Type
    viewKeyPair: cro.KeyPair;
    wallet: WalletRequest;
};
/**
 * create wallet and keys for multisig parties
 * @param name: wallet name string
 * @return MutilSigTestWallet instance
 */
const createWallet = async (name: string): Promise<MutilSigTestWallet> => {
    let walletRequest;
    const transferKeyPair = cro.KeyPair.generateRandom();
    const viewKeyPair = cro.KeyPair.generateRandom();
    const network = DEVNET;
    const transferAddress = cro.address.transfer({
        keyPair: transferKeyPair,
        network,
    });
    const walletAuthRequest = {
        name,
        passphrase: '123456',
    };

    try {
        await walletRpc.request('wallet_restoreBasic', [
            walletAuthRequest,
            viewKeyPair.privateKey!.toString('hex'),
        ]);
        const walletEnckey = await walletRpc.getAuthToken(walletAuthRequest);
        walletRequest = {
            name,
            enckey: walletEnckey,
        };
    } catch (error) {
        console.error('ERR wallet_restoreBasic :', error);
    }

    try {
        await walletRpc.request('wallet_createWatchTransferAddress', [
            walletRequest,
            transferKeyPair.publicKey!.toString('hex'),
        ]);
    } catch (error) {
        console.error('ERR wallet_createWatchTransferAddress:', error);
    }

    return {
        transferKeyPair,
        transferAddress,
        viewKeyPair,
        wallet: walletRequest,
    };
};

/**
 * Fund the target wallet from faucet
 * @param wallet target wallet to be funded
 * @param amount total amount get from faucet
 * @return txId success txId
 */
const getFundsFromFaucet = async (
    wallet: MutilSigTestWallet,
    amount: string,
) => {
    if (
        cro.utils
            .toBigNumber(amount)
            .minus(cro.utils.toBigNumber(FEE_ESTIMATION_AMOUNT))
            .isLessThanOrEqualTo(0)
    ) {
        console.error(
            'ERR: the amount to get from faucet maybe samller than fee',
        );
        return;
    }

    // prepare default wallet to get funds from
    const walletAuthRequest = {
        name: 'Default',
        passphrase: process.env.WALLET_PASSPHRASE || '123456',
    };
    const enckey = await walletRpc.getAuthToken(walletAuthRequest);
    const defaultWallet: WalletRequest = {
        name: 'Default',
        enckey,
    };

    // construct utxo sent from default wallet to target wallet
    let utxo: UTXO;
    try {
        utxo = await walletRpc.faucet(defaultWallet, {
            toAddress: wallet.transferAddress,
            value: cro.utils.toBigNumber(amount),
            viewKeys: [wallet.viewKeyPair.publicKey!],
        });
    } catch (error) {
        console.error('ERR create utxo:', error);
    }

    const input = {
        prevTxId: utxo.txId,
        prevIndex: utxo.index,
        prevOutput: {
            address: wallet.transferAddress,
            value: utxo.value,
        },
        addressParams: cro.address.SINGLE_SIGN_ADDRESS,
    };
    const output = {
        address: wallet.transferAddress,
        value: cro.utils
            .toBigNumber(amount)
            .minus(cro.utils.toBigNumber(FEE_ESTIMATION_AMOUNT)),
    };

    const txId = await sendAndBroadcastSingleInputTX(input, output, wallet);
    return txId;
};

/**
 * Send the payment and stake from cutomer to multisig address
 * @param from  customer's wallet
 * @param externalViewKeys  other parties' viewkeys
 * @param multiSigAddr  destination multisig address
 * @param amount  payment + stake
 * @return txId success txId
 */
const sendFundsFromCustomerToMultiSigAddress = async (
    from: MutilSigTestWallet,
    externalViewKeys: Array<PublicKey>,
    multiSigAddr: string, // TODO: MultiSigAddress Type (same with TransferAddress type)
    amount: string,
): Promise<string> => {
    if (
        cro.utils
            .toBigNumber(amount)
            .minus(cro.utils.toBigNumber(FEE_ESTIMATION_AMOUNT))
            .isLessThanOrEqualTo(0)
    ) {
        console.error('ERR: the amount maybe samller than fee');
        return;
    }

    let utxo: UTXO;
    try {
        utxo = await walletRpc.faucet(from.wallet, {
            toAddress: multiSigAddr,
            value: cro.utils.toBigNumber(amount),
            viewKeys: [from.viewKeyPair.publicKey!].concat(externalViewKeys),
        });
    } catch (error) {
        console.error('ERR create send to multisig address utxo:', error);
    }

    const input: cro.Input = {
        prevTxId: utxo.txId,
        prevIndex: utxo.index,
        prevOutput: {
            address: from.transferAddress,
            value: utxo.value,
        },
        addressParams: cro.address.SINGLE_SIGN_ADDRESS,
    };
    const output: cro.Output = {
        address: from.transferAddress,
        value: cro.utils
            .toBigNumber(amount)
            .minus(cro.utils.toBigNumber(FEE_ESTIMATION_AMOUNT)),
    };

    const txId = await sendAndBroadcastSingleInputTX(input, output, from);
    return txId;
};

/**
 * sendAndBroadcastSingleInputTX wrap the flow to handle estimated fee
 * and broadcast the TX. The TX will be typically 1 input (1 UTXO) and
 * 2 outputs (part of total amount and remaining amount deducted the fee)
 * @param input single TX input
 * @param output single TX output
 * @param wallet target MultiSigTestWallt providing transferAddress,
 *        viewKeyPair and transferKeyPair
 * @return txId success txId
 */
const sendAndBroadcastSingleInputTX = async (
    input: cro.Input,
    output: cro.Output,
    wallet: MutilSigTestWallet,
): Promise<string> => {
    // feeEstimationAmount is to calculate the current fee by
    // sending tx to tx-query, the value of it could be any number
    // that larger than the fee and smaller than the total amount
    const feeEstimationPartialAmount = cro.utils.toBigNumber(
        FEE_ESTIMATION_AMOUNT,
    );

    const builder = new cro.TransferTransactionBuilder({
        network: DEVNET,
    });

    // prepare the initial transaction builder
    builder
        .addInput(input)
        .addOutput(output)
        .addViewKey(wallet.viewKeyPair.publicKey!);

    // get the fee based on current input and outputs
    // Notice: fee is calculated as (constant + coefficient * tx_size)
    // the number of inputs and outputs in the tx determines the fee
    const feeEstimationBuilder = builder.clone(); // clone the initial inputs and outputs
    feeEstimationBuilder.addOutput({
        address: wallet.transferAddress,
        value: feeEstimationPartialAmount,
    });
    const estimatedFee = feeEstimationBuilder.estimateFee();
    const changeAmount = feeEstimationPartialAmount.minus(estimatedFee);

    // add the change output as the 2nd output
    builder.addOutput({
        address: wallet.transferAddress,
        value: changeAmount,
    });

    // sign the input and get the builder hex
    builder.signInput(0, wallet.transferKeyPair);
    const hex = builder.toHex(DEVNET_TX_TENDERMINT_ADDRESS);

    // broadcast tx
    try {
        await tendermintRpc.broadcastTxCommit(hex.toString('base64'));
    } catch (error) {
        console.error('ERR broadcastTxCommit:', error);
    }

    // get the txId and wait confirmation
    const txId = builder.txId();
    try {
        await tendermintRpc.waitTxIdConfirmation(txId);

        return txId;
    } catch (error) {
        console.error('ERR waitTxIdConfirmation:', error);
    }
};
