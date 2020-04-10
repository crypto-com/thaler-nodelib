import 'mocha';
import { expect } from 'chai';

import {
    UnjailTransactionBuilder,
    verifySignedUnjailTxHex,
} from './unjail_transaction';
import { Mainnet, Testnet } from '../../network';
import { KeyPair } from '../../key_pair';
import { staking } from '../../address';

const SAMPLE_KEY_PAIR = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
const SAMPLE_STAKING_ADDRESS = staking({
    keyPair: SAMPLE_KEY_PAIR,
});

describe('UnjailTransactionBuilder', () => {
    describe('constructor', () => {
        it('should throw Error when staking address is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new UnjailTransactionBuilder({
                    nonce: 1,
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
                    nonce: 1,
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
                'Expected property `nonce` to be of type `number` but received type `undefined` in object `options`',
            );
        });

        it('should use Mainnet when network is missing', () => {
            const builder = new UnjailTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: 1,
            });

            expect(builder.getNetwork()).to.deep.eq(Mainnet);
        });

        it('should create an instance of builder with the provided options', () => {
            const stakingAddress = SAMPLE_STAKING_ADDRESS;
            const nonce = 1;
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
                nonce: 1,
                network: Mainnet,
            });

            expect(builder.isCompleted()).to.eq(false);
        });

        it('should return true when the transaction is signed', () => {
            const builder = new UnjailTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: 1,
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
                nonce: 1,
                network: Mainnet,
            });

            expect(builder.txId()).to.eq(
                '7947970472cded3a0d31df9c9eb75ac25f24dc041a1cda545ed2b4575dc70c4d',
            );
        });
    });

    describe('toHex', () => {
        it('should throw Error when the builder is unsigned', () => {
            const builder = new UnjailTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: 1,
                network: Mainnet,
            });

            expect(() => {
                builder.toHex();
            }).to.throw('Transaction builder is not completed');
        });

        it('should return completed Hex', () => {
            const builder = new UnjailTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: 1,
                network: Mainnet,
            });

            builder.sign(SAMPLE_KEY_PAIR);

            expect(builder.toHex().toString('hex')).to.eq(
                '020100000000000000001a642f0e3c3af545e7acbd38b07251b3990914f12a0000e5dd2d36d815eaf5d057d0627f2014e2f4a2a2448c9d66cd6fa7ed5eb154be4504e4009f327dfc87293ad377327cfa4a53b132859c7cbc7d71a546dec14f3b95',
            );
        });
    });
});

describe('verifySignedUnajilTxHex', () => {
    const DEFAULT_STAKING_ADDRESS = SAMPLE_STAKING_ADDRESS;
    const DEFAULT_NONCE = 1;
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
                nonce: 65535,
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
