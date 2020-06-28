mod builder_options;

use chain_core::state::tendermint::BlockHeight;
use chain_core::tx::data::access::{TxAccess, TxAccessPolicy};
use chain_core::tx::data::attribute::TxAttributes;
use chain_core::tx::data::input::TxoSize;
use chain_core::tx::data::TxId;
use chain_core::tx::fee::LinearFee;
use chain_core::tx::witness::TxInWitness;
use chain_core::tx::{TransactionId, TxAux, TxEnclaveAux, TxObfuscated};
use client_common::tendermint::WebsocketRpcClient;
use client_common::{PrivateKey, Result, SignedTransaction, Transaction};
use client_core::cipher::{
    mock::MockAbciTransactionObfuscation, DefaultTransactionObfuscation, TransactionObfuscation,
};
// use client_core::signer::{KeyPairSigner, Signer};
use client_core::transaction_builder::RawTransferTransactionBuilder;
use gcd::Gcd;
use neon::prelude::*;
use parity_scale_codec::{Decode, Encode};

use crate::common::Features;
use crate::error::ClientErrorNeonExt;
use crate::function_types::*;
use crate::signer::KeyPairSigner;

use builder_options::{BuilderOptions, LinearFeeBuilderOptions};

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
        TxAttributes::new_with_access(options.raw_tx_options.chain_hex_id, access_policies);

    let mut builder = RawTransferTransactionBuilder::new(attributes, options.fee_algorithm);

    for input in options.raw_tx_options.inputs.iter() {
        let address_params = &input.address_params;
        builder.add_input(
            input.prev_output.clone(),
            transfer_address_leaves(
                address_params.total_signers,
                address_params.required_signers,
            ),
        );
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

fn transfer_address_leaves(total_signers: u64, required_signers: u64) -> u16 {
    let mut n = total_signers;
    let mut d = 1;
    let mut result = 1;
    while d <= required_signers {
        let gcd = result.gcd(d);
        result /= gcd;
        let t = n / (d / gcd);
        result *= t;
        d += 1;
        n -= 1;
    }
    result as u16
}

/// Add witness to a particular input
pub fn add_input_witness_linear_fee(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let mut builder = incomplete_builder_linear_fee_argument(&mut ctx, 0)?;
    let input_index = ctx.argument::<JsNumber>(1)?.to_string(&mut ctx)?.value();
    let mut witness = ctx.argument::<JsBuffer>(2)?;
    let mut witness = witness.borrow_mut(&ctx.lock()).as_slice();
    let witness = TxInWitness::decode(&mut witness)
        .chain_neon(&mut ctx, "Unable to decode raw witness bytes")?;

    let input_index = input_index
        .parse::<usize>()
        .chain_neon(&mut ctx, "Unable to deserialize input index")?;

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

/// Sign a particular input with the provided KeyPair
pub fn sign_input_linear_fee(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let mut builder = incomplete_builder_linear_fee_argument(&mut ctx, 0)?;
    let input_index = ctx.argument::<JsNumber>(1)?.to_string(&mut ctx)?.value();
    let (private_key, public_key) = key_pair_argument(&mut ctx, 2)?;

    let input_index = input_index
        .parse::<usize>()
        .chain_neon(&mut ctx, "Unable to deserialize input index")?;

    let signer = KeyPairSigner::new(private_key, public_key)
        .chain_neon(&mut ctx, "Unable to create KeyPair signer")?;
    let witness = signer
        .schnorr_sign_txid(&builder.tx_id())
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

/// Returns transaction Id of builder
pub fn tx_id_linear_fee(mut ctx: FunctionContext) -> JsResult<JsString> {
    let builder = incomplete_builder_linear_fee_argument(&mut ctx, 0)?;

    let tx_id = builder.tx_id();
    let tx_id = hex::encode(tx_id);

    Ok(ctx.string(tx_id))
}

/// Returns the estimated fee of builder
pub fn estimate_fee_linear_fee(mut ctx: FunctionContext) -> JsResult<JsString> {
    let builder = incomplete_builder_linear_fee_argument(&mut ctx, 0)?;

    let estimated_fee = builder
        .estimate_fee()
        .chain_neon(&mut ctx, "Unable to estimate transaction fee")?;
    let estimated_fee = serde_json::to_string(&estimated_fee)
        .chain_neon(&mut ctx, "Unable to serialize estimated fee to string")?;

    Ok(ctx.string(estimated_fee.trim_matches('"')))
}

/// Finish the transaction and export to broadcast-able hex
pub fn to_hex_linear_fee(mut ctx: FunctionContext) -> JsResult<JsBuffer> {
    let builder = incomplete_builder_linear_fee_argument(&mut ctx, 0)?;
    let tendermint_address = ctx.argument::<JsString>(1)?.value();
    let features = Features::argument(&mut ctx, 2)?;

    let tx_aux_result = match features {
        Features::AllDefault => to_tx_aux_linear_fee(&mut ctx, &builder, &tendermint_address),
        Features::MockAbci => {
            to_mock_abci_tx_aux_linear_fee(&mut ctx, &builder, &tendermint_address)
        }
        Features::MockObfuscation => {
            to_mock_tx_aux_linear_fee(&mut ctx, &builder, &tendermint_address)
        }
    };
    let value = tx_aux_result?.encode();

    let mut buffer = ctx.buffer(value.len() as u32)?;
    ctx.borrow_mut(&mut buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&value);
    });
    Ok(buffer)
}

fn to_tx_aux_linear_fee(
    ctx: &mut FunctionContext,
    builder: &LinearFeeRawTransferTransactionBuilder,
    tendermint_address: &str,
) -> NeonResult<TxAux> {
    if tendermint_address.starts_with("ws") {
        to_tx_aux_websocket_linear_fee(ctx, builder, tendermint_address)
    } else {
        ctx.throw_error("Unsupported Tendermint client protocol")
    }
}

fn to_tx_aux_websocket_linear_fee(
    ctx: &mut FunctionContext,
    builder: &LinearFeeRawTransferTransactionBuilder,
    tendermint_address: &str,
) -> NeonResult<TxAux> {
    let tendermint_client = WebsocketRpcClient::new(&tendermint_address)
        .chain_neon(ctx, "Unable to create Tendermint client from address")?;

    let tx_obfuscation = DefaultTransactionObfuscation::from_tx_query(&tendermint_client)
        .chain_neon(
            ctx,
            "Unable to create transaction obfuscation from tx query address",
        )?;

    builder
        .to_tx_aux(tx_obfuscation)
        .chain_neon(ctx, "Unable to finish transaction")
}

fn to_mock_abci_tx_aux_linear_fee(
    ctx: &mut FunctionContext,
    builder: &LinearFeeRawTransferTransactionBuilder,
    tendermint_address: &str,
) -> NeonResult<TxAux> {
    if tendermint_address.starts_with("ws") {
        to_mock_abci_tx_aux_websocket_linear_fee(ctx, builder, tendermint_address)
    } else {
        ctx.throw_error("Unsupported Tendermint client protocol")
    }
}

fn to_mock_abci_tx_aux_websocket_linear_fee(
    ctx: &mut FunctionContext,
    builder: &LinearFeeRawTransferTransactionBuilder,
    tendermint_address: &str,
) -> NeonResult<TxAux> {
    let tendermint_client = WebsocketRpcClient::new(&tendermint_address)
        .chain_neon(ctx, "Unable to create Tendermint client from address")?;

    let tx_obfuscation = MockAbciTransactionObfuscation::new(tendermint_client);

    builder
        .to_tx_aux(tx_obfuscation)
        .chain_neon(ctx, "Unable to finish transaction")
}

fn to_mock_tx_aux_linear_fee(
    ctx: &mut FunctionContext,
    builder: &LinearFeeRawTransferTransactionBuilder,
    _: &str,
) -> NeonResult<TxAux> {
    let tx_obfuscation = MockTransactionCipher;

    builder
        .to_tx_aux(tx_obfuscation)
        .chain_neon(ctx, "Unable to finish transaction")
}

/// Verify the provided incomplete RawTransferTransaction hex is a valid
/// transaction to be broadcasted
pub fn verify_linear_fee(mut ctx: FunctionContext) -> JsResult<JsUndefined> {
    let builder = incomplete_builder_linear_fee_argument(&mut ctx, 0)?;

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
    let linear_fee = parse_linear_fee_config(ctx, fee_config)?;

    RawTransferTransactionBuilder::from_incomplete(incomplete_hex, linear_fee)
        .chain_neon(ctx, "Unable to deserialize raw transfer transaction hex")
}

// #[cfg(feature = "mock")]
#[derive(Debug, Clone)]
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
                    no_of_outputs: tx.outputs.len() as TxoSize,
                    payload: TxObfuscated {
                        txid: tx.id(),
                        key_from: BlockHeight::new(0),
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

    let add_input_witness_linear_fee_fn = JsFunction::new(ctx, add_input_witness_linear_fee)?;
    js_object.set(
        ctx,
        "addInputWitnessLinearFee",
        add_input_witness_linear_fee_fn,
    )?;

    let is_completed_linear_fee_fn = JsFunction::new(ctx, is_completed_linear_fee)?;
    js_object.set(ctx, "isCompletedLinearFee", is_completed_linear_fee_fn)?;

    let tx_id_linear_fee_fn = JsFunction::new(ctx, tx_id_linear_fee)?;
    js_object.set(ctx, "txIdLinearFee", tx_id_linear_fee_fn)?;

    let verify_linear_fee_fn = JsFunction::new(ctx, verify_linear_fee)?;
    js_object.set(ctx, "verifyLinearFee", verify_linear_fee_fn)?;

    let to_hex_linear_fee_fn = JsFunction::new(ctx, to_hex_linear_fee)?;
    js_object.set(ctx, "toHexLinearFee", to_hex_linear_fee_fn)?;

    let estimate_fee_linear_fee_fn = JsFunction::new(ctx, estimate_fee_linear_fee)?;
    js_object.set(ctx, "estimateFeeLinearFee", estimate_fee_linear_fee_fn)?;

    ctx.export_value("transferTransaction", js_object)
}
