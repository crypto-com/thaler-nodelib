import * as cro from '../../lib/src';
import { FeeConfig } from '../../lib/src/fee';

export const DEVNET_TX_TENDERMINT_ADDRESS = process.env.TENDERMINT_RPC_PORT
    ? `ws://127.0.0.1:${process.env.TENDERMINT_RPC_PORT}/websocket`
    : 'ws://127.0.0.1:26657/websocket';
export const DEVNET_CHAIN_HEX_ID = process.env.CHAIN_HEX_ID || 'AB';
export const DEVNET_FEE_CONFIG: FeeConfig = {
    algorithm: cro.fee.FeeAlgorithm.LinearFee,
    constant: cro.utils.toBigNumber(1.1),
    coefficient: cro.utils.toBigNumber(1.25),
};
export const DEVNET = cro.network.Devnet({
    feeConfig: DEVNET_FEE_CONFIG,
    chainHexId: DEVNET_CHAIN_HEX_ID,
});
