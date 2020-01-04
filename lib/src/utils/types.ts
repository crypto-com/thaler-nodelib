import ow from 'ow';
import { UnitEnum } from './utils';

export const owUnitEnum = ow.string.validate((value: string) => ({
    validator: Object.values(UnitEnum).includes(value as any),
    message: 'Expected value to be one of the unit enum',
}));
