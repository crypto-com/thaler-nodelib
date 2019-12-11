use std::convert::TryFrom;
use std::str::FromStr;

use chain_core::common::{Timespec, HASH_SIZE_256};
use chain_core::init::address::CroAddress;
use chain_core::init::coin::Coin;
use chain_core::init::network::Network;
use chain_core::tx::data::access::{TxAccess, TxAccessPolicy};
use chain_core::tx::data::address::ExtendedAddr;
use chain_core::tx::data::attribute::TxAttributes;
use chain_core::tx::data::input::{TxoIndex, TxoPointer};
use chain_core::tx::data::output::TxOut;
use chain_core::tx::data::TxId;
use chain_core::tx::fee::{FeeAlgorithm, LinearFee, Milli};
use chain_core::tx::{TxAux, TxObfuscated};
// #[cfg(feature = "mock")]
use chain_core::tx::TxEnclaveAux;
// #[cfg(not(feature = "mock"))]
use client_core::cipher::DefaultTransactionObfuscation;
// #[cfg(feature = "mock")]
use client_core::cipher::TransactionObfuscation;
// #[cfg(feature = "mock")]
use client_common::{PrivateKey, PublicKey, Result};
use client_common::{SignedTransaction, Transaction};
use client_core::signer::{KeyPairSigner, Signer};
use client_core::transaction_builder::RawTransferTransactionBuilder;
use neon::prelude::*;
use parity_scale_codec::Encode;

use crate::common::does_js_object_has_prop;
use crate::error::ClientErrorNeonExt;
use crate::function_types::*;

type LinearFeeBuilderOptions = BuilderOptions<LinearFee>;

type LinearFeeRawTransferTransactionBuilder = RawTransferTransactionBuilder<LinearFee>;

/*
    // TODO: Use feature conditional compilation when ready
    // https://github.com/neon-bindings/neon/issues/471
    let is_mock = ctx.argument::<JsBoolean>(0)?.value();

    let tx_obfuscation = if is_mock {
        get_tx_obfuscation(ctx, options.tx_query_address)
    } else {
        get_mock_tx_obfuscation(ctx, options.raw_tx_options)
    };
*/

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

pub fn is_completed_linear_fee(mut ctx: FunctionContext) -> JsResult<JsBoolean> {
    let builder = incomplete_builder_linear_fee_argument(&mut ctx, 0)?;

    Ok(ctx.boolean(builder.is_completed()))
}

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

#[derive(Debug)]
struct RawTransactionOptions {
    inputs: Vec<(TxoPointer, TxOut)>,
    outputs: Vec<TxOut>,
    view_keys: Vec<PublicKey>,
    chain_id: u8,
}

#[derive(Debug)]
struct BuilderOptions<F>
where
    F: FeeAlgorithm,
{
    raw_tx_options: RawTransactionOptions,
    fee_algorithm: F,
}

impl<F> BuilderOptions<F>
where
    F: FeeAlgorithm,
{
    fn parse_linear_fee_fn_ctx(ctx: &mut FunctionContext) -> NeonResult<LinearFeeBuilderOptions> {
        let options = ctx.argument::<JsObject>(0)?;

        let raw_tx_options = BuilderOptions::<LinearFee>::parse_raw_tx_options(ctx, &options)?;
        println!("Raw Tx Options {:#?}", raw_tx_options);

        let fee_config = options
            .get(ctx, "feeConfig")?
            .downcast_or_throw::<JsObject, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast feeConfig")?;
        let fee_algorithm = parse_linear_fee_config(ctx, &fee_config)?;
        println!("Linear Fee {:#?}", fee_algorithm);

        Ok(BuilderOptions {
            raw_tx_options,
            fee_algorithm,
        })
    }

    // fn parse_fn_ctx(&mut ctx: FunctionContext) -> NeonResult<BuilderOptions> {
    fn parse_raw_tx_options(
        ctx: &mut FunctionContext,
        options: &JsObject,
    ) -> NeonResult<RawTransactionOptions> {
        // let options = ctx.argument::<JsObject>(0)?;

        let chain_id = options
            .get(ctx, "chainId")?
            .downcast_or_throw::<JsString, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast chainId")?
            .value();
        let network = get_network_from_chain_id(&chain_id);
        let chain_id = BuilderOptions::<F>::parse_chain_id(ctx, &chain_id)?;

        let inputs = options
            .get(ctx, "inputs")?
            .downcast_or_throw::<JsArray, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast inputs")?
            .to_vec(ctx)?;
        let inputs = inputs
            .iter()
            .map(|&input| {
                let input = input
                    .downcast_or_throw::<JsObject, FunctionContext>(ctx)
                    .chain_neon(ctx, "Unable to downcast input")?;
                BuilderOptions::<F>::parse_input(ctx, &input, &network)
            })
            .collect::<NeonResult<Vec<(TxoPointer, TxOut)>>>()?;

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
                BuilderOptions::<F>::parse_output(ctx, &output, &network)
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
                BuilderOptions::<F>::parse_view_key(ctx, &view_key)
            })
            .collect::<NeonResult<Vec<PublicKey>>>()?;

        Ok(RawTransactionOptions {
            inputs,
            outputs,
            view_keys,
            chain_id,
        })
    }

    fn parse_chain_id(ctx: &mut FunctionContext, chain_id: &str) -> NeonResult<u8> {
        if chain_id.len() != 2 {
            return ctx.throw_error("Chain id must be 2 hex characters");
        }

        Ok(chain_id.as_bytes()[0])
    }

    fn parse_input(
        ctx: &mut FunctionContext,
        input: &JsObject,
        network: &Network,
    ) -> NeonResult<(TxoPointer, TxOut)> {
        let prev_txid = input
            .get(ctx, "prevTxId")?
            .downcast_or_throw::<JsString, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast prevTxId in input")?
            .value();
        let prev_txid = txid_from_str(ctx, &prev_txid)?;

        let prev_index = input
            .get(ctx, "prevIndex")?
            .downcast_or_throw::<JsNumber, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast prevIndex in input")?
            .value();

        let txo_pointer = TxoPointer {
            id: prev_txid,
            index: prev_index as TxoIndex,
        };

        let tx_out = input
            .get(ctx, "prevOutput")?
            .downcast_or_throw::<JsObject, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast prevOutput in input")?;
        let tx_out = BuilderOptions::<F>::parse_output(ctx, &tx_out, &network)?;

        Ok((txo_pointer, tx_out))
    }

    fn parse_output(
        ctx: &mut FunctionContext,
        output: &JsObject,
        network: &Network,
    ) -> NeonResult<TxOut> {
        let address = output
            .get(ctx, "address")?
            .downcast_or_throw::<JsString, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast address in output")?
            .value();
        let address = ExtendedAddr::from_cro(&address, *network)
            .chain_neon(ctx, "Unable to deserialize output address to CRO address")?;

        let value = output
            .get(ctx, "value")?
            .downcast_or_throw::<JsString, FunctionContext>(ctx)
            .chain_neon(ctx, "Unable to downcast value in output")?
            .value();
        let value =
            Coin::from_str(&value).chain_neon(ctx, "Unable to deserialize output Coin value")?;

        let valid_from = if does_js_object_has_prop(ctx, &output, "validFrom")? {
            let value = output
                .get(ctx, "validFrom")?
                .downcast_or_throw::<JsNumber, FunctionContext>(ctx)
                .chain_neon(ctx, "Unable to downcast validFrom in output")?
                .value();
            Some(value as Timespec)
        } else {
            None
        };

        Ok(TxOut {
            address,
            value,
            valid_from,
        })
    }

    fn parse_view_key(ctx: &mut FunctionContext, view_key: &JsBuffer) -> NeonResult<PublicKey> {
        let view_key = view_key.borrow(&ctx.lock()).as_slice();

        let view_key = hex::encode_upper(view_key);

        PublicKey::from_str(&view_key).chain_neon(ctx, "Unable to deserialize view key")
    }
}

fn parse_linear_fee_config(
    ctx: &mut FunctionContext,
    fee_config: &JsObject,
) -> NeonResult<LinearFee> {
    let algorithm = fee_config
        .get(ctx, "algorithm")?
        .downcast_or_throw::<JsString, FunctionContext>(ctx)
        .chain_neon(ctx, "Unable to deserialize algorithm in feeConfig")?
        .value();

    if algorithm != "LinearFee" {
        return ctx.throw_error(format!("Expected LinearFee but got {}", algorithm));
    }

    let constant = fee_config
        .get(ctx, "constant")?
        .downcast_or_throw::<JsString, FunctionContext>(ctx)
        .chain_neon(ctx, "Unable to deserialize constant in LinearFee config")?
        .value();
    let constant =
        Milli::from_str(&constant).chain_neon(ctx, "Invalid constant config in LinearFee")?;
    let coefficient = fee_config
        .get(ctx, "coefficient")?
        .downcast_or_throw::<JsString, FunctionContext>(ctx)
        .chain_neon(ctx, "Unable to deserialize coefficient in LinearFee config")?
        .value();
    let coefficient =
        Milli::from_str(&coefficient).chain_neon(ctx, "Invalid coefficient config in LinearFee")?;

    Ok(LinearFee::new(constant, coefficient))
}

fn txid_from_str(ctx: &mut FunctionContext, txid: &str) -> NeonResult<TxId> {
    let txid = hex::decode(txid).chain_neon(ctx, "Unable to deserialize TxId")?;

    if txid.len() != HASH_SIZE_256 {
        return ctx.throw_error("TxId should be 32 bytes long");
    }

    let mut out = [0u8; HASH_SIZE_256];
    out.copy_from_slice(txid.as_slice());

    Ok(out)
}

pub fn register_transfer_transaction_module(ctx: &mut ModuleContext) -> NeonResult<()> {
    let js_object = JsObject::new(ctx);

    let build_incomplete_hex_linear_fee_fn = JsFunction::new(ctx, build_incomplete_hex_linear_fee)?;
    js_object.set(
        ctx,
        "buildIncompleteHexLinearFee",
        build_incomplete_hex_linear_fee_fn,
    )?;

    let verify_linear_fee_fn = JsFunction::new(ctx, verify_linear_fee)?;
    js_object.set(ctx, "verifyLinearFee", verify_linear_fee_fn)?;

    let verify_linear_fee_fn = JsFunction::new(ctx, verify_linear_fee)?;
    js_object.set(ctx, "verifyLinearFee", verify_linear_fee_fn)?;

    let sign_input_linear_fee_fn = JsFunction::new(ctx, sign_input_linear_fee)?;
    js_object.set(ctx, "signInputLinearFee", sign_input_linear_fee_fn)?;

    let is_completed_linear_fee_fn = JsFunction::new(ctx, is_completed_linear_fee)?;
    js_object.set(ctx, "isCompletedLinearFee", is_completed_linear_fee_fn)?;

    ctx.export_value("transferTransaction", js_object)
}
