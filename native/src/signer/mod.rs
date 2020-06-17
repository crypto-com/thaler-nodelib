mod key_pair_signer;

use neon::prelude::*;
use parity_scale_codec::Encode;

use crate::error::ClientErrorNeonExt;
use crate::function_types::*;

pub use key_pair_signer::KeyPairSigner;

fn schnorr_sign_txid(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let message = ctx.argument::<JsBuffer>(0)?;
    let message = ctx.borrow(&message, |data| data.as_slice::<u8>());
    let key_pair = key_pair_argument(&mut ctx, 1)?;

    let private_key = key_pair.0;
    let public_key = key_pair.1;

    let signer = KeyPairSigner::new(private_key, public_key)
        .chain_neon(&mut ctx, "Unable to create signer from KeyPair")?;

    let tx_in_witness = signer
        .schnorr_sign_txid(message)
        .chain_neon(&mut ctx, "Unable to sign message")?;
    let tx_in_witness = tx_in_witness.encode();

    let mut buffer = ctx.buffer(tx_in_witness.len() as u32)?;
    ctx.borrow_mut(&mut buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&tx_in_witness);
    });
    Ok(buffer)
}

pub fn register_signer_module(ctx: &mut ModuleContext) -> NeonResult<()> {
    let js_object = JsObject::new(ctx);

    let schnorr_sign_message_fn = JsFunction::new(ctx, schnorr_sign_txid)?;
    js_object.set(ctx, "schnorrSignTxId", schnorr_sign_message_fn)?;

    ctx.export_value("signer", js_object)
}
