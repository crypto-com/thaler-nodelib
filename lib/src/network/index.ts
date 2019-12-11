import ow from 'ow';

export enum Network {
    Mainnet = 'Mainnet',
    Testnet = 'Testnet',
    Devnet = 'Devnet',
}

const owNetworkValidateFn = (value: any) => ({
    validator: value === 'Mainnet' || value === 'Testnet' || value === 'Devnet',
    message: 'Expected value to be one of the network variants (Mainnet, Testnet, Devnet)',
});

export const owNetwork = ow.string.validate(owNetworkValidateFn);

export const owOptionalNetwork = ow.optional.string.validate(owNetworkValidateFn);

export const getChainIdByNetwork = (network: Network): string => {
    switch (network) {
        case Network.Mainnet:
            return '2A';
        case Network.Testnet:
            return '42';
        default:
            return '';
    }
};

export const getNetworkByChainId = (chainId: string): Network => {
    switch (chainId) {
        case '2A':
            return Network.Mainnet;
        case '42':
            return Network.Testnet;
        default:
            return Network.Devnet;
    }
};

export const owChainId = ow.string.matches(/^[0-9a-zA-Z]{2}$/);

export const owOptionalChainId = ow.optional.string.matches(/^[0-9a-zA-Z]{2}$/);
