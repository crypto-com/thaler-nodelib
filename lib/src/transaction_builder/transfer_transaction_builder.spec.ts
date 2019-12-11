import 'mocha';
import { expect } from 'chai';

import BigNumber from 'bignumber.js';
import TransferTransactionBuilder from './transfer_transaction_builder';
import { Network } from '../network';
import { FeeAlgorithm } from './types';
import KeyPair from '../key_pair/key_pair';
import transfer from '../address/transfer';

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
    });

    describe('txId', () => {
        it('should return the txId for the transaction built', () => {
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

            expect(builder.txId()).to.eq(
                '04000000000000000000000000000000000000000000000000000000000000000000000009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de8030000000000000000040009f113990c56b0f77c497ece8e22738a43de6069a04a715d3d0325530cfb497de8030000000000000032040248b7c5f2325a7ef7dcd68066368fd63a7aad8c4a894414fcd81b227b2178322c00',
            );
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
            const keyPair = KeyPair.makeRandom();

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
            const keyPair = KeyPair.makeRandom();

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

            const keyPair = KeyPair.makeRandom();

            expect(() => {
                builder.signInput(0, keyPair);
            }).to.throw(
                'Unable to sign transaction: Multi-sig error: Signing address does not belong to the key pair',
            );
        });

        it('should sign the input', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.makeRandom();
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
                    value: new BigNumber('1000'),
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
        it('should return false when there is missing signature in inputs', () => {
            const builder = new TransferTransactionBuilder();

            const keyPair = KeyPair.makeRandom();
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
                    value: new BigNumber('1000'),
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

            const keyPair = KeyPair.makeRandom();
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

            expect(builder.isCompleted()).to.eq(true);
        });
    });

    describe('toHex', () => {});

    // TODO
    // describe('signAll');
    // TODO
    // describe('mapInputs')
    // TODO
    // describe('mapOutputs')
    // TODO
    // describe('toIncomplete');
    // TODO
    // describe('fromIncomplete')
});
