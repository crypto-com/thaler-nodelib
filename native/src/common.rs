use neon::prelude::*;

pub fn does_js_object_has_prop(
    ctx: &mut FunctionContext,
    obj: &JsObject,
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

    return Ok(false);
}
