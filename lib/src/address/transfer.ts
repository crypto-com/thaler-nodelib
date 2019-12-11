import ow from 'ow';

import KeyPair from '../key_pair/key_pair';
import { owKeyPair } from '../key_pair/types';
import { owNetwork, Network } from '../network';

const native = require('../../../native');

export default function transfer(options: TransferOptions): string {
    ow(
        options,
        ow.any(
            ow.object.exactShape({
                publicKey: ow.buffer,
                network: owNetwork,
            }),
            ow.object.exactShape({
                keyPair: owKeyPair,
                network: owNetwork,
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
