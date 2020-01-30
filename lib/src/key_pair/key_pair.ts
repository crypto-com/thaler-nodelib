import ow from 'ow';

const native = require('../../../native');

export default class KeyPair {
    private innerPublicKey?: Buffer;

    private innerPrivateKey?: Buffer;

    public static fromPublicKey(publicKey: Buffer): KeyPair {
        ow(publicKey, ow.buffer);

        native.keyPair.verifyPublicKey(publicKey);

        const keyPair = new KeyPair();
        keyPair.addPublicKey(publicKey);

        return keyPair;
    }

    public static fromPrivateKey(privateKey: Buffer): KeyPair {
        ow(privateKey, ow.buffer);

        native.keyPair.verifyPrivateKey(privateKey);

        const keyPair = new KeyPair();
        const publicKey = native.keyPair.getPublicKeyFromPrivateKey(privateKey);

        keyPair.addPrivateKey(privateKey);
        keyPair.addPublicKey(publicKey);

        return keyPair;
    }

    public static generateRandom(): KeyPair {
        const privateKey = native.keyPair.newPrivateKey();

        return KeyPair.fromPrivateKey(privateKey);
    }

    public addPublicKey(publicKey: Buffer) {
        ow(publicKey, ow.buffer);

        this.innerPublicKey = publicKey;
    }

    public addPrivateKey(privateKey: Buffer) {
        ow(privateKey, ow.buffer);

        this.innerPrivateKey = privateKey;
    }

    public hasPublicKey(): boolean {
        return !!this.innerPublicKey;
    }

    public hasPrivateKey(): boolean {
        return !!this.innerPrivateKey;
    }

    public get publicKey(): Buffer | undefined {
        return this.innerPublicKey;
    }

    public get privateKey(): Buffer | undefined {
        return this.innerPrivateKey;
    }

    public toObject(): NativeKeyPair {
        return {
            privateKey: this.privateKey,
            publicKey: this.publicKey,
        };
    }
}

interface NativeKeyPair {
    privateKey?: Buffer;
    publicKey?: Buffer;
}
