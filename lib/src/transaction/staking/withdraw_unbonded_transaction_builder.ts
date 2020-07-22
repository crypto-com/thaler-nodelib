import ow from 'ow';
import cloneDeep from 'lodash/cloneDeep';
import BigNumber from 'bignumber.js';

import { TransactionBuilder } from '../transaction_builder';
import {
    WithdrawUnbondedTransactionBuilderOptions,
    owWithdrawUnbondedTransactionBuilderOptions,
    WithdrawUnbondedOutput,
    owWithdrawUnbondedOutput,
} from './types';
import {
    Output,
    ViewKey,
    owViewKey,
    owTendermintAddress,
    parseOutputForNative,
} from '../../types';
import { KeyPair } from '../../key_pair';
import { owKeyPair } from '../../key_pair/types';
import { FeeConfig } from '../../fee';
import { parseFeeConfigForNative } from '../../fee/types';
import { getRustFeaturesFromEnv } from '../../native';

const native = require('../../../../native');

/**
 * A builder for building withdraw unbonded transaction
 */
export class WithdrawUnbondedTransactionBuilder extends TransactionBuilder {
    private static MAX_OUTPUT_SIZE = 65536;

    private nonce: BigNumber;

    private outputs: Output[] = [];

    private viewKeys: ViewKey[] = [];

    private unsignedRawTx?: Buffer;

    private innertTxId?: string;

    private keyPair?: KeyPair;

    /**
     * Creates an instance of WithdrawUnbondedTransactionBuilder.
     * @param {UnbondTransactionBuilderOptions} [options] Builder options
     * @param {BigNumber} options.nonce Staking account next nonce value
     * @param {FeeConfigonfig Network the transaction belongs to
     * @param {Network} [options.network=Mainnet] Network of the transaction
     * @memberof UnbondTransactionBuilder
     */
    public constructor(options: WithdrawUnbondedTransactionBuilderOptions) {
        super();

        ow(options, 'options', owWithdrawUnbondedTransactionBuilderOptions);

        this.nonce = options.nonce;
        this.initNetwork(options.network);
    }

    /**
     * Returns nonce
     * @returns {BigNumber} nonce
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public getNonce(): Readonly<BigNumber> {
        return this.nonce;
    }

    /**
     * Returns fee configuration
     * @returns {FeeConfig} fee configuration
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public get feeConfig(): Readonly<FeeConfig> {
        return this.network.feeConfig;
    }

    /**
     * Append an output to the builder. In Thaler Tesetnet v0.5, one must
     * withdraw all the unbonded balance and the validFrom must be identical to
     * the unbonded from value of the account staked state.
     * @param {WithdrawUnbondedOutput} output output to be added
     * @returns {WithdrawUnbondedTransactionBuilder}
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public addOutput(
        output: WithdrawUnbondedOutput,
    ): WithdrawUnbondedTransactionBuilder {
        ow(output, 'output', owWithdrawUnbondedOutput);

        if (
            this.outputs.length ===
            WithdrawUnbondedTransactionBuilder.MAX_OUTPUT_SIZE
        ) {
            throw new Error('Exceeded maximum number of outputs');
        }

        if (!this.isTransferAddressInNetwork(output.address)) {
            throw new Error('Address does not belongs to the builder network');
        }

        this.clearPreparedRawTx();

        this.outputs.push(output);

        return this;
    }

    /**
     * Returns total withdraw amount in basic unit
     * @returns {BigNumber} withdraw amount in basic unit
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public getTotalOutputAmount(): Readonly<BigNumber> {
        return this.outputs.reduce(
            (total, output) => total.plus(output.value),
            new BigNumber(0),
        );
    }

    private isTransferAddressInNetwork(address: string): boolean {
        return native.address.isTransferAddressValid(
            address,
            this.getNetwork().name,
        );
    }

    /**
     * Returns number of outputs
     *
     * @returns {number} number of outputs
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public outputsLength(): number {
        return this.outputs.length;
    }

    /**
     * Add a view key to the builder. All previous signatures will be cleared
     * when new output is added to builder.
     *
     * @param {Buffer} viewKey view key to be added
     * @returns {WithdrawUnbondedTransactionBuilder}
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public addViewKey(viewKey: ViewKey): WithdrawUnbondedTransactionBuilder {
        ow(viewKey, 'viewKey', owViewKey);

        this.clearPreparedRawTx();

        this.viewKeys.push(viewKey);

        return this;
    }

    private clearPreparedRawTx() {
        this.unsignedRawTx = undefined;
        this.innertTxId = undefined;
    }

    /**
     * Returns number of view keys
     *
     * @returns {number} number of view keys
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public viewKeysLength(): number {
        return this.viewKeys.length;
    }

    /**
     * Returns estimated fee. It can be called before signing the transaction.
     *
     * @returns {string} Estiamted fee in basic unit
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public estimateFee(): string {
        if (!this.isRawTxPrepared()) {
            if (!this.hasOutput()) {
                throw new Error('Builder has no output');
            }

            this.prepareRawTx();
        }

        return native.stakingTransaction.estimateWithdrawUnbondedTransactionFee(
            this.unsignedRawTx,
            parseFeeConfigForNative(this.feeConfig),
        );
    }

    /**
     * Returns transaction Id. Transaction id will change whenever transaction
     * builder has changes.
     *
     * @returns {string} transaction Id
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public txId(): Readonly<string> {
        if (!this.isRawTxPrepared()) {
            if (!this.hasOutput()) {
                throw new Error('Builder has no output');
            }

            this.prepareRawTx();
        }

        return this.innertTxId!;
    }

    /**
     * Returns unsigned raw unobfuscated transaction in hex
     *
     * @returns {Buffer} transaction hex
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public toUnsignedHex(): Readonly<Buffer> {
        if (!this.isRawTxPrepared()) {
            if (!this.hasOutput()) {
                throw new Error('Builder has no output');
            }
            this.prepareRawTx();
        }

        return Buffer.concat([Buffer.from('0002', 'hex'), this.unsignedRawTx!]);
    }

    private isRawTxPrepared(): boolean {
        return !!this.unsignedRawTx;
    }

    private prepareRawTx() {
        const {
            unsignedRawTx,
            txId,
        } = native.stakingTransaction.buildRawWithdrawUnbondedTransaction({
            nonce: this.nonce.toString(10),
            outputs: this.outputs.map((output) => parseOutputForNative(output)),
            viewKeys: this.viewKeys,
            chainHexId: this.getNetwork().chainHexId,
        });

        this.unsignedRawTx = unsignedRawTx;
        this.innertTxId = txId;
    }

    /**
     * Sign the transaction with the KeyPair
     * @param {KeyPair} keyPair KeyPair to sign the transaction
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public sign(keyPair: KeyPair): WithdrawUnbondedTransactionBuilder {
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
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public isCompleted(): boolean {
        if (!this.hasOutput()) {
            return false;
        }

        return this.isSigned();
    }

    /**
     * Returns signed plain (unobfuscated) transaction in hex
     *
     * @returns {Buffer} transaction hex
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public toSignedPlainHex(): Readonly<Buffer> {
        if (!this.isRawTxPrepared()) {
            if (!this.hasOutput()) {
                throw new Error('Builder has no output');
            }
            this.prepareRawTx();
        }

        if (!this.isSigned()) {
            throw new Error('Builder is not signed');
        }

        const signedRawTx = native.stakingTransaction.withdrawUnbondedTransactionToSignedPlainHex(
            this.unsignedRawTx,
            this.keyPair!.toObject(),
        );

        return Buffer.concat([Buffer.from('00', 'hex'), signedRawTx]);
    }

    /**
     * Output broadcast-able transaction in hex
     *
     * @param {string} [tendermintAddress='ws://localhost:26657/websocket']
     * @returns {Buffer} transaction hex
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public toHex(
        tendermintAddress: string = 'ws://localhost:26657/websocket',
    ): Buffer {
        ow(tendermintAddress, 'tendermintAddress', owTendermintAddress);

        if (!this.isRawTxPrepared()) {
            if (!this.hasOutput()) {
                throw new Error('Builder has no output');
            }
            this.prepareRawTx();
        }

        if (!this.isSigned()) {
            throw new Error('Builder is not signed');
        }

        // TODO: Refactor into object options
        return native.stakingTransaction.withdrawUnbondedTransactionToObfuscatedHex(
            this.unsignedRawTx,
            this.keyPair!.toObject(),
            tendermintAddress,
            getRustFeaturesFromEnv(process.env.NODE_ENV),
        );
    }

    /**
     * Determine if the transaction builder has output appended
     *
     * @returns {boolean} returns true if the builder has output
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public hasOutput(): boolean {
        return this.outputs.length > 0;
    }

    /**
     * Determine if the transaction is signed
     *
     * @returns {boolean} returns true if the transaction is signed
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public isSigned(): boolean {
        return !!this.keyPair;
    }

    /**
     * Deep clone the builder
     *
     * @returns {WithdrawUnbondedTransactionBuilder}
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public clone(): WithdrawUnbondedTransactionBuilder {
        return cloneDeep(this);
    }
}
