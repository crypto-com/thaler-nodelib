import ow from 'ow';

import { TransactionBuilder } from '../transaction_builder';
import {
    UnjailTransactionBuilderOptions,
    owUnjailTransactionBuilderOptions,
} from './types';
import { KeyPair } from '../../key_pair';
import { owKeyPair } from '../../key_pair/types';
import { NetworkConfig } from '../../network';
import { BigNumber } from '../../utils';

const native = require('../../../../native');

export class UnjailTransactionBuilder extends TransactionBuilder {
    private stakingAddress: string;

    private nonce: BigNumber;

    private unsignedRawTx!: Buffer;

    private innertTxId!: string;

    private keyPair?: KeyPair;

    /**
     * Creates an instance of UnjailTransactionBuilder.
     * @param {UnbondTransactionBuilderOptions} [options] Builder options
     * @param {string} options.stakingAddress Staking address to unbond from
     * @param {BigNumber} options.nonce Staking address nonce
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
            nonce: this.nonce.toString(10),
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
     * @returns {BigNumber} nonce
     * @memberof UnjailTransactionBuilder
     */
    public getNonce(): Readonly<BigNumber> {
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

    /**
     * Returns unsigned raw transaction in hex
     *
     * @throws {Error} error when transaction is not completed
     * @returns {Buffer}
     * @memberof NodeJoinTransactionBuilder
     */
    public toUnsignedHex(): Buffer {
        return Buffer.concat([Buffer.from('0101', 'hex'), this.unsignedRawTx]);
    }

    /**
     * Returns broadcast-able transaction in hex
     *
     * @throws {Error} error when transaction is not completed
     * @returns {Buffer}
     * @memberof NodeJoinTransactionBuilder
     */
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

/**
 * Verify the signed transaction hex matches with the provided options
 *
 * @throws {Error} error when transaction hex is incorrect or invalid
 */
export const verifySignedUnjailTxHex = (
    unjailTxHex: Buffer,
    options: VerifySignedUnjailTxHexOption,
) => {
    native.councilNodeTransaction.verifyUnjailTxAux(unjailTxHex, {
        stakingAddress: options.stakingAddress,
        nonce: options.nonce.toString(10),
        chainHexId: options.network.chainHexId,
    });
};

interface VerifySignedUnjailTxHexOption {
    stakingAddress: string;
    nonce: BigNumber;
    network: NetworkConfig;
}
