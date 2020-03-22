import 'mocha';
import { expect } from 'chai';

import BigNumber from 'bignumber.js';

import { WithdrawUnbondedTransactionBuilder } from './withdraw_unbonded_transaction_builder';
import { WithdrawUnbondedOutput } from './types';
import { Mainnet, Devnet } from '../../network';
import { KeyPair } from '../../key_pair';
import { FeeConfig, FeeAlgorithm } from '../../fee';
import { StakedState, Timespec } from '../../types';

describe('WithdrawUnbondedTransactionBuilder', () => {
    const SAMPLE_STAKING_ADDRESS = '0xb5698ee21f69a6184afbe59b3626ed9d4bd755b0';
    const SAMPLE_UNBONDED_FROM = 1574240208;
    const SAMPLE_STAKED_STATE: StakedState = {
        nonce: 1,
        bonded: new BigNumber('1000'),
        unbonded: new BigNumber('100000000'),
        unbondedFrom: SAMPLE_UNBONDED_FROM,
        address: SAMPLE_STAKING_ADDRESS,
    };
    const SAMPLE_FEE_CONFIG: FeeConfig = {
        algorithm: FeeAlgorithm.LinearFee,
        constant: new BigNumber('1000'),
        coefficient: new BigNumber('1001'),
    };
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
        it('should throw Error when staked state is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new WithdrawUnbondedTransactionBuilder({
                    network: Mainnet,
                    feeConfig: SAMPLE_FEE_CONFIG,
                } as any);
            }).to.throw(
                'Expected property `stakedState` to be of type `object` but received type `undefined` in object `options`',
            );
        });

        it('should throw Error when staking address is invalid', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new WithdrawUnbondedTransactionBuilder({
                    stakedState: {
                        ...SAMPLE_STAKED_STATE,
                        address: '0xInvalid',
                    },
                    network: Mainnet,
                    feeConfig: SAMPLE_FEE_CONFIG,
                } as any);
            }).to.throw(
                'Expected property property value to be a valid staking address in object `stakedState` in object `options`',
            );
        });

        it('should throw Error when staked state is invalid', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new WithdrawUnbondedTransactionBuilder({
                    stakedState: {} as any,
                    network: Mainnet,
                    feeConfig: SAMPLE_FEE_CONFIG,
                });
            }).to.throw(
                'Expected property property `nonce` to be of type `number` but received type `undefined` in object `stakedState` in object `options`',
            );
        });
        it('should throw Error when staked state has missing fields', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new WithdrawUnbondedTransactionBuilder({
                    stakedState: {
                        nonce: 1,
                    } as any,
                    network: Mainnet,
                    feeConfig: SAMPLE_FEE_CONFIG,
                });
            }).to.throw(
                'Expected property property `bonded` to be of type `object` but received type `undefined` in object `stakedState` in object `options`',
            );
            expect(() => {
                // eslint-disable-next-line no-new
                new WithdrawUnbondedTransactionBuilder({
                    stakedState: {
                        nonce: 1,
                        bonded: new BigNumber('1000'),
                    } as any,
                    network: Mainnet,
                    feeConfig: SAMPLE_FEE_CONFIG,
                });
            }).to.throw(
                'Expected property property `unbonded` to be of type `object` but received type `undefined` in object `stakedState` in object `options`',
            );
            expect(() => {
                // eslint-disable-next-line no-new
                new WithdrawUnbondedTransactionBuilder({
                    stakedState: {
                        nonce: 1,
                        bonded: new BigNumber('1000'),
                        unbonded: new BigNumber('2000'),
                    } as any,
                    network: Mainnet,
                    feeConfig: SAMPLE_FEE_CONFIG,
                });
            }).to.throw(
                'Expected property property `unbondedFrom` to be of type `number` but received type `undefined` in object `stakedState` in object `options`',
            );
            expect(() => {
                // eslint-disable-next-line no-new
                new WithdrawUnbondedTransactionBuilder({
                    stakedState: {
                        nonce: 1,
                        bonded: new BigNumber('1000'),
                        unbonded: new BigNumber('2000'),
                        unbondedFrom: Date.now(),
                    } as any,
                    network: Mainnet,
                    feeConfig: SAMPLE_FEE_CONFIG,
                });
            }).to.throw(
                'Expected property property `address` to be of type `string` but received type `undefined` in object `stakedState` in object `options`',
            );
        });

        it('should set the network to Mainnet when not provided', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,

                feeConfig: SAMPLE_FEE_CONFIG,
            });

            expect(builder.getNetwork()).to.deep.eq(Mainnet);
        });

        it('should throw Error when fee config is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new WithdrawUnbondedTransactionBuilder({
                    stakedState: SAMPLE_STAKED_STATE,

                    network: Mainnet,
                } as any);
            }).to.throw(
                'Expected property `feeConfig` to be of type `object` but received type `undefined` in object `options`',
            );
        });

        it('should throw Error when fee config is invalid', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new WithdrawUnbondedTransactionBuilder({
                    stakedState: SAMPLE_STAKED_STATE,

                    network: Mainnet,
                    feeConfig: {} as any,
                });
            }).to.throw(
                'Expected property property `algorithm` to be of type `string` but received type `undefined` in object `feeConfig` in object `options`',
            );
        });

        it('should throw Error when the fee algorithm is not supported', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new WithdrawUnbondedTransactionBuilder({
                    stakedState: SAMPLE_STAKED_STATE,

                    network: Mainnet,
                    feeConfig: {
                        algorithm: 'unsupported-algorithm' as any,
                    },
                });
            }).to.throw(
                'Expected property property string `algorithm` to be one of `["LinearFee"]`, got `unsupported-algorithm` in object `feeConfig` in object `options`',
            );
        });

        it('should create a builder with the provided options', () => {
            const stakedState = SAMPLE_STAKED_STATE;
            const network = Devnet({
                chainHexId: 'AB',
            });
            const feeConfig = SAMPLE_FEE_CONFIG;
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState,
                network,
                feeConfig,
            });

            expect(builder.getStakedState()).to.eq(stakedState);
            expect(builder.getNetwork()).to.eq(network);
            expect(builder.getFeeConfig()).to.eq(feeConfig);
        });
    });

    describe('addOutput', () => {
        it('should throw Error when output is missing', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            expect(() => {
                (builder.addOutput as any)();
            }).to.throw(
                'Expected `output` to be of type `object` but received type `undefined`',
            );
        });

        it('should throw Error when output has missing fields', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
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
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
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
                stakedState: SAMPLE_STAKED_STATE,
                network: Devnet({
                    chainHexId: 'AB',
                }),
                feeConfig: SAMPLE_FEE_CONFIG,
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
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            expect(builder.addOutput(SAMPLE_OUTPUT)).to.be.an.instanceOf(
                WithdrawUnbondedTransactionBuilder,
            );
        });

        it('should return Error when trying to append an output with sum of output amount exceed unbonded amount', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: {
                    ...SAMPLE_STAKED_STATE,
                    unbonded: new BigNumber('5000'),
                },
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            expect(() => {
                builder.addOutput({
                    ...SAMPLE_OUTPUT,
                    value: new BigNumber('6000'),
                });
            }).to.throw('Output amount exceed unbonded amount');
        });

        it('should return Error when the output valid from is not the same as unbonded from time', () => {
            const unbondedFrom = 1574240208;
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: {
                    ...SAMPLE_STAKED_STATE,

                    unbondedFrom,
                },
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            expect(builder.outputsLength()).to.eq(0);

            expect(() => {
                builder.addOutput({
                    address: SAMPLE_MAINNET_TRANSFER_ADDRESS,
                    value: new BigNumber('1000'),
                    validFrom: Timespec.fromSeconds(unbondedFrom - 1),
                });
            }).to.throw(
                'Output valid from must be the same as staked state unbonded from',
            );
        });

        it('should append output to the builder', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            expect(builder.outputsLength()).to.eq(0);

            builder.addOutput(SAMPLE_OUTPUT);

            expect(builder.outputsLength()).to.eq(1);
        });

        it('should return different transaction Id when new output is appended', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
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
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
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
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            expect(() => {
                (builder.addViewKey as any)();
            }).to.throw(
                'Expected `viewKey` to be of type `Buffer` but received type `undefined`',
            );
        });

        it('should throw an Error when viewKey is invalid', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
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
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            expect(builder.addViewKey(SAMPLE_VIEW_KEY)).to.be.an.instanceOf(
                WithdrawUnbondedTransactionBuilder,
            );
        });

        it('should add viewKey', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            expect(builder.viewKeysLength()).to.eq(0);

            builder.addViewKey(SAMPLE_VIEW_KEY);

            expect(builder.viewKeysLength()).to.eq(1);
        });

        it('should return different transaction Id when new output is added', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            builder.addOutput(SAMPLE_OUTPUT);

            const firstTxId = builder.txId();

            builder.addOutput(SAMPLE_OUTPUT);

            expect(builder.txId()).not.to.eq(firstTxId);
        });
    });

    describe('sign', () => {
        it('should throw Error when KeyPair is missing', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            expect(() => {
                (builder.sign as any)();
            }).to.throw(
                'Expected `keyPair` to be of type `object` but received type `undefined`',
            );
        });

        it('should return WithdrawUnbondedTransactionBuilder', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            expect(builder.sign(KeyPair.generateRandom())).to.be.an.instanceOf(
                WithdrawUnbondedTransactionBuilder,
            );
        });

        it('should sign the transaction', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            expect(builder.isSigned()).to.eq(false);

            builder.sign(KeyPair.generateRandom());

            expect(builder.isSigned()).to.eq(true);
        });
    });

    describe('isCompleted', () => {
        it('should return false when transaction is not signed', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            builder.addOutput(SAMPLE_OUTPUT);

            expect(builder.isCompleted()).to.eq(false);
        });

        it('should return false when there is no output', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            builder.sign(KeyPair.generateRandom());

            expect(builder.isCompleted()).to.eq(false);
        });

        it('should return true when the transaction is completed', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            builder.addOutput(SAMPLE_OUTPUT).sign(KeyPair.generateRandom());

            expect(builder.isCompleted()).to.eq(true);
        });
    });

    describe('txId', () => {
        it('should throw Error when transaction builder has no output', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            expect(() => {
                builder.txId();
            }).to.throw('Builder has no output');
        });

        it('should return transaction Id', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            builder.addOutput(SAMPLE_OUTPUT);

            expect(builder.txId()).to.eq(
                'ab70d5ac5b741a27da67ade6e9d7889451f1bf394e354bad85ffb4f5bcaaecaa',
            );
        });
    });

    describe('toHex', () => {
        it('should throw Error when Tendermint address is not http nor ws', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            builder.addOutput(SAMPLE_OUTPUT).sign(SAMPLE_KEY_PAIR);

            expect(() => {
                builder.toHex('tcp://127.0.0.1');
            }).to.throw('Expected value to be HTTP or WS tendermint address');
        });

        it('should throw Error when the Tendermint address is invalid URL', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            builder.addOutput(SAMPLE_OUTPUT).sign(SAMPLE_KEY_PAIR);

            expect(() => {
                builder.toHex('ws://127.0.0.1:99999');
            }).to.throw('Expected value to be HTTP or WS tendermint address');
        });

        it('should throw Error when there is no output', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            builder.sign(SAMPLE_KEY_PAIR);

            expect(() => {
                builder.toHex('ws://127.0.0.1:26657');
            }).to.throw('Builder has no output');
        });

        it('should throw Error when the builder is not signed', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            builder.addOutput(SAMPLE_OUTPUT);

            expect(() => {
                builder.toHex('ws://127.0.0.1:26657');
            }).to.throw('Builder is not signed');
        });

        it('should return completed Hex when Tendermint address is not provided', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            builder.addOutput(SAMPLE_OUTPUT).sign(SAMPLE_KEY_PAIR);

            const txHex = builder.toHex();
            expect(txHex.toString('hex')).to.deep.eq(
                '0002010000005c44e55668f4c2f446757800c8a8c331349748b9cf0e473188018442d26aa803215d2132b64ecaa343a3a1f9da536260a9a7b13c2deed1355d29f8c102af0ca20000000000000000000000000000000000000000dd02020100000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de80300000000000001d0ffd45d000000002a000100000000000000e80300000000000000e1f50500000000d0ffd45d0000000000b5698ee21f69a6184afbe59b3626ed9d4bd755b0000000005c44e55668f4c2f446757800c8a8c331349748b9cf0e473188018442d26aa803215d2132b64ecaa343a3a1f9da536260a9a7b13c2deed1355d29f8c102af0ca2ab70d5ac5b741a27da67ade6e9d7889451f1bf394e354bad85ffb4f5bcaaecaa',
            );
        });

        it('should return completed Hex given correct tendermint address', () => {
            const builder = new WithdrawUnbondedTransactionBuilder({
                stakedState: SAMPLE_STAKED_STATE,
                network: Mainnet,
                feeConfig: SAMPLE_FEE_CONFIG,
            });

            builder.addOutput(SAMPLE_OUTPUT).sign(SAMPLE_KEY_PAIR);

            expect(builder.toHex('ws://127.0.0.1:26657').toString('hex')).to.eq(
                '0002010000005c44e55668f4c2f446757800c8a8c331349748b9cf0e473188018442d26aa803215d2132b64ecaa343a3a1f9da536260a9a7b13c2deed1355d29f8c102af0ca20000000000000000000000000000000000000000dd02020100000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de80300000000000001d0ffd45d000000002a000100000000000000e80300000000000000e1f50500000000d0ffd45d0000000000b5698ee21f69a6184afbe59b3626ed9d4bd755b0000000005c44e55668f4c2f446757800c8a8c331349748b9cf0e473188018442d26aa803215d2132b64ecaa343a3a1f9da536260a9a7b13c2deed1355d29f8c102af0ca2ab70d5ac5b741a27da67ade6e9d7889451f1bf394e354bad85ffb4f5bcaaecaa',
            );
            expect(builder.toHex('ws://localhost:26657').toString('hex')).to.eq(
                '0002010000005c44e55668f4c2f446757800c8a8c331349748b9cf0e473188018442d26aa803215d2132b64ecaa343a3a1f9da536260a9a7b13c2deed1355d29f8c102af0ca20000000000000000000000000000000000000000dd02020100000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de80300000000000001d0ffd45d000000002a000100000000000000e80300000000000000e1f50500000000d0ffd45d0000000000b5698ee21f69a6184afbe59b3626ed9d4bd755b0000000005c44e55668f4c2f446757800c8a8c331349748b9cf0e473188018442d26aa803215d2132b64ecaa343a3a1f9da536260a9a7b13c2deed1355d29f8c102af0ca2ab70d5ac5b741a27da67ade6e9d7889451f1bf394e354bad85ffb4f5bcaaecaa',
            );
            expect(
                builder
                    .toHex('ws://tendermint-zerofee:26657/websocket')
                    .toString('hex'),
            ).to.eq(
                '0002010000005c44e55668f4c2f446757800c8a8c331349748b9cf0e473188018442d26aa803215d2132b64ecaa343a3a1f9da536260a9a7b13c2deed1355d29f8c102af0ca20000000000000000000000000000000000000000dd02020100000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de80300000000000001d0ffd45d000000002a000100000000000000e80300000000000000e1f50500000000d0ffd45d0000000000b5698ee21f69a6184afbe59b3626ed9d4bd755b0000000005c44e55668f4c2f446757800c8a8c331349748b9cf0e473188018442d26aa803215d2132b64ecaa343a3a1f9da536260a9a7b13c2deed1355d29f8c102af0ca2ab70d5ac5b741a27da67ade6e9d7889451f1bf394e354bad85ffb4f5bcaaecaa',
            );
            expect(
                builder.toHex('wss://localhost/websocket').toString('hex'),
            ).to.eq(
                '0002010000005c44e55668f4c2f446757800c8a8c331349748b9cf0e473188018442d26aa803215d2132b64ecaa343a3a1f9da536260a9a7b13c2deed1355d29f8c102af0ca20000000000000000000000000000000000000000dd02020100000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de80300000000000001d0ffd45d000000002a000100000000000000e80300000000000000e1f50500000000d0ffd45d0000000000b5698ee21f69a6184afbe59b3626ed9d4bd755b0000000005c44e55668f4c2f446757800c8a8c331349748b9cf0e473188018442d26aa803215d2132b64ecaa343a3a1f9da536260a9a7b13c2deed1355d29f8c102af0ca2ab70d5ac5b741a27da67ade6e9d7889451f1bf394e354bad85ffb4f5bcaaecaa',
            );
            expect(
                builder.toHex('http://localhost:26657').toString('hex'),
            ).to.eq(
                '0002010000005c44e55668f4c2f446757800c8a8c331349748b9cf0e473188018442d26aa803215d2132b64ecaa343a3a1f9da536260a9a7b13c2deed1355d29f8c102af0ca20000000000000000000000000000000000000000dd02020100000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de80300000000000001d0ffd45d000000002a000100000000000000e80300000000000000e1f50500000000d0ffd45d0000000000b5698ee21f69a6184afbe59b3626ed9d4bd755b0000000005c44e55668f4c2f446757800c8a8c331349748b9cf0e473188018442d26aa803215d2132b64ecaa343a3a1f9da536260a9a7b13c2deed1355d29f8c102af0ca2ab70d5ac5b741a27da67ade6e9d7889451f1bf394e354bad85ffb4f5bcaaecaa',
            );
            expect(
                builder.toHex('https://chain.crypto.com').toString('hex'),
            ).to.eq(
                '0002010000005c44e55668f4c2f446757800c8a8c331349748b9cf0e473188018442d26aa803215d2132b64ecaa343a3a1f9da536260a9a7b13c2deed1355d29f8c102af0ca20000000000000000000000000000000000000000dd02020100000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de80300000000000001d0ffd45d000000002a000100000000000000e80300000000000000e1f50500000000d0ffd45d0000000000b5698ee21f69a6184afbe59b3626ed9d4bd755b0000000005c44e55668f4c2f446757800c8a8c331349748b9cf0e473188018442d26aa803215d2132b64ecaa343a3a1f9da536260a9a7b13c2deed1355d29f8c102af0ca2ab70d5ac5b741a27da67ade6e9d7889451f1bf394e354bad85ffb4f5bcaaecaa',
            );
        });
    });
});
