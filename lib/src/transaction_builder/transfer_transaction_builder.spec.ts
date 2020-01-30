import 'mocha';
import { expect } from 'chai';

import BigNumber from 'bignumber.js';
import TransferTransactionBuilder from './transfer_transaction_builder';
import { Network } from '../network';
import { FeeAlgorithm } from './types';
import KeyPair from '../key_pair/key_pair';
import transfer from '../address/transfer';
import { MAX_COIN_BN } from '../init';

describe('TransferTransactionBuilder', () => {
    describe('constructor', () => {
        it('should throw Error when network is Devnet but chain Id is not provided', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new TransferTransactionBuilder({
                    network: Network.Devnet,
                } as any);
            }).to.throw('Missing chainId for Devnet');
        });

        it('should set chainId when network is Mainnet or Testnet', () => {
            let builder = new TransferTransactionBuilder({
                network: Network.Mainnet,
            });
            expect(builder.getChainId()).to.eq('2A');

            builder = new TransferTransactionBuilder({
                network: Network.Testnet,
            });
            expect(builder.getChainId()).to.eq('42');
        });

        it('should ignore chainId when network is not Devnet', () => {
            const builder = new TransferTransactionBuilder({
                network: Network.Testnet,
                chainId: '66',
            });

            expect(builder.getChainId()).not.to.eq('66');
        });

        it('should set chainId to Mainnet when network is not provided', () => {
            const builder = new TransferTransactionBuilder();

            expect(builder.getNetwork()).to.eq(Network.Mainnet);
        });

        it('should throw Error when fee config is invalid', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new TransferTransactionBuilder({
                    feeConfig: {
                        algorithm: FeeAlgorithm.LinearFee,
                    },
                } as any);
            }).to.throw(
                'Expected property property `constant` to be of type `object` but received type `undefined` in object `feeConfig` in object',
            );
        });

        it('should throw unsupported fee algorithm error when fee algorithm is unsupported', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new TransferTransactionBuilder({
                    feeConfig: {
                        algorithm: 'Invalid',
                    },
                } as any);
            }).to.throw('Unsupported fee algorithm: Invalid in object `feeConfig` in object');
        });

        it('should throw Error when Linear fee constant and/or coefficient is invalid', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new TransferTransactionBuilder({
                    feeConfig: {
                        algorithm: FeeAlgorithm.LinearFee,
                        constant: new BigNumber('-1'),
                        coefficient: new BigNumber('1001'),
                    },
                });
            }).to.throw(
                'Expected property property value to be greater than or equal to 0 in object `feeConfig` in object',
            );

            expect(() => {
                // eslint-disable-next-line no-new
                new TransferTransactionBuilder({
                    feeConfig: {
                        algorithm: FeeAlgorithm.LinearFee,
                        constant: new BigNumber('-1'),
                        coefficient: new BigNumber('1001'),
                    },
                });
            }).to.throw(
                'Expected property property value to be greater than or equal to 0 in object `feeConfig` in object',
            );
        });

        it('should set fee algorithm as Linear fee when fee algorithm is not provided', () => {
            const builder = new TransferTransactionBuilder();

            expect(builder.getFeeConfig().algorithm).to.eq(FeeAlgorithm.LinearFee);
        });

        it('should use the fee config provided', () => {
            const builder = new TransferTransactionBuilder({
                feeConfig: {
                    algorithm: FeeAlgorithm.LinearFee,
                    constant: new BigNumber('1000'),
                    coefficient: new BigNumber('1001'),
                },
            });

            expect(builder.getFeeConfig().algorithm).to.eq(FeeAlgorithm.LinearFee);
        });
    });

    describe('setChainIdByNetwork', () => {
        it('should throw Error when the network is invalid', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.setChainIdByNetwork('Invalid' as any);
            }).to.throw(
                'Expected value to be one of the network variants (Mainnet, Testnet, Devnet)',
            );
        });

        it('should throw an Error when network is Devnet', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.setChainIdByNetwork(Network.Devnet);
            }).to.throw('Unable to determine chain Id based on network `Devnet`');
        });

        it('should update the builder chainId based on network', () => {
            const builder = new TransferTransactionBuilder();

            builder.setChainIdByNetwork(Network.Mainnet);

            expect(builder.getChainId()).to.eq('2A');
        });

        it('should return the builder itself', () => {
            const builder = new TransferTransactionBuilder();

            expect(builder.setChainIdByNetwork(Network.Mainnet)).to.deep.eq(builder);
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
                        address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                });
            }).to.throw(
                'Expected property string `prevTxId` to match `/^[0-9A-Fa-f]{64}$/`, got `INVALID` in object',
            );
            expect(() => {
                builder.addInput({
                    prevTxId: '000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                });
            }).to.throw(
                'Expected property string `prevTxId` to match `/^[0-9A-Fa-f]{64}$/`, got `000000` in object',
            );
        });

        it('should throw Error when previous index is invalid', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: -1,
                    prevOutput: {
                        address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                });
            }).to.throw(
                'Expected property number `prevIndex` to be greater than or equal to 0, got -1 in object',
            );
            expect(() => {
                builder.addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: '0' as any,
                    prevOutput: {
                        address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                });
            }).to.throw(
                'Expected property `prevIndex` to be of type `number` but received type `string` in object',
            );
        });

        it('should throw Error when previous output address is invalid', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: 'invalid0address',
                        value: new BigNumber('1000'),
                    },
                });
            }).to.throw(
                'Expected property property value to be a valid transfer address in object `prevOutput` in object',
            );
            expect(() => {
                builder.addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: 'cro0invalid0address',
                        value: new BigNumber('1000'),
                    },
                });
            }).to.throw(
                'Expected property property value to be a valid transfer address in object `prevOutput` in object',
            );
        });

        it('should throw Error when previous output address is in different network from the builder', () => {
            const builder = new TransferTransactionBuilder({
                network: Network.Mainnet,
            });

            expect(() => {
                builder.addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: 'dcro1pe7qg5gshrdl99m9q3ecpzvfr8zuk4h5qqgjyv6y24n80zye42as88x8tg',
                        value: new BigNumber('1000'),
                    },
                });
            }).to.throw('Previous output address does not belongs to the builder network');
        });

        it('should throw Error when previous output value is invalid', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: '1000' as any,
                    },
                });
            }).to.throw(
                'Expected property property `value` to be of type `object` but received type `string` in object `prevOutput` in object',
            );
        });

        it('should throw Error when previous output valid from is invalid', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                        validFrom: 0 as any,
                    },
                });
            }).to.throw(
                'Expected property property `validFrom` to be of type `date` but received type `number` in object `prevOutput` in object',
            );
        });

        it('should add input to the builder', () => {
            const builder = new TransferTransactionBuilder();

            builder.addInput({
                prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                prevIndex: 0,
                prevOutput: {
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                },
            });

            expect(builder.inputsLength()).to.eq(1);
        });

        it('should clear signed transaction witness', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('500'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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
                prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                prevIndex: 1,
                prevOutput: {
                    address: transfer({
                        keyPair,
                        network: Network.Mainnet,
                    }),
                    value: new BigNumber('1000'),
                },
            });

            expect(builder.isCompleted()).to.eq(false);
        });
    });

    describe('addOutput', () => {
        it('should throw Error when address is invalid', () => {
            const builder = new TransferTransactionBuilder();

            expect(() => {
                builder.addOutput({
                    address: 'invalid0address',
                    value: new BigNumber('1000'),
                });
            }).to.throw('Expected property value to be a valid transfer address in object');
            expect(() => {
                builder.addOutput({
                    address: 'cro0invalid0address',
                    value: new BigNumber('1000'),
                });
            }).to.throw('Expected property value to be a valid transfer address in object');
        });

        it('should throw Error when address is in different network from the builder', () => {
            const builder = new TransferTransactionBuilder({
                network: Network.Mainnet,
            });

            expect(() => {
                builder.addOutput({
                    address: 'dcro1pe7qg5gshrdl99m9q3ecpzvfr8zuk4h5qqgjyv6y24n80zye42as88x8tg',
                    value: new BigNumber('1000'),
                });
            }).to.throw('Address does not belongs to the builder network');
        });

        it('should throw Error when value is invalid', () => {
            const builder = new TransferTransactionBuilder({
                network: Network.Devnet,
                chainId: 'AB',
            });

            expect(() => {
                builder.addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: '1000' as any,
                });
            }).to.throw(
                'Expected property `value` to be of type `object` but received type `string` in object',
            );
        });

        it('should throw Error when value is greater than maximum coin', () => {
            const builder = new TransferTransactionBuilder({
                network: Network.Devnet,
                chainId: 'AB',
            });

            expect(() => {
                builder.addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: MAX_COIN_BN.plus(1),
                });
            }).to.throw(
                'Expected property value to be within maximum coin: 10,000,000,000,000,000,000 in object',
            );
        });

        it('should throw Error when valid from is invalid', () => {
            const builder = new TransferTransactionBuilder({
                network: Network.Devnet,
                chainId: 'AB',
            });

            expect(() => {
                builder.addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                    validFrom: 0 as any,
                });
            }).to.throw(
                'Expected property `validFrom` to be of type `date` but received type `number` in object',
            );
        });

        it('should add output to the builder', () => {
            const builder = new TransferTransactionBuilder();

            builder.addOutput({
                address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                value: new BigNumber('1000'),
            });

            expect(builder.outputsLength()).to.eq(1);
        });

        it('should clear signed transaction witness', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('2500'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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
                address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1500'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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

    describe('signInput', () => {
        it('should throw Error when the input index is negative', () => {
            const builder = new TransferTransactionBuilder();

            builder
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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
            }).to.throw('Expected number `index` to be greater than or equal to 0, got -1');
        });

        it('should throw Error when the input index is out of bound', () => {
            const builder = new TransferTransactionBuilder();

            builder
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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

            builder
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                        value: new BigNumber('1000'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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
            }).to.throw(
                'Unable to sign transaction: Multi-sig error: Signing address does not belong to the key pair',
            );
        });

        it('should sign the input', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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

    describe('isCompleted', () => {
        it('should return false when there transaction has no input', () => {
            const builder = new TransferTransactionBuilder();

            builder
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                })
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('2000'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                })
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 1,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('2000'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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
        it('should return transaction Id of the builder', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1500'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1000'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            expect(builder.txId()).to.eq(
                '2256fdd23a1d6bd38865b19e0693bdd7cdbe069e7d8fdca1140345c555df2fb6',
            );
        });

        it('should return the same transaction Id with or without witness', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1500'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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
        it('should throw Error when the transaction has unsigned input', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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
            }).to.throw('Transaction has unsigned input');
        });

        it('should throw Error when the transaction output amount exceeds input amount', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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
                'Unable to finish transaction: Verify error: Output amount exceed input amount',
            );
        });

        it('should return completed Hex', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                })
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 1,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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
                '000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010001000000000000000000000000000000000000000000710600080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497ddc050000000000000032040248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c000800569bacca3b4eb07c39beb59049bf436b2f894ffd015efad963b73db863309299d8ccbcc67fb41cb194333702bc3082e217a3db7fe4c6a5c4e7aa9b8fbc2cf8a2e298d504f41023eb9a4195d1227788b1270945f33f21e681a111ba6f5b382a4d00031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f00569bacca3b4eb07c39beb59049bf436b2f894ffd015efad963b73db863309299d8ccbcc67fb41cb194333702bc3082e217a3db7fe4c6a5c4e7aa9b8fbc2cf8a2e298d504f41023eb9a4195d1227788b1270945f33f21e681a111ba6f5b382a4d00031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f0000000000000000000000000000000000000000000000000000000000000000',
            );
        });
    });

    describe('toIncompleteHex', () => {
        it('should return Hex when transaction does not have input', () => {
            const builder = new TransferTransactionBuilder();

            builder
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1500'),
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            expect(builder.toIncompleteHex().toString('hex')).to.eq(
                '00040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497ddc050000000000000032040248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c00',
            );
        });

        it('should return Hex when transaction does not have output', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                })
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 1,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                })
                .addViewKey(
                    Buffer.from(
                        '0248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c',
                        'hex',
                    ),
                );

            expect(builder.toIncompleteHex().toString('hex')).to.eq(
                '080000000000000000000000000000000000000000000000000000000000000000000000e298d504f41023eb9a4195d1227788b1270945f33f21e681a111ba6f5b382a4de80300000000000000000000000000000000000000000000000000000000000000000000000000000000010000e298d504f41023eb9a4195d1227788b1270945f33f21e681a111ba6f5b382a4de80300000000000000000032040248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c00',
            );
        });

        it('should return Hex when transaction does not have viewKey', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                })
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 1,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
                    value: new BigNumber('1500'),
                });

            expect(builder.toIncompleteHex().toString('hex')).to.eq(
                '080000000000000000000000000000000000000000000000000000000000000000000000e298d504f41023eb9a4195d1227788b1270945f33f21e681a111ba6f5b382a4de80300000000000000000000000000000000000000000000000000000000000000000000000000000000010000e298d504f41023eb9a4195d1227788b1270945f33f21e681a111ba6f5b382a4de8030000000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497ddc05000000000000003200',
            );
        });

        it('should return Hex when transaction is completed with signatures', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));
            builder
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 0,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                })
                .addInput({
                    prevTxId: '0000000000000000000000000000000000000000000000000000000000000000',
                    prevIndex: 1,
                    prevOutput: {
                        address: transfer({
                            keyPair,
                            network: Network.Mainnet,
                        }),
                        value: new BigNumber('1000'),
                    },
                })
                .addOutput({
                    address: 'cro1p8c38xgv26c0wlzf0m8gugnn3fpaucrf5p98zhfaqvj4xr8mf97sp54ap3',
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
                '080000000000000000000000000000000000000000000000000000000000000000000000e298d504f41023eb9a4195d1227788b1270945f33f21e681a111ba6f5b382a4de803000000000000000100569bacca3b4eb07c39beb59049bf436b2f894ffd015efad963b73db863309299d8ccbcc67fb41cb194333702bc3082e217a3db7fe4c6a5c4e7aa9b8fbc2cf8a2e298d504f41023eb9a4195d1227788b1270945f33f21e681a111ba6f5b382a4d00031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f0000000000000000000000000000000000000000000000000000000000000000010000e298d504f41023eb9a4195d1227788b1270945f33f21e681a111ba6f5b382a4de803000000000000000100569bacca3b4eb07c39beb59049bf436b2f894ffd015efad963b73db863309299d8ccbcc67fb41cb194333702bc3082e217a3db7fe4c6a5c4e7aa9b8fbc2cf8a2e298d504f41023eb9a4195d1227788b1270945f33f21e681a111ba6f5b382a4d00031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497ddc050000000000000032040248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c00',
            );
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
