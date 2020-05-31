import ow from 'ow';
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
    StakedState,
    parseStakedStateForNative,
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

    private stakedState: StakedState;

    private feeConfig: FeeConfig;

    private outputs: Output[] = [];

    private viewKeys: ViewKey[] = [];

    private unsignedRawTx?: string;

    private innertTxId?: string;

    private keyPair?: KeyPair;

    /**
     * Creates an instance of WithdrawUnbondedTransactionBuilder.
     * @param {UnbondTransactionBuilderOptions} [options] Builder options
     * @param {StakedState} options.stakedState Current account staked state
     * @param {Network} options.feeConfig Network the transaction belongs to
     * @param {Network} [options.network=Mainnet] Network of the transaction
     * @memberof UnbondTransactionBuilder
     */
    public constructor(options: WithdrawUnbondedTransactionBuilderOptions) {
        super();

        ow(options, 'options', owWithdrawUnbondedTransactionBuilderOptions);

        this.stakedState = options.stakedState;
        this.feeConfig = options.feeConfig;
        this.initNetwork(options.network);
    }

    /**
     * Returns staked state
     * @returns {string} stakingAddress
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public getStakedState(): Readonly<StakedState> {
        return this.stakedState;
    }

    /**
     * Returns fee configuration
     * @returns {FeeConfig} fee configuration
     * @memberof WithdrawUnbondedTransactionBuilder
     */
    public getFeeConfig(): Readonly<FeeConfig> {
        return this.feeConfig;
    }

    /**
     * Append an output to the builder.
     *
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

        if (
            output.validFrom &&
            output.validFrom.toNumber() !== this.stakedState.unbondedFrom
        ) {
            throw new Error(
                'Output valid from must be the same as staked state unbonded from',
            );
        }

        const totalOutputAmount = this.getTotalOutputAmount();
        if (!this.canUnbondedCover(totalOutputAmount.plus(output.value))) {
            throw new Error('Output amount exceed unbonded amount');
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

    private canUnbondedCover(targetAmount: BigNumber) {
        return this.stakedState.unbonded.isGreaterThanOrEqualTo(targetAmount);
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

    private isRawTxPrepared(): boolean {
        return !!this.unsignedRawTx;
    }

    private prepareRawTx() {
        const {
            unsignedRawTx,
            txId,
        } = native.stakingTransaction.buildRawWithdrawUnbondedTransaction({
            stakingAddress: this.stakedState.address,
            nonce: this.stakedState.nonce,
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

        return native.stakingTransaction.withdrawUnbondedTransactionToHex(
            this.unsignedRawTx,
            JSON.stringify(parseStakedStateForNative(this.stakedState)),
            this.keyPair!.toObject(),
            parseFeeConfigForNative(this.feeConfig),
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
}
