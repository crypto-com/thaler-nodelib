use neon::register_module;

mod address;
mod common;
mod error;
mod function_types;
mod key_pair;
mod transfer_transaction;

use address::register_address_module;
use key_pair::register_key_pair_module;
use transfer_transaction::register_transfer_transaction_module;

register_module!(mut ctx, {
    register_address_module(&mut ctx)?;
    register_key_pair_module(&mut ctx)?;
    register_transfer_transaction_module(&mut ctx)?;

    Ok(())
});
