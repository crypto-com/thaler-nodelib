import 'mocha';
import { expect } from 'chai';

import { HDWallet } from './hd_wallet';
import { KeyPair } from '../key_pair';
import { NetworkEnum } from '../network';

const native = require('../../../native');

const createWallet = (): HDWallet => {
    const mnemonic =
        'point shiver hurt flight fun online hub antenna engine pave chef fantasy front interest poem accident catch load frequent praise elite pet remove used';
    return HDWallet.fromMnemonic(mnemonic);
};

describe('HDWallet', () => {
    describe('fromMnemonic', () => {
        it('should throw an Error when the mnemonic is incorrect', () => {
            const invalidMnemonic = 'hello from nodejs';
            expect(() => {
                HDWallet.fromMnemonic(invalidMnemonic);
            }).to.throw('Invalid mnemonic words');
        });

        it('should be compatible with Rust code', () => {
            const mnemonic =
                'point shiver hurt flight fun online hub antenna engine pave chef fantasy front interest poem accident catch load frequent praise elite pet remove used';
            const wallet = HDWallet.fromMnemonic(mnemonic);

            const rustSeed = native.hdWallet.getSeedFromMnemonic(mnemonic);

            expect(wallet.toSeed()).to.deep.eq(rustSeed);
        });
    });

    describe('toSeed', () => {
        it('should always restore to the same HDWallet', () => {
            const mnemonic =
                'point shiver hurt flight fun online hub antenna engine pave chef fantasy front interest poem accident catch load frequent praise elite pet remove used';
            const passphrase = 'youshallnotpass';

            const wallet = HDWallet.fromMnemonic(mnemonic, passphrase);
            const seed = wallet.toSeed();

            const restoredWallet = new HDWallet(seed);

            expect(restoredWallet.toSeed()).to.deep.eq(seed);
        });
    });

    describe('derive', () => {
        it('should throw Error when the path is not string', () => {
            const wallet = createWallet();

            expect(() => {
                wallet.derive({
                    index: 1,
                } as any);
            }).to.throw(
                'Expected `path` to be of type `string` but received type `Object`',
            );
        });

        it('should throw Error when the path is invalid', () => {
            const wallet = createWallet();

            expect(() => {
                wallet.derive('invalid');
            }).to.throw('Expected BIP32Path, got String "invalid');
        });

        it('should return KeyPair', () => {
            const wallet = createWallet();

            const result = wallet.derive("m/44'/0'/0'/0");
            expect(result).to.be.an.instanceOf(KeyPair);
            expect(result.hasPrivateKey()).to.eq(true);
            expect(result.hasPublicKey()).to.eq(true);
        });

        it('should be compatible with Rust code', () => {
            const wallet = createWallet();

            const keyPair = wallet.derive("m/44'/1'/2'/0/3").toObject();
            const rustKeyPair = native.hdWallet.deriveKeyPairFromSeed(
                wallet.toSeed(),
                NetworkEnum.Testnet,
                2,
                3,
            );

            expect(keyPair).to.deep.eq(rustKeyPair);
        });
    });

    describe('derivef', () => {
        it('should throw Error when format path has more argument than provided', () => {
            const wallet = createWallet();

            expect(() => {
                wallet.derivef("44'/{}'/2'/0/{}", 1);
            }).to.throw('Insufficient argument for format path');
        });

        it('should throw Error when argument provided is more then those in format path', () => {
            const wallet = createWallet();

            expect(() => {
                wallet.derivef("44'/{}'/2'/0/{}", 1, 3, 5);
            }).to.throw('Argument never used');
        });

        it('should return KeyPair', () => {
            const wallet = createWallet();

            const result = wallet.derivef("44'/{}'/2'/0/{}", 1, 3);
            expect(result).to.be.an.instanceOf(KeyPair);
            expect(result.hasPrivateKey()).to.eq(true);
            expect(result.hasPublicKey()).to.eq(true);
        });

        it('should support named argument in format path', () => {
            const wallet = createWallet();

            const deriveResult = wallet.derivef("44'/{}'/2'/0/{}", 1, 3);
            const derivefResult = wallet.derivef(
                "44'/{COIN_TYPE}'/2'/0/{INDEX}",
                1,
                3,
            );
            expect(derivefResult).to.deep.eq(deriveResult);
        });
    });

    describe('generateMnemonic', () => {
        it('should generate unique Mnemonic', () => {
            const firstMnemonic = HDWallet.generateMnemonic();
            const secondMnemonic = HDWallet.generateMnemonic();

            expect(firstMnemonic).not.to.deep.eq(secondMnemonic);
        });
    });
});
