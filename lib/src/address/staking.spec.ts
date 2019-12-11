import 'mocha';
import { expect } from 'chai';

import KeyPair from '../key_pair/key_pair';
import staking from './staking';

describe('staking', () => {
    it('should throw TypeError when neither KeyPair and PublicKey is provided', () => {
        expect(() => staking({})).to.throw(
            'Expected property `publicKey` to be of type `Buffer` but received type `undefined`',
        );
    });

    it('should throw Error when KeyPair has no public key', () => {
        const keyPair = new KeyPair();

        expect(() =>
            staking({
                keyPair,
            }),
        ).to.throw('Missing public key in KeyPair');
    });

    it('should return staking address from Public Key', () => {
        const publicKey = Buffer.from(
            '0492c14d055927997160e7db0842f1e58e6b5891871320a2df7082b931c3cf875a83ec3c22909c862c788b69988a89ed32e2d4819996020d8ebcddbe040da1a850',
            'hex',
        );

        expect(
            staking({
                publicKey,
            }),
        ).to.eq('0xb5698ee21f69a6184afbe59b3626ed9d4bd755b0');
    });

    it('should return staking address from Public Key in KeyPair', () => {
        const keyPair = KeyPair.fromPublicKey(
            Buffer.from(
                '0492c14d055927997160e7db0842f1e58e6b5891871320a2df7082b931c3cf875a83ec3c22909c862c788b69988a89ed32e2d4819996020d8ebcddbe040da1a850',
                'hex',
            ),
        );

        expect(
            staking({
                keyPair,
            }),
        ).to.eq('0xb5698ee21f69a6184afbe59b3626ed9d4bd755b0');
    });
});
