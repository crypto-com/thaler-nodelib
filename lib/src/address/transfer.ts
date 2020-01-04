import ow from 'ow';

import { KeyPair } from '../key_pair';
import { owKeyPair } from '../key_pair/types';
import { owNetworkConfig, NetworkConfig } from '../network/types';

const native = require('../../../native');

/**
 * Create a transfer address from a public key
 * @param options Options of the transfer address
 * @param [options.publicKey] Public key to create with
 * @param [options.keyPair] KeyPair with public key to create with
 * @param options.network Network the transfer address belongs to
 */
export function transfer(options: TransferOptions): string {
    ow(
        options,
        ow.any(
            ow.object.exactShape({
                publicKey: ow.buffer,
                network: owNetworkConfig,
            }),
            ow.object.exactShape({
                keyPair: owKeyPair,
                network: owNetworkConfig,
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
        options.network.name,
    );
}

export interface TransferOptions {
    publicKey?: Buffer;
    keyPair?: KeyPair;
    network: NetworkConfig;
}
