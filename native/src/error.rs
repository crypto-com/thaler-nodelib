use std::fmt::Display;

use neon::prelude::*;

pub trait ClientErrorNeonExt<T> {
    /// Adds given error kind and message to source error
    fn chain_neon<'a, C, M>(self, ctx: &mut C, message: M) -> NeonResult<T>
    where
        C: Context<'a>,
        M: Display;
}

impl<T, E> ClientErrorNeonExt<T> for Result<T, E>
where
    E: Display,
{
    #[inline]
    fn chain_neon<'a, C, M>(self, ctx: &mut C, message: M) -> NeonResult<T>
    where
        C: Context<'a>,
        M: Display,
    {
        match self {
            Err(err) => ctx.throw_error(format!("{}: {}", message, err)),
            Ok(v) => Ok(v),
        }
    }
}
