import ow from 'ow';

export const owMultiSigSessionNotEmpty = ow.buffer.validate(
    (session: Buffer) => ({
        validator: session.length > 0,
        message: 'Expected session to be not emtpy',
    }),
);
