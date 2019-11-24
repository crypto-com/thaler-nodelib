use std::fmt::Display;

use neon::prelude::*;

pub trait ClientErrorNeonExt<T> {
    /// Adds given error kind and message to source error
    fn chain_neon<'a, C>(self, ctx: &mut C) -> NeonResult<T>
    where
        C: Context<'a>;
}

impl<T, E> ClientErrorNeonExt<T> for Result<T, E>
where
    E: Display
{
    #[inline]
    fn chain_neon<'a, C>(self, ctx: &mut C) -> NeonResult<T>
    where
        C: Context<'a>,
    {
        match self {
           Err(err) => ctx.throw_error(err.to_string()),
           Ok(v) => Ok(v),
        }
    }
}
