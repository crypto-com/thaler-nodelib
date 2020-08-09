import ow from 'ow';

import { KeyPair } from './key_pair';

/**
 * @internal
 */
export const owKeyPair = ow.object.validate((value: any) => ({
    validator: value instanceof KeyPair,
    message: `Expected value to be an instance of KeyPair, got ${value.constructor.name}`,
}));
