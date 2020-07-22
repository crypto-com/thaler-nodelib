import 'mocha';
import { expect } from 'chai';

import BigNumber from 'bignumber.js';

import { WithdrawUnbondedTransactionBuilder } from './withdraw_unbonded_transaction_builder';
import { WithdrawUnbondedOutput } from './types';
import { Mainnet, Testnet } from '../../network';
import { KeyPair } from '../../key_pair';
import { Timespec } from '../../types';

describe('WithdrawUnbondedTransactionBuilder', () => {
    const SAMPLE_NONCE = new BigNumber(1);
    const SAMPLE_UNBONDED_FROM = 1574240208;
    const SAMPLE_MAINNET_TRANSFER_ADDRESS =
        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3';
    const SAMPLE_VIEW_KEY = Buffer.from(
        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
        'hex',
    );
    const SAMPLE_OUTPUT: WithdrawUnbondedOutput = {
        address: SAMPLE_MAINNET_TRANSFER_ADDRESS,
        value: new BigNumber('1000'),
        validFrom: Timespec.fromSeconds(SAMPLE_UNBONDED_FROM),
    };
    const SAMPLE_KEY_PAIR = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));

    describe('constructor', () => {
        it('should throw Error when noncee is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new WithdrawUnbondedTransactionBuilder({
                    network: Mainnet,
                } as any);
            }).to.throw(
                'Expected property `nonce` to be of type `object` but received type `undefined` in object `options`',
            );
        });

        it('should throw Error when nonce is invalid', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new WithdrawUnbondedTransactionBuilder({
                    nonce: 1 as any,
                    network: Mainnet,
                });
            }).to.throw(
                'Expected property `nonce` to be of type `object` but received type `number` in object `options`',
            );
        });

        it('should set the network to Mainnet when not provided', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
            });

            expect(builder.getNetwork()).to.deep.eq(Mainnet);
        });

        it('should create a builder with the provided options', () => {
            const nonce = SAMPLE_NONCE;
            const network = Mainnet;
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce,
                network,
            });

            expect(builder.getNonce()).to.eq(nonce);
            expect(builder.getNetwork()).to.eq(network);
            expect(builder.feeConfig).to.eq(Mainnet.feeConfig);
        });
    });

    describe('addOutput', () => {
        it('should throw Error when output is missing', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(() => {
                (builder.addOutput as any)();
            }).to.throw(
                'Expected `output` to be of type `object` but received type `undefined`',
            );
        });

        it('should throw Error when output has missing fields', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(() => {
                builder.addOutput({
                    value: new BigNumber('1000'),
                    validFrom: SAMPLE_UNBONDED_FROM,
                } as any);
            }).to.throw(
                'Expected property `address` to be of type `string` but received type `undefined` in object `output`',
            );
            expect(() => {
                builder.addOutput({
                    address: SAMPLE_MAINNET_TRANSFER_ADDRESS,
                    validFrom: SAMPLE_UNBONDED_FROM,
                } as any);
            }).to.throw(
                'Expected property `value` to be of type `object` but received type `undefined` in object `output`',
            );
            expect(() => {
                builder.addOutput({
                    address: SAMPLE_MAINNET_TRANSFER_ADDRESS,
                    value: new BigNumber('1000'),
                } as any);
            }).to.throw(
                'Expected property `validFrom` to be of type `object` but received type `undefined` in object `output`',
            );
        });

        it('should throw Error when output address is invalid', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(() => {
                builder.addOutput({
                    ...SAMPLE_OUTPUT,
                    address: 'invalid-address',
                });
            }).to.throw(
                'Expected property value to be a valid transfer address in object `output`',
            );
        });

        it('should throw Error when output address is under different network', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Testnet,
            });

            expect(() => {
                builder.addOutput({
                    ...SAMPLE_OUTPUT,
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                });
            }).to.throw('Address does not belongs to the builder network');
        });

        it('should return the WithdrawUnbondedTransactionBuilder', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(builder.addOutput(SAMPLE_OUTPUT)).to.be.an.instanceOf(
                WithdrawUnbondedTransactionBuilder,
            );
        });

        it('should append output to the builder', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(builder.outputsLength()).to.eq(0);

            builder.addOutput(SAMPLE_OUTPUT);

            expect(builder.outputsLength()).to.eq(1);
        });

        it('should return different transaction Id when new output is appended', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            const firstViewKeyPair = KeyPair.generateRandom();
            builder
                .addOutput(SAMPLE_OUTPUT)
                .addViewKey(firstViewKeyPair.publicKey!);

            const firstTxId = builder.txId();

            const secondViewKeyPair = KeyPair.generateRandom();
            builder.addViewKey(secondViewKeyPair.publicKey!);

            expect(builder.txId()).not.to.eq(firstTxId);
        });
    });

    describe('getTotalOutputAmount', () => {
        it('should return the sum of all output amount', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.addOutput({
                ...SAMPLE_OUTPUT,
                value: new BigNumber('100'),
            });
            builder.addOutput({
                ...SAMPLE_OUTPUT,
                value: new BigNumber('200'),
            });
            builder.addOutput({
                ...SAMPLE_OUTPUT,
                value: new BigNumber('300'),
            });

            expect(builder.getTotalOutputAmount().toString(10)).to.deep.eq(
                '600',
            );
        });
    });

    describe('addViewKey', () => {
        it('should throw an Error when viewKey is missing', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(() => {
                (builder.addViewKey as any)();
            }).to.throw(
                'Expected `viewKey` to be of type `Buffer` but received type `undefined`',
            );
        });

        it('should throw an Error when viewKey is invalid', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(() => {
                builder.addViewKey('invalid-view-key' as any);
            }).to.throw(
                'Expected `viewKey` to be of type `Buffer` but received type `string`',
            );
            expect(() => {
                builder.addViewKey(Buffer.from('invalid-view-key'));
            }).to.throw('Expected value to be a valid view key');
        });

        it('should return the WithdrawUnbondedTransactionBuilder', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(builder.addViewKey(SAMPLE_VIEW_KEY)).to.be.an.instanceOf(
                WithdrawUnbondedTransactionBuilder,
            );
        });

        it('should add viewKey', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(builder.viewKeysLength()).to.eq(0);

            builder.addViewKey(SAMPLE_VIEW_KEY);

            expect(builder.viewKeysLength()).to.eq(1);
        });

        it('should return different transaction Id when new output is added', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.addOutput(SAMPLE_OUTPUT);

            const firstTxId = builder.txId();

            builder.addOutput(SAMPLE_OUTPUT);

            expect(builder.txId()).not.to.eq(firstTxId);
        });
    });

    describe('estimateFee', () => {
        it('should throw Error when there is not output', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(() => builder.estimateFee()).to.throw(
                'Builder has no output',
            );
        });

        it('should return estimated fee', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });
            builder.addOutput(SAMPLE_OUTPUT).addViewKey(SAMPLE_VIEW_KEY);

            expect(builder.estimateFee()).to.eq('308');
        });
    });

    describe('sign', () => {
        it('should throw Error when KeyPair is missing', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(() => {
                (builder.sign as any)();
            }).to.throw(
                'Expected `keyPair` to be of type `object` but received type `undefined`',
            );
        });

        it('should return WithdrawUnbondedTransactionBuilder', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(builder.sign(KeyPair.generateRandom())).to.be.an.instanceOf(
                WithdrawUnbondedTransactionBuilder,
            );
        });

        it('should sign the transaction', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(builder.isSigned()).to.eq(false);

            builder.sign(KeyPair.generateRandom());

            expect(builder.isSigned()).to.eq(true);
        });
    });

    describe('isCompleted', () => {
        it('should return false when transaction is not signed', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.addOutput(SAMPLE_OUTPUT);

            expect(builder.isCompleted()).to.eq(false);
        });

        it('should return false when there is no output', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.sign(KeyPair.generateRandom());

            expect(builder.isCompleted()).to.eq(false);
        });

        it('should return true when the transaction is completed', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.addOutput(SAMPLE_OUTPUT).sign(KeyPair.generateRandom());

            expect(builder.isCompleted()).to.eq(true);
        });
    });

    describe('txId', () => {
        it('should throw Error when transaction builder has no output', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(() => {
                builder.txId();
            }).to.throw('Builder has no output');
        });

        it('should return transaction Id', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.addOutput(SAMPLE_OUTPUT);

            expect(builder.txId()).to.eq(
                '8089fc12aab571120c46acc3e1f34e532ea64d8a9099a1d4d91cdffeace82cf9',
            );
        });
    });

    describe('toUnsignedHex', () => {
        it('should throw Error when there is no output', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            expect(() => {
                builder.toUnsignedHex();
            }).to.throw('Builder has no output');
        });

        it('should return completed Hex given correct tendermint address', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.addOutput(SAMPLE_OUTPUT);

            expect(builder.toUnsignedHex().toString('hex')).to.eq(
                '00020100000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de80300000000000001d0ffd45d00000000002a000100000000000000',
            );
        });
    });

    describe('toSignedPlainHex', () => {
        it('should throw Error when there is no output', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.sign(SAMPLE_KEY_PAIR);

            expect(() => {
                builder.toSignedPlainHex();
            }).to.throw('Builder has no output');
        });

        it('should throw Error when the builder is not signed', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.addOutput(SAMPLE_OUTPUT);

            expect(() => {
                builder.toSignedPlainHex();
            }).to.throw('Builder is not signed');
        });

        it('should return completed Hex given correct tendermint address', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.addOutput(SAMPLE_OUTPUT).sign(SAMPLE_KEY_PAIR);

            expect(builder.toSignedPlainHex().toString('hex')).to.eq(
                '00020100000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de80300000000000001d0ffd45d00000000002a000100000000000000000167463afac53c8fe80e2724c3d1c40678a3e852adeada94d87d6670fb95043ab11200429a46fc03c3f0b95d8c6d60de61c69d3fa66fbbc4603e903bfc76b42088',
            );
        });
    });

    describe('toHex', () => {
        it('should throw Error when Tendermint address is not http nor ws', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.addOutput(SAMPLE_OUTPUT).sign(SAMPLE_KEY_PAIR);

            expect(() => {
                builder.toHex('tcp://127.0.0.1');
            }).to.throw('Expected value to be HTTP or WS tendermint address');
        });

        it('should throw Error when the Tendermint address is invalid URL', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.addOutput(SAMPLE_OUTPUT).sign(SAMPLE_KEY_PAIR);

            expect(() => {
                builder.toHex('ws://127.0.0.1:99999');
            }).to.throw('Expected value to be HTTP or WS tendermint address');
        });

        it('should throw Error when there is no output', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.sign(SAMPLE_KEY_PAIR);

            expect(() => {
                builder.toHex('ws://127.0.0.1:26657');
            }).to.throw('Builder has no output');
        });

        it('should throw Error when the builder is not signed', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.addOutput(SAMPLE_OUTPUT);

            expect(() => {
                builder.toHex('ws://127.0.0.1:26657');
            }).to.throw('Builder is not signed');
        });

        it('should return completed Hex when Tendermint address is not provided', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.addOutput(SAMPLE_OUTPUT).sign(SAMPLE_KEY_PAIR);

            const txHex = builder.toHex();
            expect(txHex.toString('hex')).to.deep.eq(
                '00020100000167463afac53c8fe80e2724c3d1c40678a3e852adeada94d87d6670fb95043ab11200429a46fc03c3f0b95d8c6d60de61c69d3fa66fbbc4603e903bfc76b4208800000000000000000000000000000000000000002502020100000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de80300000000000001d0ffd45d00000000002a000100000000000000000167463afac53c8fe80e2724c3d1c40678a3e852adeada94d87d6670fb95043ab11200429a46fc03c3f0b95d8c6d60de61c69d3fa66fbbc4603e903bfc76b420888089fc12aab571120c46acc3e1f34e532ea64d8a9099a1d4d91cdffeace82cf9',
            );
        });

        it('should return completed Hex given correct tendermint address', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.addOutput(SAMPLE_OUTPUT).sign(SAMPLE_KEY_PAIR);

            expect(builder.toHex('ws://127.0.0.1:26657').toString('hex')).to.eq(
                '00020100000167463afac53c8fe80e2724c3d1c40678a3e852adeada94d87d6670fb95043ab11200429a46fc03c3f0b95d8c6d60de61c69d3fa66fbbc4603e903bfc76b4208800000000000000000000000000000000000000002502020100000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de80300000000000001d0ffd45d00000000002a000100000000000000000167463afac53c8fe80e2724c3d1c40678a3e852adeada94d87d6670fb95043ab11200429a46fc03c3f0b95d8c6d60de61c69d3fa66fbbc4603e903bfc76b420888089fc12aab571120c46acc3e1f34e532ea64d8a9099a1d4d91cdffeace82cf9',
            );
            expect(builder.toHex('ws://localhost:26657').toString('hex')).to.eq(
                '00020100000167463afac53c8fe80e2724c3d1c40678a3e852adeada94d87d6670fb95043ab11200429a46fc03c3f0b95d8c6d60de61c69d3fa66fbbc4603e903bfc76b4208800000000000000000000000000000000000000002502020100000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de80300000000000001d0ffd45d00000000002a000100000000000000000167463afac53c8fe80e2724c3d1c40678a3e852adeada94d87d6670fb95043ab11200429a46fc03c3f0b95d8c6d60de61c69d3fa66fbbc4603e903bfc76b420888089fc12aab571120c46acc3e1f34e532ea64d8a9099a1d4d91cdffeace82cf9',
            );
            expect(
                builder
                    .toHex('ws://tendermint-zerofee:26657/websocket')
                    .toString('hex'),
            ).to.eq(
                '00020100000167463afac53c8fe80e2724c3d1c40678a3e852adeada94d87d6670fb95043ab11200429a46fc03c3f0b95d8c6d60de61c69d3fa66fbbc4603e903bfc76b4208800000000000000000000000000000000000000002502020100000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de80300000000000001d0ffd45d00000000002a000100000000000000000167463afac53c8fe80e2724c3d1c40678a3e852adeada94d87d6670fb95043ab11200429a46fc03c3f0b95d8c6d60de61c69d3fa66fbbc4603e903bfc76b420888089fc12aab571120c46acc3e1f34e532ea64d8a9099a1d4d91cdffeace82cf9',
            );
            expect(
                builder.toHex('wss://localhost/websocket').toString('hex'),
            ).to.eq(
                '00020100000167463afac53c8fe80e2724c3d1c40678a3e852adeada94d87d6670fb95043ab11200429a46fc03c3f0b95d8c6d60de61c69d3fa66fbbc4603e903bfc76b4208800000000000000000000000000000000000000002502020100000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de80300000000000001d0ffd45d00000000002a000100000000000000000167463afac53c8fe80e2724c3d1c40678a3e852adeada94d87d6670fb95043ab11200429a46fc03c3f0b95d8c6d60de61c69d3fa66fbbc4603e903bfc76b420888089fc12aab571120c46acc3e1f34e532ea64d8a9099a1d4d91cdffeace82cf9',
            );
        });
    });

    describe('clone', () => {
        it('should return a deep clone copy of the builder', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                nonce: SAMPLE_NONCE,
                network: Mainnet,
            });

            builder.addOutput(SAMPLE_OUTPUT).sign(SAMPLE_KEY_PAIR);

            const clonedBuilder = builder.clone();
            clonedBuilder.addOutput(SAMPLE_OUTPUT);

            expect(builder.outputsLength()).to.eq(1);
            expect(clonedBuilder.outputsLength()).to.eq(2);
        });
    });
});
