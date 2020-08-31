import ow from 'ow';

import { KeyPair } from '../key_pair';
import { owKeyPair } from '../key_pair/types';
import { owMultiSigSessionNotEmpty } from './owTypes';

const native = require('../../../native');

type PublicKey = Buffer;
/**
 * MultiSig session and its methods
 * @class MultiSigSession
 */
export class MultiSigSession {
    // 32 bytes message for session creation. E.g. fund tx hash
    public message: string;

    // self keyPair
    private keyPair: KeyPair;

    // all parties' public keys, self ones and coSigners' public keys
    private signerPublicKeys: Array<PublicKey> = [];

    // current session, could be complete or incomplete
    private session: Buffer;

    // self nonce commitment
    public nonceCommitment?: Buffer;

    // local cache for the already added co-signer's commitments
    private coSignerNonceCommitments: Array<Buffer> = [];

    // current nonce
    public nonce?: Buffer;

    // local cache for the already added co-signer's nonces
    private coSignerNonces: Array<Buffer> = [];

    // session's own partial signature, will be passed to co-signers
    public partialSignature?: Buffer;

    // local cache for the already added co-signer's signatures
    private coSignerSignatures: Array<Buffer> = [];

    // session's final signature
    public signature?: Buffer;

    constructor(
        message: string,
        selfKeyPair: KeyPair,
        signerPublicKeys: Array<PublicKey>,
    ) {
        ow(message, ow.string.not.empty);
        this.message = message;

        ow(selfKeyPair, 'KeyPair', owKeyPair);
        this.keyPair = selfKeyPair;

        ow(signerPublicKeys, ow.array.minLength(2).ofType(ow.buffer));
        this.signerPublicKeys = signerPublicKeys;

        this.session = native.multiSig.newSession(
            this.message,
            this.signerPublicKeys,
            this.keyPair.publicKey,
            this.keyPair.privateKey,
        );
    }

    /**
     * return current multi-sig session
     *
     * @param message message for new session, e.g. fund tx
     * @returns {session}
     * @throws session to be not emtpy
     * @memberof MultiSigSession
     */
    public getRawSession(): Buffer {
        ow(this.session, 'session', owMultiSigSessionNotEmpty);
        return this.session;
    }

    /**
     * return the message in current session
     *
     * @param message message for new session, e.g. fund tx
     * @returns {message}
     * @throws message to be not emtpy
     * @memberof MultiSigSession
     */
    public getMessage(): string {
        ow(this.message, 'message', ow.string.not.empty);
        return this.message;
    }

    /**
     * generate self nonce commitment
     *
     * @returns {nonceCommitment}
     * @memberof MultiSigSession
     */
    public generateNonceCommitment(): Buffer {
        const {
            nonceCommitment,
            incompleteSession,
        } = native.multiSig.generateNonceCommitment(this.session);

        this.nonceCommitment = nonceCommitment;
        this.session = incompleteSession;

        return this.nonceCommitment!;
    }

    /**
     * add co-signer's nonce commitment to current session
     *
     * @param coSignerPublicKey external co-signer's publickey
     * @param coSignerNonceCommitment external co-signer's nonce commitment
     * @throws coSignerNonceCommitment should be Buffer
     * @returns {session} session after add other nonce commitment
     * @memberof MultiSigSession
     */
    public addNonceCommitment(
        coSignerPublicKey: Buffer,
        coSignerNonceCommitment: Buffer,
    ): Buffer {
        ow(coSignerNonceCommitment, ow.buffer);

        if (this.hasThisSignerNonceCommitment(coSignerNonceCommitment)) {
            throw new Error(
                "This co-signer's nonce commitment has already been added",
            );
        }

        this.session = native.multiSig.addNonceCommitment(
            this.session,
            coSignerPublicKey,
            coSignerNonceCommitment,
        );
        this.coSignerNonceCommitments.push(coSignerNonceCommitment);

        return this.session!;
    }

    /**
     * generate self nonce, noted that it can only be taken after collected all nonce commitments
     *
     * @returns {nonce}
     * @throws should collect all nonce commitments before calling generateNonce
     * @memberof MultiSigSession
     */
    public generateNonce(): Buffer {
        if (!this.hasCollectedAllNonceCommitments()) {
            throw new Error(
                "Nonce can be generated only after all co-signer's nonce commitment are added",
            );
        }

        const { nonce, incompleteSession } = native.multiSig.generateNonce(
            this.session,
        );

        this.nonce = nonce;
        this.session = incompleteSession;

        return this.nonce!;
    }

    /**
     * add co-signer's nonce to current session
     *
     * @param coSignerPublicKey external co-signer's publickey
     * @param coSignerNonce external co-signer's nonce
     * @throws public key and nonce should be buffer
     * @throws the nonce has already been added
     * @returns {session} session after add other nonce commitment
     * @memberof MultiSigSession
     */
    public addNonce(coSignerPublicKey: Buffer, coSignerNonce: Buffer): Buffer {
        ow(coSignerPublicKey, ow.buffer);
        ow(coSignerNonce, ow.buffer);

        if (this.hasThisSignerNonce(coSignerNonce)) {
            throw new Error("This co-signer's nonce has already been added");
        }

        this.session = native.multiSig.addNonce(
            this.session,
            coSignerPublicKey,
            coSignerNonce,
        );
        this.coSignerNonces.push(coSignerNonce);

        return this.session!;
    }

    /**
     * generate partial signature, noted that it can only be taken after collected all nonces
     *
     * @returns {partialSignature}
     * @throws should collect all nonce before calling partialSign
     * @memberof MultiSigSession
     */
    public partialSign(): Buffer {
        if (!this.hasColletedAllNonces()) {
            throw new Error(
                "Session can be partially signed only after all co-signer's nonces are added",
            );
        }

        const {
            partialSignature,
            incompleteSession,
        } = native.multiSig.partialSign(this.session);

        this.partialSignature = partialSignature;
        this.session = incompleteSession;

        return this.partialSignature!;
    }

    /**
     * add co-signer's partial signature to current session
     *
     * @param coSignerPublicKey external co-signer's publickey
     * @param coSignerSignature external co-signer's partial signature
     * @throws public key and signature should be buffer
     * @throws the partial signature has already been added
     * @returns {session} session after add other nonce commitment
     * @memberof MultiSigSession
     */
    public addPartialSignature(
        coSignerPublicKey: Buffer,
        coSignerSignature: Buffer,
    ): Buffer {
        ow(coSignerPublicKey, ow.buffer);
        ow(coSignerSignature, ow.buffer);

        if (this.hasThisSignerSignature(coSignerSignature)) {
            throw new Error(
                "This co-signer's signature has already been added",
            );
        }

        this.session = native.multiSig.addPartialSignature(
            this.session,
            coSignerPublicKey,
            coSignerSignature,
        );
        this.coSignerSignatures.push(coSignerSignature);

        return this.session!;
    }

    /**
     * generate final signature, noted that it can only be taken after collected all partial signatures
     *
     * @returns {signature}
     * @throws should collect all partial signature before calling sign
     * @memberof MultiSigSession
     */
    public sign(): Buffer {
        if (!this.hasColletedAllPartialSignatures()) {
            throw new Error(
                "Session can be final signed only after all co-signer's partial signatures are added",
            );
        }

        this.signature = native.multiSig.sign(this.session);

        return this.signature!;
    }

    /**
     * verify the final external signature or self is valid or not
     *
     * @param signature external signature
     * @throws self signature is not ready for verification
     * @returns {boolean}
     * @memberof MultiSigSession
     */
    public verify(_signature?: Buffer): boolean {
        let signature = _signature;
        if (!_signature) {
            if (!this.signature) {
                throw new Error(
                    'Current signature is not ready for verification',
                );
            }
            signature = this.signature;
        }

        return native.multiSig.verify(
            signature,
            this.message,
            this.signerPublicKeys,
        );
    }

    private hasThisSignerNonceCommitment(nc: Buffer): boolean {
        return this.coSignerNonceCommitments.indexOf(nc) > -1;
    }

    private hasThisSignerNonce(n: Buffer): boolean {
        return this.coSignerNonces.indexOf(n) > -1;
    }

    private hasThisSignerSignature(s: Buffer): boolean {
        return this.coSignerSignatures.indexOf(s) > -1;
    }

    private hasCollectedAllNonceCommitments(): boolean {
        return (
            this.coSignerNonceCommitments.length ===
            this.totalExternalCoSigners()
        );
    }

    private hasColletedAllNonces(): boolean {
        return this.coSignerNonces.length === this.totalExternalCoSigners();
    }

    private hasColletedAllPartialSignatures(): boolean {
        return this.coSignerSignatures.length === this.totalExternalCoSigners();
    }

    private totalExternalCoSigners(): number {
        return this.signerPublicKeys.length - 1;
    }
}
