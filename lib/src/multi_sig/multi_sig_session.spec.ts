import 'mocha';
import { step } from 'mocha-steps';
import { expect } from 'chai';
import { NetworkEnum } from '../network';
import { KeyPair } from '../key_pair';
import { MultiSigBuilder } from '.';
import { MultiSigSession } from './multi_sig_session';

const network = NetworkEnum.Devnet;

describe('MultiSigBuilder', () => {
    // Sample keypairs for two signers: customer & merchant
    const customerKeyPair = KeyPair.fromPrivateKey(
        Buffer.from(
            '8b292c13c1bfdec73526669cb121989f92d50fa6d4ad3d60f2c17d21a6a5b8c0',
            'hex',
        ),
    );
    const merchantKeyPair = KeyPair.fromPrivateKey(
        Buffer.from(
            'd66f0ecce4e736155a5f80f8229756635c3b060a9538a94ff62a0726f5bd3387',
            'hex',
        ),
    );

    let customerSession: MultiSigSession;
    let merchantSession: MultiSigSession;

    // Create new multiSigAddress for both signers
    step('should be able to generate multiSig sessions', () => {
        const customerBuilder = new MultiSigBuilder(
            customerKeyPair,
            [merchantKeyPair.publicKey!],
            network,
            1,
        );

        const merchantBuilder = new MultiSigBuilder(
            merchantKeyPair,
            [customerKeyPair.publicKey!],
            network,
            1,
        );

        const message =
            'efefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefef';

        customerSession = customerBuilder.createNewSession(message);
        merchantSession = merchantBuilder.createNewSession(message);
    });

    // Generate nonce commitment for both signers
    step('should generate self nonce commitment', () => {
        const nc = customerSession.generateNonceCommitment();
        merchantSession.generateNonceCommitment();

        expect(nc).to.be.instanceof(Buffer);
    });

    // Buyer add merchant's public key and nonce commitment
    step("should add co-signer's nonce commitment to current session", () => {
        const coSignerPublicKey = merchantKeyPair.publicKey!;
        const coSignerNonceCommitment = merchantSession.nonceCommitment!;

        customerSession.addNonceCommitment(
            coSignerPublicKey,
            coSignerNonceCommitment,
        );
    });

    // Cannot add a signer's nonce commitment multiple times
    step(
        'should throw error if user try to add same commitment multiple times',
        () => {
            expect(() => {
                const coSignerPublicKey = merchantKeyPair.publicKey!;
                const coSignerNonceCommitment = merchantSession.nonceCommitment!;
                customerSession.addNonceCommitment(
                    coSignerPublicKey,
                    coSignerNonceCommitment,
                );
            }).to.throw(
                "This co-signer's nonce commitment has already been added",
            );
        },
    );

    // Seller tries generating nonce when not ready
    step(
        "should throw error since not all signer's commitments are collected",
        () => {
            // haven't collected all co-signers' nonce commitments
            expect(() => {
                merchantSession.generateNonce();
            }).to.throw(
                "Nonce can be generated only after all co-signer's nonce commitment are added",
            );
        },
    );

    // Properly generate nonce for both signers after collected all commitments
    step(
        "should generate nonce after all signer's commitments are collected",
        () => {
            // add nonce commitment to merchant session
            const coSignerPublicKey = customerKeyPair.publicKey!;
            const coSignerNonceCommitment = customerSession.nonceCommitment!;
            merchantSession.addNonceCommitment(
                coSignerPublicKey,
                coSignerNonceCommitment,
            );

            // gen nonce
            const nonce = customerSession.generateNonce();
            merchantSession.generateNonce();

            expect(nonce).to.be.instanceof(Buffer);
        },
    );

    // Add nonce for each signer
    step('should successfully add nonce to current session', () => {
        // add nonce to customer session
        const session = customerSession.addNonce(
            merchantKeyPair.publicKey!,
            merchantSession.nonce!,
        );
        // add nonce to merchant session
        merchantSession.addNonce(
            customerKeyPair.publicKey!,
            customerSession.nonce!,
        );

        expect(session).to.be.instanceof(Buffer);
    });

    // Cannot add a signer's nonce multiple times
    step(
        'should throw error if user try to add same nonce multiple times',
        () => {
            expect(() => {
                customerSession.addNonce(
                    merchantKeyPair.publicKey!,
                    merchantSession.nonce!,
                );
            }).to.throw("This co-signer's nonce has already been added");
        },
    );

    // Generate partial signature for both signers
    step('should generate self partial signature properly', () => {
        const sig = customerSession.partialSign();
        merchantSession.partialSign();
        expect(sig).to.be.instanceof(Buffer);
    });

    // Add partial signature for eath signer
    step('should successfully add signature to current session', () => {
        // add sig to customer session
        const session = customerSession.addPartialSignature(
            merchantKeyPair.publicKey!,
            merchantSession.partialSignature!,
        );
        // add sig to merchant session
        merchantSession.addPartialSignature(
            customerKeyPair.publicKey!,
            customerSession.partialSignature!,
        );

        expect(session).to.be.instanceof(Buffer);
    });

    // Cannot add a signer's partial signature multiple times
    step(
        'should throw error if user try to add same partial signature multiple times',
        () => {
            expect(() => {
                customerSession.addPartialSignature(
                    merchantKeyPair.publicKey!,
                    merchantSession.partialSignature!,
                );
            }).to.throw("This co-signer's signature has already been added");
        },
    );

    // Try verify when not ready
    step("should throw error calling verify when it's not ready", () => {
        expect(() => {
            customerSession.verify();
        }).to.throw('Current signature is not ready for verification');
    });

    // Sign for both signers
    step('should generate final signature properly', () => {
        const sig = customerSession.sign();
        merchantSession.sign();
        expect(sig).to.be.instanceof(Buffer);
    });

    // Verify for both signers
    step('should verify the final signature properly', () => {
        const b = customerSession.verify();
        expect(b).eq(true);
    });

    step("should verify the other's final signature properly", () => {
        const b = customerSession.verify(merchantSession.signature);
        expect(b).eq(true);
    });
});
