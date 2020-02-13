use std::str::FromStr;

use chain_core::common::{Timespec, HASH_SIZE_256};
use chain_core::init::address::CroAddress;
use chain_core::init::coin::Coin;
use chain_core::init::network::Network;
use chain_core::tx::data::address::ExtendedAddr;
use chain_core::tx::data::input::{TxoIndex, TxoPointer};
use chain_core::tx::data::output::TxOut;
use chain_core::tx::data::TxId;
use chain_core::tx::fee::{FeeAlgorithm, LinearFee, Milli};
use client_common::PublicKey;
use neon::prelude::*;

use crate::common::does_js_object_has_prop;
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
    pub inputs: Vec<(TxoPointer, TxOut)>,
    pub outputs: Vec<TxOut>,
    pub view_keys: Vec<PublicKey>,
    pub chain_id: u8,
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
        let fee_algorithm = parse_linear_fee_config(ctx, *fee_config)?;

        Ok(BuilderOptions {
            raw_tx_options,
            fee_algorithm,
        })
    }

    // fn parse_fn_ctx(&mut ctx: FunctionContext) -> NeonResult<BuilderOptions> {
    fn parse_raw_tx_options(
        ctx: &mut FunctionContext,
        options: JsObject,
    ) -> NeonResult<RawTransactionOptions> {
        let chain_id = options
            .get(ctx, "chainId")?
            .downcast_or_throw::<JsString, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast chainId")?
            .value();
        let network = get_network_from_chain_id(&chain_id);
        let chain_id = BuilderOptions::<F>::parse_chain_id(ctx, &chain_id)?;

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
            .collect::<NeonResult<Vec<(TxoPointer, TxOut)>>>()?;

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
                BuilderOptions::<F>::parse_output(ctx, *output, network)
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
                BuilderOptions::<F>::parse_view_key(ctx, *view_key)
            })
            .collect::<NeonResult<Vec<PublicKey>>>()?;

        Ok(RawTransactionOptions {
            inputs,
            outputs,
            view_keys,
            chain_id,
        })
    }

    fn parse_chain_id(ctx: &mut FunctionContext, chain_id: &str) -> NeonResult<u8> {
        if chain_id.len() != 2 {
            return ctx.throw_error("Chain id must be 2 hex characters");
        }

        let chain_id = hex::decode(chain_id).chain_neon(ctx, "Unable to deserialize chain Id")?;

        Ok(chain_id[0])
    }

    fn parse_input(
        ctx: &mut FunctionContext,
        input: JsObject,
        network: Network,
    ) -> NeonResult<(TxoPointer, TxOut)> {
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
            index: prev_index as TxoIndex,
        };

        let tx_out = input
            .get(ctx, "prevOutput")?
            .downcast_or_throw::<JsObject, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast prevOutput in input")?;
        let tx_out = BuilderOptions::<F>::parse_output(ctx, *tx_out, network)?;

        Ok((txo_pointer, tx_out))
    }

    fn parse_output(
        ctx: &mut FunctionContext,
        output: JsObject,
        network: Network,
    ) -> NeonResult<TxOut> {
        let address = output
            .get(ctx, "address")?
            .downcast_or_throw::<JsString, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast address in output")?
            .value();
        let address = ExtendedAddr::from_cro(&address, network)
            .chain_neon(ctx, "Unable to deserialize output address to CRO address")?;

        let value = output
            .get(ctx, "value")?
            .downcast_or_throw::<JsString, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast value in output")?
            .value();
        let value =
            Coin::from_str(&value).chain_neon(ctx, "Unable to deserialize output Coin value")?;

        let valid_from = if does_js_object_has_prop(ctx, output, "validFrom")? {
            let value = output
                .get(ctx, "validFrom")?
                .downcast_or_throw::<JsNumber, FunctionContext>(ctx)
                .chain_neon(ctx, "Unable to downcast validFrom in output")?
                .value();
            Some(value as Timespec)
        } else {
            None
        };

        Ok(TxOut {
            address,
            value,
            valid_from,
        })
    }

    fn parse_view_key(ctx: &mut FunctionContext, view_key: JsBuffer) -> NeonResult<PublicKey> {
        let view_key = view_key.borrow(&ctx.lock()).as_slice();

        let view_key = hex::encode_upper(view_key);

        PublicKey::from_str(&view_key).chain_neon(ctx, "Unable to deserialize view key")
    }
}

pub fn parse_linear_fee_config(
    ctx: &mut FunctionContext,
    fee_config: JsObject,
) -> NeonResult<LinearFee> {
    let algorithm = fee_config
        .get(ctx, "algorithm")?
        .downcast_or_throw::<JsString, FunctionContext>(ctx)
        .chain_neon(ctx, "Unable to deserialize algorithm in feeConfig")?
        .value();

    if algorithm != "LinearFee" {
        return ctx.throw_error(format!("Expected LinearFee but got {}", algorithm));
    }

    let constant = fee_config
        .get(ctx, "constant")?
        .downcast_or_throw::<JsString, FunctionContext>(ctx)
        .chain_neon(ctx, "Unable to deserialize constant in LinearFee config")?
        .value();
    let constant =
        Milli::from_str(&constant).chain_neon(ctx, "Invalid constant config in LinearFee")?;
    let coefficient = fee_config
        .get(ctx, "coefficient")?
        .downcast_or_throw::<JsString, FunctionContext>(ctx)
        .chain_neon(ctx, "Unable to deserialize coefficient in LinearFee config")?
        .value();
    let coefficient =
        Milli::from_str(&coefficient).chain_neon(ctx, "Invalid coefficient config in LinearFee")?;

    Ok(LinearFee::new(constant, coefficient))
}

fn txid_from_str(ctx: &mut FunctionContext, txid: &str) -> NeonResult<TxId> {
    let txid = hex::decode(txid).chain_neon(ctx, "Unable to deserialize TxId")?;

    if txid.len() != HASH_SIZE_256 {
        return ctx.throw_error("TxId should be 32 bytes long");
    }

    let mut out = [0u8; HASH_SIZE_256];
    out.copy_from_slice(txid.as_slice());

    Ok(out)
}
