import 'mocha';
import { expect } from 'chai';

import { DepositTransactionBuilder } from './deposit_transaction_builder';
import { Mainnet, Devnet } from '../../network';
import { KeyPair } from '../../key_pair';
import { PrevOutputPointer } from './types';
import { FeeConfig, FeeAlgorithm } from '../../fee';
import { BigNumber } from '../../utils';

describe('DepositTransactionBuilder', () => {
    const SAMPLE_FEE_CONFIG: FeeConfig = {
        algorithm: FeeAlgorithm.LinearFee,
        constant: new BigNumber(1.1),
        coefficient: new BigNumber(1.25),
    };
    const SAMPLE_INPUT: PrevOutputPointer = {
        prevTxId:
            '0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
        prevIndex: 2,
    };
    const SAMPLE_STAKING_ADDRESS = '0xb5698ee21f69a6184afbe59b3626ed9d4bd755b0';
    const SAMPLE_KEY_PAIR = KeyPair.fromPrivateKey(Buffer.alloc(32, 1));

    describe('constructor', () => {
        it('should throw Error when staking address is missing', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new DepositTransactionBuilder({
                    network: Mainnet,
                } as any);
            }).to.throw(
                'Expected property `stakingAddress` to be of type `string` but received type `undefined` in object `options`',
            );
        });

        it('should throw Error when staking address is invalid', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                new DepositTransactionBuilder({
                    stakingAddress: '0xInvalid',
                    network: Mainnet,
                });
            }).to.throw(
                'Expected property value to be a valid staking address in object `options`',
            );
        });

        it('should set network to Mainnet when network is missing', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            expect(builder.getNetwork()).to.deep.eq(Mainnet);
        });

        it('should create builder with the provided config', () => {
            const stakingAddress = SAMPLE_STAKING_ADDRESS;
            const network = Devnet({
                feeConfig: SAMPLE_FEE_CONFIG,
                chainHexId: 'AB',
            });
            const builder = new DepositTransactionBuilder({
                stakingAddress,
                network,
            });

            expect(builder.getStakingAddress()).to.eq(stakingAddress);
            expect(builder.getNetwork()).to.deep.eq(network);
        });
    });

    describe('addInput', () => {
        it('should throw Error when transaction output pointer is missing', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            expect(() => {
                (builder.addInput as any)();
            }).to.throw(
                'Expected `prevOutputPointer` to be of type `object` but received type `undefined`',
            );
        });

        it('should throw Error when input is missing index', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            expect(() => {
                const input = {
                    prevTxId:
                        '0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
                };

                builder.addInput(input as any);
            }).to.throw(
                'Expected property `prevIndex` to be of type `number` but received type `undefined` in object `prevOutputPointer`',
            );
        });

        it('should throw Error when input is missing index', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            expect(() => {
                const input = {
                    index: 1,
                };

                builder.addInput(input as any);
            }).to.throw(
                'Expected property `prevTxId` to be of type `string` but received type `undefined` in object `prevOutputPointer`',
            );
        });

        it('should throw Error when tx output pointer has invalid tx id', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            expect(() => {
                const input = {
                    prevTxId: 'invalid-txid',
                    prevIndex: 1,
                };

                builder.addInput(input);
            }).to.throw(
                'Expected property string `prevTxId` to match `/^[0-9A-Fa-f]{64}$/`, got `invalid-txid` in object `prevOutputPointer`',
            );
        });

        it('should throw Error when tx output pointer has invalid index', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            expect(() => {
                const input = {
                    txId:
                        '0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
                    index: 'index',
                };

                builder.addInput(input as any);
            }).to.throw(
                'Expected property `prevTxId` to be of type `string` but received type `undefined` in object `prevOutputPointer`',
            );
        });

        it('should throw Error when tx output pointer is out of bound', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            expect(() => {
                const input = {
                    prevTxId:
                        '0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
                    prevIndex: 65537,
                };

                builder.addInput(input);
            }).to.throw(
                'Expected property number `prevIndex` to be in range [0..65535], got 65537 in object `prevOutputPointer`',
            );
        });

        it('should reset return different transaction Id after adding input', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            const firstInput: PrevOutputPointer = {
                ...SAMPLE_INPUT,
                prevIndex: 0,
            };
            builder.addInput(firstInput).signInput(0, SAMPLE_KEY_PAIR);

            const prevTxId = builder.txId();

            const secondInput: PrevOutputPointer = {
                ...SAMPLE_INPUT,
                prevIndex: 1,
            };
            builder.addInput(secondInput);

            const txId = builder.txId();
            expect(txId).not.to.eq(prevTxId);
        });

        it('should clear all existing witnesses', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            const firstInput: PrevOutputPointer = {
                ...SAMPLE_INPUT,
                prevIndex: 0,
            };
            builder.addInput(firstInput).signInput(0, SAMPLE_KEY_PAIR);

            expect(builder.hasWitness(0)).to.eq(true);

            const secondInput: PrevOutputPointer = {
                ...SAMPLE_INPUT,
                prevIndex: 1,
            };
            builder.addInput(secondInput);

            expect(builder.hasWitness(0)).to.eq(false);
        });

        it('should return DepositTransactionBuilder', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            expect(builder.addInput(SAMPLE_INPUT)).to.be.an.instanceOf(
                DepositTransactionBuilder,
            );
        });

        it('should append input to the builder', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            expect(builder.inputsLength()).to.eq(0);

            builder.addInput(SAMPLE_INPUT);
            expect(builder.inputsLength()).to.eq(1);
        });
    });

    describe('txId', () => {
        it('should throw Error when there is no input', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            expect(() => {
                builder.txId();
            }).to.throw('Builder has no input');
        });

        it('should return transaction id in string', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            builder.addInput(SAMPLE_INPUT);

            expect(builder.txId()).to.be.a('string');
            expect(builder.txId()).to.eq(
                'e77d35ddec2b4ba14809d2d229a687a24e30f1122663d4ede67a0e5dad767d3b',
            );
        });
    });

    describe('signInput', () => {
        it('should throw Error when the input index is missing', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            builder.addInput(SAMPLE_INPUT);

            expect(() => {
                (builder.signInput as any)();
            }).to.throw(
                'Expected `index` to be of type `number` but received type `undefined`',
            );
        });

        it('should throw Error when the key pair is missing', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            builder.addInput(SAMPLE_INPUT);

            expect(() => {
                (builder.signInput as any)(0);
            }).to.throw(
                'Expected `keyPair` to be of type `object` but received type `undefined`',
            );
        });

        it('should throw Error when the key pair is invalid', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            builder.addInput(SAMPLE_INPUT);

            const invalidKeyPair = {};
            expect(() => {
                builder.signInput(5, invalidKeyPair as any);
            }).to.throw(
                'Expected value to be an instance of KeyPair, got Object',
            );
        });

        it('should throw Error when the input index does not exist', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            builder.addInput(SAMPLE_INPUT);

            expect(() => {
                builder.signInput(-1, SAMPLE_KEY_PAIR);
            }).to.throw('Input index out of bound');
            expect(() => {
                builder.signInput(5, SAMPLE_KEY_PAIR);
            }).to.throw('Input index out of bound');
        });

        it('should throw Error when the builder has no input', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            expect(() => {
                builder.signInput(0, SAMPLE_KEY_PAIR);
            }).to.throw('Builder has no input');
        });

        it('should return DepositTransactionBuilder', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            builder.addInput(SAMPLE_INPUT);

            expect(builder.signInput(0, SAMPLE_KEY_PAIR)).to.be.an.instanceOf(
                DepositTransactionBuilder,
            );
        });

        it('should sign the input with the provided KeyPair', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            builder.addInput(SAMPLE_INPUT).signInput(0, SAMPLE_KEY_PAIR);

            expect(builder.hasWitness(0)).to.eq(true);
        });
    });

    describe('addWitness', () => {
        it('should throw Error when the input index is missing', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            builder.addInput(SAMPLE_INPUT);

            expect(() => {
                (builder.addWitness as any)();
            }).to.throw(
                'Expected `index` to be of type `number` but received type `undefined`',
            );
        });

        it('should throw Error when the witness is missing', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            builder.addInput(SAMPLE_INPUT);

            expect(() => {
                (builder.addWitness as any)(0);
            }).to.throw(
                'Expected `witness` to be of type `Buffer` but received type `undefined`',
            );
        });

        it('should throw Error when the witness is invalid', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            builder.addInput(SAMPLE_INPUT);

            const invalidWitness = 'invalid';
            expect(() => {
                builder.addWitness(0, invalidWitness as any);
            }).to.throw(
                'Expected `witness` to be of type `Buffer` but received type `string`',
            );
        });

        it('should throw Error when the input index does not exist', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            builder.addInput(SAMPLE_INPUT);

            const witness = Buffer.from('witness');
            expect(() => {
                builder.addWitness(-1, witness);
            }).to.throw('Input index out of bound');
            expect(() => {
                builder.addWitness(5, witness);
            }).to.throw('Input index out of bound');
        });

        it('should throw Error when the builder has no input', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            const witness = Buffer.from('witness');
            expect(() => {
                builder.addWitness(0, witness);
            }).to.throw('Builder has no input');
        });

        it('should return DepositTransactionBuilder', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            builder.addInput(SAMPLE_INPUT);

            const witness = Buffer.from('witness');
            expect(builder.addWitness(0, witness)).to.be.an.instanceOf(
                DepositTransactionBuilder,
            );
        });

        it('should add the witness to the input', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            builder.addInput(SAMPLE_INPUT);

            expect(builder.hasWitness(0)).to.eq(false);

            const witness = Buffer.from('witness');
            builder.addWitness(0, witness);
            expect(builder.hasWitness(0)).to.eq(true);
        });
    });

    describe('hasWitness', () => {
        it('should throw Error when input index is missing', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            builder.addInput(SAMPLE_INPUT).signInput(0, SAMPLE_KEY_PAIR);

            expect(() => {
                (builder.hasWitness as any)();
            }).to.throw(
                'Expected `index` to be of type `number` but received type `undefined`',
            );
        });

        it('should throw Error when input index does not exist', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            builder.addInput(SAMPLE_INPUT).signInput(0, SAMPLE_KEY_PAIR);

            expect(() => {
                builder.hasWitness(-1);
            }).to.throw('Input index out of bound');
            expect(() => {
                builder.hasWitness(5);
            }).to.throw('Input index out of bound');
        });

        it('should return false when the input has no witness associated', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            builder.addInput(SAMPLE_INPUT);

            expect(builder.hasWitness(0)).to.eq(false);
        });

        it('should return true when the input has witness associated', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            builder
                .addInput(SAMPLE_INPUT)

                .signInput(0, SAMPLE_KEY_PAIR);

            expect(builder.hasWitness(0)).to.eq(true);
        });
    });

    describe('isCompleted', () => {
        it('should return false when the builder has no input', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            expect(builder.isCompleted()).to.eq(false);
        });

        it('should return false when at least one input does not have witness', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            const firstInput: PrevOutputPointer = {
                ...SAMPLE_INPUT,
                prevIndex: 0,
            };
            const secondInput: PrevOutputPointer = {
                ...SAMPLE_INPUT,
                prevIndex: 1,
            };
            builder

                .addInput(firstInput)
                .addInput(secondInput)
                .signInput(0, SAMPLE_KEY_PAIR);

            expect(builder.isCompleted()).to.eq(false);
        });

        it('should return true when all input has witnesses', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });
            const firstInput: PrevOutputPointer = {
                ...SAMPLE_INPUT,
                prevIndex: 0,
            };
            const secondInput: PrevOutputPointer = {
                ...SAMPLE_INPUT,
                prevIndex: 1,
            };
            builder

                .addInput(firstInput)
                .addInput(secondInput)
                .signInput(0, SAMPLE_KEY_PAIR)
                .signInput(1, SAMPLE_KEY_PAIR);

            expect(builder.isCompleted()).to.eq(true);
        });
    });

    describe('toUnsignedHex', () => {
        it('should throw Error when the builder has no input', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            expect(() => {
                builder.toUnsignedHex();
            }).to.throw('Builder has no input');
        });

        it('should return raw transaction Hex', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            builder.addInput(SAMPLE_INPUT).signInput(0, SAMPLE_KEY_PAIR);

            const txHex = builder.toUnsignedHex();
            expect(txHex.toString('hex')).to.deep.eq(
                '040123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef020000b5698ee21f69a6184afbe59b3626ed9d4bd755b0002a0100000000000000',
            );
        });
    });

    describe('toHex', () => {
        it('should throw Error when Tendermint address is not http nor ws', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            builder.addInput(SAMPLE_INPUT).signInput(0, SAMPLE_KEY_PAIR);

            expect(() => {
                builder.toHex('tcp://127.0.0.1');
            }).to.throw('Expected value to be HTTP or WS tendermint address');
        });

        it('should throw Error when the Tendermint address is invalid URL', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            builder.addInput(SAMPLE_INPUT).signInput(0, SAMPLE_KEY_PAIR);

            expect(() => {
                builder.toHex('ws://127.0.0.1:99999');
            }).to.throw('Expected value to be HTTP or WS tendermint address');
        });

        it('should throw Error when the builder has no input', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            expect(() => {
                builder.toHex('ws://127.0.0.1:26657');
            }).to.throw('Builder has no input');
        });

        it('should throw Error when the builder has unsigned input', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            builder.addInput(SAMPLE_INPUT);

            expect(() => {
                builder.toHex('ws://127.0.0.1:26657');
            }).to.throw('Transaction builder is not completed');
        });

        it('should return completed Hex', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            builder.addInput(SAMPLE_INPUT).signInput(0, SAMPLE_KEY_PAIR);

            const txHex = builder.toHex();
            expect(txHex.toString('hex')).to.deep.eq(
                '0001040123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef020000b5698ee21f69a6184afbe59b3626ed9d4bd755b0002a01000000000000000000000000000000000000000000000000000000990201040123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef020000b5698ee21f69a6184afbe59b3626ed9d4bd755b0002a0100000000000000040027251329bd77bdc7f5ac98d4adfe84a0a866066b9d7c1ac45c1d4aa38e11332c9b3616ff4aabf42defa743ac57b833c495124e22e75d95df33a851e310bd10aa001b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078fe77d35ddec2b4ba14809d2d229a687a24e30f1122663d4ede67a0e5dad767d3b',
            );
        });

        it('should return completed Hex given correct tendermint address', () => {
            const builder = new DepositTransactionBuilder({
                stakingAddress: SAMPLE_STAKING_ADDRESS,
            });

            builder.addInput(SAMPLE_INPUT).signInput(0, SAMPLE_KEY_PAIR);

            expect(builder.toHex('ws://127.0.0.1:26657').toString('hex')).to.eq(
                '0001040123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef020000b5698ee21f69a6184afbe59b3626ed9d4bd755b0002a01000000000000000000000000000000000000000000000000000000990201040123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef020000b5698ee21f69a6184afbe59b3626ed9d4bd755b0002a0100000000000000040027251329bd77bdc7f5ac98d4adfe84a0a866066b9d7c1ac45c1d4aa38e11332c9b3616ff4aabf42defa743ac57b833c495124e22e75d95df33a851e310bd10aa001b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078fe77d35ddec2b4ba14809d2d229a687a24e30f1122663d4ede67a0e5dad767d3b',
            );
            expect(builder.toHex('ws://localhost:26657').toString('hex')).to.eq(
                '0001040123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef020000b5698ee21f69a6184afbe59b3626ed9d4bd755b0002a01000000000000000000000000000000000000000000000000000000990201040123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef020000b5698ee21f69a6184afbe59b3626ed9d4bd755b0002a0100000000000000040027251329bd77bdc7f5ac98d4adfe84a0a866066b9d7c1ac45c1d4aa38e11332c9b3616ff4aabf42defa743ac57b833c495124e22e75d95df33a851e310bd10aa001b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078fe77d35ddec2b4ba14809d2d229a687a24e30f1122663d4ede67a0e5dad767d3b',
            );
            expect(
                builder
                    .toHex('ws://tendermint-zerofee:26657/websocket')
                    .toString('hex'),
            ).to.eq(
                '0001040123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef020000b5698ee21f69a6184afbe59b3626ed9d4bd755b0002a01000000000000000000000000000000000000000000000000000000990201040123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef020000b5698ee21f69a6184afbe59b3626ed9d4bd755b0002a0100000000000000040027251329bd77bdc7f5ac98d4adfe84a0a866066b9d7c1ac45c1d4aa38e11332c9b3616ff4aabf42defa743ac57b833c495124e22e75d95df33a851e310bd10aa001b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078fe77d35ddec2b4ba14809d2d229a687a24e30f1122663d4ede67a0e5dad767d3b',
            );
            expect(
                builder.toHex('wss://localhost/websocket').toString('hex'),
            ).to.eq(
                '0001040123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef020000b5698ee21f69a6184afbe59b3626ed9d4bd755b0002a01000000000000000000000000000000000000000000000000000000990201040123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef020000b5698ee21f69a6184afbe59b3626ed9d4bd755b0002a0100000000000000040027251329bd77bdc7f5ac98d4adfe84a0a866066b9d7c1ac45c1d4aa38e11332c9b3616ff4aabf42defa743ac57b833c495124e22e75d95df33a851e310bd10aa001b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078fe77d35ddec2b4ba14809d2d229a687a24e30f1122663d4ede67a0e5dad767d3b',
            );
        });
    });
});
