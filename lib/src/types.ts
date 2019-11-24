import ow from 'ow';
import KeyPair from './key_pair';

export enum Network {
    Mainnet = 'Mainnet',
    Testnet = 'Testnet',
    Devnet = 'Devnet',
}

export const CustomTypes = {
    KeyPair: ow.object.validate((value) => ({
        validator: value instanceof KeyPair,
        message: `Expected value to be an instance of KeyPair, got ${value.constructor.name}`,
    })),
    Network: ow.string.validate((value) => ({
        validator: value === 'Mainnet' || value === 'Testnet' || value === 'Devnet',
        message: `Expected value to be one of the network variants (Mainnet, Testnet, Devnet)`,
    })),
};
