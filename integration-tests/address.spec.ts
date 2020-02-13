import 'mocha';
import { expect } from 'chai';
import * as cro from '../lib/src';

describe('Address', () => {
    it('can create random transfer address', () => {
        const keyPair = cro.KeyPair.generateRandom();

        const address = cro.address.transfer({
            keyPair,
            network: cro.Network.Mainnet,
        });

        expect(address.startsWith('cro')).to.eq(true);
    });

    it('can create Transfer address from private key', () => {
        const privateKey = Buffer.alloc(32, 1);
        const keyPair = cro.KeyPair.fromPrivateKey(privateKey);

        const address = cro.address.transfer({
            keyPair,
            network: cro.Network.Mainnet,
        });

        expect(address.startsWith('cro')).to.eq(true);
    });

    it('can create Transfer address from public key', () => {
        const publicKey = Buffer.from(
            '041ff5820f619d51663efbb233eb03bd5d434f63c352a5633717d8b570daa43c190bddc906ed9b8601c10c2b58e347f6e1cc4035b391b98be1d9afa9c5ead9423b',
            'hex',
        );
        const keyPair = cro.KeyPair.fromPublicKey(publicKey);

        const address = cro.address.transfer({
            keyPair,
            network: cro.Network.Mainnet,
        });

        expect(address.startsWith('cro')).to.eq(true);
    });

    it('can create Transfer address on Testnet', () => {
        const keyPair = cro.KeyPair.generateRandom();

        const address = cro.address.transfer({
            keyPair,
            network: cro.Network.Testnet,
        });

        expect(address.startsWith('tcro')).to.eq(true);
    });

    it('can create Staking address', () => {
        const keyPair = cro.KeyPair.generateRandom();

        const address = cro.address.staking({
            keyPair,
        });

        expect(address.startsWith('0x')).to.eq(true);
    });

    it('can create Staking address from private key', () => {
        const privateKey = Buffer.alloc(32, 1);
        const keyPair = cro.KeyPair.fromPrivateKey(privateKey);

        const address = cro.address.staking({
            keyPair,
        });

        expect(address.startsWith('0x')).to.eq(true);
    });

    it('can create Staking address from public key', () => {
        const publicKey = Buffer.from(
            '041ff5820f619d51663efbb233eb03bd5d434f63c352a5633717d8b570daa43c190bddc906ed9b8601c10c2b58e347f6e1cc4035b391b98be1d9afa9c5ead9423b',
            'hex',
        );
        const keyPair = cro.KeyPair.fromPublicKey(publicKey);

        const address = cro.address.staking({
            keyPair,
        });

        expect(address.startsWith('0x')).to.eq(true);
    });
});
