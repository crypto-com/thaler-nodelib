use client_core::{HDSeed, Mnemonic};
use neon::prelude::*;
use secstr::SecUtf8;

use crate::error::ClientErrorNeonExt;
use crate::function_types::*;

fn get_seed_from_mnemonic(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let mnemonic = ctx.argument::<JsString>(0)?.value();
    let mnemonic = SecUtf8::from(mnemonic.as_str());

    let mnemonic =
        Mnemonic::from_secstr(&mnemonic).chain_neon(&mut ctx, "Unable to deserialize mnemonic")?;

    let value = mnemonic.seed();

    let mut buffer = ctx.buffer(value.len() as u32)?;
    ctx.borrow_mut(&mut buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&value);
    });
    Ok(buffer)
}

fn derive_key_pair_from_seed(mut ctx: FunctionContext) -> JsResult<JsObject> {
    let seed = u8_buffer_argument(&mut ctx, 0)?;
    let network = network_argument(&mut ctx, 1)?;
    let account = ctx.argument::<JsNumber>(2)?.to_string(&mut ctx)?.value();
    let index = ctx.argument::<JsNumber>(3)?.to_string(&mut ctx)?.value();

    let account = account
        .parse::<u32>()
        .chain_neon(&mut ctx, "Unable to deserialize account")?;
    let index = index
        .parse::<u32>()
        .chain_neon(&mut ctx, "Unable to deserialize index")?;

    let hd_seed = HDSeed::new(seed);

    let (public_key, private_key) = hd_seed
        .derive_key_pair(network, account, index)
        .chain_neon(&mut ctx, "Unable to derive key pair")?;

    let serialized_public_key = public_key.serialize();
    let mut public_key_buffer = ctx.buffer(serialized_public_key.len() as u32)?;
    ctx.borrow_mut(&mut public_key_buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&serialized_public_key);
    });

    let compressed_public_key = public_key.serialize_compressed();
    let mut compressed_public_key_buffer = ctx.buffer(compressed_public_key.len() as u32)?;
    ctx.borrow_mut(&mut compressed_public_key_buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&compressed_public_key);
    });

    let private_key = private_key.serialize();
    let mut private_key_buffer = ctx.buffer(private_key.len() as u32)?;
    ctx.borrow_mut(&mut private_key_buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&private_key);
    });

    let js_object = JsObject::new(&mut ctx);
    js_object.set(&mut ctx, "publicKey", public_key_buffer)?;
    js_object.set(
        &mut ctx,
        "compressedPublicKey",
        compressed_public_key_buffer,
    )?;
    js_object.set(&mut ctx, "privateKey", private_key_buffer)?;

    Ok(js_object)
}

pub fn register_hd_wallet_module(ctx: &mut ModuleContext) -> NeonResult<()> {
    let js_object = JsObject::new(ctx);

    let get_seed_from_mnemonic_fn = JsFunction::new(ctx, get_seed_from_mnemonic)?;
    js_object.set(ctx, "getSeedFromMnemonic", get_seed_from_mnemonic_fn)?;

    let derive_key_pair_from_seed_fn = JsFunction::new(ctx, derive_key_pair_from_seed)?;
    js_object.set(ctx, "deriveKeyPairFromSeed", derive_key_pair_from_seed_fn)?;

    ctx.export_value("hdWallet", js_object)
}
