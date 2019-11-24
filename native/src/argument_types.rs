use neon::prelude::*;

use chain_core::init::network::Network;
use client_common::{PrivateKey, PublicKey};

use crate::error::ClientErrorNeonExt;

#[inline]
pub fn public_key_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<PublicKey> {
    let mut public_key = ctx.argument::<JsBuffer>(i)?;
    let public_key = ctx.borrow_mut(&mut public_key, |data| data.as_slice::<u8>());

    PublicKey::deserialize_from(public_key).chain_neon(ctx)
}

#[inline]
pub fn private_key_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<PrivateKey> {
    let mut private_key = ctx.argument::<JsBuffer>(i)?;
    let private_key = ctx.borrow_mut(&mut private_key, |data| data.as_slice::<u8>());

    PrivateKey::deserialize_from(private_key).chain_neon(ctx)
}

#[inline]
pub fn network_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<Network> {
    let network = ctx.argument::<JsString>(i)?.value();
    match network.as_str() {
        "Mainnet" => Ok(Network::Mainnet),
        "Devnet" => Ok(Network::Devnet),
        "Testnet" => Ok(Network::Testnet),
        network => ctx.throw_error(format!("Unrecognized network {}", network)),
    }
}
