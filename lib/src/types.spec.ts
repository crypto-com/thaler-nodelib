import 'mocha';
import { expect } from 'chai';
import ow from 'ow';
import BigNumber from 'bignumber.js';
import { owAccountNonce } from './types';

describe('owAccountNonce', () => {
    it('should throw Error when nonce is not BigNumber', () => {
        expect(() => {
            ow('1' as any, owAccountNonce);
        }).to.throw(
            'Expected argument to be of type `object` but received type `string`',
        );

        expect(() => {
            ow({} as any, owAccountNonce);
        }).to.throw(
            'Expected value to be positive BigNumber within maximum nonce: 18446744073709551616',
        );
    });

    it('should throw Error when nonce is negative', () => {
        expect(() => {
            ow(new BigNumber('-1'), owAccountNonce);
        }).to.throw(
            'Expected value to be positive BigNumber within maximum nonce: 18446744073709551616',
        );
    });

    it('should throw Error when nonce is greater than maximum', () => {
        expect(() => {
            ow(new BigNumber(2).pow(64).plus(1), owAccountNonce);
        }).to.throw(
            'Expected value to be positive BigNumber within maximum nonce: 18446744073709551616',
        );
    });

    it('should pass when nonce is equal to maximum nonce', () => {
        expect(() => {
            ow(new BigNumber(2).pow(64), owAccountNonce);
        }).not.to.throw();
    });

    it('should pass when nonce is 0', () => {
        expect(() => {
            ow(new BigNumber(0), owAccountNonce);
        }).not.to.throw();
    });

    it('should pass when nonce is within the range', () => {
        expect(() => {
            ow(new BigNumber(2).pow(64).minus(1), owAccountNonce);
        }).not.to.throw();
        expect(() => {
            ow(new BigNumber(1), owAccountNonce);
        }).not.to.throw();
    });
});
