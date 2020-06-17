import axios from 'axios';
import BigNumber from 'bignumber.js';

import LosslessJSON = require('lossless-json');

const losslessJSONReceiver = (_key: string, value: any) => {
    if (value && value.isLosslessNumber) {
        return new BigNumber(value.toString());
    }
    return value;
};

export class RpcClient {
    private requestId = 1;

    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    public async request(method: string, params: string | any[]): Promise<any> {
        this.requestId += 1;
        const id = this.requestId;
        // eslint-disable-next-line
        const { data } = await axios.post(
            this.url,
            {
                jsonrpc: '2.0',
                id,
                method,
                params: typeof params === 'string' ? [params] : params,
            },
            {
                transformResponse: (rawData: any) => {
                    return LosslessJSON.parse(rawData, losslessJSONReceiver);
                },
            },
        );
        if (data.error) {
            return Promise.reject(data.error);
        }
        return data.result;
    }
}
