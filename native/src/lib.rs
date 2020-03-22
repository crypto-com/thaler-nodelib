use neon::register_module;

mod address;
mod common;
mod council_node_transaction;
mod error;
mod function_types;
mod hd_wallet;
mod key_pair;
mod signer;
mod staking_transaction;
mod transfer_transaction;
mod tx_aux;

use address::register_address_module;
use council_node_transaction::register_council_node_transaction_module;
use hd_wallet::register_hd_wallet_module;
use key_pair::register_key_pair_module;
use signer::register_signer_module;
use staking_transaction::register_staking_transaction_module;
use transfer_transaction::register_transfer_transaction_module;

register_module!(mut ctx, {
    register_address_module(&mut ctx)?;
    register_council_node_transaction_module(&mut ctx)?;
    register_hd_wallet_module(&mut ctx)?;
    register_key_pair_module(&mut ctx)?;
    register_signer_module(&mut ctx)?;
    register_staking_transaction_module(&mut ctx)?;
    register_transfer_transaction_module(&mut ctx)?;

    Ok(())
});
