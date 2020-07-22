import 'mocha';
import { expect } from 'chai';

import BigNumber from 'bignumber.js';
import { UnbondTransactionBuilder } from './unbond_transaction_builder';
import { Mainnet, Devnet } from '../../network';
import { MAX_COIN_BN } from '../../init';
import { KeyPair } from '../../key_pair';
import { FeeAlgorithm, FeeConfig } from '../../fee';

describe('UnbondTransactionBuilder', () => {
    const SAMPLE_FEE_CONFIG: FeeConfig = {
        algorithm: FeeAlgorithm.LinearFee,
        constant: new BigNumber(1.1),
        coefficient: new BigNumber(1.25),
    };
    const SAMPLE_NONCE = new BigNumber(1);
    const SAMPLE_STAKING_ADDRESS = '0xb5698ee21f69a6184afbe59b3626ed9d4bd755b0';

    describe('constructor', () => {
        it('should throw Error when staking address is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new UnbondTransactionBuilder({
                    nonce: SAMPLE_NONCE,
                    amount: new BigNumber(1000),
                    network: Mainnet,
                } as any);
            }).to.throw(
                'Expected property `stakingAddress` to be of type `string` but received type `undefined` in object `options`',
            );
        });

        it('should throw Error when staking address is invalid', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new UnbondTransactionBuilder({
                    nonce: SAMPLE_NONCE,
                    stakingAddress: '0xInvalid',
                    amount: new BigNumber(1000),
                    network: Mainnet,
                });
            }).to.throw(
                'Expected property value to be a valid staking address in object `options`',
            );
        });

        it('should throw Error when nonce is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new UnbondTransactionBuilder({
                    stakingAddress: SAMPLE_STAKING_ADDRESS,
                    amount: new BigNumber(1000),
                    network: Mainnet,
                } as any);
            }).to.throw(
                'Expected property `nonce` to be of type `object` but received type `undefined` in object `options`',
            );
        });

        it('should throw Error when amount is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new UnbondTransactionBuilder({
                    stakingAddress: SAMPLE_STAKING_ADDRESS,
                    nonce: SAMPLE_NONCE,
                    network: Mainnet,
                } as any);
            }).to.throw(
                'Expected property `amount` to be of type `object` but received type `undefined` in object `options`',
            );
        });

        it('should throw Error when amount is not a BigNumber', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new UnbondTransactionBuilder({
                    stakingAddress: SAMPLE_STAKING_ADDRESS,
                    nonce: SAMPLE_NONCE,
                    amount: 1000,
                    network: Mainnet,
                } as any);
            }).to.throw(
                'Expected property `amount` to be of type `object` but received type `number` in object `options`',
            );
        });

        it('should throw Error when amount is negative', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new UnbondTransactionBuilder({
                    stakingAddress: SAMPLE_STAKING_ADDRESS,
                    nonce: SAMPLE_NONCE,
                    amount: new BigNumber('-12'),
                    network: Mainnet,
                });
            }).to.throw(
                'Expected property value to be within maximum coin: 10,000,000,000,000,000,000 in object `options`',
            );
        });

        it('should throw Error when amount exceed maximum coin', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new UnbondTransactionBuilder({
                    stakingAddress: SAMPLE_STAKING_ADDRESS,
                    nonce: SAMPLE_NONCE,
                    amount: MAX_COIN_BN.plus(1),
                    network: Mainnet,
                });
            }).to.throw(
                'Expected property value to be within maximum coin: 10,000,000,000,000,000,000 in object `options`',
            );
        });

        it('should set the network to Mainet when not provided', () => {
            const builder = new UnbondTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                amount: new BigNumber(1000),
            });

            expect(builder.getNetwork()).to.deep.eq(Mainnet);
        });

        it('should create a builder with the provided options', () => {
            const stakingAddress = SAMPLE_STAKING_ADDRESS;
            const nonce = SAMPLE_NONCE;
            const amount = new BigNumber('1000');
            const network = Devnet({
                feeConfig: SAMPLE_FEE_CONFIG,
                chainHexId: 'AB',
            });
            const builder = new UnbondTransactionBuilder({
                stakingAddress,
                nonce,
                amount,
                network,
            });

            expect(builder.getStakingAddress()).to.eq(stakingAddress);
            expect(builder.getNonce()).to.eq(nonce);
            expect(builder.getAmount()).to.deep.eq(amount);
            expect(builder.getNetwork()).to.eq(network);
        });
    });

    describe('sign', () => {
        it('should throw Error when KeyPair is missing', () => {
            const builder = new UnbondTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                amount: new BigNumber('1000'),
                network: Mainnet,
            });

            expect(() => {
                (builder.sign as any)();
            }).to.throw(
                'Expected `keyPair` to be of type `object` but received type `undefined`',
            );
        });

        it('should return UnbondTransactionBuilder', () => {
            const builder = new UnbondTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                amount: new BigNumber('1000'),
                network: Mainnet,
            });

            expect(builder.sign(KeyPair.generateRandom())).to.be.an.instanceOf(
                UnbondTransactionBuilder,
            );
        });

        it('should sign the transaction', () => {
            const builder = new UnbondTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                amount: new BigNumber('1000'),
                network: Mainnet,
            });

            builder.sign(KeyPair.generateRandom());

            expect(builder.isCompleted()).to.eq(true);
        });
    });

    describe('isCompleted', () => {
        it('should return false when the transaction is not signed', () => {
            const builder = new UnbondTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                amount: new BigNumber('1000'),
                network: Mainnet,
            });

            expect(builder.isCompleted()).to.eq(false);
        });

        it('should return true when the transaction is signed', () => {
            const builder = new UnbondTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                amount: new BigNumber('1000'),
                network: Mainnet,
            });

            builder.sign(KeyPair.generateRandom());

            expect(builder.isCompleted()).to.eq(true);
        });
    });

    describe('txId', () => {
        it('should return the transaction Id', () => {
            const builder = new UnbondTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                amount: new BigNumber('1000'),
                network: Devnet({
                    feeConfig: SAMPLE_FEE_CONFIG,
                    chainHexId: 'AB',
                }),
            });

            expect(builder.txId()).to.eq(
                '860423b18e754feaf4ef4f64eb40f5f2f20d5380cf8d1197e34a30fcb26c2dad',
            );
        });
    });

    describe('toUnsignedHex', () => {
        it('should return the raw transaction Hex', () => {
            const builder = new UnbondTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                amount: new BigNumber('1000'),
                network: Mainnet,
            });

            expect(builder.toUnsignedHex().toString('hex')).to.eq(
                '010000b5698ee21f69a6184afbe59b3626ed9d4bd755b00100000000000000e803000000000000002a0100000000000000',
            );
        });
    });

    describe('toHex', () => {
        it('should throw Error when the builder is unsigned', () => {
            const builder = new UnbondTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                amount: new BigNumber('1000'),
                network: Mainnet,
            });

            expect(() => {
                builder.toHex();
            }).to.throw('Transaction builder is not completed');
        });

        it('should return completed Hex', () => {
            const builder = new UnbondTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                amount: new BigNumber('1000'),
                network: Mainnet,
            });

            const privateKey = Buffer.alloc(32, 1);
            const keyPair = KeyPair.fromPrivateKey(privateKey);
            builder.sign(keyPair);

            expect(builder.toHex().toString('hex')).to.eq(
                '010000b5698ee21f69a6184afbe59b3626ed9d4bd755b00100000000000000e803000000000000002a010000000000000000013279fcc50e83da0ce82d1c75a91d754bce84dd0d715b4561c64846c6bd38f9a96667f7fb4da8d47bdd94760c9984c8cf44c5156e705c8a39e7d29d20146053cf',
            );
        });
    });
});
