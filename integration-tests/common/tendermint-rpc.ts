import axios from 'axios';
import BigNumber from 'bignumber.js';
import { sleep, asyncMiddleman } from './utils';

export class TendermintRpc {
    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    public latestBlockHeight(): Promise<number> {
        return axios.get(`${this.url}/status`).then((res: any) => {
            return res.data.result.sync_info.latest_block_height;
        });
    }

    public broadcastTx(encodedTx: string) {
        return axios.post(`${this.url}`, {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'broadcast_tx_async',
            params: [encodedTx],
        });
    }

    public broadcastTxCommit(encodedTx: string) {
        const response: any = axios
            .post(`${this.url}`, {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'broadcast_tx_commit',
                params: [encodedTx],
            })
            .then((res: any) => res.data);

        const throwError = () => {
            throw new Error(
                `Error when broadcasting transaction: ${JSON.stringify(
                    response,
                    null,
                    '    ',
                )}`,
            );
        };
        // eslint-disable-next-line camelcase
        if (response.result?.check_tx?.code !== 0) {
            throwError();
        }
        // eslint-disable-next-line camelcase
        if (response.result?.deliver_tx?.code !== 0) {
            throwError();
        }
    }

    public isTxIdConfirmed(txId: string): Promise<boolean> {
        return axios
            .get(`${this.url}/tx_search?query="valid_txs.txid='${txId}'"`)
            .then((res: any) => {
                // eslint-disable-next-line no-console
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
