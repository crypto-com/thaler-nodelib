use std::str::FromStr;

use neon::prelude::*;

use chain_core::state::account::{
    Nonce, StakedStateAddress, StakedStateOpAttributes, StakedStateOpWitness, UnjailTx,
};
use chain_core::tx::{TransactionId, TxAux, TxPublicAux};
use chain_tx_validation::witness::verify_tx_recover_address;
use parity_scale_codec::{Decode, Encode};

use crate::error::ClientErrorNeonExt;
use crate::function_types::*;
use crate::signer::KeyPairSigner;
use crate::tx_aux::tx_aux_to_hex;

pub fn build_raw_unjail_transaction(mut ctx: FunctionContext) -> JsResult<JsObject> {
    let options = BuildNodeJoinTransactionOptions::argument(&mut ctx, 0)?;
    let attributes = StakedStateOpAttributes::new(options.0.chain_hex_id);

    let tx = UnjailTx::new(options.0.nonce, options.0.staking_address, attributes);

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

pub fn unjail_transaction_to_hex(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let unjail_tx = unjail_tx_argument(&mut ctx, 0)?;
    let key_pair = key_pair_argument(&mut ctx, 1)?;
    let signer = KeyPairSigner::new(key_pair.0, key_pair.1)
        .chain_neon(&mut ctx, "Unable to create KeyPair signer")?;

    let signature = signer
        .sign(&unjail_tx.id())
        .map(StakedStateOpWitness::new)
        .chain_neon(&mut ctx, "Error when signing transaction")?;

    let tx_aux = TxAux::PublicTx(TxPublicAux::UnjailTx(unjail_tx, signature));

    tx_aux_to_hex(&mut ctx, tx_aux)
}

fn unjail_tx_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<UnjailTx> {
    let unjail_tx = ctx.argument::<JsBuffer>(i)?;
    let mut unjail_tx = unjail_tx.borrow(&ctx.lock()).as_slice();

    UnjailTx::decode(&mut unjail_tx).chain_neon(ctx, "Unable to decode raw transaction bytes")
}

pub fn verify_unjail_tx_aux(mut ctx: FunctionContext) -> JsResult<JsUndefined> {
    let (unjail_tx, witness) = unjail_tx_aux_argument(&mut ctx, 0)?;
    let assertions = UnjailTxAssertion::argument(&mut ctx, 1)?;

    if unjail_tx.address != assertions.0.staking_address {
        return ctx.throw_error("Mismatch staking address");
    }
    if unjail_tx.nonce != assertions.0.nonce {
        return ctx.throw_error("Mismatch staking account nonce");
    }
    if unjail_tx.attributes.chain_hex_id != assertions.0.chain_hex_id {
        return ctx.throw_error("Mismatch chain hex id");
    }

    let address = verify_tx_recover_address(&witness, &unjail_tx.id())
        .chain_neon(&mut ctx, "Invalid signature")?;
    if address != assertions.0.staking_address {
        return ctx.throw_error("Incorrect signature");
    }

    Ok(ctx.undefined())
}

fn unjail_tx_aux_argument(
    ctx: &mut FunctionContext,
    i: i32,
) -> NeonResult<(UnjailTx, StakedStateOpWitness)> {
    let unjail_tx_aux = ctx.argument::<JsBuffer>(i)?;
    let mut unjail_tx_aux = unjail_tx_aux.borrow(&ctx.lock()).as_slice();

    let tx_aux =
        TxAux::decode(&mut unjail_tx_aux).chain_neon(ctx, "Unable to decode transaction bytes")?;
    match tx_aux {
        TxAux::PublicTx(TxPublicAux::UnjailTx(unjail_tx, staked_state_op_witness)) => {
            Ok((unjail_tx, staked_state_op_witness))
        }
        _ => ctx.throw_error("Transaction is not an Unjail transaction"),
    }
}

struct UnjailTxAssertion(UnjailTxProps);

impl UnjailTxAssertion {
    fn argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<UnjailTxAssertion> {
        let assertion = ctx
            .argument::<JsObject>(i)
            .chain_neon(ctx, "Unable to deserialize assertion object")?;

        let unjail_tx_props = UnjailTxProps::parse(ctx, assertion)?;

        Ok(UnjailTxAssertion(unjail_tx_props))
    }
}

struct BuildNodeJoinTransactionOptions(UnjailTxProps);

impl BuildNodeJoinTransactionOptions {
    fn argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<BuildNodeJoinTransactionOptions> {
        let options = ctx
            .argument::<JsObject>(i)
            .chain_neon(ctx, "Unable to deserialize options object")?;

        let unjail_tx_props = UnjailTxProps::parse(ctx, options)?;

        Ok(BuildNodeJoinTransactionOptions(unjail_tx_props))
    }
}

struct UnjailTxProps {
    staking_address: StakedStateAddress,
    nonce: Nonce,
    chain_hex_id: u8,
}

impl UnjailTxProps {
    fn parse(
        ctx: &mut FunctionContext,
        prop_object: Handle<JsObject>,
    ) -> NeonResult<UnjailTxProps> {
        let staking_address = prop_object
            .get(ctx, "stakingAddress")?
            .downcast_or_throw::<JsString, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast stakingAddress")?
            .value();
        let staking_address = StakedStateAddress::from_str(&staking_address)
            .chain_neon(ctx, "Unable to deserialize stakingAddress")?;

        let nonce = prop_object
            .get(ctx, "nonce")?
            .downcast_or_throw::<JsString, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast nonce")?
            .value();
        let nonce = parse_account_nonce(ctx, nonce)?;

        let chain_hex_id = prop_object
            .get(ctx, "chainHexId")?
            .downcast_or_throw::<JsBuffer, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast chainHexId")?;
        let chain_hex_id = chain_hex_id.borrow(&ctx.lock()).as_slice().to_vec();
        let chain_hex_id = chain_hex_id_from_vec(ctx, chain_hex_id)?;

        Ok(UnjailTxProps {
            staking_address,
            nonce,
            chain_hex_id,
        })
    }
}
