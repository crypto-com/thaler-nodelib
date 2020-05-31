use std::str::FromStr;

use chain_core::init::address::{CroAddress, RedeemAddress};
use chain_core::state::account::StakedStateAddress;
use chain_core::tx::data::address::ExtendedAddr;
use client_common::MultiSigAddress;
use neon::prelude::*;

use crate::error::ClientErrorNeonExt;
use crate::function_types::*;

pub fn get_transfer_address_from_public_key(mut ctx: FunctionContext) -> JsResult<JsString> {
    let public_key = public_key_argument(&mut ctx, 0)?;
    let network = network_argument(&mut ctx, 1)?;

    let required_signers = 1;
    let multi_sig_address =
        MultiSigAddress::new(vec![public_key.clone()], public_key, required_signers)
            .chain_neon(&mut ctx, "Unable to create MultiSig address")?;

    let extended_address = ExtendedAddr::from(multi_sig_address);
    let cro_address = extended_address
        .to_cro(network)
        .chain_neon(&mut ctx, "Unable to convert to CRO address")?;

    Ok(ctx.string(cro_address))
}

pub fn get_staking_address_from_public_key(mut ctx: FunctionContext) -> JsResult<JsString> {
    let public_key = public_key_argument(&mut ctx, 0)?;

    let staked_state_address = StakedStateAddress::BasicRedeem(RedeemAddress::from(&public_key));

    Ok(ctx.string(staked_state_address.to_string()))
}

pub fn is_transfer_address_valid(mut ctx: FunctionContext) -> JsResult<JsBoolean> {
    let address = ctx.argument::<JsString>(0)?.value();
    let network = network_argument(&mut ctx, 1)?;

    let is_valid = ExtendedAddr::from_cro(&address, network).is_ok();

    Ok(ctx.boolean(is_valid))
}

pub fn is_staking_address_valid(mut ctx: FunctionContext) -> JsResult<JsBoolean> {
    let address = ctx.argument::<JsString>(0)?.value();

    let is_valid = StakedStateAddress::from_str(&address).is_ok();

    Ok(ctx.boolean(is_valid))
}

pub fn register_address_module(ctx: &mut ModuleContext) -> NeonResult<()> {
    let js_object = JsObject::new(ctx);

    let get_transfer_address_from_public_key_fn =
        JsFunction::new(ctx, get_transfer_address_from_public_key)?;
    js_object.set(
        ctx,
        "getTransferAddressFromPublicKey",
        get_transfer_address_from_public_key_fn,
    )?;

    let get_staking_address_from_public_key_fn =
        JsFunction::new(ctx, get_staking_address_from_public_key)?;
    js_object.set(
        ctx,
        "getStakingAddressFromPublicKey",
        get_staking_address_from_public_key_fn,
    )?;

    let is_transfer_address_valid_fn = JsFunction::new(ctx, is_transfer_address_valid)?;
    js_object.set(ctx, "isTransferAddressValid", is_transfer_address_valid_fn)?;

    let is_staking_address_valid_fn = JsFunction::new(ctx, is_staking_address_valid)?;
    js_object.set(ctx, "isStakingAddressValid", is_staking_address_valid_fn)?;

    ctx.export_value("address", js_object)
}
