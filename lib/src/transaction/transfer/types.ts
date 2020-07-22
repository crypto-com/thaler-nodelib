import ow from 'ow';
import { NetworkConfig } from '../../network';
import { owOptionalNetworkConfig } from '../../network/types';
import { owOptionalFeeConfig } from '../../fee/types';

export type TransferTransactionBuilderOptions = {
    network?: NetworkConfig;
};

export const owTransferTransactionBuilderOptions = ow.optional.object.exactShape(
    {
        network: owOptionalNetworkConfig,
        feeConfig: owOptionalFeeConfig,
    },
);
