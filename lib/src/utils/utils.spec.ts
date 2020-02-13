import 'mocha';
import { expect } from 'chai';

import {
    isBigNumber,
    toBigNumber,
    fromCRO,
    toCRO,
    BigNumber,
    UnitEnum,
} from './utils';
import { MAX_COIN, MAX_CRO } from '../init';

describe('Utils', () => {
    describe('isBigNumber', () => {
        it('should return false when the value is not a BigNumber', () => {
            expect(isBigNumber(1)).to.eq(false);
            expect(isBigNumber(NaN)).to.eq(false);
            expect(isBigNumber('string')).to.eq(false);
            expect(isBigNumber({})).to.eq(false);
        });

        it('should return true when the valie is a BigNumber', () => {
            const value = new BigNumber(1);

            expect(isBigNumber(value)).to.eq(true);
        });
    });

    describe('toBigNumber', () => {
        it('should throw Error when value is not number, string nor BigNumber', () => {
            expect(() => {
                toBigNumber({} as any);
            }).to.throw(
                'Expected `value` to be of type `number` but received type `Object`\n- Expected `value` to be of type `string` but received type `Object`\n- Expected object `value` `{}` to be of type `BigNumber`',
            );
            expect(() => {
                toBigNumber(NaN);
            }).to.throw(
                'Expected `value` to be of type `number` but received type `number`\n- Expected `value` to be of type `string` but received type `number`\n- Expected `value` to be of type `object` but received type `number`',
            );
        });

        it('should throw TypeError when the value is not a BigNumber', () => {
            expect(() => {
                toBigNumber('invalid');
            }).to.throw('Expected valid number representation');
        });

        it('should return BigNumber instance when the value is a valid number', () => {
            expect(toBigNumber(1)).to.be.an.instanceOf(BigNumber);
            expect(toBigNumber(1.2345)).to.be.an.instanceOf(BigNumber);
            expect(toBigNumber('1')).to.be.an.instanceOf(BigNumber);
            expect(toBigNumber('1.2345')).to.be.an.instanceOf(BigNumber);
            expect(toBigNumber('0x1')).to.be.an.instanceOf(BigNumber);
            expect(toBigNumber(new BigNumber(1))).to.be.an.instanceOf(
                BigNumber,
            );
        });
    });

    describe('toCRO', () => {
        it('should throw Error when value is not BigNumber', () => {
            expect(() => {
                toCRO('invalid' as any, UnitEnum.BasicUnit);
            }).to.throw(
                'Expected `value` to be of type `object` but received type `string`',
            );
        });

        it('should throw Error when from unit is not UnitEnum', () => {
            expect(() => {
                toCRO(new BigNumber(1), 'invalid' as any);
            }).to.throw('Expected value to be one of the unit enum');
        });

        context('When from unit is basic unit', () => {
            it('should throw Error when value is negative', () => {
                expect(() => {
                    toCRO(new BigNumber(-1), UnitEnum.BasicUnit);
                }).to.throw('value cannot be negative');
            });

            it('should throw Error when value is not integer', () => {
                expect(() => {
                    toCRO(new BigNumber('1.2'), UnitEnum.BasicUnit);
                }).to.throw('value exceed maximum number of decimal places');
            });

            it('should throw Error when value exceed maximum supply', () => {
                expect(() => {
                    toCRO(new BigNumber(MAX_COIN).plus(1), UnitEnum.BasicUnit);
                }).to.throw('value exceed maximum CRO supply');
            });

            it('should return BigNumber', () => {
                expect(
                    toCRO(new BigNumber(1), UnitEnum.BasicUnit),
                ).to.be.an.instanceOf(BigNumber);
            });

            it('should return CRO unit of the value', () => {
                expect(
                    toCRO(new BigNumber(1), UnitEnum.BasicUnit).toString(10),
                ).to.eq('0.00000001');
            });
        });

        context('When from unit is CRO', () => {
            it('should throw Error when value is negative', () => {
                expect(() => {
                    toCRO(new BigNumber(-1), UnitEnum.CRO);
                }).to.throw('value cannot be negative');
            });

            it('should throw Error when value exceed maximum number of decimal places', () => {
                expect(() => {
                    toCRO(new BigNumber('1.123456789'), UnitEnum.CRO);
                }).to.throw('value exceed maximum number of decimal places');
            });

            it('should throw Error when value exceed maximum supply', () => {
                expect(() => {
                    toCRO(new BigNumber(MAX_CRO).plus(1), UnitEnum.CRO);
                }).to.throw('value exceed maximum CRO supply');
            });

            it('should return BigNumber', () => {
                expect(
                    toCRO(new BigNumber(1), UnitEnum.CRO),
                ).to.be.an.instanceOf(BigNumber);
            });

            it('should return CRO unit of the value', () => {
                expect(
                    toCRO(new BigNumber(1), UnitEnum.CRO).toString(10),
                ).to.eq('1');
            });
        });
    });

    describe('fromCRO', () => {
        it('should throw Error when value is not BigNumber', () => {
            expect(() => {
                fromCRO('invalid' as any, UnitEnum.BasicUnit);
            }).to.throw(
                'Expected `value` to be of type `object` but received type `string`',
            );
        });

        it('should throw Error when from unit is not UnitEnum', () => {
            expect(() => {
                fromCRO(new BigNumber(1), 'invalid' as any);
            }).to.throw('Expected value to be one of the unit enum');
        });

        context('When to unit is CRO', () => {
            it('should throw Error when value is negative', () => {
                expect(() => {
                    fromCRO(new BigNumber(-1), UnitEnum.CRO);
                }).to.throw('value cannot be negative');
            });

            it('should throw Error when value exceed maximum number of decimal places', () => {
                expect(() => {
                    fromCRO(new BigNumber('1.123456789'), UnitEnum.CRO);
                }).to.throw('value exceed maximum number of decimal places');
            });

            it('should throw Error when value exceed maximum supply', () => {
                expect(() => {
                    fromCRO(new BigNumber(MAX_CRO).plus(1), UnitEnum.CRO);
                }).to.throw('value exceed maximum CRO supply');
            });

            it('should return BigNumber', () => {
                expect(
                    fromCRO(new BigNumber(1), UnitEnum.CRO),
                ).to.be.an.instanceOf(BigNumber);
            });

            it('should return CRO unit of the value', () => {
                expect(
                    fromCRO(new BigNumber(1), UnitEnum.CRO).toString(10),
                ).to.eq('1');
            });
        });

        context('When to unit is basic unit', () => {
            it('should throw Error when value is negative', () => {
                expect(() => {
                    fromCRO(new BigNumber(-1), UnitEnum.BasicUnit);
                }).to.throw('value cannot be negative');
            });

            it('should throw Error when value exceeds maximum decimal places', () => {
                expect(() => {
                    fromCRO(new BigNumber('1.123456789'), UnitEnum.BasicUnit);
                }).to.throw('value exceed maximum number of decimal places');
            });

            it('should throw Error when value exceed maximum supply', () => {
                expect(() => {
                    fromCRO(new BigNumber(MAX_CRO).plus(1), UnitEnum.BasicUnit);
                }).to.throw('value exceed maximum CRO supply');
            });

            it('should return BigNumber', () => {
                expect(
                    fromCRO(new BigNumber('0.00000001'), UnitEnum.BasicUnit),
                ).to.be.an.instanceOf(BigNumber);
            });

            it('should return CRO unit of the value', () => {
                expect(
                    fromCRO(
                        new BigNumber('0.00000001'),
                        UnitEnum.BasicUnit,
                    ).toString(10),
                ).to.eq('1');
            });
        });
    });
});
