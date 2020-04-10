use neon::prelude::*;

mod node_join_transaction;
mod unjail_transaction;

use node_join_transaction::{build_raw_node_join_transaction, node_join_transaction_to_hex};
use unjail_transaction::{
    build_raw_unjail_transaction, unjail_transaction_to_hex, verify_unjail_tx_aux,
};

pub fn register_council_node_transaction_module(ctx: &mut ModuleContext) -> NeonResult<()> {
    let js_object = JsObject::new(ctx);

    let build_raw_node_join_transaction_fn = JsFunction::new(ctx, build_raw_node_join_transaction)?;
    js_object.set(
        ctx,
        "buildRawNodeJoinTransaction",
        build_raw_node_join_transaction_fn,
    )?;

    let node_join_transaction_to_hex_fn = JsFunction::new(ctx, node_join_transaction_to_hex)?;
    js_object.set(
        ctx,
        "nodeJoinTransactionToHex",
        node_join_transaction_to_hex_fn,
    )?;

    let build_raw_unjail_transaction_fn = JsFunction::new(ctx, build_raw_unjail_transaction)?;
    js_object.set(
        ctx,
        "buildRawUnjailTransaction",
        build_raw_unjail_transaction_fn,
    )?;

    let unjail_transaction_to_hex_fn = JsFunction::new(ctx, unjail_transaction_to_hex)?;
    js_object.set(ctx, "unjailTransactionToHex", unjail_transaction_to_hex_fn)?;

    let verify_unjail_tx_aux_fn = JsFunction::new(ctx, verify_unjail_tx_aux)?;
    js_object.set(ctx, "verifyUnjailTxAux", verify_unjail_tx_aux_fn)?;

    ctx.export_value("councilNodeTransaction", js_object)
}
