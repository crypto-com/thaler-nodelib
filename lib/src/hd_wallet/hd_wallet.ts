import ow from 'ow';
import * as bip32 from 'bip32';
import * as bip39 from 'bip39';
import { KeyPair } from '../key_pair';

export class HDWallet {
    private seed: Buffer;

    public constructor(seed: Buffer) {
        ow(seed, 'seed', ow.buffer);

        this.seed = seed;
    }

    public derive(path: string): KeyPair {
        ow(path, 'path', ow.string);

        const root = bip32.fromSeed(this.seed);
        const derivedResult = root.derivePath(path);

        return KeyPair.fromPrivateKey(derivedResult.privateKey!);
    }

    public derivef(formatPath: string, ...args: number[]): KeyPair {
        ow(formatPath, 'formatPath', ow.string);
        ow(args, 'args', ow.array.ofType(ow.number.uint32));

        const path = formatPath.replace(/{\w*}/g, () => {
            if (args.length === 0) {
                throw new Error('Insufficient argument for format path');
            }

            const arg = args.shift();
            return arg!.toString();
        });

        if (args.length !== 0) {
            throw new Error('Argument never used');
        }

        return this.derive(path);
    }

    public toSeed(): Buffer {
        return this.seed;
    }

    public static fromMnemonic(
        mnemonic: string,
        passphrase?: string,
    ): HDWallet {
        ow(mnemonic, 'mnemonic', ow.string);
        ow(passphrase, 'passphrase', ow.optional.string);

        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('Invalid mnemonic words');
        }

        let seed: Buffer;
        if (passphrase) {
            seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
        } else {
            seed = bip39.mnemonicToSeedSync(mnemonic);
        }

        return new HDWallet(seed);
    }

    public static generateMnemonic(): string {
        return bip39.generateMnemonic(256);
    }

    public static AccountType = {
        Transfer: 0,
        Staking: 1,
        Viewkey: 2,
    };
}
