import ow from 'ow';
import { NetworkEnum } from '../network';
import { owTransferAddress } from '../types';

import { KeyPair } from '../key_pair';
import { owKeyPair } from '../key_pair/types';
import { MultiSigSession } from './multi_sig_session';
import { owNetworkEnum } from '../network/types';

const native = require('../../../native');

type PublicKey = Buffer;
/**
 * builder to facilitate multiSig flow
 * @class MultiSigBuilder
 */
export class MultiSigBuilder {
    // self keyPair
    private keyPair: KeyPair;

    // current network config
    private network: NetworkEnum;

    // all parties' public keys, self ones and coSigners' public keys
    private signerPublicKeys: Array<PublicKey> = [];

    // required signers number to sign the tx
    private requiredSignerNumber: number;

    // a transfer address for multiSig
    public multiSigAddress?: string;

    constructor(
        selfKeyPair: KeyPair,
        coSignerPublicKeys: Array<PublicKey>,
        network: NetworkEnum,
        requiredSignerNumber: number,
    ) {
        ow(selfKeyPair, 'KeyPair', owKeyPair);
        this.keyPair = selfKeyPair;

        ow(network, owNetworkEnum);
        this.network = network;

        ow(coSignerPublicKeys, ow.array.minLength(1).ofType(ow.buffer));
        this.signerPublicKeys = coSignerPublicKeys
            .slice()
            .concat([selfKeyPair.publicKey!]);

        // required signers should be at least 1 and at most the number of all signers
        ow(requiredSignerNumber, ow.number.greaterThanOrEqual(1));
        ow(
            requiredSignerNumber,
            ow.number.lessThanOrEqual(this.signerPublicKeys.length),
        );
        this.requiredSignerNumber = requiredSignerNumber;
    }

    /**
     * create multiSig address for receiving fund
     *
     * @returns {multiSigAddress}
     * @throws signerPublicKeys should be larger than 2, which means at least 1 co-signer other than yourself
     * @memberof MultiSigBuilder
     */
    public createMultiSigAddress(): string {
        ow(this.signerPublicKeys, ow.array.minLength(2));

        const address = native.multiSig.createAddress(
            this.signerPublicKeys,
            this.keyPair.publicKey,
            this.requiredSignerNumber,
            this.network,
        );
        // check if address is a validate transfer address
        ow(address, owTransferAddress);

        this.multiSigAddress = address;
        return this.multiSigAddress!;
    }

    /**
     * create new multi-sig session
     *
     * @param message message for new session, e.g. fund tx
     * @returns {session}
     * @throws Message should be string
     * @memberof MultiSigBuilder
     */
    public createNewSession(message: string): MultiSigSession {
        ow(message, ow.string);

        const session: MultiSigSession = new MultiSigSession(
            message,
            this.keyPair,
            this.signerPublicKeys,
        );

        return session;
    }
}
