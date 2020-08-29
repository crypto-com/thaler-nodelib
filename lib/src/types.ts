/**
 * @packageDocumentation
 * @module Root
 */
import BigNumber from 'bignumber.js';
import ow from 'ow';
import { URL } from 'url';

import { MAX_COIN_BN, MAX_COIN_FORMATTED } from './init';
import { NetworkEnum } from './network/network';
import { Timespec, owOptionalTimespec } from './types/timespec';

const native = require('../../native');

export { Timespec };

/**
 * @internal
 */
export const owBigNumber = ow.object.validate((value: object) => ({
    validator: BigNumber.isBigNumber(value),
    message: 'Expected value to be a BigNumber',
}));

/**
 * @internal
 */
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

/**
 * @internal
 */
export const owTransferAddress = ow.string.validate((value: string) => ({
    validator: validateTransferAddress(value),
    message: 'Expected value to be a valid transfer address',
}));

/**
 * @internal
 */
const validateStakingAddress = (value: string): boolean => {
    return native.address.isStakingAddressValid(value);
};

/**
 * @internal
 */
export const owStakingAddress = ow.string.validate((value: string) => ({
    validator: validateStakingAddress(value),
    message: 'Expected value to be a valid staking address',
}));

/**
 * @internal
 */
export const owViewKey = ow.buffer.validate((value: Buffer) => ({
    validator: native.keyPair.isValidViewKey(value),
    message: 'Expected value to be a valid view key',
}));

const isURL = (url: string): boolean => {
    try {
        // eslint-disable-next-line no-new
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
};

/**
 * @internal
 */
export const owTendermintAddress = ow.string.validate((value: string) => ({
    validator: /^(ws)s?/.test(value) && isURL(value),
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

/**
 * @internal
 */
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

/**
 * @internal
 */
export interface NativeOutput {
    address: string;
    value: string;
    validFrom?: number;
}

/**
 * @internal
 */
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
    addressParams: InputAddressParams;
}

/**
 * @internal
 */
interface NativeInput {
    prevTxId: string;
    prevIndex: number;
    prevOutput: NativeOutput;
    addressParams: InputAddressParams;
}

export interface InputAddressParams {
    requiredSigners: number;
    totalSigners: number;
}

/**
 * @internal
 */
export const parseInputForNative = (input: Input): NativeInput => {
    return {
        ...input,
        prevOutput: parseOutputForNative(input.prevOutput),
    };
};

/**
 * @internal
 */
export const owTxId = ow.string.matches(/^[0-9A-Fa-f]{64}$/);

/**
 * @internal
 */
export const owInputAddressParams = ow.object
    .exactShape({
        requiredSigners: ow.number.integer.greaterThan(0),
        totalSigners: ow.number.integer.greaterThan(0),
    })
    .validate((value: object) => ({
        validator:
            (value as InputAddressParams).totalSigners >=
            (value as InputAddressParams).requiredSigners,
        message:
            'Total signers should be greater than or equal to required signers',
    }));

/**
 * @internal
 */
export const owInput = ow.object.exactShape({
    prevTxId: owTxId,
    prevIndex: ow.number.integer.greaterThanOrEqual(0),
    prevOutput: owOutput,
    addressParams: owInputAddressParams,
});

/**
 * @internal
 */
export const owUnixTimestamp = ow.number.integer;

const bigNumberU64Max = new BigNumber(2).pow(64);
/**
 * @internal
 */
export const owAccountNonce = ow.object.validate((value: object) => ({
    validator:
        BigNumber.isBigNumber(value) &&
        value.isInteger() &&
        value.isGreaterThanOrEqualTo(0) &&
        value.isLessThanOrEqualTo(bigNumberU64Max),
    message: `Expected value to be positive BigNumber within maximum nonce: ${bigNumberU64Max.toString(
        10,
    )}`,
}));
