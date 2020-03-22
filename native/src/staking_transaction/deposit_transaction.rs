use std::str::FromStr;

use neon::prelude::*;

use chain_core::state::account::{DepositBondTx, StakedStateAddress, StakedStateOpAttributes};
use chain_core::tx::data::input::TxoPointer;
use chain_core::tx::witness::TxInWitness;
use chain_core::tx::TransactionId;
use client_common::SignedTransaction;
use parity_scale_codec::{Decode, Encode};

use crate::common::Features;
use crate::error::ClientErrorNeonExt;
use crate::function_types::*;
use crate::tx_aux::signed_transaction_to_hex;

pub fn build_raw_deposit_transaction(mut ctx: FunctionContext) -> JsResult<JsObject> {
    let options = BuildRawDepositTransactionOption::parse(&mut ctx)?;
    let attributes = StakedStateOpAttributes::new(options.chain_hex_id);

    let tx = DepositBondTx::new(options.inputs, options.to_address, attributes);

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

pub fn deposit_transaction_to_hex(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let deposit_bond_tx = deposit_bond_tx_argument(&mut ctx, 0)?;
    let tx_in_witness_vec = tx_in_witness_vec_argument(&mut ctx, 1)?;
    let tendermint_address = ctx.argument::<JsString>(2)?.value();
    let features = Features::argument(&mut ctx, 3)?;

    let witness = tx_in_witness_vec.into();
    let signed_transaction = SignedTransaction::DepositStakeTransaction(deposit_bond_tx, witness);

    signed_transaction_to_hex(&mut ctx, signed_transaction, &tendermint_address, features)
}

pub fn deposit_bond_tx_argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<DepositBondTx> {
    let deposit_bond_tx = ctx.argument::<JsBuffer>(i)?;
    let mut deposit_bond_tx = deposit_bond_tx.borrow(&ctx.lock()).as_slice();

    DepositBondTx::decode(&mut deposit_bond_tx)
        .chain_neon(ctx, "Unable to decode raw transaction bytes")
}

pub fn tx_in_witness_vec_argument(
    ctx: &mut FunctionContext,
    i: i32,
) -> NeonResult<Vec<TxInWitness>> {
    let tx_in_witnesses = ctx.argument::<JsArray>(i)?.to_vec(ctx)?;
    tx_in_witnesses
        .iter()
        .map(|&tx_in_witness| {
            let tx_in_witness = tx_in_witness
                .downcast_or_throw::<JsBuffer, FunctionContext>(ctx)
                .chain_neon(ctx, "Unable to downcast witness")?;
            let mut tx_in_witness = tx_in_witness.borrow(&ctx.lock()).as_slice();

            TxInWitness::decode(&mut tx_in_witness).chain_neon(ctx, "Unable to decode witness")
        })
        .collect()
}

struct BuildRawDepositTransactionOption {
    inputs: Vec<TxoPointer>,
    to_address: StakedStateAddress,
    chain_hex_id: u8,
}

impl BuildRawDepositTransactionOption {
    fn parse(ctx: &mut FunctionContext) -> NeonResult<BuildRawDepositTransactionOption> {
        let options = ctx
            .argument::<JsObject>(0)
            .chain_neon(ctx, "Unable to deserialize options object")?;

        let inputs = options
            .get(ctx, "inputs")?
            .downcast_or_throw::<JsArray, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast inputs")?
            .to_vec(ctx)?;
        let inputs = parse_prev_output_pointer_vec(ctx, inputs)?;

        let to_address = options
            .get(ctx, "toAddress")?
            .downcast_or_throw::<JsString, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast toAddress")?
            .value();
        let to_address = StakedStateAddress::from_str(&to_address)
            .chain_neon(ctx, "Unable to deserialize staking address")?;

        let chain_hex_id = options
            .get(ctx, "chainHexId")?
            .downcast_or_throw::<JsBuffer, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast chainHexId")?;
        let chain_hex_id = ctx.borrow(&chain_hex_id, |data| data.as_slice::<u8>());
        let chain_hex_id = chain_hex_id_from_vec(ctx, chain_hex_id.to_vec())?;

        Ok(BuildRawDepositTransactionOption {
            inputs,
            to_address,
            chain_hex_id,
        })
    }
}
