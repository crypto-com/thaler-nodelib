import ow from 'ow';

import { TransactionBuilder } from '../transaction_builder';
import {
    NodeMetaData,
    NodeJoinTransactionBuilderOptions,
    owNodeJoinTransactionBuilderOptions,
    parseNodeMetaDataForNative,
} from './types';
import { KeyPair } from '../../key_pair';
import { owKeyPair } from '../../key_pair/types';
import { BigNumber } from '../../utils';

const native = require('../../../../native');

export class NodeJoinTransactionBuilder extends TransactionBuilder {
    private stakingAddress: string;

    private nonce: BigNumber;

    private nodeMetaData: NodeMetaData;

    private unsignedRawTx!: Buffer;

    private innertTxId!: string;

    private keyPair?: KeyPair;

    /**
     * Creates an instance of NodeJoinTransactionBuilder.
     * @param {UnbondTransactionBuilderOptions} [options] Builder options
     * @param {string} options.stakingAddress Staking address to unbond from
     * @param {BigNumber} options.nonce Staking address nonce
     * @param {NodeMetaData} options.nodeMetaData Node meta data
     * @param {Network} [options.network] Network the transaction belongs to
     * @memberof NodeJoinTransactionBuilder
     */
    public constructor(options: NodeJoinTransactionBuilderOptions) {
        super();

        ow(options, 'options', owNodeJoinTransactionBuilderOptions);

        this.stakingAddress = options.stakingAddress;
        this.nonce = options.nonce;
        this.nodeMetaData = options.nodeMetaData;

        this.initNetwork(options.network);

        this.prepareRawTx();
    }

    private prepareRawTx() {
        const {
            unsignedRawTx,
            txId,
        } = native.councilNodeTransaction.buildRawNodeJoinTransaction({
            stakingAddress: this.stakingAddress,
            nonce: this.nonce.toString(10),
            nodeMetaData: JSON.stringify(
                parseNodeMetaDataForNative(this.nodeMetaData),
            ),
            chainHexId: this.getNetwork().chainHexId,
        });

        this.unsignedRawTx = unsignedRawTx;
        this.innertTxId = txId;
    }

    /**
     * Returns staking address holding the stake to participate as council node
     * @returns {string} stakingAddress
     * @memberof NodeJoinTransactionBuilder
     */
    public getStakingAddress(): Readonly<string> {
        return this.stakingAddress;
    }

    /**
     * Returns account nonce
     * @returns {BigNumber} nonce
     * @memberof NodeJoinTransactionBuilder
     */
    public getNonce(): Readonly<BigNumber> {
        return this.nonce;
    }

    /**
     * Returns node metadata of the builder
     * @returns {NodeMetaData} node metadata
     * @memberof NodeJoinTransactionBuilder
     */
    public getNodeMetaData(): Readonly<NodeMetaData> {
        return this.nodeMetaData;
    }

    /**
     * Determine if the transaction is completed and can be exported
     *
     * @returns {boolean} returns true if the transaction is completed
     * @memberof NodeJoinTransactionBuilder
     */
    public isCompleted(): boolean {
        return !!this.keyPair;
    }

    /**
     * Returns transaction Id
     *
     * @returns {string} transaction Id
     * @memberof NodeJoinTransactionBuilder
     */
    public txId(): Readonly<string> {
        return this.innertTxId!;
    }

    /**
     * Sign the transaction with the KeyPair
     * @param {KeyPair} keyPair KeyPair to sign the transaction
     * @returns {NodeJoinTransactionBuilder}
     * @memberof NodeJoinTransactionBuilder
     */
    public sign(keyPair: KeyPair): NodeJoinTransactionBuilder {
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
        return Buffer.concat([Buffer.from('0102', 'hex'), this.unsignedRawTx]);
    }

    /**
     * Output broadcast-able transaction in hex
     *
     * @throws {Error} error when transaction is not completed
     * @returns {Buffer}
     * @memberof NodeJoinTransactionBuilder
     */
    public toHex(): Buffer {
        if (!this.isCompleted()) {
            throw new Error('Transaction builder is not completed');
        }

        return native.councilNodeTransaction.nodeJoinTransactionToHex(
            this.unsignedRawTx,
            this.keyPair!.toObject(),
        );
    }
}
