import 'mocha';
import { expect } from 'chai';
import * as cro from '../lib/src';

const native = require('../native');

describe('ViewKey', () => {
    it('can create random view key', () => {
        const viewKey = cro.KeyPair.generateRandom();

        expect(
            native.keyPair.isValidViewKey(viewKey.compressedPublicKey),
        ).to.eq(true);
        expect(native.keyPair.isValidViewKey(viewKey.publicKey)).to.eq(true);
    });
});
