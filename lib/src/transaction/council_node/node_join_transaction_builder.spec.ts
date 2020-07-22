import 'mocha';
import { expect } from 'chai';

import { NodeJoinTransactionBuilder } from './node_join_transaction_builder';
import { NodePublicKeyType, NodePublicKey } from './types';
import { Mainnet, Testnet } from '../../network';
import { KeyPair } from '../../key_pair';
import { BigNumber } from '../../utils';

describe('NodeJoinTransactionBuilder', () => {
    const SAMPLE_PUBLIC_KEY: NodePublicKey = {
        type: NodePublicKeyType.Ed25519,
        value: 'FF5JxhRrCUNLj6UZmYdjv/AWgSWUeiomeOMeJG71owE=',
    };
    const SAMPLE_NODE_META_DATA = {
        name: 'Council Node',
        securityContact: 'security@councilnode.com',
        consensusPublicKey: SAMPLE_PUBLIC_KEY,
    };
    const SAMPLE_STAKING_ADDRESS = '0xb5698ee21f69a6184afbe59b3626ed9d4bd755b0';
    const SAMPLE_NONCE = new BigNumber(1);
    const SAMPLE_KEY_PAIR = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));

    describe('constructor', () => {
        it('should throw Error when staking address is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new NodeJoinTransactionBuilder({
                    nonce: SAMPLE_NONCE,
                    nodeMetaData: SAMPLE_NODE_META_DATA,
                    network: Mainnet,
                } as any);
            }).to.throw(
                'Expected property `stakingAddress` to be of type `string` but received type `undefined` in object `options`',
            );
        });

        it('should throw Error when staking address is invalid', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new NodeJoinTransactionBuilder({
                    nonce: SAMPLE_NONCE,
                    stakingAddress: '0xInvalid',
                    nodeMetaData: SAMPLE_NODE_META_DATA,
                    network: Mainnet,
                });
            }).to.throw(
                'Expected property value to be a valid staking address in object `options`',
            );
        });

        it('should throw Error when nonce is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new NodeJoinTransactionBuilder({
                    stakingAddress: SAMPLE_STAKING_ADDRESS,
                    nodeMetaData: SAMPLE_NODE_META_DATA,
                    network: Mainnet,
                } as any);
            }).to.throw(
                'Expected property `nonce` to be of type `object` but received type `undefined` in object `options`',
            );
        });

        it('should throw Error when nodeMetaData is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new NodeJoinTransactionBuilder({
                    stakingAddress: SAMPLE_STAKING_ADDRESS,
                    nonce: SAMPLE_NONCE,
                    network: Mainnet,
                } as any);
            }).to.throw(
                'Expected property `nodeMetaData` to be of type `object` but received type `undefined` in object `options`',
            );
        });

        it('should throw Error when nodeMetaData has missing field', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new NodeJoinTransactionBuilder({
                    stakingAddress: SAMPLE_STAKING_ADDRESS,
                    nonce: SAMPLE_NONCE,
                    nodeMetaData: {
                        securityContact: 'security@councilnode.com',
                        consensusPublicKey: SAMPLE_PUBLIC_KEY,
                    } as any,
                    network: Mainnet,
                } as any);
            }).to.throw(
                'Expected property property `name` to be of type `string` but received type `undefined` in object `nodeMetaData` in object `options`',
            );
            expect(() => {
                // eslint-disable-next-line no-new
                new NodeJoinTransactionBuilder({
                    stakingAddress: SAMPLE_STAKING_ADDRESS,
                    nonce: SAMPLE_NONCE,
                    nodeMetaData: {
                        name: 'Council Node',
                        securityContact:
                            'security@councilnode.Expected property `nodeMetaData` to be of type `object` but received type `undefined` in object `options`com',
                    } as any,
                    network: Mainnet,
                } as any);
            }).to.throw(
                'Expected property property `consensusPublicKey` to be of type `object` but received type `undefined` in object `nodeMetaData` in object `options',
            );
        });

        it('should use Mainnet when network is missing', () => {
            const builder = new NodeJoinTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                nodeMetaData: SAMPLE_NODE_META_DATA,
            });

            expect(builder.getNetwork()).to.deep.eq(Mainnet);
        });

        it('should create an instance of builder with the provided options', () => {
            const stakingAddress = SAMPLE_STAKING_ADDRESS;
            const nonce = SAMPLE_NONCE;
            const nodeMetaData = SAMPLE_NODE_META_DATA;
            const network = Testnet;
            const builder = new NodeJoinTransactionBuilder({
                stakingAddress,
                nonce,
                nodeMetaData,
                network,
            });

            expect(builder.getStakingAddress()).to.eq(stakingAddress);
            expect(builder.getNonce()).to.eq(nonce);
            expect(builder.getNodeMetaData()).to.eq(nodeMetaData);
            expect(builder.getNetwork()).to.deep.eq(Testnet);
        });
    });

    describe('isCompleted', () => {
        it('should return false when the transaction is not signed', () => {
            const builder = new NodeJoinTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                nodeMetaData: SAMPLE_NODE_META_DATA,
                network: Mainnet,
            });

            expect(builder.isCompleted()).to.eq(false);
        });

        it('should return true when the transaction is signed', () => {
            const builder = new NodeJoinTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                nodeMetaData: SAMPLE_NODE_META_DATA,
                network: Mainnet,
            });

            builder.sign(SAMPLE_KEY_PAIR);

            expect(builder.isCompleted()).to.eq(true);
        });
    });

    describe('txId', () => {
        it('should return the transaction Id', () => {
            const builder = new NodeJoinTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                nodeMetaData: SAMPLE_NODE_META_DATA,
                network: Mainnet,
            });

            expect(builder.txId()).to.eq(
                'd249387c02a26726bd6b81bc2c40f07eee7bae5fe20738ca1add507af92589f6',
            );
        });
    });

    describe('toUnsignedHex', () => {
        it('should return raw transaction hex', () => {
            const builder = new NodeJoinTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                nodeMetaData: SAMPLE_NODE_META_DATA,
                network: Mainnet,
            });

            expect(builder.toUnsignedHex().toString('hex')).to.eq(
                '0102010000000000000000b5698ee21f69a6184afbe59b3626ed9d4bd755b0002a01000000000000000030436f756e63696c204e6f64650160736563757269747940636f756e63696c6e6f64652e636f6d00145e49c6146b09434b8fa519998763bff0168125947a2a2678e31e246ef5a301144649584d45',
            );
        });
    });

    describe('toHex', () => {
        it('should throw Error when the builder is unsigned', () => {
            const builder = new NodeJoinTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                nodeMetaData: SAMPLE_NODE_META_DATA,
                network: Mainnet,
            });

            expect(() => {
                builder.toHex();
            }).to.throw('Transaction builder is not completed');
        });

        it('should return completed Hex', () => {
            const builder = new NodeJoinTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: SAMPLE_NONCE,
                nodeMetaData: SAMPLE_NODE_META_DATA,
                network: Mainnet,
            });

            builder.sign(SAMPLE_KEY_PAIR);

            expect(builder.toHex().toString('hex')).to.eq(
                '0102010000000000000000b5698ee21f69a6184afbe59b3626ed9d4bd755b0002a01000000000000000030436f756e63696c204e6f64650160736563757269747940636f756e63696c6e6f64652e636f6d00145e49c6146b09434b8fa519998763bff0168125947a2a2678e31e246ef5a301144649584d450000bd34271e6043cc89493af9fdda0408e0b690d60966bbc95168e508994d10b7862c871b4ae46ed1569aa348c2d46253d1f4794fe94378b112d42d5aeb6e808680',
            );
        });
    });
});
