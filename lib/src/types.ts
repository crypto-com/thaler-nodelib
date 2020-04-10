import BigNumber from 'bignumber.js';
import ow from 'ow';
import { URL } from 'url';

import { MAX_COIN_BN, MAX_COIN_FORMATTED } from './init';
import { NetworkEnum } from './network/network';
import { Timespec, owOptionalTimespec } from './types/timespec';

const native = require('../../native');

export { Timespec };

export const owBigNumber = ow.object.validate((value: object) => ({
    validator: BigNumber.isBigNumber(value),
    message: 'Expected value to be a BigNumber',
}));

export const owCoin = ow.object.validate((value: object) => ({
    validator:
        BigNumber.isBigNumber(value) &&
        value.isInteger() &&
        value.isGreaterThanOrEqualTo(0) &&
        value.isLessThanOrEqualTo(MAX_COIN_BN),
    message: `Expected value to be within maximum coin: ${MAX_COIN_FORMATTED}`,
}));

const validateTransferAddress = (value: string): boolean => {
    let network: NetworkEnum;
    if (value.startsWith('cro')) {
        network = NetworkEnum.Mainnet;
    } else if (value.startsWith('tcro')) {
        network = NetworkEnum.Testnet;
    } else if (value.startsWith('dcro')) {
        network = NetworkEnum.Devnet;
    } else {
        return false;
    }

    return native.address.isTransferAddressValid(value, network);
};

export const owTransferAddress = ow.string.validate((value: string) => ({
    validator: validateTransferAddress(value),
    message: 'Expected value to be a valid transfer address',
}));

const validateStakingAddress = (value: string): boolean => {
    return native.address.isStakingAddressValid(value);
};

export const owStakingAddress = ow.string.validate((value: string) => ({
    validator: validateStakingAddress(value),
    message: 'Expected value to be a valid staking address',
}));

export const owViewKey = ow.buffer.validate((value: Buffer) => ({
    validator: native.keyPair.isValidViewKey(value),
    message: 'Expected value to be a valid view key',
}));

export type PublicKey = Buffer;

export type ViewKey = Buffer;

const isURL = (url: string): boolean => {
    try {
        // eslint-disable-next-line no-new
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
};

export const owTendermintAddress = ow.string.validate((value: string) => ({
    validator: /^(http|ws)s?/.test(value) && isURL(value),
    message: 'Expected value to be HTTP or WS tendermint address',
}));

/**
 * Transaction output
 * @typedef {object} Output
 * @property {string} address output destination address
 * @property {BigNumber} value output value in basic unit
 * @property {Timespec} validFrom output valid from
 */
export interface Output {
    address: string;
    value: BigNumber;
    validFrom?: Timespec;
}

export const parseOutputForNative = (output: Output): NativeOutput => {
    const nativeOutput: NativeOutput = {
        address: output.address,
        value: output.value.toString(10),
    };
    if (output.validFrom) {
        nativeOutput.validFrom = output.validFrom.toNumber();
    }

    return nativeOutput;
};

export interface NativeOutput {
    address: string;
    value: string;
    validFrom?: number;
}

export const owOutput = ow.object.exactShape({
    address: owTransferAddress,
    value: owCoin,
    validFrom: owOptionalTimespec,
});

/**
 * Transaction input
 * @typedef {object} Input
 * @property {string} prevTxId previous transaction Id
 * @property {number} prevIndex previous transaction output index
 * @property {Output} prevOutput previous transaction output
 */
export interface Input {
    prevTxId: string;
    prevIndex: number;
    prevOutput: Output;
}

interface NativeInput {
    prevTxId: string;
    prevIndex: number;
    prevOutput: NativeOutput;
}

export const parseInputForNative = (input: Input): NativeInput => {
    return {
        ...input,
        prevOutput: parseOutputForNative(input.prevOutput),
    };
};

export const owTxId = ow.string.matches(/^[0-9A-Fa-f]{64}$/);

export const owInput = ow.object.exactShape({
    prevTxId: owTxId,
    prevIndex: ow.number.integer.greaterThanOrEqual(0),
    prevOutput: owOutput,
});

export const owUnixTimestamp = ow.number.integer;

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
        securityContact?: string;
        consensusPubkey: {
            type: string;
            value: string;
        };
    };
}

export const owAccountNonce = ow.number.int16;

export const owStakedState = ow.object.exactShape({
    nonce: owAccountNonce,
    bonded: owBigNumber,
    unbonded: owBigNumber,
    unbondedFrom: owUnixTimestamp,
    address: owStakingAddress,
    punishment: ow.optional.object.exactShape({
        kind: ow.string,
        jailedUntil: owUnixTimestamp,
        slashAmount: owBigNumber,
    }),
    councilNode: ow.optional.object.exactShape({
        name: ow.string,
        securityContact: ow.optional.string,
        consensusPubkey: ow.object.exactShape({
            type: ow.string,
            value: ow.string,
        }),
    }),
});

/* eslint-disable camelcase */
export interface NativeStakedState {
    nonce: number;
    bonded: string;
    unbonded: string;
    unbonded_from: number;
    address: string;
    punishment?: {
        kind: string;
        jailed_until: number;
        slash_amount: string;
    };
    council_node?: {
        name: string;
        security_contact?: string;
        consensus_pubkey: {
            type: string;
            value: string;
        };
    };
}
/* eslint-enable camelcase */

export const parseStakedStateForNative = (
    stakedState: StakedState,
): NativeStakedState => {
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
};

/* eslint-disable camelcase */
export const parseStakedStateForNodelib = (
    stakedState: NativeStakedState,
): StakedState => {
    return {
        nonce: stakedState.nonce,
        bonded: new BigNumber(stakedState.bonded),
        unbonded: new BigNumber(stakedState.unbonded),
        unbondedFrom: stakedState.unbonded_from,
        address: stakedState.address,
        punishment: stakedState.punishment
            ? {
                  kind: stakedState.punishment!.kind,
                  jailedUntil: stakedState.punishment!.jailed_until,
                  slashAmount: new BigNumber(
                      stakedState.punishment!.slash_amount,
                  ),
              }
            : undefined,
        councilNode: stakedState.council_node
            ? {
                  name: stakedState.council_node!.name,
                  securityContact: stakedState.council_node!.security_contact,
                  consensusPubkey: stakedState.council_node!.consensus_pubkey,
              }
            : undefined,
    };
};
/* eslint-enable camelcase */
