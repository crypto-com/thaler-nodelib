import ow from 'ow';
import BigNumber from 'bignumber.js';
import { CRO_DECIMAL, MAX_CRO } from '../init';
import { owUnitEnum } from './types';
import { owBigNumber } from '../types';

/**
 * Determine if the value is a BigNumber.js instance
 *
 * @export
 * @param {*} value value to test
 * @returns {boolean} Returns true if it is a BigNumber.js instance, false otherwise
 */
export const isBigNumber = (value: any): boolean => {
    return BigNumber.isBigNumber(value);
};

export { BigNumber };

/**
 * Convert any supported number representation to BigNumber
 *
 * @export
 * @param {(number | string | BigNumber)} value number represented in number,
 * string of BigNumber
 * @throws {TypeError} Throws TypeError when the value is not a supported
 * number representation
 * @returns {BigNumber} Returns BigNumber instance
 */
export const toBigNumber = (value: number | string | BigNumber): BigNumber => {
    ow(
        value,
        'value',
        ow.any(ow.number, ow.string, ow.object.instanceOf(BigNumber)),
    );

    const bigNumber = new BigNumber(value);
    if (bigNumber.isNaN()) {
        throw new TypeError('Expected valid number representation');
    }

    return bigNumber;
};

export enum UnitEnum {
    BasicUnit = 'BasicUnit',
    CRO = 'CRO',
}

const verifyCRO = (value: BigNumber) => {
    if (!value.multipliedBy(CRO_DECIMAL).isInteger()) {
        throw new Error('value exceed maximum number of decimal places');
    }
    if (value.isNegative()) {
        throw new Error('value cannot be negative');
    }
    if (value.isGreaterThan(MAX_CRO)) {
        throw new Error('value exceed maximum CRO supply');
    }
};

/**
 * Convert value to CRO unit
 *
 * @param {BigNumber} value value to convert to CRO
 * @param {UnitEnum} fromUnit from unit
 * @returns {BigNumber} Returns CRO unit of the value
 */
export const toCRO = (value: BigNumber, fromUnit: UnitEnum): BigNumber => {
    ow(value, 'value', owBigNumber);
    ow(fromUnit, 'fromUnit', owUnitEnum as any);

    let cro: BigNumber;
    switch (fromUnit) {
        case UnitEnum.BasicUnit:
            cro = value.dividedBy(CRO_DECIMAL);
            break;
        case UnitEnum.CRO:
            cro = value;
            break;
        default:
            throw new Error('Unsupported from unit');
    }

    verifyCRO(cro);

    return cro;
};

export const fromCRO = (value: BigNumber, toUnit: UnitEnum): BigNumber => {
    ow(value, 'value', owBigNumber);
    ow(toUnit, 'fromUnit', owUnitEnum as any);

    verifyCRO(value);

    switch (toUnit) {
        case UnitEnum.BasicUnit:
            return value.multipliedBy(CRO_DECIMAL);
        case UnitEnum.CRO:
            return value;
        default:
            throw new Error('Unsupported to unit');
    }
};
