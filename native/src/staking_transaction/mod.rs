use neon::prelude::*;

mod deposit_transaction;
mod unbond_transaction;
mod withdraw_unbonded_transaction;

use deposit_transaction::{build_raw_deposit_transaction, deposit_transaction_to_hex};
use unbond_transaction::{build_raw_unbond_transaction, unbond_transaction_to_hex};
use withdraw_unbonded_transaction::{
    build_raw_withdraw_unbonded_transaction, withdraw_unbonded_transaction_to_hex,
};

pub fn register_staking_transaction_module(ctx: &mut ModuleContext) -> NeonResult<()> {
    let js_object = JsObject::new(ctx);

    let build_raw_deposit_transaction_fn = JsFunction::new(ctx, build_raw_deposit_transaction)?;
    js_object.set(
        ctx,
        "buildRawDepositTransaction",
        build_raw_deposit_transaction_fn,
    )?;

    let deposit_transaction_to_hex_fn = JsFunction::new(ctx, deposit_transaction_to_hex)?;
    js_object.set(
        ctx,
        "depositTransactionToHex",
        deposit_transaction_to_hex_fn,
    )?;

    let build_raw_unbond_transaction_fn = JsFunction::new(ctx, build_raw_unbond_transaction)?;
    js_object.set(
        ctx,
        "buildRawUnbondTransaction",
        build_raw_unbond_transaction_fn,
    )?;

    let unbond_transaction_to_hex_fn = JsFunction::new(ctx, unbond_transaction_to_hex)?;
    js_object.set(ctx, "unbondTransactionToHex", unbond_transaction_to_hex_fn)?;

    let build_raw_withdraw_unbonded_transaction_fn =
        JsFunction::new(ctx, build_raw_withdraw_unbonded_transaction)?;
    js_object.set(
        ctx,
        "buildRawWithdrawUnbondedTransaction",
        build_raw_withdraw_unbonded_transaction_fn,
    )?;

    let withdraw_unbonded_transaction_to_hex_fn =
        JsFunction::new(ctx, withdraw_unbonded_transaction_to_hex)?;
    js_object.set(
        ctx,
        "withdrawUnbondedTransactionToHex",
        withdraw_unbonded_transaction_to_hex_fn,
    )?;

    ctx.export_value("stakingTransaction", js_object)
}
