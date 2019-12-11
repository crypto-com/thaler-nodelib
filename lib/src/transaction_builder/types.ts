import ow from 'ow';
import BigNumber from 'bignumber.js';
import { owTransferAddress, owCoin } from '../types';
import { owOptionalNetwork, owOptionalChainId, Network } from '../network';

export interface Input {
    prevTxId: string;
    prevIndex: number;
    prevOutput: Output;
}

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

export type FeeConfig =
    | LinearFeeConfig
    | {
          algorithm: FeeAlgorithm;
      };
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

export const owTransferTransactionBuilderOptions = ow.optional.object.exactShape({
    network: owOptionalNetwork,
    chainId: owOptionalChainId,
    feeConfig: owOptionalFeeConfig,
});
