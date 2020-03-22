import 'mocha';
import { expect } from 'chai';

import { Timespec } from './timespec';

describe('Timespec', () => {
    describe('fromSeconds', () => {
        it('should throw Error when seconds is non-number', () => {
            expect(() => {
                Timespec.fromSeconds('invalid' as any);
            }).to.throw(
                'Expected `seconds` to be of type `number` but received type `string`',
            );
        });

        it('should throw Error when seconds is non-integer', () => {
            expect(() => {
                Timespec.fromSeconds(1.1);
            }).to.throw('Expected number `seconds` to be an integer, got 1.1');
        });

        it('should throw Error when seconds is negative integer', () => {
            expect(() => {
                Timespec.fromSeconds(-1);
            }).to.throw('Expected number `seconds` to be positive, got -1');
        });
    });

    describe('toNumber', () => {
        it('should return number representation of the Timespec', () => {
            const timespec = Timespec.fromSeconds(1586094976);

            expect(timespec.toNumber()).to.eq(1586094976);
        });
    });
});
