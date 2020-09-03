use chain_core::init::address::CroAddress;
use chain_core::tx::data::address::ExtendedAddr;
use client_common::{MultiSigAddress, PublicKey, SECP};
use neon::prelude::*;

use chain_core::common::H256;
use client_core::multi_sig::MultiSigBuilder;
use secp256k1::Message;
use secp256k1::{schnorrsig::schnorr_verify, schnorrsig::SchnorrSignature};

use crate::error::ClientErrorNeonExt;
use crate::function_types::*;

/// create new multisig address
/// @arguments
/// - public_keys: vector of public key, consist of all signers
/// - self_public_key: public key of use who init the multisig address
/// - required_signers: min number of signers to activate the tx
/// - network: netword argument to identify network env (testnet, devnet, etc)
/// @return cro_address
pub fn create_address(mut ctx: FunctionContext) -> JsResult<JsString> {
    let public_keys = public_key_vector_argument(&mut ctx, 0)?;
    let self_public_key = public_key_argument(&mut ctx, 1)?;
    let required_signers = ctx
        .argument::<JsNumber>(2)?
        .downcast_or_throw::<JsNumber, FunctionContext>(&mut ctx)
        .chain_neon(&mut ctx, "Unable to downcast required_signers in input")?
        .value() as usize;
    let network = network_argument(&mut ctx, 3)?;

    let multi_sig_address = MultiSigAddress::new(public_keys, self_public_key, required_signers)
        .chain_neon(&mut ctx, "Unable to create MultiSig address")?;

    let extended_address = ExtendedAddr::from(multi_sig_address);
    let cro_address = extended_address
        .to_cro(network)
        .chain_neon(&mut ctx, "Unable to convert to CRO address")?;

    Ok(ctx.string(cro_address))
}

/// create new multisig session
/// @arguments
/// - message:  H256 format of msg to be signed
/// - signer_public_keys: public keys of all the signers (including current signer)
/// - self_public_key: public key of current signer
/// - self_private_key: private key of current signer
/// @return incompleteSession
pub fn new_session(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let message = h256_str_argument(&mut ctx, 0)?;
    let signer_public_keys = public_key_vector_argument(&mut ctx, 1)?;
    let self_public_key = public_key_argument(&mut ctx, 2)?;
    let self_private_key = private_key_argument(&mut ctx, 3)?;

    let session = MultiSigBuilder::new(
        message,
        signer_public_keys,
        self_public_key,
        self_private_key,
    )
    .chain_neon(&mut ctx, "Unable to create new MultiSigBuilder")?;

    let incomplete_session = session.to_incomplete();
    let mut incomplete_session_buffer = ctx.buffer(incomplete_session.len() as u32)?;
    ctx.borrow_mut(&mut incomplete_session_buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&incomplete_session);
    });

    Ok(incomplete_session_buffer)
}

/// generate nonce commitment
/// @arguments
/// - incomplete_session_bytes: incomplete multisig session bytes
/// @return {
///     incompleteSession: Buffer,
///     nonceCommitment: Buffer
/// }
pub fn generate_nonce_commitment(mut ctx: FunctionContext) -> JsResult<JsObject> {
    let incomplete_session_bytes = u8_buffer_argument(&mut ctx, 0)?;
    let mut session = MultiSigBuilder::from_incomplete_insecure(incomplete_session_bytes)
        .chain_neon(&mut ctx, "Unable to restore the incomplete session")?;

    let nonce_commitment: H256 = session
        .nonce_commitment()
        .chain_neon(&mut ctx, "Unable to process nonce commitment")?;

    // prepare return object
    let object = JsObject::new(&mut ctx);

    let incomplete_session = session.to_incomplete();
    let mut incomplete_session_buffer = ctx.buffer(incomplete_session.len() as u32)?;
    ctx.borrow_mut(&mut incomplete_session_buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&incomplete_session);
    });

    let mut nonce_commitment_buffer = ctx.buffer(nonce_commitment.len() as u32)?;
    ctx.borrow_mut(&mut nonce_commitment_buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&nonce_commitment);
    });

    object
        .set(&mut ctx, "incompleteSession", incomplete_session_buffer)
        .chain_neon(
            &mut ctx,
            "Unable to create object with key incompleteSession",
        )?;
    object
        .set(&mut ctx, "nonceCommitment", nonce_commitment_buffer)
        .chain_neon(&mut ctx, "Unable to create object with key nonceCommitment")?;

    Ok(object)
}

/// add nonce commitment to session
/// @arguments
/// - incomplete_session_bytes: incomplete multisig session bytes
/// - public_key: other signer's public key
/// - nonce_commitment: other signer's nonce_commitment
/// @return incompleteSession
pub fn add_nonce_commitment(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let incomplete_session_bytes = u8_buffer_argument(&mut ctx, 0)?;
    let mut session = MultiSigBuilder::from_incomplete_insecure(incomplete_session_bytes)
        .chain_neon(&mut ctx, "Unable to restore the incomplete session")?;

    let public_key = public_key_argument(&mut ctx, 1)?;
    let nonce_commitment = h256_buffer_argument(&mut ctx, 2)?;

    session
        .add_nonce_commitment(&public_key, nonce_commitment)
        .chain_neon(&mut ctx, "Unable to add nonce commitment")?;

    let incomplete_session = session.to_incomplete();
    let mut incomplete_session_buffer = ctx.buffer(incomplete_session.len() as u32)?;
    ctx.borrow_mut(&mut incomplete_session_buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&incomplete_session);
    });

    Ok(incomplete_session_buffer)
}

/// generate nonce: notice that it will throw error if missing any required
///     signer's nonce commitment
/// @arguments
/// - incomplete_session_bytes: incomplete multisig session bytes
/// @return {
///     incompleteSession: Buffer,
///     nonce: Buffer
/// }
pub fn generate_nonce(mut ctx: FunctionContext) -> JsResult<JsObject> {
    let incomplete_session_bytes = u8_buffer_argument(&mut ctx, 0)?;
    let mut session = MultiSigBuilder::from_incomplete_insecure(incomplete_session_bytes)
        .chain_neon(&mut ctx, "Unable to restore the incomplete session")?;

    let nonce = session
        .nonce()
        .chain_neon(&mut ctx, "Unable to process nonce")?;
    // let nonce = nonce.serialize();

    // prepare return object
    let object = JsObject::new(&mut ctx);
    let incomplete_session = session.to_incomplete();
    let mut incomplete_session_buffer = ctx.buffer(incomplete_session.len() as u32)?;
    ctx.borrow_mut(&mut incomplete_session_buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&incomplete_session);
    });

    let mut nonce_buffer = ctx.buffer(nonce.len() as u32)?;
    ctx.borrow_mut(&mut nonce_buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&nonce);
    });

    object
        .set(&mut ctx, "incompleteSession", incomplete_session_buffer)
        .chain_neon(
            &mut ctx,
            "Unable to create object with key incompleteSession",
        )?;
    object
        .set(&mut ctx, "nonce", nonce_buffer)
        .chain_neon(&mut ctx, "Unable to create object with key nonce")?;

    Ok(object)
}

/// add nonce to session: noted that should not be able to modify
///     an already existing nonce
/// @arguments
/// - incomplete_session_bytes: incomplete multisig session bytes
/// - public_key: the other signer's public key
/// - nonce: the other signer's nonce
/// @return incompleteSession
pub fn add_nonce(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let incomplete_session_bytes = u8_buffer_argument(&mut ctx, 0)?;
    let mut session = MultiSigBuilder::from_incomplete_insecure(incomplete_session_bytes)
        .chain_neon(&mut ctx, "Unable to restore the incomplete session")?;

    let public_key = public_key_argument(&mut ctx, 1)?;
    let nonce = h256_buffer_argument(&mut ctx, 2)?;
    session
        .add_nonce(&public_key, &nonce)
        .chain_neon(&mut ctx, "Unable to add nonce")?;

    let incomplete_session = session.to_incomplete();
    let mut incomplete_session_buffer = ctx.buffer(incomplete_session.len() as u32)?;
    ctx.borrow_mut(&mut incomplete_session_buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&incomplete_session);
    });

    Ok(incomplete_session_buffer)
}

/// generate partial signature
/// @arguments
/// - incomplete_session_bytes: incomplete multisig session bytes
/// @return {
///     incompleteSession: Buffer,
///     partialSignature: Buffer
/// }
pub fn partial_sign(mut ctx: FunctionContext) -> JsResult<JsObject> {
    let incomplete_session_bytes = u8_buffer_argument(&mut ctx, 0)?;
    let mut session = MultiSigBuilder::from_incomplete_insecure(incomplete_session_bytes)
        .chain_neon(&mut ctx, "Unable to restore the incomplete session")?;

    let partial_signature: H256 = session
        .partial_signature()
        .chain_neon(&mut ctx, "Unable to partially sign")?;

    // prepare return object
    let object = JsObject::new(&mut ctx);
    let incomplete_session = session.to_incomplete();
    let mut incomplete_session_buffer = ctx.buffer(incomplete_session.len() as u32)?;
    ctx.borrow_mut(&mut incomplete_session_buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&incomplete_session);
    });

    let mut partial_signature_buffer = ctx.buffer(partial_signature.len() as u32)?;
    ctx.borrow_mut(&mut partial_signature_buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&partial_signature);
    });

    object
        .set(&mut ctx, "incompleteSession", incomplete_session_buffer)
        .chain_neon(
            &mut ctx,
            "Unable to create object with key incompleteSession",
        )?;
    object
        .set(&mut ctx, "partialSignature", partial_signature_buffer)
        .chain_neon(
            &mut ctx,
            "Unable to create object with key partialSignature",
        )?;

    Ok(object)
}

/// add partial signature to session
/// @arguments
/// - incomplete_session_bytes: incomplete multisig session bytes
/// - public_key: the other signer's public key
/// - partial_signature: the other signer's H256 partial signature
/// @return incompleteSession
pub fn add_partial_signature(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let incomplete_session_bytes = u8_buffer_argument(&mut ctx, 0)?;
    let mut session = MultiSigBuilder::from_incomplete_insecure(incomplete_session_bytes)
        .chain_neon(&mut ctx, "Unable to restore the incomplete session")?;

    let public_key = public_key_argument(&mut ctx, 1)?;
    let partial_signature: H256 = h256_buffer_argument(&mut ctx, 2)?;

    session
        .add_partial_signature(&public_key, partial_signature)
        .chain_neon(&mut ctx, "Unable to add partial signature")?;

    let incomplete_session = session.to_incomplete();
    let mut incomplete_session_buffer = ctx.buffer(incomplete_session.len() as u32)?;
    ctx.borrow_mut(&mut incomplete_session_buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&incomplete_session);
    });

    Ok(incomplete_session_buffer)
}

/// sign the ready session that gathered all co-signers' signatures
/// @arguments
/// - incomplete_session_bytes: incomplete multisig session bytes
/// @return signature:SchnorrSignature
pub fn sign(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let incomplete_session_bytes = u8_buffer_argument(&mut ctx, 0)?;
    let session = MultiSigBuilder::from_incomplete_insecure(incomplete_session_bytes)
        .chain_neon(&mut ctx, "Unable to restore the incomplete session")?;

    let signature = session
        .signature()
        .chain_neon(&mut ctx, "Unable to create signature")?
        .serialize_default()
        .to_vec();

    let mut signature_buffer = ctx.buffer(signature.len() as u32)?;
    ctx.borrow_mut(&mut signature_buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&signature);
    });

    Ok(signature_buffer)
}

/// verify the final signature valid or not
/// @arguments
/// - signature: final signature Buffer
/// - message: session H256 message string
/// - public_keys: all co-signers' public keys
/// @return boolean
pub fn verify(mut ctx: FunctionContext) -> JsResult<JsBoolean> {
    let raw = u8_buffer_argument(&mut ctx, 0)?;
    let signature =
        SchnorrSignature::from_default(&raw).chain_neon(&mut ctx, "Unable to restore signature")?;

    let message = h256_str_argument(&mut ctx, 1)?;
    let message = Message::from_slice(&message).chain_neon(&mut ctx, "Unable to form message")?;

    let mut public_keys = public_key_vector_argument(&mut ctx, 2)?;
    public_keys.sort(); // sort the public keys to keep the order consistency

    let combined_public_key = PublicKey::combine(&public_keys)
        .chain_neon(&mut ctx, "Unable combine public keys")?
        .0;

    let verify_passed = SECP.with(|secp| {
        schnorr_verify(&secp, &message, &signature, &combined_public_key.into()).is_ok()
    });

    Ok(ctx.boolean(verify_passed))
}

pub fn register_multi_sig_module(ctx: &mut ModuleContext) -> NeonResult<()> {
    let js_object = JsObject::new(ctx);

    let create_address_fn = JsFunction::new(ctx, create_address)?;
    let new_session_fn = JsFunction::new(ctx, new_session)?;
    let generate_nonce_commitment_fn = JsFunction::new(ctx, generate_nonce_commitment)?;
    let add_nonce_commitment_fn = JsFunction::new(ctx, add_nonce_commitment)?;
    let generate_nonce_fn = JsFunction::new(ctx, generate_nonce)?;
    let add_nonce_fn = JsFunction::new(ctx, add_nonce)?;
    let partial_sign_fn = JsFunction::new(ctx, partial_sign)?;
    let add_partial_signature_fn = JsFunction::new(ctx, add_partial_signature)?;
    let sign_fn = JsFunction::new(ctx, sign)?;
    let verify_fn = JsFunction::new(ctx, verify)?;

    js_object.set(ctx, "createAddress", create_address_fn)?;
    js_object.set(ctx, "newSession", new_session_fn)?;
    js_object.set(ctx, "generateNonceCommitment", generate_nonce_commitment_fn)?;
    js_object.set(ctx, "addNonceCommitment", add_nonce_commitment_fn)?;
    js_object.set(ctx, "generateNonce", generate_nonce_fn)?;
    js_object.set(ctx, "addNonce", add_nonce_fn)?;
    js_object.set(ctx, "partialSign", partial_sign_fn)?;
    js_object.set(ctx, "addPartialSignature", add_partial_signature_fn)?;
    js_object.set(ctx, "sign", sign_fn)?;
    js_object.set(ctx, "verify", verify_fn)?;

    ctx.export_value("multiSig", js_object)
}
