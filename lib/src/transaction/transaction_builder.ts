import { NetworkConfig, Mainnet } from '../network';

export abstract class TransactionBuilder {
    protected network!: NetworkConfig;

    protected initNetwork(network?: NetworkConfig) {
        if (network) {
            this.network = network;
        } else {
            this.network = Mainnet;
        }
    }

    /**
     * Returns the current network
     *
     * @returns {NetworkConfig} current network
     * @memberof TransferTransactionBuilder
     */
    public getNetwork(): Readonly<NetworkConfig> {
        return this.network;
    }
}
