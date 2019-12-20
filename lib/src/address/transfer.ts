import ow from 'ow';
import KeyPair from '../key_pair';
import { CustomTypes, Network } from '../types';

const native = require('../../../native');

export default function transfer(options: TransferOptions): string {
    ow(
        options,
        ow.any(
            ow.object.exactShape({
                publicKey: ow.buffer,
                network: CustomTypes.Network,
            }),
            ow.object.exactShape({
                keyPair: CustomTypes.KeyPair,
                network: CustomTypes.Network,
            }),
        ),
    );

    let publicKey: Buffer;
    if (options.keyPair) {
        if (!options.keyPair.hasPublicKey()) {
            throw new Error('Missing public key in KeyPair');
        }
        publicKey = options.keyPair.publicKey as Buffer;
    } else {
        publicKey = options.publicKey as Buffer;
    }

    return native.address.getTransferAddressFromPublicKey(publicKey, options.network);
}

export interface TransferOptions {
    publicKey?: Buffer;
    keyPair?: KeyPair;
    network: Network;
}
