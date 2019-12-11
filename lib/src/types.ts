import ow from 'ow';
import BigNumber from 'bignumber.js';

import { Network } from './network';

const native = require('../../native');

export const owBigNumber = ow.object.validate((value: object) => ({
    validator: BigNumber.isBigNumber(value),
    message: 'Expected value to be a BigNumber',
}));

const validateTransferAddress = (value: string): boolean => {
    let network: Network;
    if (value.startsWith('cro')) {
        network = Network.Mainnet;
    } else if (value.startsWith('tcro')) {
        network = Network.Testnet;
    } else if (value.startsWith('dcro')) {
        network = Network.Devnet;
    } else {
        return false;
    }

    return native.address.isTransferAddressValid(value, network);
};

export const owTransferAddress = ow.string.validate((value: string) => ({
    validator: validateTransferAddress(value),
    message: 'Expected value to be a valid transfer address',
}));

export const owViewKey = ow.buffer.validate((value: Buffer) => ({
    validator: native.keyPair.isValidViewKey(value),
    message: 'Expected value to be a valid view key',
}));

export type PublicKey = Buffer;

export type ViewKey = Buffer;
