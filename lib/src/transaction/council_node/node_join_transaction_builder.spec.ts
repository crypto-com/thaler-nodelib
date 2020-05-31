import 'mocha';
import { expect } from 'chai';

import { NodeJoinTransactionBuilder } from './node_join_transaction_builder';
import { NodePublicKeyType, NodePublicKey } from './types';
import { Mainnet, Testnet } from '../../network';
import { KeyPair } from '../../key_pair';

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
    const SAMPLE_KEY_PAIR = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));

    describe('constructor', () => {
        it('should throw Error when staking address is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new NodeJoinTransactionBuilder({
                    nonce: 1,
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
                    nonce: 1,
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
                'Expected property `nonce` to be of type `number` but received type `undefined` in object `options`',
            );
        });

        it('should throw Error when nodeMetaData is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new NodeJoinTransactionBuilder({
                    stakingAddress: SAMPLE_STAKING_ADDRESS,
                    nonce: 1,
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
                    nonce: 1,
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
                    nonce: 1,
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
                nonce: 1,
                nodeMetaData: SAMPLE_NODE_META_DATA,
            });

            expect(builder.getNetwork()).to.deep.eq(Mainnet);
        });

        it('should create an instance of builder with the provided options', () => {
            const stakingAddress = SAMPLE_STAKING_ADDRESS;
            const nonce = 1;
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
                nonce: 1,
                nodeMetaData: SAMPLE_NODE_META_DATA,
                network: Mainnet,
            });

            expect(builder.isCompleted()).to.eq(false);
        });

        it('should return true when the transaction is signed', () => {
            const builder = new NodeJoinTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: 1,
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
                nonce: 1,
                nodeMetaData: SAMPLE_NODE_META_DATA,
                network: Mainnet,
            });

            expect(builder.txId()).to.eq(
                'a9012b6b9780739bbd75589d28d415e3970dd55004307ceb3774352ab9fa4f78',
            );
        });
    });

    describe('toHex', () => {
        it('should throw Error when the builder is unsigned', () => {
            const builder = new NodeJoinTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
                nonce: 1,
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
                nonce: 1,
                nodeMetaData: SAMPLE_NODE_META_DATA,
                network: Mainnet,
            });

            builder.sign(SAMPLE_KEY_PAIR);

            expect(builder.toHex().toString('hex')).to.eq(
                '03010000000000000000b5698ee21f69a6184afbe59b3626ed9d4bd755b02a30436f756e63696c204e6f64650160736563757269747940636f756e63696c6e6f64652e636f6d00145e49c6146b09434b8fa519998763bff0168125947a2a2678e31e246ef5a3010000b51b2cd204cc7d16a8fd1cc21378c0dd1b538bc14e2d858609b50a657c7065d97a71a3400e99f290f7d7cca54cf005295f56d944ba5df561ee09d120dd6e6e07',
            );
        });
    });
});
