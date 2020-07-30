use std::str::FromStr;

use client_common::{PrivateKey, PublicKey};
use neon::prelude::*;

use crate::error::ClientErrorNeonExt;
use crate::function_types::*;

pub fn verify_public_key(mut ctx: FunctionContext) -> JsResult<JsUndefined> {
    let _ = public_key_argument(&mut ctx, 0)?;

    Ok(ctx.undefined())
}

pub fn verify_private_key(mut ctx: FunctionContext) -> JsResult<JsUndefined> {
    let _ = private_key_argument(&mut ctx, 0)?;

    Ok(ctx.undefined())
}

pub fn get_public_keys_from_private_key(mut ctx: FunctionContext) -> JsResult<JsObject> {
    let private_key = private_key_argument(&mut ctx, 0)?;

    let public_key = PublicKey::from(&private_key);
    let compressed_public_key = public_key.serialize_compressed();
    let public_key = public_key.serialize();

    let mut public_key_buf = ctx.buffer(public_key.len() as u32)?;
    ctx.borrow_mut(&mut public_key_buf, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&public_key);
    });

    let mut compressed_public_key_buf = ctx.buffer(compressed_public_key.len() as u32)?;
    ctx.borrow_mut(&mut compressed_public_key_buf, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&compressed_public_key);
    });

    let js_object = JsObject::new(&mut ctx);
    js_object.set(&mut ctx, "publicKey", public_key_buf)?;
    js_object.set(&mut ctx, "compressedPublicKey", compressed_public_key_buf)?;

    Ok(js_object)
}

pub fn get_public_keys_from_any_public_key(mut ctx: FunctionContext) -> JsResult<JsObject> {
    let public_key = public_key_argument(&mut ctx, 0)?;

    let compressed_public_key = public_key.serialize_compressed();
    let public_key = public_key.serialize();

    let mut public_key_buf = ctx.buffer(public_key.len() as u32)?;
    ctx.borrow_mut(&mut public_key_buf, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&public_key);
    });

    let mut compressed_public_key_buf = ctx.buffer(compressed_public_key.len() as u32)?;
    ctx.borrow_mut(&mut compressed_public_key_buf, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&compressed_public_key);
    });

    let js_object = JsObject::new(&mut ctx);
    js_object.set(&mut ctx, "publicKey", public_key_buf)?;
    js_object.set(&mut ctx, "compressedPublicKey", compressed_public_key_buf)?;

    Ok(js_object)
}

pub fn new_private_key(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let private_key = PrivateKey::new().chain_neon(&mut ctx, "Unable to create new private key")?;
    let private_key = private_key.serialize();

    let value = &private_key;
    let mut buffer = ctx.buffer(value.len() as u32)?;
    ctx.borrow_mut(&mut buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&value);
    });
    Ok(buffer)
}

pub fn is_valid_view_key(mut ctx: FunctionContext) -> JsResult<JsBoolean> {
    let view_key = u8_buffer_argument(&mut ctx, 0)?;

    let view_key = hex::encode_upper(view_key);

    let is_valid = match PublicKey::from_str(&view_key) {
        Ok(_) => true,
        _ => false,
    };

    Ok(ctx.boolean(is_valid))
}

pub fn register_key_pair_module(ctx: &mut ModuleContext) -> NeonResult<()> {
    let js_object = JsObject::new(ctx);

    let verify_private_key_fn = JsFunction::new(ctx, verify_private_key)?;
    js_object.set(ctx, "verifyPrivateKey", verify_private_key_fn)?;

    let verify_public_key_fn = JsFunction::new(ctx, verify_public_key)?;
    js_object.set(ctx, "verifyPublicKey", verify_public_key_fn)?;

    let get_public_keys_from_private_key_fn =
        JsFunction::new(ctx, get_public_keys_from_private_key)?;
    js_object.set(
        ctx,
        "getPublicKeysFromPrivateKey",
        get_public_keys_from_private_key_fn,
    )?;

    let get_public_keys_from_any_public_key_fn =
        JsFunction::new(ctx, get_public_keys_from_any_public_key)?;
    js_object.set(
        ctx,
        "getPublicKeysFromAnyPublicKey",
        get_public_keys_from_any_public_key_fn,
    )?;

    let new_private_key_fn = JsFunction::new(ctx, new_private_key)?;
    js_object.set(ctx, "newPrivateKey", new_private_key_fn)?;

    let is_valid_view_key_fn = JsFunction::new(ctx, is_valid_view_key)?;
    js_object.set(ctx, "isValidViewKey", is_valid_view_key_fn)?;

    ctx.export_value("keyPair", js_object)
}
