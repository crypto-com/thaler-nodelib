import ow from 'ow';

import { KeyPair } from '../key_pair';
import { owKeyPair } from '../key_pair/types';
import { Network } from '../network';
import { owNetwork } from '../network/types';

const native = require('../../../native');

export function transfer(options: TransferOptions): string {
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

    return native.address.getTransferAddressFromPublicKey(
        publicKey,
        options.network,
    );
}

export interface TransferOptions {
    publicKey?: Buffer;
    keyPair?: KeyPair;
    network: Network;
}
