import ow from 'ow';
import BigNumber from 'bignumber.js';

import { owDevnetOptions, NetworkConfig, DevnetOptions } from './types';
import { FeeAlgorithm } from '../fee';

/**
 * Network enums
 *
 * @export
 * @readonly
 * @enum {string} Network name
 */
export enum NetworkEnum {
    Mainnet = 'Mainnet',
    Testnet = 'Testnet',
    Devnet = 'Devnet',
}

/**
 * Mainnet constants
 *
 * @const {object}
 * @export
 * @type {NetworkConfig}
 */
export const Mainnet: NetworkConfig = {
    name: NetworkEnum.Mainnet,
    chainId: Buffer.from('2A', 'hex'),
    addressPrefix: 'cro',
    feeConfig: {
        algorithm: FeeAlgorithm.LinearFee,
        constant: new BigNumber(1000),
        coefficient: new BigNumber(1001),
    },
};

/**
 * Testnet constants
 *
 * @const {object}
 * @export
 * @type {NetworkConfig}
 */
export const Testnet: NetworkConfig = {
    name: NetworkEnum.Testnet,
    chainId: Buffer.from('42', 'hex'),
    addressPrefix: 'tcro',
    feeConfig: {
        algorithm: FeeAlgorithm.LinearFee,
        constant: new BigNumber(1000),
        coefficient: new BigNumber(1001),
    },
};

/**
 * Generate Devnet constants with the provided chainId
 *
 * @export
 * @param {DevnetOptions} options Devnet options
 * @returns {NetworkConfig} Devnet constants
 */
export const Devnet = (options: DevnetOptions): NetworkConfig => {
    ow(options, 'options', owDevnetOptions);

    const chainId =
        typeof options.chainId === 'string'
            ? Buffer.from(options.chainId, 'hex')
            : options.chainId;

    return {
        name: NetworkEnum.Devnet,
        addressPrefix: 'dcro',
        ...options,
        chainId,
    };
};

/**
 * Get network constants from given chainId
 *
 * @param {Buffer} chainId two hex characters chainId
 * @returns {NetworkConfig} Network constants
 */
export const fromChainId = (chainId: Buffer): NetworkConfig => {
    switch (chainId.toString('hex').toUpperCase()) {
        case '2A':
            return Mainnet;
        case '42':
            return Testnet;
        default:
            return Devnet({
                chainId,
            });
    }
};
