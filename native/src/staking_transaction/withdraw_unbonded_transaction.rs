use neon::prelude::*;

use chain_core::state::account::{Nonce, StakedStateOpWitness, WithdrawUnbondedTx};
use chain_core::tx::data::access::{TxAccess, TxAccessPolicy};
use chain_core::tx::data::attribute::TxAttributes;
use chain_core::tx::data::output::TxOut;
use chain_core::tx::fee::FeeAlgorithm;
use chain_core::tx::TransactionId;
use client_common::{PublicKey, SignedTransaction};
use client_core::signer::DummySigner;
use parity_scale_codec::{Decode, Encode};

use crate::common::Features;
use crate::error::ClientErrorNeonExt;
use crate::function_types::*;
use crate::signer::KeyPairSigner;
use crate::tx_aux::{signed_transaction_to_tx_aux, tx_aux_to_hex};

pub fn build_raw_withdraw_unbonded_transaction(mut ctx: FunctionContext) -> JsResult<JsObject> {
    let options = BuildWithdrawUnbondedTransactionOptions::parse(&mut ctx)?;
    let mut access_policies: Vec<TxAccessPolicy> = Vec::new();
    for view_key in options.view_keys.iter() {
        access_policies.push(TxAccessPolicy {
            view_key: view_key.into(),
            access: TxAccess::AllData,
        });
    }
    let attributes = TxAttributes::new_with_access(options.chain_hex_id, access_policies);

    let tx = WithdrawUnbondedTx::new(options.nonce, options.outputs, attributes);

    let raw_tx = tx.encode();
    let mut raw_tx_buffer = ctx.buffer(raw_tx.len() as u32)?;
    ctx.borrow_mut(&mut raw_tx_buffer, |data| {
        let data = data.as_mut_slice();
        data.copy_from_slice(&raw_tx)
    });

    let tx_id = tx.id();
    let tx_id = ctx.string(hex::encode(tx_id));

    let return_object = ctx.empty_object();
    return_object
        .set(&mut ctx, "unsignedRawTx", raw_tx_buffer)
        .chain_neon(&mut ctx, "Unable to set unsignedRawTx of return object")?;
    return_object
        .set(&mut ctx, "txId", tx_id)
        .chain_neon(&mut ctx, "Unable to set txId of return object")?;

    Ok(return_object)
}

pub fn estimate_withdraw_unbonded_transaction_fee(mut ctx: FunctionContext) -> JsResult<JsString> {
    let withdraw_unbonded_tx = withdraw_unbonded_tx_argument(&mut ctx, 0)?;

    let fee_config = ctx.argument::<JsObject>(1)?;
    let fee_config = parse_linear_fee_config(&mut ctx, fee_config)?;

    let dummy_signer = DummySigner();
    let tx_aux = dummy_signer.mock_txaux_for_withdraw(withdraw_unbonded_tx);

    let estimated_fee = fee_config
        .calculate_for_txaux(&tx_aux)
        .chain_neon(&mut ctx, "Unable to estimate transaction fee")?;
    let estimated_fee = serde_json::to_string(&estimated_fee)
        .chain_neon(&mut ctx, "Unable to serialize estimated fee to string")?;

    Ok(ctx.string(estimated_fee.trim_matches('"')))
}

pub fn withdraw_unbonded_transaction_to_signed_plain_hex(
    mut ctx: FunctionContext,
) -> JsResult<JsBuffer> {
    let withdraw_unbonded_tx = withdraw_unbonded_tx_argument(&mut ctx, 0)?;

    let key_pair = key_pair_argument(&mut ctx, 1)?;
    let signer = KeyPairSigner::new(key_pair.0, key_pair.1)
        .chain_neon(&mut ctx, "Unable to create KeyPair signer")?;

    let signature = signer
        .sign(&withdraw_unbonded_tx.id())
        .map(StakedStateOpWitness::new)
        .chain_neon(&mut ctx, "Error when signing transaction")?;
    let signed_transaction =
        SignedTransaction::WithdrawUnbondedStakeTransaction(withdraw_unbonded_tx, signature);

    let raw_tx = signed_transaction.encode();
    let mut raw_tx_buffer = ctx.buffer(raw_tx.len() as u32)?;
    ctx.borrow_mut(&mut raw_tx_buffer, |data| {
        let data = data.as_mut_slice();
        data.copy_from_slice(&raw_tx)
    });

    Ok(raw_tx_buffer)
}

pub fn withdraw_unbonded_transaction_to_obfuscated_hex(
    mut ctx: FunctionContext,
) -> JsResult<JsBuffer> {
    let withdraw_unbonded_tx = withdraw_unbonded_tx_argument(&mut ctx, 0)?;

    let key_pair = key_pair_argument(&mut ctx, 1)?;
    let signer = KeyPairSigner::new(key_pair.0, key_pair.1)
        .chain_neon(&mut ctx, "Unable to create KeyPair signer")?;

    let tendermint_address = ctx.argument::<JsString>(2)?.value();
    let features = Features::argument(&mut ctx, 3)?;

    let signature = signer
        .sign(&withdraw_unbonded_tx.id())
        .map(StakedStateOpWitness::new)
        .chain_neon(&mut ctx, "Error when signing transaction")?;
    let signed_transaction =
        SignedTransaction::WithdrawUnbondedStakeTransaction(withdraw_unbonded_tx, signature);
    let tx_aux =
        signed_transaction_to_tx_aux(&mut ctx, signed_transaction, &tendermint_address, features)
            .chain_neon(&mut ctx, "Unable to obfuscate transaction")?;

    tx_aux_to_hex(&mut ctx, tx_aux)
}

#[inline]
fn withdraw_unbonded_tx_argument(
    ctx: &mut FunctionContext,
    i: i32,
) -> NeonResult<WithdrawUnbondedTx> {
    let unbond_tx = ctx.argument::<JsBuffer>(i)?;
    let mut unbond_tx = unbond_tx.borrow(&ctx.lock()).as_slice();

    WithdrawUnbondedTx::decode(&mut unbond_tx)
        .chain_neon(ctx, "Unable to decode raw transaction bytes")
}

struct BuildWithdrawUnbondedTransactionOptions {
    nonce: Nonce,
    outputs: Vec<TxOut>,
    view_keys: Vec<PublicKey>,
    chain_hex_id: u8,
}

impl BuildWithdrawUnbondedTransactionOptions {
    fn parse(ctx: &mut FunctionContext) -> NeonResult<BuildWithdrawUnbondedTransactionOptions> {
        let options = ctx
            .argument::<JsObject>(0)
            .chain_neon(ctx, "Unable to deserialize options object")?;

        let nonce = options
            .get(ctx, "nonce")?
            .downcast_or_throw::<JsString, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast nonce")?
            .value();
        let nonce = parse_account_nonce(ctx, nonce)?;

        let chain_hex_id = options
            .get(ctx, "chainHexId")?
            .downcast_or_throw::<JsBuffer, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast chainHexId")?;
        let chain_hex_id = chain_hex_id.borrow(&ctx.lock()).as_slice().to_vec();
        let chain_hex_id = chain_hex_id_from_vec(ctx, chain_hex_id)?;

        let network = network_from_chain_hex_id(chain_hex_id);
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

                parse_output(ctx, output, network)
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
                parse_view_key(ctx, view_key)
            })
            .collect::<NeonResult<Vec<PublicKey>>>()?;

        Ok(BuildWithdrawUnbondedTransactionOptions {
            nonce,
            outputs,
            view_keys,
            chain_hex_id,
        })
    }
}
