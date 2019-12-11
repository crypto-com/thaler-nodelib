import axios from 'axios';
import BigNumber from 'bignumber.js';
import { sleep, asyncMiddleman } from './utils';

export class TendermintRpc {
    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    public broadcastTx(encodedTx: string) {
        return axios.post(`${this.url}`, {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'broadcast_tx_async',
            params: [encodedTx],
        });
    }

    public isTxIdConfirmed(txId: string): Promise<boolean> {
        return axios
            .get(`${this.url}/tx_search?query="valid_txs.txid='${txId}'"`)
            .then((res: any) => {
                return new BigNumber(
                    res.data.result.total_count,
                ).isGreaterThanOrEqualTo(1);
            });
    }

    public async waitTxIdConfirmation(
        txId: string,
        retryTimeout: number = 1000,
    ): Promise<boolean> {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            // eslint-disable-next-line no-console
            console.log(
                `[Log] Checking transaction confirmation on chain: ${txId}`,
            );
            // eslint-disable-next-line no-await-in-loop
            const exists = await asyncMiddleman(
                this.isTxIdConfirmed(txId),
                'Error when retrieving transaction confirmation',
            );
            if (exists) {
                break;
            }

            // eslint-disable-next-line no-await-in-loop
            await sleep(retryTimeout);
        }

        return true;
    }
}
