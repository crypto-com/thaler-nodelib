import 'mocha';
import { expect } from 'chai';
import BigNumber from 'bignumber.js';

import { TransferTransactionBuilder } from './transfer_transaction_builder';
import { KeyPair } from '../../key_pair';
import { transfer, SINGLE_SIGN_ADDRESS } from '../../address';
import { MAX_COIN_BN } from '../../init';
import { FeeAlgorithm, ZERO_LINEAR_FEE, FeeConfig } from '../../fee';
import { Mainnet, Devnet, Testnet } from '../../network';
import { Timespec } from '../../types/timespec';

const native = require('../../../../native/index.node');

describe('TransferTransactionBuilder', () => {
    describe('constructor', () => {
        it('should set network to Mainnet when network is not provided', () => {
            const builder = new TransferTransactionBuilder();

            expect(builder.getNetwork()).to.deep.eq(Mainnet);
        });

        it('should use the network fee config', () => {
            const builder = new TransferTransactionBuilder({
                network: Testnet,
            });

            expect(builder.feeConfig).to.deep.eq(Testnet.feeConfig);
        });
    });

    describe('addInput', () => {
        it('should throw Error when previous TxId is invalid', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.addInput({
                    prevTxId: 'INVALID',
                    prevIndex: 0,
                    prevOutput: {
                        address:
                            'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                });
            }).to.throw(
                'Expected property string `prevTxId` to match `/^[0-9A-Fa-f]{64}$/`, got `INVALID` in object',
            );
            expect(() => {
                builder.addInput({
                    prevTxId: '000000',
                    prevIndex: 0,
                    prevOutput: {
                        address:
                            'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                });
            }).to.throw(
                'Expected property string `prevTxId` to match `/^[0-9A-Fa-f]{64}$/`, got `000000` in object',
            );
        });

        it('should throw Error when previous index is invalid', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: -1,
                    prevOutput: {
                        address:
                            'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                });
            }).to.throw(
                'Expected property number `prevIndex` to be greater than or equal to 0, got -1 in object',
            );
            expect(() => {
                builder.addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: '0' as any,
                    prevOutput: {
                        address:
                            'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                });
            }).to.throw(
                'Expected property `prevIndex` to be of type `number` but received type `string` in object',
            );
        });

        it('should throw Error when previous output address is invalid', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: 'invalid0address',
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                });
            }).to.throw(
                'Expected property property value to be a valid transfer address in object `prevOutput` in object',
            );
            expect(() => {
                builder.addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: 'cro0invalid0address',
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                });
            }).to.throw(
                'Expected property property value to be a valid transfer address in object `prevOutput` in object',
            );
        });

        it('should throw Error when previous output address is in different network from the builder', () => {
            const builder = new TransferTransactionBuilder({
                network: Mainnet,
            });

            expect(() => {
                builder.addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address:
                            'dcro1pe7qg5gshrdl99m9q3ecpzvfr8zuk4h5qqgjyv6y24n80zye42as88x8tg',
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                });
            }).to.throw(
                'Previous output address does not belongs to the builder network',
            );
        });

        it('should throw Error when previous output value is invalid', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address:
                            'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: '1000' as any,
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                });
            }).to.throw(
                'Expected property property `value` to be of type `object` but received type `string` in object `prevOutput` in object',
            );
        });

        it('should throw Error when previous output valid from is invalid', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address:
                            'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                        validFrom: 0 as any,
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                });
            }).to.throw(
                'Expected property property `validFrom` to be of type `object` but received type `number` in object `prevOutput` in object',
            );
        });

        it('should throw Error when addressParams is missing', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address:
                            'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                } as any);
            }).to.throw(
                'Expected property `addressParams` to be of type `object` but received type `undefined` in object `input`',
            );
        });

        it('should throw Error when addressParams is invalid', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address:
                            'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                    addressParams: {
                        requiredSigners: -1,
                        totalSigners: -1,
                    },
                });
            }).to.throw(
                'Expected property property number `requiredSigners` to be greater than 0, got -1 in object `addressParams` in object `input`',
            );

            expect(() => {
                builder.addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address:
                            'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                    addressParams: {
                        requiredSigners: 5,
                        totalSigners: 1,
                    },
                });
            }).to.throw(
                '(object `addressParams`) Total signers should be greater than or equal to required signers in object `input`',
            );
        });

        it('should add input to the builder', () => {
            const builder = new TransferTransactionBuilder();

            builder.addInput({
                prevTxId:
                    '0000000000000000000000000000000000000000000000000000000000000000',
                prevIndex: 0,
                prevOutput: {
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                },
                addressParams: SINGLE_SIGN_ADDRESS,
            });

            expect(builder.inputsLength()).to.eq(1);
        });

        it('should clear signed transaction witness', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1500'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            builder.signInput(0, keyPair);

            expect(builder.isCompleted()).to.eq(true);

            builder.addInput({
                prevTxId:
                    '0000000000000000000000000000000000000000000000000000000000000000',
                prevIndex: 1,
                prevOutput: {
                    address: transfer({
                        keyPair,
                        network: Mainnet,
                    }),
                    value: new BigNumber('1000'),
                },
                addressParams: SINGLE_SIGN_ADDRESS,
            });

            expect(builder.isCompleted()).to.eq(false);
        });
    });

    describe('addOutput', () => {
        const SAMPLE_FEE_CONFIG: FeeConfig = {
            algorithm: FeeAlgorithm.LinearFee,
            constant: new BigNumber('1000'),
            coefficient: new BigNumber('1001'),
        };

        it('should throw Error when address is invalid', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.addOutput({
                    address: 'invalid0address',
                    value: new BigNumber('1000'),
                });
            }).to.throw(
                'Expected property value to be a valid transfer address in object',
            );
            expect(() => {
                builder.addOutput({
                    address: 'cro0invalid0address',
                    value: new BigNumber('1000'),
                });
            }).to.throw(
                'Expected property value to be a valid transfer address in object',
            );
        });

        it('should throw Error when address is in different network from the builder', () => {
            const builder = new TransferTransactionBuilder({
                network: Mainnet,
            });

            expect(() => {
                builder.addOutput({
                    address:
                        'dcro1pe7qg5gshrdl99m9q3ecpzvfr8zuk4h5qqgjyv6y24n80zye42as88x8tg',
                    value: new BigNumber('1000'),
                });
            }).to.throw('Address does not belongs to the builder network');
        });

        it('should throw Error when value is invalid', () => {
            const builder = new TransferTransactionBuilder({
                network: Devnet({
                    feeConfig: SAMPLE_FEE_CONFIG,
                    chainHexId: 'AB',
                }),
            });

            expect(() => {
                builder.addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: '1000' as any,
                });
            }).to.throw(
                'Expected property `value` to be of type `object` but received type `string` in object',
            );
        });

        it('should throw Error when value is greater than maximum coin', () => {
            const builder = new TransferTransactionBuilder({
                network: Devnet({
                    feeConfig: SAMPLE_FEE_CONFIG,
                    chainHexId: 'AB',
                }),
            });

            expect(() => {
                builder.addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: MAX_COIN_BN.plus(1),
                });
            }).to.throw(
                'Expected property value to be within maximum coin: 10,000,000,000,000,000,000 in object',
            );
        });

        it('should throw Error when valid from is invalid', () => {
            const builder = new TransferTransactionBuilder({
                network: Devnet({
                    feeConfig: SAMPLE_FEE_CONFIG,
                    chainHexId: 'AB',
                }),
            });

            expect(() => {
                builder.addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                    validFrom: 0 as any,
                });
            }).to.throw(
                'Expected property `validFrom` to be of type `object` but received type `number` in object',
            );
        });

        it('should add output to the builder', () => {
            const builder = new TransferTransactionBuilder();

            builder.addOutput({
                address:
                    'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                value: new BigNumber('1000'),
            });

            expect(builder.outputsLength()).to.eq(1);
        });

        it('should clear signed transaction witness', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1500'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            builder.signInput(0, keyPair);

            expect(builder.isCompleted()).to.eq(true);

            builder.addOutput({
                address:
                    'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                value: new BigNumber('1000'),
            });

            expect(builder.isCompleted()).to.eq(false);
        });
    });

    describe('addViewKey', () => {
        it('should throw Error when view key is invalid', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.addViewKey(Buffer.from('00000000', 'hex'));
            }).to.throw('Expected value to be a valid view key');
        });

        it('should add view key to the builder', () => {
            const builder = new TransferTransactionBuilder();

            builder.addViewKey(
                Buffer.from(
                    '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                    'hex',
                ),
            );

            expect(builder.viewKeysLength()).to.eq(1);
        });

        it('should clear signed transaction witness', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1500'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            builder.signInput(0, keyPair);

            expect(builder.isCompleted()).to.eq(true);

            builder.addViewKey(
                Buffer.from(
                    '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                    'hex',
                ),
            );

            expect(builder.isCompleted()).to.eq(false);
        });
    });

    describe('estimateFee', () => {
        it('should throw Error when there is no inputs', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => builder.estimateFee()).to.throw(
                'Builder has no input',
            );
        });

        it('should throw Error when there is no outputs', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder.addInput({
                prevTxId:
                    '0000000000000000000000000000000000000000000000000000000000000000',
                prevIndex: 0,
                prevOutput: {
                    address: transfer({
                        keyPair,
                        network: Mainnet,
                    }),
                    value: new BigNumber('1500'),
                },
                addressParams: SINGLE_SIGN_ADDRESS,
            });

            expect(() => builder.estimateFee()).to.throw(
                'Builder has no output',
            );
        });

        it('should return estimated fee in string', () => {
            const builder = new TransferTransactionBuilder({
                network: Mainnet,
            });
            const keyPair = KeyPair.generateRandom();
            const transferAddress = transfer({
                keyPair,
                network: Mainnet,
            });

            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transferAddress,
                        value: new BigNumber('2000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );
            expect(builder.estimateFee()).to.equal('417');

            builder.addOutput({
                address:
                    'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                value: new BigNumber('1000'),
            });
            expect(builder.estimateFee()).to.equal('469');

            builder.addInput({
                prevTxId:
                    '0000000000000000000000000000000000000000000000000000000000000001',
                prevIndex: 0,
                prevOutput: {
                    address: transferAddress,
                    value: new BigNumber('1000'),
                },
                addressParams: SINGLE_SIGN_ADDRESS,
            });
            expect(builder.estimateFee()).to.equal('677');

            builder.addInput({
                prevTxId:
                    '0000000000000000000000000000000000000000000000000000000000000001',
                prevIndex: 0,
                prevOutput: {
                    address: transferAddress,
                    value: new BigNumber('1000'),
                    validFrom: Timespec.fromSeconds(1000),
                },
                addressParams: SINGLE_SIGN_ADDRESS,
            });
            expect(builder.estimateFee()).to.equal('884');
        });
    });

    describe('signInput', () => {
        it('should throw Error when the input index is negative', () => {
            const builder = new TransferTransactionBuilder();

            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address:
                            'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );
            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));

            expect(() => {
                builder.signInput(-1, keyPair);
            }).to.throw(
                'Expected number `index` to be greater than or equal to 0, got -1',
            );
        });

        it('should throw Error when the input index is out of bound', () => {
            const builder = new TransferTransactionBuilder();

            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address:
                            'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );
            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));

            expect(() => {
                builder.signInput(2, keyPair);
            }).to.throw('Expected number `index` to be less than 1, got 2');
        });

        it('should throw Error when KeyPair does not have private key', () => {
            const builder = new TransferTransactionBuilder();

            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address:
                            'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            const publicKey = Buffer.from(
                '0317b7e1ce1f9f94c32a43739229f88c0b0333296fb46e8f72865849c6ae34b84e',
                'hex',
            );
            const keyPair = KeyPair.fromPublicKey(publicKey);

            expect(() => {
                builder.signInput(0, keyPair);
            }).to.throw('KeyPair does not have private key');
        });

        it('should throw Error when KeyPair is unable to sign the input', () => {
            const builder = new TransferTransactionBuilder();
            const mismatchedTransferAddress =
                'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3';

            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: mismatchedTransferAddress,
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));

            expect(() => {
                builder.signInput(0, keyPair);
            }).to.throw('Input address is not signable by the key pair');
        });

        it('should sign the input', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('2500'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            expect(builder.isCompleted()).to.eq(false);

            builder.signInput(0, keyPair);

            expect(builder.isCompleted()).to.eq(true);
        });
    });

    describe('addWitness', () => {
        it('should throw Error when the input index is negative', () => {
            const builder = new TransferTransactionBuilder();

            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address:
                            'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );
            const witness = Buffer.from(
                '001e649e6ec3165c63b0fa47ffce7d18675f49bf887354a21d0f8ecc4d2be6cb784aad962752d1550913cefdfd7211f97bb80af5713a4692f41ab20bd88c0bc940ebaac52a25455a63e812b57a42439c68c016d05f7d99e84561a2728aebe872a30002fe0a593b63d48ee042035f39432d062c5df78876d16b9c328044bd6e120b7392',
                'hex',
            );

            expect(() => {
                builder.addWitness(-1, witness);
            }).to.throw(
                'Expected number `index` to be greater than or equal to 0, got -1',
            );
        });

        it('should throw Error when the input index is out of bound', () => {
            const builder = new TransferTransactionBuilder();

            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address:
                            'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );
            const witness = Buffer.from(
                '001e649e6ec3165c63b0fa47ffce7d18675f49bf887354a21d0f8ecc4d2be6cb784aad962752d1550913cefdfd7211f97bb80af5713a4692f41ab20bd88c0bc940ebaac52a25455a63e812b57a42439c68c016d05f7d99e84561a2728aebe872a30002fe0a593b63d48ee042035f39432d062c5df78876d16b9c328044bd6e120b7392',
                'hex',
            );

            expect(() => {
                builder.addWitness(2, witness);
            }).to.throw('Expected number `index` to be less than 1, got 2');
        });

        it('should throw Error when witness does not correspond to the input', () => {
            const builder = new TransferTransactionBuilder();
            const keyPair = KeyPair.generateRandom();
            const transferAddress = transfer({ keyPair, network: Mainnet });

            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transferAddress,
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );
            const anotherKeyPair = KeyPair.generateRandom();
            const witness = native.signer.schnorrSignTxId(
                Buffer.from(builder.txId(), 'hex'),
                anotherKeyPair.toObject(),
            );

            expect(() => {
                builder.addWitness(0, witness);
            }).to.throw(
                'Unable to add witness to input: Invalid input: Incorrect signature: secp: malformed public key',
            );
        });

        it('should add the witness to the input', () => {
            const builder = new TransferTransactionBuilder();
            const keyPair = KeyPair.generateRandom();
            const transferAddress = transfer({ keyPair, network: Mainnet });

            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transferAddress,
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );
            const witness = native.signer.schnorrSignTxId(
                Buffer.from(builder.txId(), 'hex'),
                keyPair.toObject(),
            );

            expect(builder.isCompleted()).to.eq(false);

            builder.addWitness(0, witness);

            expect(builder.isCompleted()).to.eq(true);
        });
    });

    describe('isCompleted', () => {
        it('should return false when there transaction has no input', () => {
            const builder = new TransferTransactionBuilder();

            builder
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('2500'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            expect(builder.isCompleted()).to.eq(false);
        });

        it('should return false when there is missing signature in inputs', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('2000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('2500'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            builder.signInput(1, keyPair);

            expect(builder.isCompleted()).to.eq(false);
        });

        it('should return true when all inputs are signed', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 1,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('2000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('2500'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            builder.signInput(0, keyPair);
            builder.signInput(1, keyPair);

            expect(builder.isCompleted()).to.eq(true);
        });
    });

    describe('txId', () => {
        it('should throw Error when the build has no input', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.txId();
            }).to.throw('Builder has no input');
        });

        it('should return transaction Id of the builder', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1500'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            expect(builder.txId()).to.eq(
                'b10ae56b53fa9f8560b5d6bf211f4d48c948dfb8dbab86eb6a4bf7c4af08da83',
            );
        });

        it('should return the same transaction Id with or without witness', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1500'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            const txIdBeforeSign = builder.txId();

            builder.signInput(0, keyPair);

            expect(builder.txId()).to.eq(txIdBeforeSign);
        });
    });

    describe('toHex', () => {
        const ZERO_FEE_DEVNET = Devnet({
            feeConfig: ZERO_LINEAR_FEE,
            chainHexId: 'AB',
        });

        it('should throw Error when the tendermint address is not ws', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('2000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1500'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            builder.signInput(0, keyPair);

            expect(() => {
                builder.toHex('tcp://127.0.0.1');
            }).to.throw('Expected value to be HTTP or WS tendermint address');
        });

        it('should throw Error when the tendermint address is http', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('2000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1500'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            builder.signInput(0, keyPair);

            expect(() => {
                builder.toHex('http://127.0.0.1');
            }).to.throw('Expected value to be HTTP or WS tendermint address');
        });

        it('should throw Error when the tendermint address is invalid URL', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('2000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1500'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            builder.signInput(0, keyPair);

            expect(() => {
                builder.toHex('ws://tendermint:999999');
            }).to.throw('Expected value to be HTTP or WS tendermint address');
        });

        it('should throw Error when the builder has no input', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.toHex();
            }).to.throw('Builder has no input');
        });

        it('should throw Error when the transaction has unsigned input', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('500'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            expect(() => {
                builder.toHex();
            }).to.throw('Transaction is not completed');
        });

        it('should throw Error when the builder has no output', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder.addInput({
                prevTxId:
                    '0000000000000000000000000000000000000000000000000000000000000000',
                prevIndex: 0,
                prevOutput: {
                    address: transfer({
                        keyPair,
                        network: Mainnet,
                    }),
                    value: new BigNumber('1000'),
                },
                addressParams: SINGLE_SIGN_ADDRESS,
            });

            expect(() => {
                builder.toHex();
            }).to.throw('Builder has no output');
        });

        it('should throw Error when the transaction output amount exceeds input amount', () => {
            const builder = new TransferTransactionBuilder({
                network: ZERO_FEE_DEVNET,
            });

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: ZERO_FEE_DEVNET,
                        }),
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'dcro1qkwn2jde2cq5e6ef6jd0s60y24vxc9zdv5ejp0kyy7d6td7n2kdqyq4n4v',
                    value: new BigNumber('1500'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            builder.signInput(0, keyPair);

            expect(() => {
                builder.toHex();
            }).to.throw(
                'Error when trying to verify raw transfer transaction: Verify error: Insufficient balance',
            );
        });

        it('should return completed Hex', () => {
            const builder = new TransferTransactionBuilder({
                network: ZERO_FEE_DEVNET,
            });

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: ZERO_FEE_DEVNET,
                        }),
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 1,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: ZERO_FEE_DEVNET,
                        }),
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'dcro1qkwn2jde2cq5e6ef6jd0s60y24vxc9zdv5ejp0kyy7d6td7n2kdqyq4n4v',
                    value: new BigNumber('1500'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            builder.signInput(0, keyPair);
            builder.signInput(1, keyPair);

            expect(builder.toHex().toString('hex')).to.eq(
                '0000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100010000000000000000000000000000000000000000008d05000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000400059d3549b956014ceb29d49af869e455586c144d653320bec4279ba5b7d3559adc050000000000000000ab040248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c00010000000000000008009e0400eb47cb60e896d9876f85823d8d4b9b685f7fa4193e3508f9f08004b10caae91ba2000cb48b35a2333b8a9dc5c90849b82147b3e791c8d7ff323d47faff001b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f009e0400eb47cb60e896d9876f85823d8d4b9b685f7fa4193e3508f9f08004b10caae91ba2000cb48b35a2333b8a9dc5c90849b82147b3e791c8d7ff323d47faff001b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078fd1d2c971db2e1016dfd67209d62675e82b329a9362f0e39e11218f441ddbbabe',
            );
        });

        it('should return completed Hex given correct tendermint address', () => {
            const builder = new TransferTransactionBuilder({
                network: ZERO_FEE_DEVNET,
            });

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: ZERO_FEE_DEVNET,
                        }),
                        value: new BigNumber('2000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'dcro1qkwn2jde2cq5e6ef6jd0s60y24vxc9zdv5ejp0kyy7d6td7n2kdqyq4n4v',
                    value: new BigNumber('1500'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            builder.signInput(0, keyPair);

            expect(
                builder.toHex('ws://127.0.0.1/websocket').toString('hex'),
            ).to.eq(
                '00000400000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000007d030004000000000000000000000000000000000000000000000000000000000000000000000400059d3549b956014ceb29d49af869e455586c144d653320bec4279ba5b7d3559adc050000000000000000ab040248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c00010000000000000004006913d40ceca57ae9330c493b4e9d38ef0beebf638ca86df187b000832d6e3f8bc8e766c61a8fc7c611b3b6ef0e9094346af856c983864f6bfccf217c5dd6b7d4001b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f93ccef4bfff2fe0ce9b0d4276ce45d1aa91be72fb8c1f479ba04e7bd3ed2f04b',
            );
            expect(
                builder.toHex('ws://localhost/websocket').toString('hex'),
            ).to.eq(
                '00000400000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000007d030004000000000000000000000000000000000000000000000000000000000000000000000400059d3549b956014ceb29d49af869e455586c144d653320bec4279ba5b7d3559adc050000000000000000ab040248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c00010000000000000004006913d40ceca57ae9330c493b4e9d38ef0beebf638ca86df187b000832d6e3f8bc8e766c61a8fc7c611b3b6ef0e9094346af856c983864f6bfccf217c5dd6b7d4001b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f93ccef4bfff2fe0ce9b0d4276ce45d1aa91be72fb8c1f479ba04e7bd3ed2f04b',
            );
            expect(
                builder
                    .toHex('ws://tendermint-zerofee:26657/websocket')
                    .toString('hex'),
            ).to.eq(
                '00000400000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000007d030004000000000000000000000000000000000000000000000000000000000000000000000400059d3549b956014ceb29d49af869e455586c144d653320bec4279ba5b7d3559adc050000000000000000ab040248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c00010000000000000004006913d40ceca57ae9330c493b4e9d38ef0beebf638ca86df187b000832d6e3f8bc8e766c61a8fc7c611b3b6ef0e9094346af856c983864f6bfccf217c5dd6b7d4001b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f93ccef4bfff2fe0ce9b0d4276ce45d1aa91be72fb8c1f479ba04e7bd3ed2f04b',
            );
            expect(
                builder.toHex('wss://localhost/websocket').toString('hex'),
            ).to.eq(
                '00000400000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000007d030004000000000000000000000000000000000000000000000000000000000000000000000400059d3549b956014ceb29d49af869e455586c144d653320bec4279ba5b7d3559adc050000000000000000ab040248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c00010000000000000004006913d40ceca57ae9330c493b4e9d38ef0beebf638ca86df187b000832d6e3f8bc8e766c61a8fc7c611b3b6ef0e9094346af856c983864f6bfccf217c5dd6b7d4001b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f93ccef4bfff2fe0ce9b0d4276ce45d1aa91be72fb8c1f479ba04e7bd3ed2f04b',
            );
        });
    });

    describe('toIncompleteHex', () => {
        it('should return Hex when transaction does not have input', () => {
            const builder = new TransferTransactionBuilder();

            builder
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1500'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            expect(builder.toIncompleteHex().toString('hex')).to.eq(
                '00040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497ddc0500000000000000002a040248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c000100000000000000',
            );
        });

        it('should return Hex when transaction does not have output', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 1,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            expect(builder.toIncompleteHex().toString('hex')).to.eq(
                '080000000000000000000000000000000000000000000000000000000000000000000000ca4792470298f0fb8afa9fef6bec440e6d0a31a6c1bdc8f01d12665477f9ed87e803000000000000000001000000000000000000000000000000000000000000000000000000000000000000010000ca4792470298f0fb8afa9fef6bec440e6d0a31a6c1bdc8f01d12665477f9ed87e8030000000000000000010000002a040248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c000100000000000000',
            );
        });

        it('should return Hex when transaction does not have viewKey', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 1,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1500'),
                });

            expect(builder.toIncompleteHex().toString('hex')).to.eq(
                '080000000000000000000000000000000000000000000000000000000000000000000000ca4792470298f0fb8afa9fef6bec440e6d0a31a6c1bdc8f01d12665477f9ed87e803000000000000000001000000000000000000000000000000000000000000000000000000000000000000010000ca4792470298f0fb8afa9fef6bec440e6d0a31a6c1bdc8f01d12665477f9ed87e80300000000000000000100040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497ddc0500000000000000002a000100000000000000',
            );
        });

        it('should return Hex when transaction is completed with signatures', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 1,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1500'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            builder.signInput(0, keyPair);
            builder.signInput(1, keyPair);

            expect(builder.toIncompleteHex().toString('hex')).to.eq(
                '080000000000000000000000000000000000000000000000000000000000000000000000ca4792470298f0fb8afa9fef6bec440e6d0a31a6c1bdc8f01d12665477f9ed87e803000000000000000100f82e78f5ed675752a760015b073e0f0533f264513eff6b1d934db4fcac063e1989372e1d0ef971099bbcb21d327bee574b3ff2ef49b340ebadad498cd70b8314001b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f01000000000000000000000000000000000000000000000000000000000000000000010000ca4792470298f0fb8afa9fef6bec440e6d0a31a6c1bdc8f01d12665477f9ed87e803000000000000000100f82e78f5ed675752a760015b073e0f0533f264513eff6b1d934db4fcac063e1989372e1d0ef971099bbcb21d327bee574b3ff2ef49b340ebadad498cd70b8314001b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f0100040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497ddc0500000000000000002a040248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c000100000000000000',
            );
        });
    });

    describe('clone', () => {
        it('should return a deep clone copy of the builder', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addInput({
                    prevTxId:
                        '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 1,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                    addressParams: SINGLE_SIGN_ADDRESS,
                })
                .addOutput({
                    address:
                        'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1500'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            builder.signInput(0, keyPair);
            builder.signInput(1, keyPair);

            const clonedBuilder = builder.clone();
            clonedBuilder.addOutput({
                address:
                    'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                value: new BigNumber('500'),
            });

            expect(builder.outputsLength()).to.eq(1);
            expect(clonedBuilder.outputsLength()).to.eq(2);

            expect(builder.isCompleted()).to.eq(true);
            expect(clonedBuilder.isCompleted()).to.eq(false);
        });
    });

    // TODO
    // describe('signAll');
    // TODO
    // describe('mapInputs')
    // TODO
    // describe('mapOutputs')
    // TODO
    // describe('fromIncomplete')
});
