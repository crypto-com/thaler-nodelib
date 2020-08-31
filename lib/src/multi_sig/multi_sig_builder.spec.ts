import 'mocha';
import { step } from 'mocha-steps';
import { expect } from 'chai';
import { NetworkEnum } from '../network';
import { KeyPair } from '../key_pair';
import { MultiSigBuilder, MultiSigSession } from '.';

const network = NetworkEnum.Devnet;
const testnetAddressReg = new RegExp('^dcro1[0-9a-z]{58}$');

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

    let customerBuilder: MultiSigBuilder;
    let merchantBuilder: MultiSigBuilder;

    // Create new multiSigAddress for both signers
    step('should generate a multiSigAddress', () => {
        customerBuilder = new MultiSigBuilder(
            customerKeyPair,
            [merchantKeyPair.publicKey!],
            network,
            1,
        );

        const address = customerBuilder.createMultiSigAddress();

        expect(address).to.be.a('string').and.match(testnetAddressReg);
    });

    // Create same multiSigAddress for both signers
    step(
        'should generate same multiSigAddress between customer and merchant',
        () => {
            merchantBuilder = new MultiSigBuilder(
                merchantKeyPair,
                [customerKeyPair.publicKey!],
                network,
                1,
            );

            const customerAddress = customerBuilder.createMultiSigAddress();
            const merchantAddress = merchantBuilder.createMultiSigAddress();

            expect(customerAddress).to.equal(merchantAddress);
        },
    );

    // new MultiSigBuilder requires more than 1 signer
    step('should throw error when required_signers is less than 1', () => {
        expect(() => {
            /* eslint-disable no-new */
            new MultiSigBuilder(
                customerKeyPair,
                [merchantKeyPair.publicKey!],
                network,
                0,
            );
        }).to.throw('Expected number to be greater than or equal to 1, got 0');
    });

    // new MultiSigBuilder requires less than all signer
    step(
        'should throw error when required_signers is greater than total parties number',
        () => {
            expect(() => {
                /* eslint-disable no-new */
                new MultiSigBuilder(
                    customerKeyPair,
                    [merchantKeyPair.publicKey!],
                    network,
                    3,
                );
            }).to.throw('Expected number to be less than or equal to 2, got 3');
        },
    );

    // Creates new session for both signers, while message is the transaction
    step('should create a new session', () => {
        const message =
            'efefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefef';
        const session: MultiSigSession = customerBuilder.createNewSession(
            message,
        );

        expect(session.getRawSession()).to.be.instanceof(Buffer);
    });

    // Message format should be 64 bytes hex string
    step('should throw error when message is not 64 bytes hex string', () => {
        expect(() => {
            const message = 'ffffffffff';
            customerBuilder.createNewSession(message);
        }).to.throw(
            'input hash should be a hex string of 32 bytes, [255, 255, 255, 255, 255] is 5 bytes',
        );
    });

    // Can create multiple sessions
    step('should be able to create multiple sessions with same builder', () => {
        const message1 =
            'efefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefef';
        const session1: MultiSigSession = customerBuilder.createNewSession(
            message1,
        );

        const message2 =
            'fefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefe';
        const session2: MultiSigSession = customerBuilder.createNewSession(
            message2,
        );

        expect(session1.getRawSession()).not.equal(session2.getRawSession());
    });
});
