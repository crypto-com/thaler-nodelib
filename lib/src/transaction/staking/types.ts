import BigNumber from 'bignumber.js';
import ow from 'ow';

import { NetworkConfig } from '../../network';
import { owOptionalNetworkConfig } from '../../network/types';
import { owCoin, owTxId, owBigNumber, owUnixTimestamp } from '../../types';
import { FeeConfig } from '../../fee';
import { owFeeConfig } from '../../fee/types';

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
    stakingAddress: ow.string,
    network: owOptionalNetworkConfig,
});

export interface UnbondTransactionBuilderOptions {
    stakingAddress: string;
    nonce: number;
    amount: BigNumber;
    network?: NetworkConfig;
}

export const owUnbondTransactionBuilderOptions = ow.object.exactShape({
    stakingAddress: ow.string,
    nonce: ow.number.int16,
    amount: owCoin,
    network: owOptionalNetworkConfig,
});

// TODO: StakedState is only used in withdraw unbonded transaction builder.
// Enforce strict type checks when needed.
export interface StakedState {
    nonce: number;
    bonded: BigNumber;
    unbonded: BigNumber;
    unbondedFrom: number;
    address: string;
    punishment?: {
        kind: string;
        jailedUntil: number;
        slashAmount: BigNumber;
    };
    councilNode?: {
        name: string;
        securityContact: string;
        consensusPubkey: {
            type: string;
            value: string;
        };
    };
}

export const owStakedState = ow.object.exactShape({
    nonce: ow.number.int16,
    bonded: owBigNumber,
    unbonded: owBigNumber,
    unbondedFrom: owUnixTimestamp,
    address: ow.string,
    punishment: ow.optional.object.exactShape({
        kind: ow.string,
        jailedUntil: owUnixTimestamp,
        slashAmount: owBigNumber,
    }),
    councilNode: ow.optional.object.exactShape({
        name: ow.string,
        securityContact: ow.string,
        consensusPubkey: ow.object.exactShape({
            type: ow.string,
            value: ow.string,
        }),
    }),
});

export function parseStakedStateForNative(
    stakedState: StakedState,
): NativeStakedState {
    return {
        nonce: stakedState.nonce,
        bonded: stakedState.bonded.toString(10),
        unbonded: stakedState.unbonded.toString(10),
        unbonded_from: stakedState.unbondedFrom,
        address: stakedState.address,
        punishment: stakedState.punishment
            ? {
                  kind: stakedState.punishment.kind,
                  jailed_until: stakedState.punishment!.jailedUntil,
                  slash_amount: stakedState.punishment!.slashAmount.toString(
                      10,
                  ),
              }
            : undefined,
        council_node: stakedState.councilNode
            ? {
                  name: stakedState.councilNode!.name,
                  security_contact: stakedState.councilNode!.securityContact,
                  consensus_pubkey: stakedState.councilNode!.consensusPubkey,
              }
            : undefined,
    };
}

export interface NativeStakedState {
    nonce: number;
    bonded: string;
    unbonded: string;
    unbonded_from: number; // eslint-disable-line camelcase
    address: string;
    punishment?: {
        kind: string;
        jailed_until: number; // eslint-disable-line camelcase
        slash_amount: string; // eslint-disable-line camelcase
    };
    // eslint-disable-next-line camelcase
    council_node?: {
        name: string;
        security_contact: string; // eslint-disable-line camelcase
        // eslint-disable-next-line camelcase
        consensus_pubkey: {
            type: string;
            value: string;
        };
    };
}

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
