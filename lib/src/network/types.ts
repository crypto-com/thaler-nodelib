import ow from 'ow';
import { FeeConfig } from '../fee';
import { NetworkEnum } from './network';
import { owFeeConfig } from '../fee/types';

/**
 * @typedef {object} NetworkConfig
 * @property {string} name Name of the network
 * @property {string} addressPrefix Prefix of the bech32 transfer address
 * @property {Buffer} chainId Two hex characters chainId
 * @property {FeeConfig} [feeConfig] Default fee configuration
 */
export type NetworkConfig = MainnetConfig | TestnetConfig | DevnetConfig;

export type MainnetConfig = FullNetworkConfig & {
    name: NetworkEnum.Mainnet;
};

export type TestnetConfig = FullNetworkConfig & {
    name: NetworkEnum.Testnet;
};

export type FullNetworkConfig = {
    name: string;
    chainId: Buffer;
    addressPrefix: string;
    bip44Path: string;
    feeConfig: FeeConfig;
};

export type DevnetConfig = {
    name: NetworkEnum.Devnet;
    chainId: Buffer;
    addressPrefix: string;
    bip44Path: string;
};

export interface DevnetOptions {
    chainId: Buffer | string;
}

const owNetworkEnumValidateFn = (value: any) => ({
    validator: value === 'Mainnet' || value === 'Testnet' || value === 'Devnet',
    message:
        'Expected value to be one of the network variants (Mainnet, Testnet, Devnet)',
});

export const owNetworkEnum = ow.string.validate(owNetworkEnumValidateFn);
export const owOptionalNetworkEnum = ow.optional.string.validate(
    owNetworkEnumValidateFn,
);

const owMainnet = ow.object
    .exactShape({
        name: owNetworkEnum,
        chainId: ow.buffer,
        addressPrefix: ow.string,
        bip44Path: ow.string,
        feeConfig: owFeeConfig,
    })
    .validate((value: any) => ({
        validator: value.name === NetworkEnum.Mainnet,
        message: `Expected network name to be ${NetworkEnum.Mainnet}`,
    }));
const owTestnet = ow.object
    .exactShape({
        name: owNetworkEnum,
        chainId: ow.buffer,
        addressPrefix: ow.string,
        bip44Path: ow.string,
        feeConfig: owFeeConfig,
    })
    .validate((value: any) => ({
        validator: value.name === NetworkEnum.Testnet,
        message: `Expected network name to be ${NetworkEnum.Testnet}`,
    }));
const owDevnet = ow.object
    .exactShape({
        name: owNetworkEnum,
        chainId: ow.buffer,
        addressPrefix: ow.string,
        bip44Path: ow.string,
    })
    .validate((value: any) => ({
        validator: value.name === NetworkEnum.Devnet,
        message: `Expected network name to be ${NetworkEnum.Devnet}`,
    }));

export const owNetworkConfig = ow.any(owMainnet, owTestnet, owDevnet);
export const owOptionalNetworkConfig = ow.optional.any(
    owMainnet,
    owTestnet,
    owDevnet,
);

const owChainIdStr = ow.string.validate((value: any) => ({
    validator: /^[0-9a-fA-F]{2}$/.test(value),
    message: 'Expected value to be two hex characters of chain Id',
}));
const owChainIdBuffer = ow.buffer.validate((value: any) => ({
    validator: /^[0-9a-fA-F]{2}$/.test(value.toString('hex')),
    message: 'Expected value to be two hex characters of chain Id',
}));
export const owChainId = ow.any(owChainIdStr, owChainIdBuffer);
export const owOptionalChainId = ow.optional.any(owChainIdStr, owChainIdBuffer);

export const owDevnetOptions = ow.object.exactShape({
    chainId: owChainId,
});
