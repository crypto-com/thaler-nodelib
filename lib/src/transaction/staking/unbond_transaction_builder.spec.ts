import 'mocha';
import { expect } from 'chai';

import BigNumber from 'bignumber.js';
import { UnbondTransactionBuilder } from './unbond_transaction_builder';
import { Mainnet, Devnet } from '../../network';
import { MAX_COIN_BN } from '../../init';
import { KeyPair } from '../../key_pair';
// import { KeyPair } from '../../key_pair';

describe('UnbondTransactionBuilder', () => {
    const SAMPLE_STAKING_ADDRESS = '0xb5698ee21f69a6184afbe59b3626ed9d4bd755b0';
    // const SAMPLE_KEY_PAIR = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));

    describe('constructor', () => {
        it('should throw Error when staking address is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new UnbondTransactionBuilder({
                    nonce: 1,
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
                    nonce: 1,
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
                'Expected property `nonce` to be of type `number` but received type `undefined` in object `options`',
            );
        });

        it('should throw Error when amount is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new UnbondTransactionBuilder({
                    stakingAddress: SAMPLE_STAKING_ADDRESS,
                    nonce: 1,
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
                    nonce: 1,
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
                    nonce: 1,
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
                    nonce: 1,
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
                nonce: 1,
                amount: new BigNumber(1000),
            });

            expect(builder.getNetwork()).to.deep.eq(Mainnet);
        });

        it('should create a builder with the provided options', () => {
            const stakingAddress = SAMPLE_STAKING_ADDRESS;
            const nonce = 1;
            const amount = new BigNumber('1000');
            const network = Devnet({
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
                nonce: 1,
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
                nonce: 1,
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
                nonce: 1,
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
                nonce: 1,
                amount: new BigNumber('1000'),
                network: Mainnet,
            });

            expect(builder.isCompleted()).to.eq(false);
        });

        it('should return true when the transaction is signed', () => {
            const builder = new UnbondTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: 1,
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
                nonce: 1,
                amount: new BigNumber('1000'),
                network: Devnet({
                    chainHexId: 'AB',
                }),
            });

            expect(builder.txId()).to.eq(
                '50948cd11f8d4867c7c0eab665b22d036ea11cd5bdfe6b97c4302de63b0604f0',
            );
        });
    });

    describe('toHex', () => {
        it('should throw Error when the builder is unsigned', () => {
            const builder = new UnbondTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: 1,
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
                nonce: 1,
                amount: new BigNumber('1000'),
                network: Mainnet,
            });

            const privateKey = Buffer.alloc(32, 1);
            const keyPair = KeyPair.fromPrivateKey(privateKey);
            builder.sign(keyPair);

            expect(builder.toHex().toString('hex')).to.eq(
                '0100b5698ee21f69a6184afbe59b3626ed9d4bd755b00100000000000000e8030000000000002a000108f6c158fbb75158aca2259c918b0d6c7f6711611997f04cf113efe21ca5b9a50ee44df788acff3460dbb1b229b5c54f280516e59c128260f1c8769ed9b6e817',
            );
        });
    });
});
