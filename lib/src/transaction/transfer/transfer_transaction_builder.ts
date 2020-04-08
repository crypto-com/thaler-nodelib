import ow, { NumberPredicate } from 'ow';
import BigNumber from 'bignumber.js';

import {
    Input,
    Output,
    owTransferTransactionBuilderOptions,
    TransferTransactionBuilderOptions,
    owInput,
    owOutput,
    owOptionalTendermintAddress,
} from './types';
import { NetworkConfig } from '../../network/types';
import { ViewKey, owViewKey } from '../../types';
import { KeyPair } from '../../key_pair/key_pair';
import { owKeyPair } from '../../key_pair/types';
import { getRustFeaturesFromEnv } from '../../native';
import { FeeConfig, FeeAlgorithm, LinearFeeConfig } from '../../fee';
import { Mainnet } from '../../network';

const native = require('../../../../native');

const parseOutputForNative = (output: Output): NativeOutput => {
    const nativeOutput: NativeOutput = {
        address: output.address,
        value: output.value.toString(10),
    };
    if (output.validFrom) {
        nativeOutput.validFrom = output.validFrom.valueOf();
    }

    return nativeOutput;
};

const parseInputForNative = (input: Input): NativeInput => {
    return {
        ...input,
        prevOutput: parseOutputForNative(input.prevOutput),
    };
};

const parseFeeConfigForNative = (feeConfig: FeeConfig): NativeFeeConfig => {
    if (feeConfig.algorithm === FeeAlgorithm.LinearFee) {
        return {
            ...feeConfig,
            constant: (feeConfig as LinearFeeConfig).constant.toString(10),
            coefficient: (feeConfig as LinearFeeConfig).coefficient.toString(
                10,
            ),
        };
    }
    throw new Error(`Unsupported fee algorithm: ${feeConfig.algorithm}`);
};

/**
 * A builder for building transfer transaction
 */
export class TransferTransactionBuilder {
    private inputs: Input[] = [];

    private outputs: Output[] = [];

    private viewKeys: ViewKey[] = [];

    private network!: NetworkConfig;

    private feeConfig!: FeeConfig;

    private incompleteHex?: Buffer;

    /**
     * Creates an instance of TransferTransactionBuilder.
     * @param {TransferTransactionBuilderOptions} [options] Builder options
     * @param {Network} options.network Network the transaction belongs to
     * @param {FeeConfig} [options.feeConfig=LinearFee] Fee configuration
     * @memberof TransferTransactionBuilder
     */
    public constructor(options?: TransferTransactionBuilderOptions) {
        ow(options, owTransferTransactionBuilderOptions as any);

        this.parseOptions(options);
    }

    private parseOptions(options?: TransferTransactionBuilderOptions) {
        if (options?.network) {
            this.network = options.network;
        } else {
            this.network = Mainnet;
        }

        if (options?.feeConfig) {
            this.feeConfig = options.feeConfig;
        } else {
            this.feeConfig = {
                algorithm: FeeAlgorithm.LinearFee,
                constant: new BigNumber('1000'),
                coefficient: new BigNumber('1001'),
            };
        }
    }

    /**
     * Returns the current network
     *
     * @returns {NetworkConfig} current network
     * @memberof TransferTransactionBuilder
     */
    public getNetwork(): Readonly<NetworkConfig> {
        return this.network;
    }

    /**
     * Returns current fee configuration
     *
     * @returns {FeeConfig} current fee configuration
     * @memberof TransferTransactionBuilder
     */
    public getFeeConfig(): FeeConfig {
        return {
            ...this.feeConfig,
        };
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
            this.network.name,
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
        this.incompleteHex = undefined;
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
     * @memberof TransferTransactionBuilder
     */
    public txId(): string {
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
        ow(index, 'index', this.owIndex());
        ow(keyPair, 'KeyPair', owKeyPair);

        if (!keyPair.hasPrivateKey()) {
            throw new Error('KeyPair does not have private key');
        }

        const incompleteSigningHex = this.prepareIncompletedHex();

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

        this.incompleteHex = updatedIncompleteSigningHex;
    }

    /**
     * Add witness to particular input
     *
     * @param {number} index input index
     * @param {Buffer} witness hex encoded witness data
     * @memberof TransferTransactionBuilder
     */
    public addWitness(index: number, witness: Buffer) {
        ow(index, 'index', this.owIndex());
        ow(witness, 'witness', ow.buffer);

        const incompleteSigningHex = this.prepareIncompletedHex();

        let updatedIncompleteSigningHex: Buffer;
        if (this.feeConfig.algorithm === FeeAlgorithm.LinearFee) {
            // FIXME: properly handle witness verification
            updatedIncompleteSigningHex = native.transferTransaction.addInputWitnessLinearFee(
                {
                    incompleteHex: incompleteSigningHex,
                    feeConfig: parseFeeConfigForNative(this.feeConfig),
                },
                index,
                witness,
            );
        } else {
            throw new Error(
                `Unsupported fee algorithm ${this.feeConfig.algorithm}`,
            );
        }

        this.incompleteHex = updatedIncompleteSigningHex;
    }

    private owIndex(): NumberPredicate {
        return ow.number.greaterThanOrEqual(0).lessThan(this.inputsLength());
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
            return this.incompleteHex!;
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
        if (!this.incompleteHex) {
            return false;
        }

        if (this.feeConfig.algorithm === FeeAlgorithm.LinearFee) {
            return native.transferTransaction.isCompletedLinearFee({
                incompleteHex: this.incompleteHex,
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
        ow(tendermintAddress, owOptionalTendermintAddress);

        if (!this.isCompleted()) {
            throw new Error('Transaction has unsigned input');
        }

        return native.transferTransaction.toHexLinearFee(
            {
                incompleteHex: this.incompleteHex,
                feeConfig: parseFeeConfigForNative(this.feeConfig),
            },
            tendermintAddress,
            // TODO: Use feature conditional compilation when ready
            // https://github.com/neon-bindings/neon/issues/471
            getRustFeaturesFromEnv(process.env.NODE_ENV),
        );
    }

    private prepareIncompletedHex(): Buffer {
        if (!this.isSigning()) {
            this.incompleteHex = this.buildIncompleteHex();
        }

        return this.incompleteHex!;
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
            chainId: this.network.chainId.toString('hex'),
            inputs: this.inputs.map(parseInputForNative),
            outputs: this.outputs.map(parseOutputForNative),
            viewKeys: this.viewKeys,
            feeConfig: parseFeeConfigForNative(this.feeConfig),
        });
    }

    private isSigning(): boolean {
        return !!this.incompleteHex;
    }
}

interface NativeInput {
    prevTxId: string;
    prevIndex: number;
    prevOutput: NativeOutput;
}
interface NativeOutput {
    address: string;
    value: string;
    validFrom?: number;
}

type NativeFeeConfig = NativeLinearFeeConfig | NativeBaseFeeConfig;
type NativeLinearFeeConfig = {
    algorithm: FeeAlgorithm;
    constant: string;
    coefficient: string;
};
type NativeBaseFeeConfig = {
    algorithm: FeeAlgorithm;
};
