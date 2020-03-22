import 'mocha';
import { expect } from 'chai';

import { Mainnet, Testnet, Devnet, fromChainId, NetworkEnum } from './network';

describe('Network', () => {
    describe('Devnet', () => {
        it('should throw Error when option is invalid', () => {
            expect(() => {
                Devnet('invalid' as any);
            }).to.throw(
                'Expected `options` to be of type `object` but received type `string`',
            );

            expect(() => {
                Devnet({
                    chainHexId: 'INVALID' as any,
                });
            }).to.throw(
                'Expected property value to be two hex characters of chain Id\n- Expected `chainHexId` to be of type `Buffer` but received type `string` in object `options`',
            );

            expect(() => {
                // Non-hex characters
                Devnet({
                    chainHexId: 'ZZ' as any,
                });
            }).to.throw(
                'Expected property value to be two hex characters of chain Id\n- Expected `chainHexId` to be of type `Buffer` but received type `string` in object `options`',
            );
        });

        it('should return Devnet of the provided chainHexId when it is a string', () => {
            const chainHexId = 'AB';
            const network = Devnet({
                chainHexId,
            });

            expect(network.chainHexId).to.deep.eq(
                Buffer.from(chainHexId, 'hex'),
            );
        });

        it('should return Devnet of the provided chainHexId when it is a Buffer', () => {
            const chainHexId = Buffer.from('AB', 'hex');
            const network = Devnet({
                chainHexId,
            });

            expect(network.chainHexId).to.deep.eq(chainHexId);
        });
    });

    describe('fromChainId', () => {
        it('should return network based on chainHexId', () => {
            expect(fromChainId(Mainnet.chainHexId)).to.deep.eq(Mainnet);
            expect(fromChainId(Testnet.chainHexId)).to.deep.eq(Testnet);

            const expectedDevnet = fromChainId(Buffer.from('AB', 'hex'));
            expect(expectedDevnet.name).to.eq(NetworkEnum.Devnet);
        });
    });
});
