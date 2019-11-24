import ow from 'ow';
import KeyPair from '../key_pair';
import { CustomTypes, Network } from '../types';

const native = require('../../../native');

export default function staking(options: StakingOptions): string {
    ow(
        options,
        ow.any(
            ow.object.exactShape({
                publicKey: ow.buffer,
            }),
            ow.object.exactShape({
                keyPair: CustomTypes.KeyPair,
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
