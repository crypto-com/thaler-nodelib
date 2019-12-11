import {
    newWithFeeWalletRpc,
    newZeroFeeWalletRpc,
    newWalletRequest,
} from './common/utils';

const main = async () => {
    const withFeeWalletRpc = newWithFeeWalletRpc();
    const zeroFeeWalletRpc = newZeroFeeWalletRpc();
    const defaultWallet = newWalletRequest('Default', '123456');

    // eslint-disable-next-line no-console
    console.info(
        '[Log] Withdrawing all stake of default wallet in with fee setup',
    );
    await withFeeWalletRpc.unbondAndWithdrawStake(defaultWallet);

    // eslint-disable-next-line no-console
    console.info(
        '[Log] Withdrawing all stake of default wallet in zero fee setup',
    );
    await zeroFeeWalletRpc.unbondAndWithdrawStake(defaultWallet);
};

main();
