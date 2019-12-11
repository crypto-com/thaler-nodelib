import ow from 'ow';

const owNetworkValidateFn = (value: any) => ({
    validator: value === 'Mainnet' || value === 'Testnet' || value === 'Devnet',
    message:
        'Expected value to be one of the network variants (Mainnet, Testnet, Devnet)',
});

export const owNetwork = ow.string.validate(owNetworkValidateFn);

export const owOptionalNetwork = ow.optional.string.validate(
    owNetworkValidateFn,
);

export const owChainId = ow.string.matches(/^[0-9a-zA-Z]{2}$/);

export const owOptionalChainId = ow.optional.string.matches(/^[0-9a-zA-Z]{2}$/);
