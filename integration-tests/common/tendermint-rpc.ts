import axios from 'axios';
import BigNumber from 'bignumber.js';
import { sleep, asyncMiddleman, JSONPrettyStringify } from './utils';

export class TendermintRpc {
    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    public abciInfo(): Promise<any> {
        return axios.get(`${this.url}/abci_info`).then((res: any) => {
            return res.data.result;
        });
    }

    public latestBlockHeight(): Promise<number> {
        return axios.get(`${this.url}/status`).then((res: any) => {
            return res.data.result.sync_info.latest_block_height;
        });
    }

    public latestValidators(): Promise<ValidatorsResult> {
        return axios.get(`${this.url}/validators`).then((res: any) => {
            return res.data.result;
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

    public async broadcastTxCommit(encodedTx: string) {
        const response: any = await axios
            .post(`${this.url}`, {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'broadcast_tx_commit',
                params: [encodedTx],
            })
            .then((res: any) => res.data);

        const throwError = () => {
            throw new Error(
                `Error when broadcasting transaction: ${JSONPrettyStringify(
                    response,
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

        // eslint-disable-next-line no-console
        console.log(
            `Transaction successfully submitted: ${JSONPrettyStringify(
                response,
            )}`,
        );
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

/* eslint-disable camelcase */
export interface ValidatorsResult {
    block_height: string;
    validators: Validator[];
}

export interface Validator {
    address: string;
    pub_key: PubKey;
    voting_power: string;
    proposer_priority: string;
}

export interface PubKey {
    type: string;
    value: string;
}
/* eslint-enable camelcase */
