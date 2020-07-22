import 'mocha';
import { expect } from 'chai';
import { KeyPair } from './key_pair';

describe('KeyPair', () => {
    const validPublicKey = (): Buffer =>
        Buffer.from(
            '04405f598dfbd9749d84da2084a9abcd165a4cfaf9045c51b4944a22b0a90ccce44d1b3583d296f70969b3279efcce6b5a0c0b98717e3d7fd8a5cbc8f6578e62df',
            'hex',
        );
    const validCompressedPublicKey = (): Buffer =>
        Buffer.from(
            '03405f598dfbd9749d84da2084a9abcd165a4cfaf9045c51b4944a22b0a90ccce4',
            'hex',
        );

    describe('fromPublicKey', () => {
        it('should throw Error when Public Key length is neither 65 nor 33', () => {
            const thirtyTwoBytesBuffer = Buffer.alloc(32, 0);
            expect(() => KeyPair.fromPublicKey(thirtyTwoBytesBuffer)).to.throw(
                'Deserialization error: Unable to deserialize public key from bytes',
            );

            const sixtySixBytesBuffer = Buffer.alloc(66, 0);
            expect(() => KeyPair.fromPublicKey(sixtySixBytesBuffer)).to.throw(
                'Deserialization error: Unable to deserialize public key from bytes',
            );
        });

        it('should throw Error when Public Key is invalid', () => {
            const invalidPublicKey = Buffer.alloc(65);
            validCompressedPublicKey().copy(invalidPublicKey);
            invalidPublicKey[0] = 15;

            expect(() => KeyPair.fromPublicKey(invalidPublicKey)).to.throw(
                'Deserialization error: Unable to deserialize public key from bytes',
            );
        });

        it('should return KeyPair with the provided PublicKey', () => {
            const publicKey = validPublicKey();
            const expectedCompressedPublicKey = validCompressedPublicKey();
            const keyPair = KeyPair.fromPublicKey(publicKey);

            expect(keyPair.hasPublicKey()).to.eq(true);
            expect(keyPair.publicKey.toString('hex')).to.eq(
                publicKey.toString('hex'),
            );
            expect(keyPair.compressedPublicKey.toString('hex')).to.eq(
                expectedCompressedPublicKey.toString('hex'),
            );
        });
    });

    describe('fromPrivateKey', () => {
        it('should throw Error when Private Key length is not 32', () => {
            expect(() => KeyPair.fromPrivateKey(Buffer.alloc(33, 0))).to.throw(
                'Deserialization error: Unable to deserialize secret key',
            );
        });

        it('should throw Error when Private Key is invalid', () => {
            expect(() => KeyPair.fromPrivateKey(Buffer.alloc(32, 0))).to.throw(
                'Deserialization error: Unable to deserialize secret key',
            );
        });

        it('should return KeyPair with the provided PrivateKey and corresponding PublicKey', () => {
            const privateKey = Buffer.alloc(32, 1);
            const keyPair = KeyPair.fromPrivateKey(privateKey);

            expect(keyPair.hasPublicKey()).to.eq(true);
            expect(keyPair.hasPrivateKey()).to.eq(true);
            expect(keyPair.privateKey).to.deep.eq(privateKey);
            expect(keyPair.publicKey).to.have.lengthOf(65);
            expect(keyPair.publicKey.toString('hex')).to.eq(
                '041b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f70beaf8f588b541507fed6a642c5ab42dfdf8120a7f639de5122d47a69a8e8d1',
            );
            expect(keyPair.compressedPublicKey).to.have.lengthOf(33);
            expect(keyPair.compressedPublicKey.toString('hex')).to.eq(
                '031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f',
            );
        });
    });

    describe('generateRandom', () => {
        it('should generate a new key pair', () => {
            const keyPair = KeyPair.generateRandom();

            expect(keyPair.hasPublicKey()).to.eq(true);
            expect(keyPair.hasPrivateKey()).to.eq(true);
        });

        it('should create unique key pair', () => {
            const firstKeyPair = KeyPair.generateRandom();
            const secondKeyPair = KeyPair.generateRandom();

            expect(firstKeyPair.publicKey).not.to.deep.eq(
                secondKeyPair.publicKey,
            );
            expect(firstKeyPair.compressedPublicKey).not.to.deep.eq(
                secondKeyPair.publicKey,
            );
            expect(firstKeyPair.privateKey).not.to.deep.eq(
                secondKeyPair.privateKey,
            );
        });
    });

    describe('toObject', () => {
        it('should transform the private public key pair into an object', () => {
            const keyPair = KeyPair.generateRandom();

            const obj = keyPair.toObject();
            expect(obj.publicKey).to.deep.eq(keyPair.publicKey);
            expect(obj.compressedPublicKey).to.deep.eq(
                keyPair.compressedPublicKey,
            );
            expect(obj.privateKey).to.deep.eq(keyPair.privateKey);
        });
    });
});
