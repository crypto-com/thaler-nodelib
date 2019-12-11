import ow from 'ow';

import { KeyPair } from '../key_pair';
import { owKeyPair } from '../key_pair/types';

const native = require('../../../native');

/**
 * Create a staking address from a public key
 * @param options Options of the staking address
 * @param [options.publicKey] Public key to create with
 * @param [options.keyPair] KeyPair with public key to create with
 */
export function staking(options: StakingOptions): string {
    ow(
        options,
        ow.any(
            ow.object.exactShape({
                publicKey: ow.buffer,
            }),
            ow.object.exactShape({
                keyPair: owKeyPair,
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

    return native.address.getStakingAddressFromPublicKey(publicKey);
}

export interface StakingOptions {
    publicKey?: Buffer;
    keyPair?: KeyPair;
}
