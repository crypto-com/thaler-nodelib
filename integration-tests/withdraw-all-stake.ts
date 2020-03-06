import { newWalletRPC, WalletRequest, WalletAuthRequest } from './common/utils';

const main = async () => {
    const walletRPC = newWalletRPC();

    const defaultWalletAuthRequest: WalletAuthRequest = {
        name: 'Default',
        passphrase: process.env.WALLET_PASSPHRASE || '123456',
    };
    const enckey = await walletRPC.getAuthToken(defaultWalletAuthRequest);

    const defaultWallet: WalletRequest = {
        name: 'Default',
        enckey,
    };
    // eslint-disable-next-line no-console
    console.info('[Log] Withdrawing all stake of default wallet');
    await walletRPC.unbondAndWithdrawStake(defaultWallet);
};

main();
