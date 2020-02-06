import ow from 'ow';
import { NetworkEnum } from '../network';
import { PublicKey } from '../types';

import { KeyPair } from '../key_pair';
import { owKeyPair } from '../key_pair/types';

const native = require('../../../native');

/**
 * builder to facilitate multiSig flow
 * @class MultiSigBuilder
 */
export class MultiSigBuilder {
    private keyPair: KeyPair;

    private network: NetworkEnum;

    private signerPublicKeys: Array<PublicKey> = [];

    private requiredSignerNumber: number;

    // transferable address start with `cro1`
    public multiSigAddress?: string;

    // 32 bytes message for session creation. E.g. fund tx hash
    public message?: string;

    // current session, could be complete or incomplete
    private session?: Buffer;

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
        selfKeyPair: KeyPair,
        otherSignerPublicKeys: Array<PublicKey>,
        network: NetworkEnum,
        requiredSignerNumber: number,
    ) {
        ow(selfKeyPair, 'KeyPair', owKeyPair);
        ow(otherSignerPublicKeys, ow.array.minLength(1).ofType(ow.buffer));
        ow(network, ow.string);
        ow(requiredSignerNumber, ow.number.uint32.greaterThanOrEqual(1));

        this.keyPair = selfKeyPair;
        this.network = network;
        this.signerPublicKeys = otherSignerPublicKeys
            .slice()
            .concat([selfKeyPair.publicKey!]);
        this.requiredSignerNumber = requiredSignerNumber;
    }

    /**
     * create multiSig address for receiving fund
     *
     * @returns {multiSigAddress}
     * @throws signerPublicKeys should be larger than 2, which means at least 1 co-signer other than yourself
     * @memberof MultiSigBuilder
     */
    public createMultiSigAddress(): string | undefined {
        ow(this.signerPublicKeys, ow.array.minLength(2));

        this.multiSigAddress = native.multiSig.createAddress(
            this.signerPublicKeys,
            this.keyPair.publicKey,
            this.requiredSignerNumber,
            this.network,
        );

        return this.multiSigAddress;
    }

    /**
     * create new multi-sig session
     *
     * @param message message for new session, e.g. fund tx
     * @returns {session}
     * @throws Message should be string
     * @memberof MultiSigBuilder
     */
    public createNewSession(message: string): Buffer | undefined {
        ow(message, ow.string);

        this.session = native.multiSig.newSession(
            message,
            this.signerPublicKeys,
            this.keyPair.publicKey,
            this.keyPair.privateKey,
        );
        this.message = message;

        return this.session;
    }

    /**
     * generate self nonce commitment
     *
     * @returns {nonceCommitment}
     * @memberof MultiSigBuilder
     */
    public generateNonceCommitment(): Buffer | undefined {
        const {
            nonceCommitment,
            incompleteSession,
        } = native.multiSig.generateNonceCommitment(this.session);

        this.nonceCommitment = nonceCommitment;
        this.session = incompleteSession;

        return this.nonceCommitment;
    }

    /**
     * add co-signer's nonce commitment to current session
     *
     * @param coSignerPublicKey external co-signer's publickey
     * @param coSignerNonceCommitment external co-signer's nonce commitment
     * @throws coSignerNonceCommitment should be Buffer
     * @returns {session} session after add other nonce commitment
     * @memberof MultiSigBuilder
     */
    public addNonceCommitment(
        coSignerPublicKey: Buffer,
        coSignerNonceCommitment: Buffer,
    ): Buffer | undefined {
        ow(coSignerNonceCommitment, ow.buffer);

        if (this.hasThisSignerNonceCommitment(coSignerNonceCommitment))
            throw new Error(
                "This co-signer's nonce commitment has already been added",
            );

        this.session = native.multiSig.addNonceCommitment(
            this.session,
            coSignerPublicKey,
            coSignerNonceCommitment,
        );
        this.coSignerNonceCommitments!.push(coSignerNonceCommitment);

        return this.session;
    }

    /**
     * generate self nonce, noted that it can only be taken after collected all nonce commitments
     *
     * @returns {nonce}
     * @throws should collect all nonce commitments before calling generateNonce
     * @memberof MultiSigBuilder
     */
    public generateNonce(): Buffer | undefined {
        if (!this.hasCollectedAllNonceCommitments())
            throw new Error(
                "Nonce can be generated only after all co-signer's nonce commitment are added",
            );

        const { nonce, incompleteSession } = native.multiSig.generateNonce(
            this.session,
        );

        this.nonce = nonce;
        this.session = incompleteSession;

        return this.nonce;
    }

    /**
     * add co-signer's nonce to current session
     *
     * @param coSignerPublicKey external co-signer's publickey
     * @param coSignerNonce external co-signer's nonce
     * @throws public key and nonce should be buffer
     * @throws the nonce has already been added
     * @returns {session} session after add other nonce commitment
     * @memberof MultiSigBuilder
     */
    public addNonce(
        coSignerPublicKey: Buffer,
        coSignerNonce: Buffer,
    ): Buffer | undefined {
        ow(coSignerPublicKey, ow.buffer);
        ow(coSignerNonce, ow.buffer);

        if (this.hasThisSignerNonce(coSignerNonce))
            throw new Error("This co-signer's nonce has already been added");

        this.session = native.multiSig.addNonce(
            this.session,
            coSignerPublicKey,
            coSignerNonce,
        );
        this.coSignerNonces!.push(coSignerNonce);

        return this.session;
    }

    /**
     * generate partial signature, noted that it can only be taken after collected all nonces
     *
     * @returns {partialSignature}
     * @throws should collect all nonce before calling partialSign
     * @memberof MultiSigBuilder
     */
    public partialSign(): Buffer | undefined {
        if (!this.hasColletedAllNonces())
            throw new Error(
                "Session can be partially signed only after all co-signer's nonces are added",
            );

        const {
            partialSignature,
            incompleteSession,
        } = native.multiSig.partialSign(this.session);

        this.partialSignature = partialSignature;
        this.session = incompleteSession;

        return this.partialSignature;
    }

    /**
     * add co-signer's partial signature to current session
     *
     * @param coSignerPublicKey external co-signer's publickey
     * @param coSignerSignature external co-signer's partial signature
     * @throws public key and signature should be buffer
     * @throws the partial signature has already been added
     * @returns {session} session after add other nonce commitment
     * @memberof MultiSigBuilder
     */
    public addPartialSignature(
        coSignerPublicKey: Buffer,
        coSignerSignature: Buffer,
    ): Buffer | undefined {
        ow(coSignerPublicKey, ow.buffer);
        ow(coSignerSignature, ow.buffer);

        if (this.hasThisSignerSignature(coSignerSignature))
            throw new Error(
                "This co-signer's signature has already been added",
            );

        this.session = native.multiSig.addPartialSignature(
            this.session,
            coSignerPublicKey,
            coSignerSignature,
        );
        this.coSignerSignatures!.push(coSignerSignature);

        return this.session;
    }

    /**
     * generate final signature, noted that it can only be taken after collected all partial signatures
     *
     * @returns {signature}
     * @throws should collect all partial signature before calling sign
     * @memberof MultiSigBuilder
     */
    public sign(): Buffer | undefined {
        if (!this.hasColletedAllPartialSignatures())
            throw new Error(
                "Session can be final signed only after all co-signer's partial signatures are added",
            );

        this.signature = native.multiSig.sign(this.session);

        return this.signature;
    }

    /**
     * verify the final external signature or self is valid or not
     *
     * @param signature external signature
     * @throws self signature is not ready for verification
     * @returns {boolean}
     * @memberof MultiSigBuilder
     */
    public verify(_signature?: Buffer): boolean {
        let signature = _signature;
        if (!_signature) {
            if (!this.signature)
                throw new Error('Own signature is not ready for verification');
            signature = this.signature;
        }

        return native.multiSig.verify(
            signature,
            this.message,
            this.signerPublicKeys,
        );
    }

    private hasThisSignerNonceCommitment(nc: Buffer): boolean {
        return this.coSignerNonceCommitments!.indexOf(nc) > -1;
    }

    private hasThisSignerNonce(n: Buffer): boolean {
        return this.coSignerNonces!.indexOf(n) > -1;
    }

    private hasThisSignerSignature(s: Buffer): boolean {
        return this.coSignerSignatures!.indexOf(s) > -1;
    }

    private hasCollectedAllNonceCommitments(): boolean {
        return (
            this.coSignerNonceCommitments!.length ===
            this.totalExternalCoSigners()
        );
    }

    private hasColletedAllNonces(): boolean {
        return this.coSignerNonces!.length === this.totalExternalCoSigners();
    }

    private hasColletedAllPartialSignatures(): boolean {
        return (
            this.coSignerSignatures!.length === this.totalExternalCoSigners()
        );
    }

    private totalExternalCoSigners(): number {
        return this.signerPublicKeys.length - 1;
    }
}
