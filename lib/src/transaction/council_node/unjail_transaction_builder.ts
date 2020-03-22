import ow from 'ow';

import { TransactionBuilder } from '../transaction_builder';
import {
    UnjailTransactionBuilderOptions,
    owUnjailTransactionBuilderOptions,
} from './types';
import { KeyPair } from '../../key_pair';
import { owKeyPair } from '../../key_pair/types';

const native = require('../../../../native');

export class UnjailTransactionBuilder extends TransactionBuilder {
    private stakingAddress: string;

    private nonce: number;

    private unsignedRawTx!: string;

    private innertTxId!: string;

    private keyPair?: KeyPair;

    /**
     * Creates an instance of UnjailTransactionBuilder.
     * @param {UnbondTransactionBuilderOptions} [options] Builder options
     * @param {string} options.stakingAddress Staking address to unbond from
     * @param {number} options.nonce Staking address nonce
     * @param {Network} [options.network] Network the transaction belongs to
     * @memberof UnjailTransactionBuilder
     */
    public constructor(options: UnjailTransactionBuilderOptions) {
        super();

        ow(options, 'options', owUnjailTransactionBuilderOptions);

        this.stakingAddress = options.stakingAddress;
        this.nonce = options.nonce;
        this.initNetwork(options.network);

        this.prepareRawTx();
    }

    private prepareRawTx() {
        const {
            unsignedRawTx,
            txId,
        } = native.councilNodeTransaction.buildRawUnjailTransaction({
            stakingAddress: this.stakingAddress,
            nonce: this.nonce,
            chainHexId: this.getNetwork().chainHexId,
        });

        this.unsignedRawTx = unsignedRawTx;
        this.innertTxId = txId;
    }

    /**
     * Returns staking address
     * @returns {string} stakingAddress
     * @memberof UnjailTransactionBuilder
     */
    public getStakingAddress(): Readonly<string> {
        return this.stakingAddress;
    }

    /**
     * Returns account nonce
     * @returns {number} nonce
     * @memberof UnjailTransactionBuilder
     */
    public getNonce(): Readonly<number> {
        return this.nonce;
    }

    /**
     * Determine if the transaction is completed and can be exported
     *
     * @returns {boolean} returns true if the transaction is completed
     * @memberof UnjailTransactionBuilder
     */
    public isCompleted(): boolean {
        return !!this.keyPair;
    }

    /**
     * Returns transaction Id
     *
     * @returns {string} transaction Id
     * @memberof UnjailTransactionBuilder
     */
    public txId(): Readonly<string> {
        return this.innertTxId!;
    }

    /**
     * Sign the transaction with the KeyPair
     * @param {KeyPair} keyPair KeyPair to sign the transaction
     * @returns {UnjailTransactionBuilder}
     * @memberof UnjailTransactionBuilder
     */
    public sign(keyPair: KeyPair): UnjailTransactionBuilder {
        ow(keyPair, 'keyPair', owKeyPair);
        // FIXME: Signature cannot be cached in builder because
        // RecoverableSignature does not support Encode/Decode
        // https://github.com/crypto-com/chain/blob/release/v0.3/client-common/src/key/private_key.rs#L40
        this.keyPair = keyPair;

        return this;
    }

    public toHex(): Buffer {
        if (!this.isCompleted()) {
            throw new Error('Transaction builder is not completed');
        }

        return native.councilNodeTransaction.unjailTransactionToHex(
            this.unsignedRawTx,
            this.keyPair!.toObject(),
        );
    }
}
