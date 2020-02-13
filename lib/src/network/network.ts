export enum Network {
    Mainnet = 'Mainnet',
    Testnet = 'Testnet',
    Devnet = 'Devnet',
}

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
