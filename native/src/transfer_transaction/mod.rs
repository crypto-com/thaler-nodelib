mod builder_options;

use chain_core::tx::data::access::{TxAccess, TxAccessPolicy};
use chain_core::tx::data::attribute::TxAttributes;
use chain_core::tx::data::input::TxoIndex;
use chain_core::tx::data::TxId;
use chain_core::tx::fee::LinearFee;
use chain_core::tx::{TxAux, TxObfuscated};
// #[cfg(feature = "mock")]
use chain_core::tx::TxEnclaveAux;
// #[cfg(not(feature = "mock"))]
use client_core::cipher::DefaultTransactionObfuscation;
// #[cfg(feature = "mock")]
use client_core::cipher::TransactionObfuscation;
use client_common::{PrivateKey, Result};
use client_common::{SignedTransaction, Transaction};
use client_core::signer::{KeyPairSigner, Signer};
use client_core::transaction_builder::RawTransferTransactionBuilder;
use neon::prelude::*;
use parity_scale_codec::Encode;

use crate::error::ClientErrorNeonExt;
use crate::function_types::*;

use builder_options::{parse_linear_fee_config, BuilderOptions, LinearFeeBuilderOptions};

type LinearFeeRawTransferTransactionBuilder = RawTransferTransactionBuilder<LinearFee>;

/// Create a basic linear fee transfer transaction builder without witnesses
pub fn build_incomplete_hex_linear_fee(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let options: LinearFeeBuilderOptions =
        BuilderOptions::<LinearFee>::parse_linear_fee_fn_ctx(&mut ctx)?;

    let mut access_policies: Vec<TxAccessPolicy> = Vec::new();
    for view_key in options.raw_tx_options.view_keys.iter() {
        access_policies.push(TxAccessPolicy {
            view_key: view_key.into(),
            access: TxAccess::AllData,
        });
    }

    let attributes =
        TxAttributes::new_with_access(options.raw_tx_options.chain_id, access_policies);

    let mut builder = RawTransferTransactionBuilder::new(attributes, options.fee_algorithm.clone());

    for input in options.raw_tx_options.inputs.iter() {
        builder.add_input(input.to_owned());
    }
    for output in options.raw_tx_options.outputs.iter() {
        builder.add_output(output.to_owned());
    }

    let value = &builder.to_incomplete();
    let mut buffer = ctx.buffer(value.len() as u32)?;
    ctx.borrow_mut(&mut buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&value);
    });
    Ok(buffer)
}

/// Sign a particular input with the provided KeyPair
pub fn sign_input_linear_fee(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let mut builder = incomplete_builder_linear_fee_argument(&mut ctx, 0)?;
    let input_index = ctx.argument::<JsNumber>(1)?.to_string(&mut ctx)?.value();
    let (private_key, public_key) = key_pair_argument(&mut ctx, 2)?;

    let tx_id = builder.tx_id();

    let input_index = input_index
        .parse::<usize>()
        .chain_neon(&mut ctx, "Unable to deserialize input index")?;
    let input = builder.input_at_index(input_index).chain_neon(
        &mut ctx,
        format!("Unable to get input at index {}", input_index),
    )?;
    let signing_addr = &input.prev_tx_out.address;

    let signer = KeyPairSigner::new(private_key, public_key)
        .chain_neon(&mut ctx, "Unable to create KeyPair signer")?;
    let witness = signer
        .schnorr_sign(tx_id, signing_addr)
        .chain_neon(&mut ctx, "Unable to sign transaction")?;

    builder
        .add_witness(input_index, witness)
        .chain_neon(&mut ctx, "Unable to add witness to input")?;

    let value = &builder.to_incomplete();
    let mut buffer = ctx.buffer(value.len() as u32)?;
    ctx.borrow_mut(&mut buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&value);
    });
    Ok(buffer)
}

/// Determine if all the transaction inputs have signature
pub fn is_completed_linear_fee(mut ctx: FunctionContext) -> JsResult<JsBoolean> {
    let builder = incomplete_builder_linear_fee_argument(&mut ctx, 0)?;

    Ok(ctx.boolean(builder.is_completed()))
}

/// Finish the transaction and export to broadcast-able hex 
pub fn to_hex_linear_fee(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let builder = incomplete_builder_linear_fee_argument(&mut ctx, 0)?;
    let tx_query_address = ctx.argument::<JsString>(1)?.value();
    // TODO: Use feature conditional compilation when ready
    // https://github.com/neon-bindings/neon/issues/471
    let is_mock = ctx.argument::<JsBoolean>(2)?.value();

    let tx_aux_result = if is_mock {
        to_mock_tx_aux_linear_fee(&mut ctx, &builder, &tx_query_address)
    } else {
        to_tx_aux_linear_fee(&mut ctx, &builder, &tx_query_address)
    };
    let value = tx_aux_result?.encode();

    let mut buffer = ctx.buffer(value.len() as u32)?;
    ctx.borrow_mut(&mut buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&value);
    });
    Ok(buffer)
}

fn to_tx_aux_linear_fee(ctx: &mut FunctionContext, builder: &LinearFeeRawTransferTransactionBuilder, tx_query_address: &str) -> NeonResult<TxAux>{
    let tx_obfuscation = get_tx_obfuscation(ctx, &tx_query_address)?;
   
    builder.to_tx_aux(tx_obfuscation).chain_neon(ctx, "Unable to finish transaction")
}

fn to_mock_tx_aux_linear_fee(ctx: &mut FunctionContext, builder: &LinearFeeRawTransferTransactionBuilder, tx_query_address: &str) -> NeonResult<TxAux>{
    let tx_obfuscation = get_mock_tx_obfuscation(ctx, &tx_query_address)?;
   
    builder.to_tx_aux(tx_obfuscation).chain_neon(ctx, "Unable to finish transaction")
}

// #[cfg(not(feature = "mock"))]
fn get_tx_obfuscation(
    ctx: &mut FunctionContext,
    tx_query_address: &str,
) -> NeonResult<DefaultTransactionObfuscation> {
    DefaultTransactionObfuscation::from_tx_query_address(tx_query_address).chain_neon(
        ctx,
        "Unable to create transaction obfuscation from tx query address",
    )
}

// #[cfg(feature = "mock")]
fn get_mock_tx_obfuscation(_: &mut FunctionContext, _: &str) -> NeonResult<MockTransactionCipher> {
    Ok(MockTransactionCipher)
}

/// Verify the provided incomplete RawTransferTransaction hex is a valid
/// transaction to be broadcasted
pub fn verify_linear_fee(mut ctx: FunctionContext) -> JsResult<JsUndefined> {
    let incomplete_hex = u8_buffer_argument(&mut ctx, 0)?;
    let fee_config = ctx.argument::<JsObject>(1)?;

    let linear_fee = parse_linear_fee_config(&mut ctx, &fee_config)?;

    let builder = RawTransferTransactionBuilder::from_incomplete(incomplete_hex, linear_fee)
        .chain_neon(
            &mut ctx,
            "Unable to deserialize raw transfer transaction hex",
        )?;

    builder.verify().chain_neon(
        &mut ctx,
        "Error when trying to verify raw transfer transaction",
    )?;

    Ok(ctx.undefined())
}

#[inline]
pub fn incomplete_builder_linear_fee_argument(
    ctx: &mut FunctionContext,
    i: i32,
) -> NeonResult<LinearFeeRawTransferTransactionBuilder> {
    let incomplete_builder = ctx.argument::<JsObject>(i)?;

    let incomplete_hex = incomplete_builder
        .get(ctx, "incompleteHex")?
        .downcast_or_throw::<JsBuffer, FunctionContext>(ctx)
        .chain_neon(ctx, "Unable to downcast incompleteHex")?;
    let incomplete_hex = incomplete_hex.borrow(&ctx.lock()).as_slice().to_vec();

    let fee_config = incomplete_builder
        .get(ctx, "feeConfig")?
        .downcast_or_throw::<JsObject, FunctionContext>(ctx)
        .chain_neon(ctx, "Unable to downcast feeConfig")?;
    let linear_fee = parse_linear_fee_config(ctx, &fee_config)?;

    RawTransferTransactionBuilder::from_incomplete(incomplete_hex, linear_fee)
        .chain_neon(ctx, "Unable to deserialize raw transfer transaction hex")
}

// #[cfg(feature = "mock")]
#[derive(Debug)]
struct MockTransactionCipher;

// #[cfg(feature = "mock")]
impl TransactionObfuscation for MockTransactionCipher {
    fn decrypt(
        &self,
        _transaction_ids: &[TxId],
        _private_key: &PrivateKey,
    ) -> Result<Vec<Transaction>> {
        unreachable!()
    }

    fn encrypt(&self, transaction: SignedTransaction) -> Result<TxAux> {
        let txpayload = transaction.encode();

        match transaction {
            SignedTransaction::TransferTransaction(tx, _) => {
                Ok(TxAux::EnclaveTx(TxEnclaveAux::TransferTx {
                    inputs: tx.inputs.clone(),
                    no_of_outputs: tx.outputs.len() as TxoIndex,
                    payload: TxObfuscated {
                        txid: [0; 32],
                        key_from: 0,
                        init_vector: [0u8; 12],
                        txpayload,
                    },
                }))
            }
            _ => unreachable!(),
        }
    }
}

pub fn register_transfer_transaction_module(ctx: &mut ModuleContext) -> NeonResult<()> {
    let js_object = JsObject::new(ctx);

    let build_incomplete_hex_linear_fee_fn = JsFunction::new(ctx, build_incomplete_hex_linear_fee)?;
    js_object.set(
        ctx,
        "buildIncompleteHexLinearFee",
        build_incomplete_hex_linear_fee_fn,
    )?;

    let sign_input_linear_fee_fn = JsFunction::new(ctx, sign_input_linear_fee)?;
    js_object.set(ctx, "signInputLinearFee", sign_input_linear_fee_fn)?;

    let is_completed_linear_fee_fn = JsFunction::new(ctx, is_completed_linear_fee)?;
    js_object.set(ctx, "isCompletedLinearFee", is_completed_linear_fee_fn)?;

    let verify_linear_fee_fn = JsFunction::new(ctx, verify_linear_fee)?;
    js_object.set(ctx, "verifyLinearFee", verify_linear_fee_fn)?;

    let to_hex_linear_fee_fn = JsFunction::new(ctx, to_hex_linear_fee)?;
    js_object.set(ctx, "toHexLinearFee", to_hex_linear_fee_fn)?;

    ctx.export_value("transferTransaction", js_object)
}
