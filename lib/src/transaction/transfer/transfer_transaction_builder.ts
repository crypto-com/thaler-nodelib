import ow from 'ow';
import BigNumber from 'bignumber.js';

import {
    owTransferTransactionBuilderOptions,
    TransferTransactionBuilderOptions,
} from './types';
import {
    Input,
    Output,
    ViewKey,
    owInput,
    owOutput,
    owTendermintAddress,
    owViewKey,
    parseInputForNative,
    parseOutputForNative,
} from '../../types';
import { KeyPair } from '../../key_pair/key_pair';
import { owKeyPair } from '../../key_pair/types';
import { getRustFeaturesFromEnv } from '../../native';
import { FeeConfig, FeeAlgorithm } from '../../fee';
import { parseFeeConfigForNative } from '../../fee/types';
import { TransactionBuilder } from '../transaction_builder';

const native = require('../../../../native');

/**
 * A builder for building transfer transaction
 */
export class TransferTransactionBuilder extends TransactionBuilder {
    private inputs: Input[] = [];

    private outputs: Output[] = [];

    private viewKeys: ViewKey[] = [];

    private feeConfig!: FeeConfig;

    private incompleteSigningHex?: Buffer;

    /**
     * Creates an instance of TransferTransactionBuilder.
     * @param {TransferTransactionBuilderOptions} [options] Builder options
     * @param {Network} options.network Network the transaction belongs to
     * @param {FeeConfig} [options.feeConfig=LinearFee] Fee configuration
     * @memberof TransferTransactionBuilder
     */
    public constructor(options?: TransferTransactionBuilderOptions) {
        super();

        ow(options, owTransferTransactionBuilderOptions as any);

        this.parseOptions(options);
    }

    private parseOptions(options?: TransferTransactionBuilderOptions) {
        this.initNetwork(options?.network);

        if (options?.feeConfig) {
            this.feeConfig = options.feeConfig;
        } else {
            // FIXME: Do not provide default fee configuration
            // https://mcoproduct.atlassian.net/browse/CEV2-159
            this.feeConfig = {
                algorithm: FeeAlgorithm.LinearFee,
                constant: new BigNumber('1000'),
                coefficient: new BigNumber('1001'),
            };
        }
    }

    /**
     * Returns current fee configuration
     *
     * @returns {FeeConfig} current fee configuration
     * @memberof TransferTransactionBuilder
     */
    public getFeeConfig(): Readonly<FeeConfig> {
        return this.feeConfig;
    }

    /**
     * Append a previous transaction output as a input. All previous signatures
     * will be cleared when new input is added to builder.
     *
     * @param {Input} input input to be added
     * @returns {TransferTransactionBuilder}
     * @memberof TransferTransactionBuilder
     */
    public addInput(input: Input): TransferTransactionBuilder {
        ow(input, owInput);

        if (!this.isTransferAddressInNetwork(input.prevOutput.address)) {
            throw new Error(
                'Previous output address does not belongs to the builder network',
            );
        }

        this.clearIncompleteSigningHex();

        this.inputs.push(input);

        return this;
    }

    /**
     * Append an output to the builder. All previous signatures will be cleared
     * when new output is added to builder.
     *
     * @param {Output} output output to be added
     * @returns {TransferTransactionBuilder}
     * @memberof TransferTransactionBuilder
     */
    public addOutput(output: Output): TransferTransactionBuilder {
        ow(output, owOutput);

        if (!this.isTransferAddressInNetwork(output.address)) {
            throw new Error('Address does not belongs to the builder network');
        }

        this.clearIncompleteSigningHex();

        this.outputs.push(output);

        return this;
    }

    private isTransferAddressInNetwork(address: string): boolean {
        return native.address.isTransferAddressValid(
            address,
            this.getNetwork().name,
        );
    }

    /**
     * Add a view key to the builder. All previous signatures will be cleared
     * when new output is added to builder.
     *
     * @param {Buffer} viewKey view key to be added
     * @returns {TransferTransactionBuilder}
     * @memberof TransferTransactionBuilder
     */
    public addViewKey(viewKey: Buffer): TransferTransactionBuilder {
        ow(viewKey, owViewKey);

        this.clearIncompleteSigningHex();

        this.viewKeys.push(viewKey);

        return this;
    }

    private clearIncompleteSigningHex() {
        this.incompleteSigningHex = undefined;
    }

    /**
     * Returns number of inputs
     *
     * @returns {number} number of inputs
     * @memberof TransferTransactionBuilder
     */
    public inputsLength(): number {
        return this.inputs.length;
    }

    /**
     * Returns number of outputs
     *
     * @returns {number} number of outputs
     * @memberof TransferTransactionBuilder
     */
    public outputsLength(): number {
        return this.outputs.length;
    }

    /**
     * Returns number of view keys
     *
     * @returns {number} number of view keys
     * @memberof TransferTransactionBuilder
     */
    public viewKeysLength(): number {
        return this.viewKeys.length;
    }

    /**
     * Returns transaction Id
     *
     * @returns {string} transaction Id
     * @throws {Error} error when
     * @memberof TransferTransactionBuilder
     */
    public txId(): string {
        this.verifyHasInput();

        if (this.feeConfig.algorithm === FeeAlgorithm.LinearFee) {
            const incompleteHex = this.buildIncompleteHex();

            return native.transferTransaction.txIdLinearFee({
                incompleteHex,
                feeConfig: parseFeeConfigForNative(this.feeConfig),
            });
        }
        throw new Error(
            `Unsupported fee algorithm ${this.feeConfig.algorithm}`,
        );
    }

    /**
     * Sign a particular input with the provided KeyPair
     *
     * @param {number} index input index
     * @param {KeyPair} keyPair key pair which can unlock the input
     * @memberof TransferTransactionBuilder
     */
    public signInput(index: number, keyPair: KeyPair) {
        ow(
            index,
            'index',
            ow.number.greaterThanOrEqual(0).lessThan(this.inputsLength()),
        );
        ow(keyPair, 'KeyPair', owKeyPair);

        if (!keyPair.hasPrivateKey()) {
            throw new Error('KeyPair does not have private key');
        }

        const incompleteSigningHex = this.prepareIncompleteSigningHex();

        let updatedIncompleteSigningHex: Buffer;
        if (this.feeConfig.algorithm === FeeAlgorithm.LinearFee) {
            updatedIncompleteSigningHex = native.transferTransaction.signInputLinearFee(
                {
                    incompleteHex: incompleteSigningHex,
                    feeConfig: parseFeeConfigForNative(this.feeConfig),
                },
                index,
                keyPair.toObject(),
            );
        } else {
            throw new Error(
                `Unsupported fee algorithm ${this.feeConfig.algorithm}`,
            );
        }

        this.incompleteSigningHex = updatedIncompleteSigningHex;
    }

    /**
     * Verify the transaction builder is valid
     *
     * @throws {Error} error when the transaction is invalid
     * @memberof TransferTransactionBuilder
     */
    public verify() {
        if (this.feeConfig.algorithm === FeeAlgorithm.LinearFee) {
            return native.transferTransaction.verifyLinearFee();
        }
        throw new Error(
            `Unsupported fee algorithm ${this.feeConfig.algorithm}`,
        );
    }

    /**
     * Returns the incompleted raw transaction in hex. This transaction is not
     * broadcast-able
     *
     * @returns {Buffer} incomplete raw transaction hex
     * @memberof TransferTransactionBuilder
     */
    public toIncompleteHex(): Buffer {
        if (this.isSigning()) {
            return this.incompleteSigningHex!;
        }

        return this.buildIncompleteHex();
    }

    /**
     * Determine if the transaction has signatures for all of its input
     *
     * @returns {boolean} returns true if all inputs have signature
     * @memberof TransferTransactionBuilder
     */
    public isCompleted(): boolean {
        if (!this.incompleteSigningHex) {
            return false;
        }

        if (this.feeConfig.algorithm === FeeAlgorithm.LinearFee) {
            return native.transferTransaction.isCompletedLinearFee({
                incompleteHex: this.incompleteSigningHex,
                feeConfig: parseFeeConfigForNative(this.feeConfig),
            });
        }

        throw new Error(
            `Unsupported fee algorithm ${this.feeConfig.algorithm}`,
        );
    }

    /**
     * Output broadcast-able transaction in hex
     *
     * @param {string} [tendermintAddress='ws://localhost:26657/websocket']
     * @returns {Buffer}
     * @memberof TransferTransactionBuilder
     */
    public toHex(
        tendermintAddress: string = 'ws://localhost:26657/websocket',
    ): Buffer {
        ow(tendermintAddress, owTendermintAddress);

        this.verifyHasInput();

        if (!this.isCompleted()) {
            throw new Error('Transaction is not completed');
        }

        return native.transferTransaction.toHexLinearFee(
            {
                incompleteHex: this.incompleteSigningHex,
                feeConfig: parseFeeConfigForNative(this.feeConfig),
            },
            tendermintAddress,
            // TODO: Use feature conditional compilation when ready
            // https://github.com/neon-bindings/neon/issues/471
            getRustFeaturesFromEnv(process.env.NODE_ENV),
        );
    }

    private verifyHasInput() {
        if (!this.hasInput()) {
            throw new Error('Builder has no input');
        }
    }

    private hasInput(): boolean {
        return this.inputs.length !== 0;
    }

    private prepareIncompleteSigningHex(): Buffer {
        if (!this.isSigning()) {
            this.incompleteSigningHex = this.buildIncompleteHex();
        }

        return this.incompleteSigningHex!;
    }

    private buildIncompleteHex(): Buffer {
        if (this.feeConfig.algorithm === FeeAlgorithm.LinearFee) {
            return this.buildIncompleteHexLinearFee();
        }
        throw new Error(
            `Unsupported fee algorithm ${this.feeConfig.algorithm}`,
        );
    }

    private buildIncompleteHexLinearFee(): Buffer {
        return native.transferTransaction.buildIncompleteHexLinearFee({
            chainHexId: this.getNetwork().chainHexId,
            inputs: this.inputs.map(parseInputForNative),
            outputs: this.outputs.map(parseOutputForNative),
            viewKeys: this.viewKeys,
            feeConfig: parseFeeConfigForNative(this.feeConfig),
        });
    }

    private isSigning(): boolean {
        return !!this.incompleteSigningHex;
    }
}
