import ow from 'ow';
import BigNumber from 'bignumber.js';
import { URL } from 'url';
import { owCoin, owTransferAddress } from '../../types';
import { NetworkConfig } from '../../network';
import { FeeConfig } from '../../fee';
import { owOptionalNetworkConfig } from '../../network/types';
import { owOptionalFeeConfig } from '../../fee/types';

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

/**
 * Transaction output
 * @typedef {object} Output
 * @property {string} address output destination address
 * @property {BigNumber} value output value in CRO basic unit
 * @property {Date} validFrom output valid from
 */
export interface Output {
    address: string;
    value: BigNumber;
    validFrom?: Date;
}

export const owOutput = ow.object.exactShape({
    address: owTransferAddress,
    value: owCoin,
    validFrom: ow.optional.date,
});

export const owTxId = ow.string.matches(/^[0-9A-Fa-f]{64}$/);

export const owInput = ow.object.exactShape({
    prevTxId: owTxId,
    prevIndex: ow.number.integer.greaterThanOrEqual(0),
    prevOutput: owOutput,
});

export type TransferTransactionBuilderOptions = {
    network?: NetworkConfig;
    feeConfig?: FeeConfig;
};

export const owTransferTransactionBuilderOptions = ow.optional.object.exactShape(
    {
        network: owOptionalNetworkConfig,
        feeConfig: owOptionalFeeConfig,
    },
);

const isURL = (url: string): boolean => {
    try {
        // eslint-disable-next-line no-new
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
};

export const owOptionalTendermintAddress = ow.optional.string.validate(
    (value: string) => ({
        validator: /^(http|ws)s?/.test(value) && isURL(value),
        message: 'Expected value to be HTTP or WS tendermint address',
    }),
);
