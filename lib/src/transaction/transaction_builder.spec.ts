import 'mocha';
import { expect } from 'chai';

import { TransactionBuilder } from './transaction_builder';
import { NetworkConfig, Mainnet, Testnet } from '../network';

describe('TransactionBuilder', () => {
    class TransactionBuilderImpl extends TransactionBuilder {
        public initNetwork(network?: NetworkConfig) {
            super.initNetwork(network);
        }
    }
    describe('initNetwork()', () => {
        it('should initialize network to Mainnet when none is provided', () => {
            const builder = new TransactionBuilderImpl();
            builder.initNetwork();

            expect(builder.getNetwork()).to.deep.eq(Mainnet);
        });

        it('should initialize network to the provided network config', () => {
            const builder = new TransactionBuilderImpl();
            builder.initNetwork(Testnet);

            expect(builder.getNetwork()).to.deep.eq(Testnet);
        });
    });
});
