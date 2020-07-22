import ow from 'ow';

import {
    PrevOutputPointer,
    DepositTransactionBuilderOptions,
    owPrevOutputPointer,
    owDepositTransactionOptions,
    WitnessedPrevOutputPointer,
} from './types';
import { TransactionBuilder } from '../transaction_builder';
import { KeyPair } from '../../key_pair';
import { owKeyPair } from '../../key_pair/types';
import { owTendermintAddress } from '../../types';
import { getRustFeaturesFromEnv } from '../../native';

const native = require('../../../../native');

/**
 * A builder for building deposit transaction
 */
export class DepositTransactionBuilder extends TransactionBuilder {
    private inputs: WitnessedPrevOutputPointer[] = [];

    private stakingAddress: string;

    private unsignedRawTx?: Buffer;

    private innertTxId?: string;

    /**
     * Creates an instance of DepositTransactionBuilder.
     * @param {DepositTransactionBuilderOptions} [options] Builder options
     * @param {string} options.stakingAddress Staking address to deposit to
     * @param {Network} [options.network] Network the transaction belongs to
     * @memberof DepositTransactionBuilder
     */
    constructor(options: DepositTransactionBuilderOptions) {
        super();

        ow(options, 'options', owDepositTransactionOptions as any);

        this.stakingAddress = options.stakingAddress;
        this.initNetwork(options?.network);
    }

    /**
     * Returns staking address of the builder
     * @returns {string} Staking address of the builder
     * @throws {Error} when staking address has not been set
     */
    public getStakingAddress(): Readonly<string> {
        return this.stakingAddress!;
    }

    /**
     * Append a previous transaction output as a input. All previous signatures
     * will be cleared when new input is added to builder.
     *
     * @param {PrevOutputPointer} prevOutputPointer input to be added
     * @returns {TransferTransactionBuilder}
     * @memberof TransferTransactionBuilder
     */
    public addInput(
        prevOutputPointer: PrevOutputPointer,
    ): DepositTransactionBuilder {
        ow(prevOutputPointer, 'prevOutputPointer', owPrevOutputPointer);

        this.clearCachedData();

        const input: WitnessedPrevOutputPointer = {
            prevOutputPointer,
        };
        this.inputs.push(input);

        return this;
    }

    private clearCachedData() {
        this.clearWitnesses();
        this.clearPreparedRawTx();
    }

    private clearWitnesses() {
        for (let i = 0, l = this.inputs.length; i < l; i += 1) {
            this.inputs[i].witness = undefined;
        }
    }

    private clearPreparedRawTx() {
        this.unsignedRawTx = undefined;
        this.innertTxId = undefined;
    }

    /**
     * Returns transaction Id
     *
     * @returns {string} transaction Id
     * @throws {Error} error when the builder is not ready
     * @memberof TransferTransactionBuilder
     */
    public txId(): Readonly<string> {
        if (!this.isRawTxPrepared()) {
            this.verifyTxIsSignable();
            this.prepareRawTx();
        }
        return this.innertTxId!;
    }

    /**
     * Sign a particular input with the provided KeyPair
     *
     * @param {number} index input index
     * @param {KeyPair} keyPair key pair which can unlock the input
     * @throws {Error} error when input index does not exist
     * @memberof DepositTransactionBuilder
     */
    public signInput(
        index: number,
        keyPair: KeyPair,
    ): DepositTransactionBuilder {
        ow(index, 'index', ow.number);
        ow(keyPair, 'keyPair', owKeyPair);

        if (!this.isRawTxPrepared()) {
            this.verifyTxIsSignable();
            this.prepareRawTx();
        }
        this.verifyInputIndex(index);

        const witness = native.signer.schnorrSignTxId(
            Buffer.from(this.innertTxId!, 'hex'),
            keyPair.toObject(),
        );
        this.inputs[index].witness = witness;

        return this;
    }

    /**
     * Add witness data to input
     *
     * @param {number} index input index
     * @param {Buffer} witness witness which can unlock the input
     * @throws {Error} error when input index does not exist
     * @memberof DepositTransactionBuilder
     */
    public addWitness(
        index: number,
        witness: Buffer,
    ): DepositTransactionBuilder {
        ow(index, 'index', ow.number);
        ow(witness, 'witness', ow.buffer);

        this.verifyTxIsSignable();
        this.verifyInputIndex(index);

        this.inputs[index].witness = witness;

        return this;
    }

    private verifyInputIndex(index: number) {
        if (index < 0 || index >= this.inputsLength()) {
            throw new Error('Input index out of bound');
        }
    }

    /**
     * Returns number of inputs
     *
     * @returns {number} number of inputs
     * @memberof DepositTransactionBuilder
     */
    public inputsLength(): number {
        return this.inputs.length;
    }

    /**
     * Determine if input has associated witness already
     * @param {number} index input index
     * @throws {Error} error when input index does not exist
     */
    public hasWitness(index: number): boolean {
        ow(index, 'index', ow.number);

        this.verifyInputIndex(index);

        return !!this.inputs[index].witness;
    }

    private verifyTxIsSignable() {
        this.verifyHasInput();
    }

    private verifyHasInput() {
        if (!this.hasInput()) {
            throw new Error('Builder has no input');
        }
    }

    /**
     * Returns unsigned raw unobfuscated transaction in hex
     *
     * @throws {Error} error when transaction is not completed
     * @returns {Buffer}
     * @memberof DepositTransactionBuilder
     */
    public toUnsignedHex(): Buffer {
        this.verifyHasInput();
        if (!this.isRawTxPrepared()) {
            this.prepareRawTx();
        }

        return this.unsignedRawTx!;
    }

    /**
     * Returns broadcast-able transaction in hex
     *
     * @param {string} [tendermintAddress='ws://localhost:26657/websocket']
     * @throws {Error} error when transaction is not completed
     * @returns {Buffer}
     * @memberof DepositTransactionBuilder
     */
    public toHex(
        tendermintAddress: string = 'ws://localhost:26657/websocket',
    ): Buffer {
        ow(tendermintAddress, 'tendermintAddress', owTendermintAddress);

        if (!this.isRawTxPrepared()) {
            this.verifyTxIsSignable();
            this.prepareRawTx();
        }
        if (!this.isCompleted()) {
            throw new Error('Transaction builder is not completed');
        }

        const txInWitnesses = this.inputs.map((input) => input.witness);

        return native.stakingTransaction.depositTransactionToHex(
            this.unsignedRawTx,
            txInWitnesses,
            tendermintAddress,
            getRustFeaturesFromEnv(process.env.NODE_ENV),
        );
    }

    private isRawTxPrepared(): boolean {
        return !!this.unsignedRawTx;
    }

    /**
     * Determine if the transaction is completed and can be exported
     *
     * @returns {boolean} returns true if the transaction is completed
     * @memberof DepositTransactionBuilder
     */
    public isCompleted(): boolean {
        if (!this.hasInput()) {
            return false;
        }
        const inputHasMissingWitness = this.inputs.find(
            (input) => !input.witness,
        );

        return !inputHasMissingWitness;
    }

    private hasInput(): boolean {
        return this.inputs.length !== 0;
    }

    private prepareRawTx() {
        const inputs = this.inputs.map((input) => input.prevOutputPointer);
        const {
            unsignedRawTx,
            txId,
        } = native.stakingTransaction.buildRawDepositTransaction({
            inputs,
            toAddress: this.getStakingAddress(),
            chainHexId: this.getNetwork().chainHexId,
        });

        this.unsignedRawTx = unsignedRawTx;
        this.innertTxId = txId;
    }
}
