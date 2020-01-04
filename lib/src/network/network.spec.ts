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
                    chainId: 'INVALID' as any,
                });
            }).to.throw(
                'Expected property value to be two hex characters of chain Id\n- Expected `chainId` to be of type `Buffer` but received type `string` in object `options`',
            );

            expect(() => {
                // Non-hex characters
                Devnet({
                    chainId: 'ZZ' as any,
                });
            }).to.throw(
                'Expected property value to be two hex characters of chain Id\n- Expected `chainId` to be of type `Buffer` but received type `string` in object `options`',
            );
        });

        it('should return Devnet of the provided chainId when it is a string', () => {
            const chainId = 'AB';
            const network = Devnet({
                chainId,
            });

            expect(network.chainId).to.deep.eq(Buffer.from(chainId, 'hex'));
        });

        it('should return Devnet of the provided chainId when it is a Buffer', () => {
            const chainId = Buffer.from('AB', 'hex');
            const network = Devnet({
                chainId,
            });

            expect(network.chainId).to.deep.eq(chainId);
        });
    });

    describe('fromChainId', () => {
        it('should return network based on chainId', () => {
            expect(fromChainId(Mainnet.chainId)).to.deep.eq(Mainnet);
            expect(fromChainId(Testnet.chainId)).to.deep.eq(Testnet);

            const expectedDevnet = fromChainId(Buffer.from('AB', 'hex'));
            expect(expectedDevnet.name).to.eq(NetworkEnum.Devnet);
        });
    });
});
