import 'mocha';
import { expect } from 'chai';

import { UnjailTransactionBuilder } from './unjail_transaction_builder';
import { Mainnet, Testnet } from '../../network';
import { KeyPair } from '../../key_pair';

describe('UnjailTransactionBuilder', () => {
    const SAMPLE_STAKING_ADDRESS = '0xb5698ee21f69a6184afbe59b3626ed9d4bd755b0';
    const SAMPLE_KEY_PAIR = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));

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
                '70abcf73d10aa9b330e930a9ecccb9ed40ffd0ff5c83c07bab70dd6ec4bfaf72',
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
                '02010000000000000000b5698ee21f69a6184afbe59b3626ed9d4bd755b02a0001327f0d7a61e57ee6fb8d11bf1b8c8b4b0e0656f525592c7186871a5403380c7544e7c8b1dea4beb6342f4acc249f88e1ff7b6a3b07284965f126faea043a1600',
            );
        });
    });
});
