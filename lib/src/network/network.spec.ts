import 'mocha';
import { expect } from 'chai';

import { Mainnet, Testnet, Devnet, fromChainId, NetworkEnum } from './network';
import { FeeConfig, FeeAlgorithm } from '../fee';
import { BigNumber } from '../utils';

describe('Network', () => {
    describe('Devnet', () => {
        const ANY_FEE_CONFIG: FeeConfig = {
            algorithm: FeeAlgorithm.LinearFee,
            constant: new BigNumber(1.1),
            coefficient: new BigNumber(1.25),
        };

        it('should throw Error when option is invalid', () => {
            expect(() => {
                Devnet('invalid' as any);
            }).to.throw(
                'Expected `options` to be of type `object` but received type `string`',
            );

            expect(() => {
                Devnet({
                    feeConfig: ANY_FEE_CONFIG,
                } as any);
            }).to.throw(
                'Expected property `chainHexId` to be of type `string` but received type `undefined`',
            );

            expect(() => {
                Devnet({
                    chainHexId: 'AB',
                } as any);
            }).to.throw(
                'Expected property `feeConfig` to be of type `object` but received type `undefined` in object `options`',
            );

            expect(() => {
                Devnet({
                    feeConfig: 'INVALID' as any,
                    chainHexId: 'AB',
                });
            }).to.throw(
                'Expected property `feeConfig` to be of type `object` but received type `string` in object `options`',
            );

            expect(() => {
                Devnet({
                    feeConfig: ANY_FEE_CONFIG,
                    chainHexId: 'INVALID' as any,
                });
            }).to.throw(
                'Expected property value to be two hex characters of chain Id\n- Expected `chainHexId` to be of type `Buffer` but received type `string` in object `options`',
            );

            expect(() => {
                // Non-hex characters
                Devnet({
                    feeConfig: ANY_FEE_CONFIG,
                    chainHexId: 'ZZ' as any,
                });
            }).to.throw(
                'Expected property value to be two hex characters of chain Id\n- Expected `chainHexId` to be of type `Buffer` but received type `string` in object `options`',
            );
        });

        it('should throw Error when Linear fee constant and/or coefficient is invalid', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                Devnet({
                    feeConfig: {
                        algorithm: FeeAlgorithm.LinearFee,
                        constant: new BigNumber('-1'),
                        coefficient: new BigNumber('1001'),
                    },
                    chainHexId: 'AB',
                });
            }).to.throw(
                'Expected property property value to be greater than or equal to 0 in object `feeConfig` in object',
            );

            expect(() => {
                // eslint-disable-next-line no-new
                Devnet({
                    feeConfig: {
                        algorithm: FeeAlgorithm.LinearFee,
                        constant: new BigNumber('-1'),
                        coefficient: new BigNumber('1001'),
                    },
                    chainHexId: 'AB',
                });
            }).to.throw(
                'Expected property property value to be greater than or equal to 0 in object `feeConfig` in object',
            );
        });

        it('should throw Error when the fee algorithm is not supported', () => {
            expect(() => {
                // eslint-disable-next-line no-new
                Devnet({
                    feeConfig: {
                        algorithm: 'unsupported-algorithm' as any,
                    },
                    chainHexId: 'AB',
                });
            }).to.throw(
                'Expected property property string `algorithm` to be one of `["LinearFee"]`, got `unsupported-algorithm` in object `feeConfig` in object `options`',
            );
        });

        it('should return Devnet of the provided chainHexId when it is a string', () => {
            const chainHexId = 'AB';
            const network = Devnet({
                feeConfig: ANY_FEE_CONFIG,
                chainHexId,
            });

            expect(network.chainHexId).to.deep.eq(
                Buffer.from(chainHexId, 'hex'),
            );
        });

        it('should return Devnet of the provided chainHexId when it is a Buffer', () => {
            const chainHexId = Buffer.from('AB', 'hex');
            const network = Devnet({
                feeConfig: ANY_FEE_CONFIG,
                chainHexId,
            });

            expect(network.chainHexId).to.deep.eq(chainHexId);
        });
    });

    describe('fromChainId', () => {
        it('should return network type based on chainHexId', () => {
            expect(fromChainId(Mainnet.chainHexId)).to.deep.eq(
                NetworkEnum.Mainnet,
            );
            expect(fromChainId(Testnet.chainHexId)).to.deep.eq(
                NetworkEnum.Testnet,
            );
            expect(fromChainId(Buffer.from('AB', 'hex'))).to.deep.eq(
                NetworkEnum.Devnet,
            );
        });
    });
});
