import 'mocha';
import { expect } from 'chai';

import {
    UnjailTransactionBuilder,
    verifySignedUnjailTxHex,
} from './unjail_transaction';
import { Mainnet, Testnet } from '../../network';
import { KeyPair } from '../../key_pair';
import { staking } from '../../address';
import { BigNumber } from '../../utils';

const SAMPLE_KEY_PAIR = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
const SAMPLE_STAKING_ADDRESS = staking({
    keyPair: SAMPLE_KEY_PAIR,
});
const SAMPLE_NONCE = new BigNumber(1);

describe('UnjailTransactionBuilder', () => {
    describe('constructor', () => {
        it('should throw Error when staking address is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new UnjailTransactionBuilder({
                    nonce: SAMPLE_NONCE,
                    network: Mainnet,
                } as any);
            }).to.throw(
                'Expected property `stakingAddress` to be of type `string` but received type `undefined` in object `options`',
            );
        });

        it('should throw Error when staking address is invalid', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new UnjailTransactionBuilder({
                    nonce: SAMPLE_NONCE,
                    stakingAddress: '0xInvalid',
                    network: Mainnet,
                });
            }).to.throw(
                'Expected property value to be a valid staking address in object `options`',
            );
        });

        it('should throw Error when nonce is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new UnjailTransactionBuilder({
                    stakingAddress: SAMPLE_STAKING_ADDRESS,
                    network: Mainnet,
                } as any);
            }).to.throw(
                'Expected property `nonce` to be of type `object` but received type `undefined` in object `options`',
            );
        });

        it('should use Mainnet when network is missing', () => {
            const builder = new UnjailTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
            });

            expect(builder.getNetwork()).to.deep.eq(Mainnet);
        });

        it('should create an instance of builder with the provided options', () => {
            const stakingAddress = SAMPLE_STAKING_ADDRESS;
            const nonce = SAMPLE_NONCE;
            const network = Testnet;
            const builder = new UnjailTransactionBuilder({
                stakingAddress,
                nonce,
                network,
            });

            expect(builder.getStakingAddress()).to.eq(stakingAddress);
            expect(builder.getNonce()).to.eq(nonce);
            expect(builder.getNetwork()).to.deep.eq(Testnet);
        });
    });

    describe('isCompleted', () => {
        it('should return false when the transaction is not signed', () => {
            const builder = new UnjailTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(builder.isCompleted()).to.eq(false);
        });

        it('should return true when the transaction is signed', () => {
            const builder = new UnjailTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.sign(SAMPLE_KEY_PAIR);

            expect(builder.isCompleted()).to.eq(true);
        });
    });

    describe('txId', () => {
        it('should return the transaction Id', () => {
            const builder = new UnjailTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(builder.txId()).to.eq(
                '6df011a26c00e43dc60e99f576a3f13cb386660fe640df06ca54c6e8f1b58e0a',
            );
        });
    });

    describe('toUnsignedHex', () => {
        it('should return raw tx hex', () => {
            const builder = new UnjailTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(builder.toUnsignedHex().toString('hex')).to.eq(
                '01010100000000000000001a642f0e3c3af545e7acbd38b07251b3990914f1002a0100000000000000',
            );
        });
    });

    describe('toHex', () => {
        it('should throw Error when the builder is unsigned', () => {
            const builder = new UnjailTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(() => {
                builder.toHex();
            }).to.throw('Transaction builder is not completed');
        });

        it('should return completed Hex', () => {
            const builder = new UnjailTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.sign(SAMPLE_KEY_PAIR);

            expect(builder.toHex().toString('hex')).to.eq(
                '01010100000000000000001a642f0e3c3af545e7acbd38b07251b3990914f1002a01000000000000000001e4849e8ca3aca83c05d54fddeca8faae47f842e36dbfd75c5daa5598da9e54c43e0f1aafbf85a2833e4cf3f3b898c63730d4eec460d5b295bdcfeac27168c3d3',
            );
        });
    });
});

describe('verifySignedUnajilTxHex', () => {
    const DEFAULT_STAKING_ADDRESS = SAMPLE_STAKING_ADDRESS;
    const DEFAULT_NONCE = new BigNumber(1);
    const DEFAULT_NETWORK = Mainnet;
    const DEFAULT_KEY_PAIR = SAMPLE_KEY_PAIR;

    let signedTxHex: Buffer;

    beforeEach(() => {
        const builder = new UnjailTransactionBuilder({
            stakingAddress: DEFAULT_STAKING_ADDRESS,
            nonce: DEFAULT_NONCE,
            network: DEFAULT_NETWORK,
        });

        builder.sign(DEFAULT_KEY_PAIR);

        signedTxHex = builder.toHex();
    });

    it('should throw an Error when staking address is different', () => {
        const differentStakingAddress = staking({
            keyPair: KeyPair.generateRandom(),
        });
        expect(() => {
            verifySignedUnjailTxHex(signedTxHex, {
                stakingAddress: differentStakingAddress,
                nonce: DEFAULT_NONCE,
                network: DEFAULT_NETWORK,
            });
        }).to.throw('Mismatch staking address');
    });

    it('should throw an Error when nonce is different', () => {
        expect(() => {
            verifySignedUnjailTxHex(signedTxHex, {
                stakingAddress: DEFAULT_STAKING_ADDRESS,
                nonce: new BigNumber(65535),
                network: DEFAULT_NETWORK,
            });
        }).to.throw('Mismatch staking account nonce');
    });

    it('should throw an Error when network is different', () => {
        expect(() => {
            verifySignedUnjailTxHex(signedTxHex, {
                stakingAddress: DEFAULT_STAKING_ADDRESS,
                nonce: DEFAULT_NONCE,
                network: Testnet,
            });
        }).to.throw('Mismatch chain hex id');
    });

    it('should throw an Error when signature is incorrect', () => {
        const keyPair = KeyPair.generateRandom();
        const stakingAddress = staking({
            keyPair,
        });
        const nonce = DEFAULT_NONCE;
        const network = DEFAULT_NETWORK;

        const anotherKeyPair = KeyPair.generateRandom();

        const builder = new UnjailTransactionBuilder({
            stakingAddress,
            nonce,
            network,
        });

        builder.sign(anotherKeyPair);

        const txHex = builder.toHex();

        expect(() => {
            verifySignedUnjailTxHex(txHex, {
                stakingAddress,
                nonce,
                network,
            });
        }).to.throw('Incorrect signature');
    });

    it('should not throw any Error when the signed transaction hex is correct', () => {
        expect(() => {
            verifySignedUnjailTxHex(signedTxHex, {
                stakingAddress: DEFAULT_STAKING_ADDRESS,
                nonce: DEFAULT_NONCE,
                network: DEFAULT_NETWORK,
            });
        }).not.to.throw();
    });
});
