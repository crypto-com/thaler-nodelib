import ow from 'ow';
import BigNumber from 'bignumber.js';

import {
    Input,
    Output,
    FeeConfig,
    owTransferTransactionBuilderOptions,
    FeeAlgorithm,
    TransferTransactionBuilderOptions,
    owInput,
    owOutput,
    LinearFeeConfig,
} from './types';
import {
    Network,
    owNetwork,
    getChainIdByNetwork,
    owChainId,
    getNetworkByChainId,
} from '../network';
import { ViewKey, owViewKey } from '../types';
import KeyPair from '../key_pair/key_pair';
import { owKeyPair } from '../key_pair/types';

const native = require('../../../native');

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
            coefficient: (feeConfig as LinearFeeConfig).coefficient.toString(10),
        };
    }
    throw new Error(`Unsupported fee algorithm: ${feeConfig.algorithm}`);
};

export default class TransferTransactionBuilder {
    private inputs: Input[] = [];

    private outputs: Output[] = [];

    private viewKeys: ViewKey[] = [];

    private chainId!: string;

    private feeConfig!: FeeConfig;

    private incompleteSigningHex?: Buffer;

    public constructor(options?: TransferTransactionBuilderOptions) {
        ow(options, owTransferTransactionBuilderOptions as any);

        this.parseOptions(options);
    }

    private parseOptions(options?: TransferTransactionBuilderOptions) {
        if (options?.network) {
            if (options?.network === Network.Devnet) {
                if (!options?.chainId) {
                    throw new Error('Missing chainId for Devnet');
                }
                this.setChainId(options.chainId);
            } else {
                this.setChainIdByNetwork(options.network);
            }
        } else {
            this.setChainIdByNetwork(Network.Mainnet);
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
     * Update the chainId of the builder with the network
     * Upon update, all witness signatures will be removed
     * @param network Network that chainId belongs to
     */
    public setChainIdByNetwork(network: Network): TransferTransactionBuilder {
        ow(network, owNetwork);

        const chainId = getChainIdByNetwork(network);
        if (chainId === '') {
            throw new Error(`Unable to determine chain Id based on network \`${network}\``);
        }

        this.setChainId(chainId);

        return this;
    }

    /**
     * Returns the current network
     */
    public getNetwork(): Network {
        return getNetworkByChainId(this.chainId);
    }

    public setChainId(chainId: string): TransferTransactionBuilder {
        ow(chainId, owChainId);

        this.chainId = chainId;

        return this;
    }

    public getChainId(): string {
        return this.chainId;
    }

    public getFeeConfig(): FeeConfig {
        return {
            ...this.feeConfig,
        };
    }

    public addInput(input: Input): TransferTransactionBuilder {
        ow(input, owInput);

        if (!this.isTransferAddressInNetwork(input.prevOutput.address)) {
            throw new Error('Previous output address does not belongs to the builder network');
        }

        this.inputs.push(input);

        return this;
    }

    public addOutput(output: Output): TransferTransactionBuilder {
        ow(output, owOutput);

        if (!this.isTransferAddressInNetwork(output.address)) {
            throw new Error('Address does not belongs to the builder network');
        }

        this.outputs.push(output);

        return this;
    }

    public inputsLength(): number {
        return this.inputs.length;
    }

    public outputsLength(): number {
        return this.outputs.length;
    }

    public viewKeysLength(): number {
        return this.viewKeys.length;
    }

    public addViewKey(viewKey: Buffer): TransferTransactionBuilder {
        ow(viewKey, owViewKey);

        this.viewKeys.push(viewKey);

        return this;
    }

    private isTransferAddressInNetwork(address: string): boolean {
        return native.address.isTransferAddressValid(address, this.getNetwork());
    }

    public txId(): string {
        const incompleteHex = this.buildIncompleteHex();

        return incompleteHex.toString('hex');
    }

    public verify() {
        if (this.feeConfig.algorithm === FeeAlgorithm.LinearFee) {
            return native.transferTransaction.verifyLinearFee();
        }
        throw new Error(`Unsupported fee algorithm ${this.feeConfig.algorithm}`);
    }

    public signInput(index: number, keyPair: KeyPair) {
        ow(index, 'index', ow.number.greaterThanOrEqual(0).lessThan(this.inputsLength()));
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
            throw new Error(`Unsupported fee algorithm ${this.feeConfig.algorithm}`);
        }

        this.incompleteSigningHex = updatedIncompleteSigningHex;
    }

    public isCompleted(): boolean {
        const incompleteSigningHex = this.prepareIncompleteSigningHex();

        if (this.feeConfig.algorithm === FeeAlgorithm.LinearFee) {
            return native.transferTransaction.isCompletedLinearFee({
                incompleteHex: incompleteSigningHex,
                feeConfig: parseFeeConfigForNative(this.feeConfig),
            });
        }

        throw new Error(`Unsupported fee algorithm ${this.feeConfig.algorithm}`);
    }

    private prepareIncompleteSigningHex(): Buffer {
        if (!this.incompleteSigningHex) {
            this.incompleteSigningHex = this.buildIncompleteHex();
        }

        return this.incompleteSigningHex;
    }

    // private clearIncompletHex() {
    //     this.incompleteHex = undefined;
    // }

    private buildIncompleteHex(): Buffer {
        if (this.feeConfig.algorithm === FeeAlgorithm.LinearFee) {
            return this.buildIncompleteHexLinearFee();
        }
        throw new Error(`Unsupported fee algorithm ${this.feeConfig.algorithm}`);
    }

    private buildIncompleteHexLinearFee(): Buffer {
        return native.transferTransaction.buildIncompleteHexLinearFee({
            chainId: this.chainId,
            inputs: this.inputs.map(parseInputForNative),
            outputs: this.outputs.map(parseOutputForNative),
            viewKeys: this.viewKeys,
            feeConfig: parseFeeConfigForNative(this.feeConfig),
        });
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
