use std::str::FromStr;

use neon::prelude::*;

use chain_core::init::coin::Coin;
use chain_core::state::account::{
    Nonce, StakedStateAddress, StakedStateOpAttributes, StakedStateOpWitness, UnbondTx,
};
use chain_core::tx::{TransactionId, TxAux, TxPublicAux};
use parity_scale_codec::{Decode, Encode};

use crate::error::ClientErrorNeonExt;
use crate::function_types::*;
use crate::signer::KeyPairSigner;
use crate::tx_aux::tx_aux_to_hex;

pub fn build_raw_unbond_transaction(mut ctx: FunctionContext) -> JsResult<JsObject> {
    let options = BuildUnbondTransactionOptions::parse(&mut ctx)?;
    let attributes = StakedStateOpAttributes::new(options.chain_hex_id);

    let tx = UnbondTx::new(
        options.staking_address,
        options.nonce,
        options.amount,
        attributes,
    );

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

pub fn unbond_transaction_to_hex(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let unbond_tx = unbond_tx_argument(&mut ctx, 0)?;
    let key_pair = key_pair_argument(&mut ctx, 1)?;
    let signer = KeyPairSigner::new(key_pair.0, key_pair.1)
        .chain_neon(&mut ctx, "Unable to create KeyPair signer")?;

    let signature = signer
        .sign(&unbond_tx.id())
        .map(StakedStateOpWitness::new)
        .chain_neon(&mut ctx, "Error when signing transaction")?;

    let tx_aux = TxAux::PublicTx(TxPublicAux::UnbondStakeTx(unbond_tx, signature));

    tx_aux_to_hex(&mut ctx, tx_aux)
}

fn unbond_tx_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<UnbondTx> {
    let unbond_tx = ctx.argument::<JsBuffer>(i)?;
    let mut unbond_tx = unbond_tx.borrow(&ctx.lock()).as_slice();

    UnbondTx::decode(&mut unbond_tx).chain_neon(ctx, "Unable to decode raw transaction bytes")
}

struct BuildUnbondTransactionOptions {
    staking_address: StakedStateAddress,
    nonce: Nonce,
    amount: Coin,
    chain_hex_id: u8,
}

impl BuildUnbondTransactionOptions {
    fn parse(ctx: &mut FunctionContext) -> NeonResult<BuildUnbondTransactionOptions> {
        let options = ctx
            .argument::<JsObject>(0)
            .chain_neon(ctx, "Unable to deserialize options object")?;

        let staking_address = options
            .get(ctx, "stakingAddress")?
            .downcast_or_throw::<JsString, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast stakingAddress")?
            .value();
        let staking_address = StakedStateAddress::from_str(&staking_address)
            .chain_neon(ctx, "Unable to deserialize stakingAddress")?;

        let nonce = options
            .get(ctx, "nonce")?
            .downcast_or_throw::<JsString, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast stakingAddress")?
            .value();
        let nonce = parse_account_nonce(ctx, nonce)?;

        let amount = options
            .get(ctx, "amount")?
            .downcast_or_throw::<JsString, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast amount")?
            .value();
        let amount = Coin::from_str(&amount).chain_neon(ctx, "Unable to deserialize amount")?;

        let chain_hex_id = options
            .get(ctx, "chainHexId")?
            .downcast_or_throw::<JsBuffer, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast chainHexId")?;
        let chain_hex_id = chain_hex_id.borrow(&ctx.lock()).as_slice().to_vec();
        let chain_hex_id = chain_hex_id_from_vec(ctx, chain_hex_id)?;

        Ok(BuildUnbondTransactionOptions {
            staking_address,
            nonce,
            amount,
            chain_hex_id,
        })
    }
}
