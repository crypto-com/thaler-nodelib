use neon::prelude::*;
use client_common::{PrivateKey, PublicKey};

use crate::error::ClientErrorNeonExt;
use crate::argument_types::*;

pub fn verify_public_key(mut ctx: FunctionContext) -> JsResult<JsUndefined> {
    let _ = public_key_argument(&mut ctx, 0)?;

    Ok(ctx.undefined())
}

pub fn verify_private_key(mut ctx: FunctionContext) -> JsResult<JsUndefined> {
    let _ = private_key_argument(&mut ctx, 0)?;

    Ok(ctx.undefined())
}

pub fn get_public_key_from_private_key(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let private_key = private_key_argument(&mut ctx, 0)?;

    let public_key = PublicKey::from(&private_key);
    let public_key = public_key.serialize();
    let mut buffer = ctx.buffer(public_key.len() as u32)?;
    ctx.borrow_mut(&mut buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&public_key)
    });
    Ok(buffer)
}

pub fn new_private_key(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let private_key = PrivateKey::new().chain_neon(&mut ctx)?;
    let private_key = private_key.serialize();

    let mut buffer = ctx.buffer(private_key.len() as u32)?;
    ctx.borrow_mut(&mut buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&private_key);
    });
    Ok(buffer)
}

pub fn register_key_pair_module(ctx: &mut ModuleContext) -> NeonResult<()> {
    let js_object = JsObject::new(ctx);

    let verify_private_key_fn = JsFunction::new(ctx, verify_private_key)?;
    js_object.set(
        ctx,
        "verifyPrivateKey",
        verify_private_key_fn,
    )?;

    let verify_public_key_fn = JsFunction::new(ctx, verify_public_key)?;
    js_object.set(
        ctx,
        "verifyPublicKey",
        verify_public_key_fn,
    )?;

    let get_public_key_from_private_key_fn = JsFunction::new(ctx, get_public_key_from_private_key)?;
    js_object.set(
        ctx,
        "getPublicKeyFromPrivateKey",
        get_public_key_from_private_key_fn,
    )?;

    let new_private_key_fn = JsFunction::new(ctx, new_private_key)?;
    js_object.set(ctx, "newPrivateKey", new_private_key_fn)?;

    ctx.export_value("keyPair", js_object)
}
