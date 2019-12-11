import ow from 'ow';

const native = require('../../../native');

/**
 * Represents a private and public key pair
 * @class KeyPair
 */
export class KeyPair {
    private innerPublicKey?: Buffer;

    private innerPrivateKey?: Buffer;

    /**
     * Create a KeyPair from public key only
     * @param publicKey public key to create the KeyPair
     */
    public static fromPublicKey(publicKey: Buffer): KeyPair {
        ow(publicKey, ow.buffer);

        native.keyPair.verifyPublicKey(publicKey);

        const keyPair = new KeyPair();
        keyPair.addPublicKey(publicKey);

        return keyPair;
    }

    /**
     * Create a KeyPair from private key. The public key will be derived from
     * the private key
     * @param privateKey private key to create the KeyPair
     */
    public static fromPrivateKey(privateKey: Buffer): KeyPair {
        ow(privateKey, ow.buffer);

        native.keyPair.verifyPrivateKey(privateKey);

        const keyPair = new KeyPair();
        const publicKey = native.keyPair.getPublicKeyFromPrivateKey(privateKey);

        keyPair.addPrivateKey(privateKey);
        keyPair.addPublicKey(publicKey);

        return keyPair;
    }

    /**
     * Generate an random private key and create a KeyPair of it
     */
    public static generateRandom(): KeyPair {
        const privateKey = native.keyPair.newPrivateKey();

        return KeyPair.fromPrivateKey(privateKey);
    }

    private addPrivateKey(privateKey: Buffer) {
        ow(privateKey, ow.buffer);

        this.innerPrivateKey = privateKey;
    }

    private addPublicKey(publicKey: Buffer) {
        ow(publicKey, ow.buffer);

        this.innerPublicKey = publicKey;
    }

    /**
     * Determine if the KeyPair has public key. Returns true when there is one
     */
    public hasPublicKey(): boolean {
        return !!this.innerPublicKey;
    }

    /**
     * Determine if the KeyPair has private key. Returns true when there is one
     */
    public hasPrivateKey(): boolean {
        return !!this.innerPrivateKey;
    }

    /**
     * Returns the public key of the KeyPair
     */
    public get publicKey(): Buffer | undefined {
        return this.innerPublicKey;
    }

    /**
     * Returns the private key of the KeyPair
     */
    public get privateKey(): Buffer | undefined {
        return this.innerPrivateKey;
    }

    /**
     * Transform the KeyPair into an object of private and public key
     */
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
