use std::str::FromStr;

use lazy_static::lazy_static;
use neon::prelude::*;

use chain_core::common::{Timespec, H256, HASH_SIZE_256};
use chain_core::init::address::CroAddress;
use chain_core::init::coin::Coin;
use chain_core::init::network::Network;
use chain_core::state::account::{Nonce, StakedStateAddress, StakedStateOpWitness};
use chain_core::tx::data::address::ExtendedAddr;
use chain_core::tx::data::input::TxoPointer;
use chain_core::tx::data::output::TxOut;
use chain_core::tx::data::TxId;
use chain_core::tx::fee::{LinearFee, Milli};
use client_common::{PrivateKey, PublicKey};
use parity_scale_codec::Decode;

use crate::common::does_js_object_has_prop;
use crate::error::ClientErrorNeonExt;

lazy_static! {
    static ref MAINNET_CHAIN_HEX_ID: u8 = hex::decode("2A").unwrap()[0];
    static ref TESTNET_CHAIN_HEX_ID: u8 = hex::decode("42").unwrap()[0];
}

#[inline]
pub fn u8_buffer_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<Vec<u8>> {
    let buffer = ctx.argument::<JsBuffer>(i)?;

    Ok(ctx.borrow(&buffer, |data| data.as_slice::<u8>().to_vec()))
}

#[inline]
pub fn h256_str_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<H256> {
    let hash_str = ctx
        .argument::<JsString>(i)?
        .downcast_or_throw::<JsString, FunctionContext>(ctx)
        .chain_neon(ctx, "Unable to downcast h256 argument")?
        .value();

    let decoded_hash_array =
        hex::decode(&hash_str).chain_neon(ctx, "input hash is not a valid hex string")?;

    if decoded_hash_array.len() != HASH_SIZE_256 {
        return ctx.throw_error(format!(
            "input hash should be a hex string of 32 bytes, {:?} is {} bytes",
            decoded_hash_array,
            decoded_hash_array.len()
        ));
    }

    let mut h256_hash: H256 = [0; HASH_SIZE_256];
    h256_hash.copy_from_slice(&decoded_hash_array);

    Ok(h256_hash)
}

#[inline]
pub fn h256_buffer_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<H256> {
    let buffer = ctx.argument::<JsBuffer>(i)?;
    let buffer = ctx.borrow(&buffer, |data| data.as_slice::<u8>().to_vec());

    if buffer.len() != HASH_SIZE_256 {
        return ctx.throw_error(format!(
            "input hash should be a hex string of 32 bytes, {:?} is {} bytes",
            buffer,
            buffer.len()
        ));
    }

    let mut h256_hash: H256 = [0; HASH_SIZE_256];
    h256_hash.copy_from_slice(&buffer);

    Ok(h256_hash)
}

#[inline]
pub fn public_key_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<PublicKey> {
    let public_key = ctx.argument::<JsBuffer>(i)?;
    let public_key = ctx.borrow(&public_key, |data| data.as_slice::<u8>());

    PublicKey::deserialize_from(public_key).chain_neon(ctx, "Unable to deserialize public key")
}

#[inline]
pub fn public_key_vector_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<Vec<PublicKey>> {
    let public_key_vector_handle: Handle<JsArray> = ctx.argument::<JsArray>(i)?;
    let public_key_vector = public_key_vector_handle
        .downcast_or_throw::<JsArray, FunctionContext>(ctx)
        .chain_neon(ctx, "Unable to downcast public key array")?
        .to_vec(ctx)?;

    public_key_vector
        .iter()
        .map(|&public_key| {
            let public_key = public_key
                .downcast_or_throw::<JsBuffer, FunctionContext>(ctx)
                .chain_neon(ctx, "Unable to downcast public key")?;
            let public_key = public_key.borrow(&ctx.lock()).as_slice();
            let public_key = hex::encode_upper(public_key);
            PublicKey::from_str(&public_key).chain_neon(ctx, "Unable to deserialize public key")
        })
        .collect::<NeonResult<Vec<PublicKey>>>()
}

#[allow(dead_code)]
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

    parse_key_pair(ctx, key_pair)
}

#[inline]
pub fn parse_key_pair(
    ctx: &mut FunctionContext,
    key_pair: Handle<JsObject>,
) -> NeonResult<(PrivateKey, PublicKey)> {
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
#[allow(dead_code)]
pub fn staking_address_argument(
    ctx: &mut FunctionContext,
    i: i32,
) -> NeonResult<StakedStateAddress> {
    let staked_state_address = ctx.argument::<JsString>(i)?.value();

    StakedStateAddress::from_str(&staked_state_address)
        .chain_neon(ctx, "Unable to deserialize staking address")
}

#[inline]
pub fn network_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<Network> {
    let network = ctx.argument::<JsString>(i)?.value();

    network_from_str(ctx, network.as_str())
}

#[inline]
pub fn network_from_str(ctx: &mut FunctionContext, network_str: &str) -> NeonResult<Network> {
    match network_str {
        "Mainnet" => Ok(Network::Mainnet),
        "Testnet" => Ok(Network::Testnet),
        "Devnet" => Ok(Network::Devnet),
        network => ctx.throw_error(format!("Unrecognized network {}", network)),
    }
}

#[inline]
pub fn network_from_chain_hex_id(chain_hex_id: u8) -> Network {
    if chain_hex_id == *MAINNET_CHAIN_HEX_ID {
        Network::Mainnet
    } else if chain_hex_id == *TESTNET_CHAIN_HEX_ID {
        Network::Testnet
    } else {
        Network::Devnet
    }
}

#[inline]
#[allow(dead_code)]
pub fn chain_hex_id_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<u8> {
    let chain_hex_id = ctx.argument::<JsBuffer>(i)?;
    let chain_hex_id = ctx.borrow(&chain_hex_id, |data| data.as_slice::<u8>());

    chain_hex_id_from_vec(ctx, chain_hex_id.to_vec())
}

#[inline]
pub fn chain_hex_id_from_vec(ctx: &mut FunctionContext, chain_hex_id: Vec<u8>) -> NeonResult<u8> {
    if chain_hex_id.len() != 1 {
        return ctx.throw_error("Chain hex id must be 8 bit long");
    }

    Ok(chain_hex_id[0])
}

#[inline]
#[allow(dead_code)]
pub fn txo_pointer_vec_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<Vec<TxoPointer>> {
    let inputs = ctx.argument::<JsArray>(i)?.to_vec(ctx).chain_neon(
        ctx,
        "Unable to deserialize transaction output pointer vector",
    )?;

    parse_prev_output_pointer_vec(ctx, inputs)
}

#[inline]
pub fn parse_prev_output_pointer_vec(
    ctx: &mut FunctionContext,
    prev_output_pointer_vec: Vec<Handle<JsValue>>,
) -> NeonResult<Vec<TxoPointer>> {
    prev_output_pointer_vec
        .iter()
        .map(|&input| {
            let input = input
                .downcast_or_throw::<JsObject, FunctionContext>(ctx)
                .chain_neon(ctx, "Unable to downcast transaction output pointer")?;
            parse_prev_output_pointer(ctx, input)
        })
        .collect()
}

#[inline]
#[allow(dead_code)]
pub fn txo_pointer_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<TxoPointer> {
    let input = ctx.argument::<JsObject>(i)?;

    parse_prev_output_pointer(ctx, input)
}

#[inline]
pub fn parse_prev_output_pointer(
    ctx: &mut FunctionContext,
    prev_output_pointer: Handle<JsObject>,
) -> NeonResult<TxoPointer> {
    let tx_id = prev_output_pointer
        .get(ctx, "prevTxId")?
        .downcast_or_throw::<JsString, FunctionContext>(ctx)
        .chain_neon(
            ctx,
            "Unable to downcast transaction id in transaction output pointer",
        )?
        .value();
    let tx_id = txid_from_str(ctx, &tx_id)?;

    let index = prev_output_pointer
        .get(ctx, "prevIndex")?
        .downcast_or_throw::<JsNumber, FunctionContext>(ctx)
        .chain_neon(
            ctx,
            "Unable to downcast index in transaction output pointer",
        )?
        .value() as u16;

    Ok(TxoPointer { id: tx_id, index })
}

#[inline]
pub fn txid_from_str(ctx: &mut FunctionContext, tx_id: &str) -> NeonResult<TxId> {
    let txid = hex::decode(tx_id).chain_neon(ctx, "Unable to deserialize TxId")?;

    if txid.len() != HASH_SIZE_256 {
        return ctx.throw_error("TxId should be 32 bytes long");
    }

    let mut out = [0u8; HASH_SIZE_256];
    out.copy_from_slice(txid.as_slice());

    Ok(out)
}

#[inline]
pub fn parse_output(
    ctx: &mut FunctionContext,
    output: Handle<JsObject>,
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

#[inline]
pub fn parse_view_key(
    ctx: &mut FunctionContext,
    view_key: Handle<JsBuffer>,
) -> NeonResult<PublicKey> {
    let view_key = view_key.borrow(&ctx.lock()).as_slice();

    let view_key = hex::encode_upper(view_key);

    PublicKey::from_str(&view_key).chain_neon(ctx, "Unable to deserialize view key")
}

#[inline]
pub fn parse_linear_fee_config(
    ctx: &mut FunctionContext,
    fee_config: Handle<JsObject>,
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

#[inline]
pub fn parse_account_nonce(ctx: &mut FunctionContext, nonce: String) -> NeonResult<Nonce> {
    nonce.parse().chain_neon(ctx, "Invalid nonce")
}

#[inline]
pub fn parse_staked_state_op_witness(
    ctx: &mut FunctionContext,
    witness: Handle<JsBuffer>,
) -> NeonResult<StakedStateOpWitness> {
    let mut witness = witness.borrow(&ctx.lock()).as_slice::<u8>();
    let witness = StakedStateOpWitness::decode(&mut witness)
        .chain_neon(ctx, "Unable to decode staked state op witness")?;

    Ok(witness)
}
