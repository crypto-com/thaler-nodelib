import BigNumber from 'bignumber.js';
import ow from 'ow';

import { NetworkConfig } from '../../network';
import { owOptionalNetworkConfig } from '../../network/types';
import {
    owCoin,
    owTxId,
    owStakedState,
    Output,
    StakedState,
    Timespec,
    owAccountNonce,
    owTransferAddress,
    owStakingAddress,
} from '../../types';
import { FeeConfig } from '../../fee';
import { owFeeConfig } from '../../fee/types';
import { owTimespec } from '../../types/timespec';

// TODO: Change transfer transaction builder to use this interface
/**
 * Transaction output pointer
 * @typedef {object} TxoPointer
 * @property {string} txId previous transaction Id
 * @property {number} index previous transaction output index
 */
export interface PrevOutputPointer {
    prevTxId: string;
    prevIndex: number;
}

/**
 * Deposit Transaction input
 * @typedef {object} Input
 * @property {PrevOutputPointer} prevOutputPointer previous output pointer
 * @property {Buffer} witness witness associated to the input
 */
export interface WitnessedPrevOutputPointer {
    prevOutputPointer: PrevOutputPointer;
    witness?: Buffer;
}

export const owPrevOutputPointer = ow.object.exactShape({
    prevTxId: owTxId,
    prevIndex: ow.number.uint16,
});

export interface DepositTransactionBuilderOptions {
    stakingAddress: string;
    network?: NetworkConfig;
}

export const owDepositTransactionOptions = ow.object.exactShape({
    stakingAddress: owStakingAddress,
    network: owOptionalNetworkConfig,
});

export interface UnbondTransactionBuilderOptions {
    stakingAddress: string;
    nonce: number;
    amount: BigNumber;
    network?: NetworkConfig;
}

export const owUnbondTransactionBuilderOptions = ow.object.exactShape({
    stakingAddress: owStakingAddress,
    nonce: owAccountNonce,
    amount: owCoin,
    network: owOptionalNetworkConfig,
});

export interface WithdrawUnbondedTransactionBuilderOptions {
    stakedState: StakedState;
    feeConfig: FeeConfig;
    network?: NetworkConfig;
}

export const owWithdrawUnbondedTransactionBuilderOptions = ow.object.exactShape(
    {
        stakedState: owStakedState,
        feeConfig: owFeeConfig,
        network: owOptionalNetworkConfig,
    },
);

export interface WithdrawUnbondedOutput extends Output {
    validFrom: Timespec;
}

export const owWithdrawUnbondedOutput = ow.object.exactShape({
    address: owTransferAddress,
    value: owCoin,
    validFrom: owTimespec,
});
