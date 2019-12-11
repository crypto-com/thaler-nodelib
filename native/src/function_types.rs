use std::str::FromStr;

use neon::prelude::*;

use chain_core::init::network::Network;
use client_common::{PrivateKey, PublicKey};

use crate::error::ClientErrorNeonExt;

#[inline]
pub fn u8_buffer_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<Vec<u8>> {
    let buffer = ctx.argument::<JsBuffer>(i)?;

    Ok(ctx.borrow(&buffer, |data| data.as_slice::<u8>().to_vec()))
}

#[inline]
pub fn public_key_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<PublicKey> {
    let public_key = ctx.argument::<JsBuffer>(i)?;
    let public_key = ctx.borrow(&public_key, |data| data.as_slice::<u8>());

    PublicKey::deserialize_from(public_key).chain_neon(ctx, "Unable to deserialize public key")
}

#[inline]
pub fn view_key_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<PublicKey> {
    let view_key = ctx.argument::<JsBuffer>(i)?;
    let view_key = ctx.borrow(&view_key, |data| data.as_slice::<u8>());

    let view_key = hex::encode_upper(view_key);

    PublicKey::from_str(&view_key).chain_neon(ctx, "Unable to deserialize view key")
}

#[inline]
pub fn private_key_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<PrivateKey> {
    let private_key = ctx.argument::<JsBuffer>(i)?;
    let private_key = ctx.borrow(&private_key, |data| data.as_slice::<u8>());

    PrivateKey::deserialize_from(private_key).chain_neon(ctx, "Unable to deserialize private key")
}

#[inline]
pub fn key_pair_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<(PrivateKey, PublicKey)> {
    let key_pair = ctx.argument::<JsObject>(i)?;

    let public_key = key_pair
        .get(ctx, "publicKey")?
        .downcast_or_throw::<JsBuffer, FunctionContext>(ctx)
        .chain_neon(ctx, "Unable to downcast public key in KeyPair")?;
    let public_key = public_key.borrow(&ctx.lock()).as_slice();
    let public_key = PublicKey::deserialize_from(public_key)
        .chain_neon(ctx, "Unable to deserialize public key in KeyPair")?;

    let private_key = key_pair
        .get(ctx, "privateKey")?
        .downcast_or_throw::<JsBuffer, FunctionContext>(ctx)
        .chain_neon(ctx, "Unable to downcast private key in KeyPair")?;
    let private_key = private_key.borrow(&ctx.lock()).as_slice();
    let private_key = PrivateKey::deserialize_from(private_key)
        .chain_neon(ctx, "Unable to deserialize private key in KeyPair")?;

    Ok((private_key, public_key))
}

#[inline]
pub fn network_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<Network> {
    let network = ctx.argument::<JsString>(i)?.value();

    get_network_from_str(ctx, network.as_str())
}

#[inline]
pub fn get_network_from_str(ctx: &mut FunctionContext, network_str: &str) -> NeonResult<Network> {
    match network_str {
        "Mainnet" => Ok(Network::Mainnet),
        "Testnet" => Ok(Network::Testnet),
        "Devnet" => Ok(Network::Devnet),
        network => ctx.throw_error(format!("Unrecognized network {}", network)),
    }
}

#[inline]
pub fn get_network_from_chain_id(chain_id: &str) -> Network {
    match chain_id.to_uppercase().as_str() {
        "2A" => Network::Mainnet,
        "42" => Network::Testnet,
        _ => Network::Devnet,
    }
}
