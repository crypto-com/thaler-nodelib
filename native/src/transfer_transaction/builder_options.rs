use chain_core::init::network::Network;
use chain_core::tx::data::input::{TxoPointer, TxoSize};
use chain_core::tx::data::output::TxOut;
use chain_core::tx::fee::{FeeAlgorithm, LinearFee};
use client_common::PublicKey;
use neon::prelude::*;

use crate::error::ClientErrorNeonExt;
use crate::function_types::*;

pub type LinearFeeBuilderOptions = BuilderOptions<LinearFee>;

#[derive(Debug)]
pub struct BuilderOptions<F>
where
    F: FeeAlgorithm,
{
    pub raw_tx_options: RawTransactionOptions,
    pub fee_algorithm: F,
}

#[derive(Debug)]
pub struct RawTransactionOptions {
    pub inputs: Vec<RawTransactionOptionsInput>,
    pub outputs: Vec<TxOut>,
    pub view_keys: Vec<PublicKey>,
    pub chain_hex_id: u8,
}

#[derive(Debug)]
pub struct RawTransactionOptionsInput {
    pub prev_output: (TxoPointer, TxOut),
    pub address_params: RawTransactionOptionsInputAddressParams,
}

#[derive(Debug)]
pub struct RawTransactionOptionsInputAddressParams {
    pub required_signers: u64,
    pub total_signers: u64,
}

impl<F> BuilderOptions<F>
where
    F: FeeAlgorithm,
{
    pub fn parse_linear_fee_fn_ctx(
        ctx: &mut FunctionContext,
    ) -> NeonResult<LinearFeeBuilderOptions> {
        let options = ctx.argument::<JsObject>(0)?;

        let raw_tx_options = BuilderOptions::<LinearFee>::parse_raw_tx_options(ctx, *options)?;

        let fee_config = options
            .get(ctx, "feeConfig")?
            .downcast_or_throw::<JsObject, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast feeConfig")?;
        let fee_algorithm = parse_linear_fee_config(ctx, fee_config)?;

        Ok(BuilderOptions {
            raw_tx_options,
            fee_algorithm,
        })
    }

    fn parse_raw_tx_options(
        ctx: &mut FunctionContext,
        options: JsObject,
    ) -> NeonResult<RawTransactionOptions> {
        let chain_hex_id = options
            .get(ctx, "chainHexId")?
            .downcast_or_throw::<JsBuffer, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast chainHexId")?;
        let chain_hex_id = ctx
            .borrow(&chain_hex_id, |data| data.as_slice::<u8>())
            .to_vec();
        let chain_hex_id = chain_hex_id_from_vec(ctx, chain_hex_id)?;
        let network = network_from_chain_hex_id(chain_hex_id);

        let inputs = options
            .get(ctx, "inputs")?
            .downcast_or_throw::<JsArray, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast inputs")?
            .to_vec(ctx)?;
        let inputs = inputs
            .iter()
            .map(|&input| {
                let input = input
                    .downcast_or_throw::<JsObject, FunctionContext>(ctx)
                    .chain_neon(ctx, "Unable to downcast input")?;
                BuilderOptions::<F>::parse_input(ctx, *input, network)
            })
            .collect::<NeonResult<Vec<RawTransactionOptionsInput>>>()?;

        let outputs = options
            .get(ctx, "outputs")?
            .downcast_or_throw::<JsArray, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast outputs")?
            .to_vec(ctx)?;
        let outputs = outputs
            .iter()
            .map(|&output| {
                let output = output
                    .downcast_or_throw::<JsObject, FunctionContext>(ctx)
                    .chain_neon(ctx, "Unable to downcast output")?;
                parse_output(ctx, output, network)
            })
            .collect::<NeonResult<Vec<TxOut>>>()?;

        let view_keys = options
            .get(ctx, "viewKeys")?
            .downcast_or_throw::<JsArray, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast viewKeys")?
            .to_vec(ctx)?;
        let view_keys = view_keys
            .iter()
            .map(|&view_key| {
                let view_key = view_key
                    .downcast_or_throw::<JsBuffer, FunctionContext>(ctx)
                    .chain_neon(ctx, "Unable to downcast viewKey")?;
                parse_view_key(ctx, view_key)
            })
            .collect::<NeonResult<Vec<PublicKey>>>()?;

        Ok(RawTransactionOptions {
            inputs,
            outputs,
            view_keys,
            chain_hex_id,
        })
    }

    fn parse_input(
        ctx: &mut FunctionContext,
        input: JsObject,
        network: Network,
    ) -> NeonResult<RawTransactionOptionsInput> {
        let prev_txid = input
            .get(ctx, "prevTxId")?
            .downcast_or_throw::<JsString, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast prevTxId in input")?
            .value();
        let prev_txid = txid_from_str(ctx, &prev_txid)?;

        let prev_index = input
            .get(ctx, "prevIndex")?
            .downcast_or_throw::<JsNumber, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast prevIndex in input")?
            .value();

        let txo_pointer = TxoPointer {
            id: prev_txid,
            index: prev_index as TxoSize,
        };

        let tx_out = input
            .get(ctx, "prevOutput")?
            .downcast_or_throw::<JsObject, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast prevOutput in input")?;
        let tx_out = parse_output(ctx, tx_out, network)?;

        let address_params = input
            .get(ctx, "addressParams")?
            .downcast_or_throw::<JsObject, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast addressParams in input")?;
        let address_params =
            BuilderOptions::<LinearFee>::parse_address_params(ctx, *address_params)?;

        Ok(RawTransactionOptionsInput {
            prev_output: (txo_pointer, tx_out),
            address_params,
        })
    }

    fn parse_address_params(
        ctx: &mut FunctionContext,
        address_params: JsObject,
    ) -> NeonResult<RawTransactionOptionsInputAddressParams> {
        let required_signers = address_params
            .get(ctx, "requiredSigners")?
            .downcast_or_throw::<JsNumber, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast requiredSigners in addressParams")?
            .value();
        let required_signers = required_signers as u64;

        let total_signers = address_params
            .get(ctx, "requiredSigners")?
            .downcast_or_throw::<JsNumber, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast totalSigners in addressParams")?
            .value();
        let total_signers = total_signers as u64;

        Ok(RawTransactionOptionsInputAddressParams {
            required_signers,
            total_signers,
        })
    }
}
