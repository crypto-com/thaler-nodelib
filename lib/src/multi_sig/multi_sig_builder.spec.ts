import 'mocha';
import { step } from 'mocha-steps';
import { expect } from 'chai';
import { NetworkEnum } from '../network';
import { KeyPair } from '../key_pair';
import { MultiSigBuilder } from '.';

const network = NetworkEnum.Devnet;
const addressReg = new RegExp('^dcro1[0-9a-z]{58}$');

describe('MultiSigBuilder', () => {
    // Sample keypairs for two signers: buyer & seller
    const buyerKeyPair = KeyPair.fromPrivateKey(
        Buffer.from(
            '8b292c13c1bfdec73526669cb121989f92d50fa6d4ad3d60f2c17d21a6a5b8c0',
            'hex',
        ),
    );
    const sellerKeyPair = KeyPair.fromPrivateKey(
        Buffer.from(
            'd66f0ecce4e736155a5f80f8229756635c3b060a9538a94ff62a0726f5bd3387',
            'hex',
        ),
    );

    let buyerBuilder: MultiSigBuilder;
    let sellerBuilder: MultiSigBuilder;

    // Create new multiSigAddress for both signers
    step('should generate a multiSigAddress', () => {
        buyerBuilder = new MultiSigBuilder(
            buyerKeyPair,
            [sellerKeyPair.publicKey!],
            network,
            1,
        );

        sellerBuilder = new MultiSigBuilder(
            sellerKeyPair,
            [buyerKeyPair.publicKey!],
            network,
            1,
        );

        const address = buyerBuilder.createMultiSigAddress();
        expect(address)
            .to.be.a('string')
            .and.match(addressReg);
    });

    // new MultiSigBuilder requires more than 1 signer
    step('should throw error when required_signers is less than 1', () => {
        expect(() => {
            /* eslint-disable no-new */
            new MultiSigBuilder(
                buyerKeyPair,
                [sellerKeyPair.publicKey!],
                network,
                0,
            );
        }).to.throw('Expected number to be greater than or equal to 1, got 0');
    });

    // Creates new session for both signers, while message is the transaction
    step('should create a new session', () => {
        const message =
            'efefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefef';
        const session = buyerBuilder.createNewSession(message);
        sellerBuilder.createNewSession(message);

        expect(session).to.be.instanceof(Buffer);
    });

    // Message format is 64 bytes hex string
    step('should throw error when message is not 64 bytes hex string', () => {
        expect(() => {
            const message = 'ffffffffff';
            buyerBuilder.createNewSession(message);
        }).to.throw(
            'input hash should be a hex string of 32 bytes, [255, 255, 255, 255, 255] is 5 bytes',
        );
    });

    // Generate nonce commitment for both signers
    step('should generate self nonce commitment', () => {
        const nc = buyerBuilder.generateNonceCommitment();
        sellerBuilder.generateNonceCommitment();

        expect(nc).to.be.instanceof(Buffer);
    });

    // Buyer add seller's public key and nonce commitment
    step("should add co-signer's nonce commitment to current session", () => {
        const coSignerPublicKey = sellerKeyPair.publicKey!;
        const coSignerNonceCommitment = sellerBuilder.nonceCommitment;

        buyerBuilder.addNonceCommitment(
            coSignerPublicKey!,
            coSignerNonceCommitment!,
        );
    });

    // Cannot add a signer's nonce commitment multiple times
    step('should throw error if user try to add same commitment multiple times', () => {
        expect(() => {
            const coSignerPublicKey = sellerKeyPair.publicKey;
            const coSignerNonceCommitment = sellerBuilder.nonceCommitment;
            buyerBuilder.addNonceCommitment(
                coSignerPublicKey!,
                coSignerNonceCommitment!,
            );
        }).to.throw("This co-signer's nonce commitment has already been added");
    });

    // Seller tries generating nonce when not ready
    step("should throw error since not all signer's commitments are collected", () => {
        // haven't collected all co-signers' nonce commitments
        expect(() => {
            sellerBuilder.generateNonce();
        }).to.throw(
            "Nonce can be generated only after all co-signer's nonce commitment are added",
        );
    });

    // Properly generate nonce for both signers after collected all commitments
    step("should generate nonce after all signer's commitments are collected", () => {
        // add nonce commitment to seller session
        const coSignerPublicKey = buyerKeyPair.publicKey;
        const coSignerNonceCommitment = buyerBuilder.nonceCommitment;
        sellerBuilder.addNonceCommitment(
            coSignerPublicKey!,
            coSignerNonceCommitment!,
        );

        // gen nonce
        const nonce = buyerBuilder.generateNonce();
        sellerBuilder.generateNonce();

        expect(nonce).to.be.instanceof(Buffer);
    });

    // Add nonce for each signer
    step('should successfully add nonce to current session', () => {
        // add nonce to buyer session
        const session = buyerBuilder.addNonce(
            sellerKeyPair.publicKey!,
            sellerBuilder.nonce!,
        );
        // add nonce to seller session
        sellerBuilder.addNonce(buyerKeyPair.publicKey!, buyerBuilder.nonce!);

        expect(session).to.be.instanceof(Buffer);
    });

    // Cannot add a signer's nonce multiple times
    step("should throw error if user try to add same nonce multiple times", () => {
        expect(() => {
            buyerBuilder.addNonce(
                sellerKeyPair.publicKey!,
                sellerBuilder.nonce!,
            );
        }).to.throw("This co-signer's nonce has already been added");
    });

    // Generate partial signature for both signers
    step('should generate self partial signature properly', () => {
        const sig = buyerBuilder.partialSign();
        sellerBuilder.partialSign();
        expect(sig).to.be.instanceof(Buffer);
    });

    // Add partial signature for eath signer
    step('should successfully add signature to current session', () => {
        // add sig to buyer session
        const session = buyerBuilder.addPartialSignature(
            sellerKeyPair.publicKey!,
            sellerBuilder.partialSignature!,
        );
        // add sig to seller session
        sellerBuilder.addPartialSignature(
            buyerKeyPair.publicKey!,
            buyerBuilder.partialSignature!,
        );

        expect(session).to.be.instanceof(Buffer);
    });

    // Cannot add a signer's partial signature multiple times
    step("should throw error if user try to add same partial signature multiple times", () => {
        expect(() => {
            buyerBuilder.addPartialSignature(
                sellerKeyPair.publicKey!,
                sellerBuilder.partialSignature!,
            );
        }).to.throw("This co-signer's signature has already been added");
    });

    // Sign for both signers
    step('should generate final signature properly', () => {
        const sig = buyerBuilder.sign();
        sellerBuilder.sign();
        expect(sig).to.be.instanceof(Buffer);
    });

    // Verify for both signers
    step('should verify the final signature properly', () => {
        const b = buyerBuilder.verify();
        expect(b).eq(true);
    });

    step("should verify the other's final signature properly", () => {
        const b = buyerBuilder.verify(sellerBuilder.signature);
        expect(b).eq(true);
    });
});
