use neon::register_module;

mod error;
mod key_pair;
mod address;
mod argument_types;

use key_pair::register_key_pair_module;
use address::register_address_module;

register_module!(mut ctx, {
    register_key_pair_module(&mut ctx)?;
    register_address_module(&mut ctx)?;

    Ok(())
});
