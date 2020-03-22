use neon::prelude::*;

// TODO: Use feature conditional compilation when ready
// https://github.com/neon-bindings/neon/issues/471
#[derive(Debug)]
pub enum Features {
    AllDefault,
    MockAbci,
    MockObfuscation,
}

impl Features {
    pub fn argument(ctx: &mut FunctionContext, i: i32) -> NeonResult<Features> {
        let features = ctx.argument::<JsString>(i)?.value();
        match features.as_str() {
            "AllDefault" => Ok(Features::AllDefault),
            "MockAbci" => Ok(Features::MockAbci),
            "MockObfuscation" => Ok(Features::MockObfuscation),
            _ => ctx.throw_error("Unrecognized features"),
        }
    }
}

pub fn does_js_object_has_prop(
    ctx: &mut FunctionContext,
    obj: Handle<JsObject>,
    target_prop: &str,
) -> NeonResult<bool> {
    let prop_names = obj.get_own_property_names(ctx)?.to_vec(ctx)?;

    for prop in prop_names.iter() {
        if prop
            .downcast_or_throw::<JsString, FunctionContext>(ctx)?
            .value()
            == target_prop
        {
            return Ok(true);
        }
    }

    Ok(false)
}
