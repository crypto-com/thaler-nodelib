import 'mocha';
import { expect } from 'chai';

import { KeyPair } from '../key_pair';
import { transfer } from './transfer';
import { Mainnet, Devnet } from '../network';
import { FeeConfig, FeeAlgorithm } from '../fee';
import { BigNumber } from '../utils';

describe('transfer', () => {
    const ANY_FEE_CONFIG: FeeConfig = {
        algorithm: FeeAlgorithm.LinearFee,
        constant: new BigNumber(1.1),
        coefficient: new BigNumber(1.25),
    };

    it('should throw TypeError when neither KeyPair and PublicKey is provided', () => {
        const network = Mainnet;

        expect(() =>
            transfer({
                network,
            }),
        ).to.throw(
            'Expected property `publicKey` to be of type `Buffer` but received type `undefined`',
        );
    });

    it('should throw Error when KeyPair has no public key', () => {
        const keyPair = new KeyPair();
        const network = Mainnet;

        expect(() =>
            transfer({
                keyPair,
                network,
            }),
        ).to.throw('Missing public key in KeyPair');
    });

    it('should return Transfer address from Public Key', () => {
        const publicKey = Buffer.from(
            '041ff5820f619d51663efbb233eb03bd5d434f63c352a5633717d8b570daa43c190bddc906ed9b8601c10c2b58e347f6e1cc4035b391b98be1d9afa9c5ead9423b',
            'hex',
        );
        const network = Devnet({
            feeConfig: ANY_FEE_CONFIG,
            chainHexId: 'AB',
        });

        expect(
            transfer({
                publicKey,
                network,
            }),
        ).to.eq(
            'dcro1qkwn2jde2cq5e6ef6jd0s60y24vxc9zdv5ejp0kyy7d6td7n2kdqyq4n4v',
        );
    });

    it('should return Transfer address from Public Key in KeyPair', () => {
        const keyPair = KeyPair.fromPublicKey(
            Buffer.from(
                '041ff5820f619d51663efbb233eb03bd5d434f63c352a5633717d8b570daa43c190bddc906ed9b8601c10c2b58e347f6e1cc4035b391b98be1d9afa9c5ead9423b',
                'hex',
            ),
        );
        const network = Devnet({
            feeConfig: ANY_FEE_CONFIG,
            chainHexId: 'AB',
        });

        expect(
            transfer({
                keyPair,
                network,
            }),
        ).to.eq(
            'dcro1qkwn2jde2cq5e6ef6jd0s60y24vxc9zdv5ejp0kyy7d6td7n2kdqyq4n4v',
        );
    });

    it('should return Transfer address based on network', () => {
        const publicKey = Buffer.from(
            '043f1d17afa4b881bfdbcee2d82c0f278f09b433b0ddb14ca93fb7cb8d1e16b4b74d9f83587966a9c20243b75b828535b180557302bfd68a0cb37c3fd906b456e8',
            'hex',
        );
        const network = Mainnet;

        expect(
            transfer({
                publicKey,
                network,
            }),
        ).to.eq(
            'cro12mpa9cpru8gn6nhl2edf5rn75yp7mjr7x4wcp4szz6zrs88yquhq95hkw4',
        );
    });
});
