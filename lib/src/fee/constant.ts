import BigNumber from 'bignumber.js';
import { FeeAlgorithm, FeeConfig } from './types';

export const ZERO_LINEAR_FEE: FeeConfig = {
    algorithm: FeeAlgorithm.LinearFee,
    constant: new BigNumber(0),
    coefficient: new BigNumber(0),
};
