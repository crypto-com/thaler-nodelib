import ow from 'ow';

const native = require('../../../native');

/**
 * Represents a private and public key pair
 * @class KeyPair
 */
export class KeyPair {
    private innerPublicKey!: Buffer;

    private innerCompressedPublicKey!: Buffer;

    private innerPrivateKey?: Buffer;

    /**
     * Create a KeyPair from public key only
     * @param {Buffer} anyPublicKey public key to create the KeyPair
     */
    public static fromPublicKey(anyPublicKey: Buffer): KeyPair {
        ow(anyPublicKey, ow.buffer);

        native.keyPair.verifyPublicKey(anyPublicKey);

        const {
            publicKey,
            compressedPublicKey,
        } = native.keyPair.getPublicKeysFromAnyPublicKey(anyPublicKey);

        const keyPair = new KeyPair();
        keyPair.addPublicKey(publicKey, compressedPublicKey);

        return keyPair;
    }

    /**
     * Create a KeyPair from private key. The public key will be derived from
     * the private key
     *
     * @param {Buffer} privateKey private key to create the KeyPair
     */
    public static fromPrivateKey(privateKey: Buffer): KeyPair {
        ow(privateKey, ow.buffer);

        native.keyPair.verifyPrivateKey(privateKey);

        const keyPair = new KeyPair();
        const {
            publicKey,
            compressedPublicKey,
        } = native.keyPair.getPublicKeysFromPrivateKey(privateKey);

        keyPair.addPrivateKey(privateKey);
        keyPair.addPublicKey(publicKey, compressedPublicKey);

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

    private addPublicKey(publicKey: Buffer, compressedPublicKey: Buffer) {
        ow(publicKey, ow.buffer);
        ow(compressedPublicKey, ow.buffer);

        this.innerPublicKey = publicKey;
        this.innerCompressedPublicKey = compressedPublicKey;
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
    public get publicKey(): Buffer {
        return this.innerPublicKey;
    }

    /**
     * Returns the compressed public key of the KeyPair
     */
    public get compressedPublicKey(): Buffer {
        return this.innerCompressedPublicKey;
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
            compressedPublicKey: this.compressedPublicKey,
            publicKey: this.publicKey,
        };
    }
}

interface NativeKeyPair {
    privateKey?: Buffer;
    compressedPublicKey?: Buffer;
    publicKey?: Buffer;
}
