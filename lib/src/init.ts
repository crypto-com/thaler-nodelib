import BigNumber from 'bignumber.js';

export const MAX_COIN = '10000000000000000000';

export const MAX_COIN_BN = new BigNumber(MAX_COIN);

export const MAX_COIN_FORMATTED = MAX_COIN_BN.toFormat({
    decimalSeparator: '.',
    groupSeparator: ',',
    groupSize: 3,
});

export const MAX_CRO = '100000000000';

export const MAX_CRO_BN = new BigNumber(MAX_CRO);

export const MAX_CRO_FORMATTED = MAX_CRO_BN.toFormat({
    decimalSeparator: '.',
    groupSeparator: ',',
    groupSize: 3,
});
