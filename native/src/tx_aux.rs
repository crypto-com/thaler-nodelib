use neon::prelude::*;

// #[cfg(feature = "mock")]
use chain_core::tx::data::TxId;
// #[cfg(feature = "mock")]
use chain_core::tx::TxAux;
use chain_core::tx::{TransactionId, TxObfuscated};
// #[cfg(feature = "mock")]
use chain_core::tx::TxEnclaveAux;
// #[cfg(not(feature = "mock"))]
use client_common::tendermint::{RpcClient, WebsocketRpcClient};
use client_core::cipher::{DefaultTransactionObfuscation, TransactionObfuscation};
// #[cfg(feature = "mock-abci")]
use client_core::cipher::MockAbciTransactionObfuscation;
// #[cfg(feature = "mock")]
use client_common::{PrivateKey, Result, SignedTransaction, Transaction};

use parity_scale_codec::Encode;

use crate::common::Features;
use crate::error::ClientErrorNeonExt;

pub fn signed_transaction_to_hex<'a>(
    ctx: &mut FunctionContext<'a>,
    signed_transaction: SignedTransaction,
    tendermint_address: &str,
    features: Features,
) -> JsResult<'a, JsBuffer> {
    let tx_aux =
        signed_transaction_to_tx_aux(ctx, signed_transaction, tendermint_address, features)?;

    tx_aux_to_hex(ctx, tx_aux)
}

pub fn signed_transaction_to_tx_aux<'a>(
    ctx: &mut FunctionContext<'a>,
    signed_transaction: SignedTransaction,
    tendermint_address: &str,
    features: Features,
) -> NeonResult<TxAux> {
    match features {
        Features::AllDefault => to_tx_aux(ctx, signed_transaction, &tendermint_address),
        Features::MockAbci => to_mock_abci_tx_aux(ctx, signed_transaction, &tendermint_address),
        Features::MockObfuscation => to_mock_tx_aux(ctx, signed_transaction, &tendermint_address),
    }
}

pub fn tx_aux_to_hex<'a>(ctx: &mut FunctionContext<'a>, tx_aux: TxAux) -> JsResult<'a, JsBuffer> {
    let tx_aux = tx_aux.encode();

    let mut buffer = ctx.buffer(tx_aux.len() as u32)?;
    ctx.borrow_mut(&mut buffer, |data| {
        let slice = data.as_mut_slice();
        slice.copy_from_slice(&tx_aux);
    });
    Ok(buffer)
}

fn to_tx_aux(
    ctx: &mut FunctionContext,
    signed_transaction: SignedTransaction,
    tendermint_address: &str,
) -> NeonResult<TxAux> {
    if tendermint_address.starts_with("ws") {
        to_tx_aux_websocket(ctx, signed_transaction, tendermint_address)
    } else if tendermint_address.starts_with("http") {
        to_tx_aux_http(ctx, signed_transaction, tendermint_address)
    } else {
        ctx.throw_error("Unsupported Tendermint client protocol")
    }
}

fn to_tx_aux_websocket(
    ctx: &mut FunctionContext,
    signed_transaction: SignedTransaction,
    tendermint_address: &str,
) -> NeonResult<TxAux> {
    let tendermint_client = WebsocketRpcClient::new(&tendermint_address)
        .chain_neon(ctx, "Unable to create Tendermint client from address")?;

    let tx_obfuscation = DefaultTransactionObfuscation::from_tx_query(&tendermint_client)
        .chain_neon(
            ctx,
            "Unable to create transaction obfuscation from tx query address",
        )?;

    tx_obfuscation
        .encrypt(signed_transaction)
        .chain_neon(ctx, "Unable to encrypt transaction")
}

fn to_tx_aux_http(
    ctx: &mut FunctionContext,
    signed_transaction: SignedTransaction,
    tendermint_address: &str,
) -> NeonResult<TxAux> {
    let tendermint_client = RpcClient::new(&tendermint_address);

    let tx_obfuscation = DefaultTransactionObfuscation::from_tx_query(&tendermint_client)
        .chain_neon(
            ctx,
            "Unable to create transaction obfuscation from tx query address",
        )?;

    tx_obfuscation
        .encrypt(signed_transaction)
        .chain_neon(ctx, "Unable to encrypt transaction")
}

fn to_mock_abci_tx_aux(
    ctx: &mut FunctionContext,
    signed_transaction: SignedTransaction,
    tendermint_address: &str,
) -> NeonResult<TxAux> {
    if tendermint_address.starts_with("ws") {
        to_mock_abci_tx_aux_websocket(ctx, signed_transaction, tendermint_address)
    } else if tendermint_address.starts_with("http") {
        to_mock_abci_tx_aux_http(ctx, signed_transaction, tendermint_address)
    } else {
        ctx.throw_error("Unsupported Tendermint client protocol")
    }
}

fn to_mock_abci_tx_aux_websocket(
    ctx: &mut FunctionContext,
    signed_transaction: SignedTransaction,
    tendermint_address: &str,
) -> NeonResult<TxAux> {
    let tendermint_client = WebsocketRpcClient::new(&tendermint_address)
        .chain_neon(ctx, "Unable to create Tendermint client from address")?;

    let tx_obfuscation = MockAbciTransactionObfuscation::new(tendermint_client);

    tx_obfuscation
        .encrypt(signed_transaction)
        .chain_neon(ctx, "Unable to encrypt transaction")
}

fn to_mock_abci_tx_aux_http(
    ctx: &mut FunctionContext,
    signed_transaction: SignedTransaction,
    tendermint_address: &str,
) -> NeonResult<TxAux> {
    let tendermint_client = RpcClient::new(&tendermint_address);

    let tx_obfuscation = MockAbciTransactionObfuscation::new(tendermint_client);

    tx_obfuscation
        .encrypt(signed_transaction)
        .chain_neon(ctx, "Unable to encrypt transaction")
}

fn to_mock_tx_aux(
    ctx: &mut FunctionContext,
    signed_transaction: SignedTransaction,
    _: &str,
) -> NeonResult<TxAux> {
    let tx_obfuscation = MockTransactionCipher;

    tx_obfuscation
        .encrypt(signed_transaction)
        .chain_neon(ctx, "Unable to encrypt transaction")
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
            SignedTransaction::DepositStakeTransaction(tx, _) => {
                Ok(TxAux::EnclaveTx(TxEnclaveAux::DepositStakeTx {
                    tx: tx.clone(),
                    payload: TxObfuscated {
                        txid: tx.id(),
                        key_from: 0,
                        init_vector: [0u8; 12],
                        txpayload,
                    },
                }))
            }
            SignedTransaction::WithdrawUnbondedStakeTransaction(tx, _, witness) => {
                Ok(TxAux::EnclaveTx(TxEnclaveAux::WithdrawUnbondedStakeTx {
                    no_of_outputs: tx.outputs.len() as u16,
                    witness,
                    payload: TxObfuscated {
                        txid: tx.id(),
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
