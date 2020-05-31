import ow from 'ow';
import BigNumber from 'bignumber.js';

export enum FeeAlgorithm {
    LinearFee = 'LinearFee',
}

export type FeeConfig =
    | LinearFeeConfig
    | {
          algorithm: FeeAlgorithm;
      };
export type LinearFeeConfig = {
    algorithm: FeeAlgorithm.LinearFee;
    constant: BigNumber;
    coefficient: BigNumber;
};

export const owFeeAlgorithm = ow.string.oneOf(Object.values(FeeAlgorithm));

const owLinearFeeMilli = ow.object.validate((value: object) => ({
    validator: BigNumber.isBigNumber(value) && value.isGreaterThanOrEqualTo(0),
    message: 'Expected value to be greater than or equal to 0',
}));
const owLinearFeeConfig = ow.object.exactShape({
    algorithm: owFeeAlgorithm,
    constant: owLinearFeeMilli,
    coefficient: owLinearFeeMilli,
});

export const owFeeConfig = ow.any(owLinearFeeConfig);
export const owOptionalFeeConfig = ow.optional.any(owLinearFeeConfig);

export const parseFeeConfigForNative = (
    feeConfig: FeeConfig,
): NativeFeeConfig => {
    if (feeConfig.algorithm === FeeAlgorithm.LinearFee) {
        return {
            ...feeConfig,
            constant: (feeConfig as LinearFeeConfig).constant.toString(10),
            coefficient: (feeConfig as LinearFeeConfig).coefficient.toString(
                10,
            ),
        };
    }
    throw new Error(`Unsupported fee algorithm: ${feeConfig.algorithm}`);
};

type NativeFeeConfig = NativeLinearFeeConfig | NativeBaseFeeConfig;
type NativeLinearFeeConfig = {
    algorithm: FeeAlgorithm;
    constant: string;
    coefficient: string;
};
type NativeBaseFeeConfig = {
    algorithm: FeeAlgorithm;
};
