import 'mocha';
import { expect } from 'chai';
import * as cro from '../lib/src';

const native = require('../native');

describe('HDWallet', () => {
    it('can generate 24 mnemonic words', () => {
        const mnemnoic = cro.HDWallet.generateMnemonic();

        expect(mnemnoic.split(' ')).to.have.lengthOf(24);
    });

    context('Restore from mnemonic words', () => {
        it('can create transfer address', () => {
            const mnemonic =
                'point shiver hurt flight fun online hub antenna engine pave chef fantasy front interest poem accident catch load frequent praise elite pet remove used';
            const wallet = cro.HDWallet.fromMnemonic(mnemonic);

            const keyPair = wallet.derive("m/44'/394'/0'/0/1");

            const transferAddress = cro.address.transfer({
                keyPair,
                network: cro.network.Mainnet,
            });
            expect(transferAddress).to.eq(
                'cro1l6mqkzzemx6amezmalx4q7g0y87lrn7ec27y64afkrzj7gqpu7zsecxksg',
            );
        });

        it('can create staking address', () => {
            const mnemonic =
                'point shiver hurt flight fun online hub antenna engine pave chef fantasy front interest poem accident catch load frequent praise elite pet remove used';
            const wallet = cro.HDWallet.fromMnemonic(mnemonic);

            const keyPair = wallet.derive("m/44'/394'/1'/0/1");

            const stakingAddress = cro.address.staking({
                keyPair,
            });
            expect(stakingAddress).to.eq(
                '0x8f1dec4d75772760e50e74abc1edaab83d819c5c',
            );
        });

        it('can create view key', () => {
            const mnemonic =
                'point shiver hurt flight fun online hub antenna engine pave chef fantasy front interest poem accident catch load frequent praise elite pet remove used';
            const wallet = cro.HDWallet.fromMnemonic(mnemonic);

            const viewKey = wallet.derive("m/44'/394'/2'/0/1");

            expect(native.keyPair.isValidViewKey(viewKey.publicKey)).to.eq(
                true,
            );
        });
    });

    context('Derive at Crypto.com path', () => {
        it('can create transfer address', () => {
            const mnemonic =
                'point shiver hurt flight fun online hub antenna engine pave chef fantasy front interest poem accident catch load frequent praise elite pet remove used';
            const wallet = cro.HDWallet.fromMnemonic(mnemonic);

            const index = 1;
            const keyPair = wallet.derivef(
                cro.network.Mainnet.bip44Path,
                cro.HDWallet.AccountType.Transfer,
                index,
            );

            const transferAddress = cro.address.transfer({
                keyPair,
                network: cro.network.Mainnet,
            });
            expect(transferAddress).to.eq(
                'cro1l6mqkzzemx6amezmalx4q7g0y87lrn7ec27y64afkrzj7gqpu7zsecxksg',
            );
        });

        it('can create staking address', () => {
            const mnemonic =
                'point shiver hurt flight fun online hub antenna engine pave chef fantasy front interest poem accident catch load frequent praise elite pet remove used';
            const wallet = cro.HDWallet.fromMnemonic(mnemonic);

            const index = 1;
            const keyPair = wallet.derivef(
                cro.network.Mainnet.bip44Path,
                cro.HDWallet.AccountType.Staking,
                index,
            );

            const stakingAddress = cro.address.staking({
                keyPair,
            });
            expect(stakingAddress).to.eq(
                '0x8f1dec4d75772760e50e74abc1edaab83d819c5c',
            );
        });

        it('can create view key', () => {
            const mnemonic =
                'point shiver hurt flight fun online hub antenna engine pave chef fantasy front interest poem accident catch load frequent praise elite pet remove used';
            const wallet = cro.HDWallet.fromMnemonic(mnemonic);

            const index = 1;
            const viewKey = wallet.derivef(
                cro.network.Mainnet.bip44Path,
                cro.HDWallet.AccountType.Viewkey,
                index,
            );

            expect(native.keyPair.isValidViewKey(viewKey.publicKey)).to.eq(
                true,
            );
        });
    });

    it('can derive key pair at path with positional argument', () => {
        const mnemonic =
            'point shiver hurt flight fun online hub antenna engine pave chef fantasy front interest poem accident catch load frequent praise elite pet remove used';
        const wallet = cro.HDWallet.fromMnemonic(mnemonic);

        const account = 0;
        const index = 1;

        const namedKeyPair = wallet
            .derivef("m/44'/394'/{ACCOUNT}'/0/{INDEX}", account, index)
            .toObject();

        // named argument is for self-explanatory purpose and is
        // equivalent to
        const keyPair = wallet
            .derivef("m/44'/394'/{}'/0/{}", account, index)
            .toObject();

        expect(namedKeyPair).to.deep.eq(keyPair);
    });
});
