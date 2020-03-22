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
    chainHexId: Buffer.from('2A', 'hex'),
    addressPrefix: 'cro',
    bip44Path: "m/44'/394'/{ACCOUNT}'/0/{INDEX}",
    feeConfig: {
        algorithm: FeeAlgorithm.LinearFee,
        constant: new BigNumber(1100),
        coefficient: new BigNumber(1250),
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
    chainHexId: Buffer.from('42', 'hex'),
    addressPrefix: 'tcro',
    bip44Path: "m/44'/1'/{ACCOUNT}'/0/{INDEX}",
    feeConfig: {
        algorithm: FeeAlgorithm.LinearFee,
        constant: new BigNumber(1100),
        coefficient: new BigNumber(1250),
    },
};

/**
 * Generate Devnet constants with the provided chainHexId
 *
 * @export
 * @param {DevnetOptions} options Devnet options
 * @returns {NetworkConfig} Devnet constants
 */
export const Devnet = (options: DevnetOptions): NetworkConfig => {
    ow(options, 'options', owDevnetOptions);

    const chainHexId =
        typeof options.chainHexId === 'string'
            ? Buffer.from(options.chainHexId, 'hex')
            : options.chainHexId;

    return {
        name: NetworkEnum.Devnet,
        addressPrefix: 'dcro',
        bip44Path: "m/44'/1'/{ACCOUNT}'/0/{INDEX}",
        ...options,
        chainHexId,
    };
};

/**
 * Get network constants from given chainHexId
 *
 * @param {Buffer} chainHexId two hex characters chainHexId
 * @returns {NetworkConfig} Network constants
 */
export const fromChainId = (chainHexId: Buffer): NetworkConfig => {
    switch (chainHexId.toString('hex').toUpperCase()) {
        case '2A':
            return Mainnet;
        case '42':
            return Testnet;
        default:
            return Devnet({
                chainHexId,
            });
    }
};
