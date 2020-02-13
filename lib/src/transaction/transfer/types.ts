import ow from 'ow';
import BigNumber from 'bignumber.js';
import { URL } from 'url';
import { owCoin, owTransferAddress } from '../../types';
import { Network } from '../../network';
import { owOptionalNetwork, owOptionalChainId } from '../../network/types';

/**
 * Transaction input
 * @typedef Input
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
 * @typedef Output
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

// TODO: Mainnet Testnet Devnet types are not enforced because they are
// overridden by base
export type TransferTransactionBuilderOptions =
    | MainnetTransferTransactionBuilderOptions
    | TestnetTransferTransactionBuilderOptions
    | DevnetTransferTransactionBuilderOptions
    | BaseTransferTransactionBuilderOptions;
type MainnetTransferTransactionBuilderOptions = {
    network: Network.Mainnet;
    feeConfig?: FeeConfig;
};
type TestnetTransferTransactionBuilderOptions = {
    network: Network.Testnet;
    feeConfig?: FeeConfig;
};
type DevnetTransferTransactionBuilderOptions = {
    network: Network.Devnet;
    chainId: string;
    feeConfig?: FeeConfig;
};
type BaseTransferTransactionBuilderOptions = {
    network?: Network;
    chainId?: string;
    feeConfig?: FeeConfig;
};

export enum FeeAlgorithm {
    LinearFee = 'LinearFee',
}

/**
 * Transaction builder fee configuration
 * @typedef FeeConfig
 */
export type FeeConfig =
    | LinearFeeConfig
    | {
          algorithm: FeeAlgorithm;
      };
/**
 * Linear fee configuration
 * @typedef LinearFee
 */
export type LinearFeeConfig = {
    algorithm: FeeAlgorithm.LinearFee;
    constant: BigNumber;
    coefficient: BigNumber;
};

export const owFeeAlgorithm = ow.string.validate((value: string) => ({
    validator: Object.keys(FeeAlgorithm).includes(value),
    message: `Unsupported fee algorithm: ${value}`,
}));

const owLinearFeeMilli = ow.object.validate((value: object) => ({
    validator: BigNumber.isBigNumber(value) && value.isGreaterThanOrEqualTo(0),
    message: 'Expected value to be greater than or equal to 0',
}));
const owLinearFeeConfig = ow.object.exactShape({
    algorithm: owFeeAlgorithm,
    constant: owLinearFeeMilli,
    coefficient: owLinearFeeMilli,
});

const owOptionalFeeConfig = ow.optional.any(owLinearFeeConfig);

export const owTransferTransactionBuilderOptions = ow.optional.object.exactShape(
    {
        network: owOptionalNetwork,
        chainId: owOptionalChainId,
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
