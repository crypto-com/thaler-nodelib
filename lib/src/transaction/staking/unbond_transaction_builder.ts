import BigNumber from 'bignumber.js';
import ow from 'ow';

import {
    UnbondTransactionBuilderOptions,
    owUnbondTransactionBuilderOptions,
} from './types';
import { TransactionBuilder } from '../transaction_builder';
import { KeyPair } from '../../key_pair';
import { owKeyPair } from '../../key_pair/types';

const native = require('../../../../native');

/**
 * A builder for building unbond transaction
 */
export class UnbondTransactionBuilder extends TransactionBuilder {
    private stakingAddress!: string;

    private nonce!: BigNumber;

    private amount!: BigNumber;

    private unsignedRawTx!: Buffer;

    private innertTxId!: string;

    private keyPair?: KeyPair;

    /**
     * Creates an instance of DepositTransactionBuilder.
     * @param {UnbondTransactionBuilderOptions} [options] Builder options
     * @param {string} options.stakingAddress Staking address to unbond from
     * @param {BigNumber} options.nonce Staking address nonce
     * @param {string} options.amount Amount in basic unit to unbond
     * @param {Network} [options.network] Network the transaction belongs to
     * @memberof UnbondTransactionBuilder
     */
    constructor(options: UnbondTransactionBuilderOptions) {
        super();

        ow(options, 'options', owUnbondTransactionBuilderOptions);

        this.stakingAddress = options.stakingAddress;
        this.nonce = options.nonce;
        this.amount = options.amount;
        this.initNetwork(options.network);
        this.prepareRawTx();
    }

    private prepareRawTx() {
        const {
            unsignedRawTx,
            txId,
        } = native.stakingTransaction.buildRawUnbondTransaction({
            stakingAddress: this.stakingAddress,
            nonce: this.nonce.toString(10),
            amount: this.amount.toString(10),
            chainHexId: this.getNetwork().chainHexId,
        });

        this.unsignedRawTx = unsignedRawTx;
        this.innertTxId = txId;
    }

    /**
     * Returns staking address to unbond from
     * @returns {string} stakingAddress
     * @memberof UnbondTransactionBuilder
     */
    public getStakingAddress(): Readonly<string> {
        return this.stakingAddress;
    }

    /**
     * Returns account nonce
     * @returns {BigNumber} nonce
     * @memberof UnbondTransactionBuilder
     */
    public getNonce(): Readonly<BigNumber> {
        return this.nonce;
    }

    /**
     * Returns amount in basic unit to unbond
     * @returns {BigNumber} unbond amount in basic unit
     * @memberof UnbondTransactionBuilder
     */
    public getAmount(): Readonly<BigNumber> {
        return this.amount;
    }

    /**
     * Sign the transaction with the KeyPair
     * @param {KeyPair} keyPair KeyPair to sign the transaction
     * @returns {UnbondTransactionBuilder}
     * @memberof UnbondTransactionBuilder
     */
    public sign(keyPair: KeyPair): UnbondTransactionBuilder {
        ow(keyPair, 'keyPair', owKeyPair);
        // FIXME: Signature cannot be cached in builder because
        // RecoverableSignature does not support Encode/Decode
        // https://github.com/crypto-com/chain/blob/release/v0.3/client-common/src/key/private_key.rs#L40
        this.keyPair = keyPair;

        return this;
    }

    /**
     * Determine if the transaction is completed and can be exported
     *
     * @returns {boolean} returns true if the transaction is completed
     * @memberof UnbondTransactionBuilder
     */
    public isCompleted(): boolean {
        return !!this.keyPair;
    }

    /**
     * Returns transaction Id
     *
     * @returns {string} transaction Id
     * @memberof UnbondTransactionBuilder
     */
    public txId(): Readonly<string> {
        return this.innertTxId!;
    }

    /**
     * Returns unsigned raw transaction in hex
     *
     * @returns {Buffer}
     * @memberof UnbondTransactionBuilder
     */
    public toUnsignedHex(): Buffer {
        return Buffer.concat([Buffer.from('0100', 'hex'), this.unsignedRawTx]);
    }

    /**
     * Returns broadcast-able transaction in hex
     *
     * @returns {Buffer}
     * @memberof UnbondTransactionBuilder
     */
    public toHex(): Buffer {
        if (!this.isCompleted()) {
            throw new Error('Transaction builder is not completed');
        }

        return native.stakingTransaction.unbondTransactionToHex(
            this.unsignedRawTx,
            this.keyPair!.toObject(),
        );
    }
}
