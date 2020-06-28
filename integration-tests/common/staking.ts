import BigNumber from 'bignumber.js';

import * as cro from '../../lib/src';

/* eslint-disable camelcase */
export interface RPCStakedState {
    nonce: BigNumber;
    bonded: string;
    unbonded: string;
    unbonded_from: BigNumber;
    address: string;
    validator?: {
        council_node?: RPCCouncilNode;
        jailed_until?: BigNumber;
        inactive_time?: BigNumber;
        inactive_block?: BigNumber;
    };
    punishment?: {
        kind: string;
        time: BigNumber;
        amount: string;
    };
}
/* eslint-enable camelcase */

/* eslint-disable camelcase */
interface RPCCouncilNode {
    name: string;
    security_contact?: string;
    consensus_pubkey: {
        type: string;
        value: string;
    };
    confidential_init: {
        cert: string;
    };
}
/* eslint-enable camelcase */
export const parseRPCCouncilNodeFromNodeMetaData = (
    nodeMetaData: cro.transaction.councilNode.NodeMetaData,
): RPCCouncilNode => ({
    name: nodeMetaData.name,
    security_contact: nodeMetaData.securityContact,
    consensus_pubkey: nodeMetaData.consensusPublicKey,
    // TODO: confidential init
    confidential_init: {
        cert: Buffer.from('FIXME').toString('base64'),
    },
});

export const parseStakedStateFromRPC = (
    stakedState: RPCStakedState,
): cro.StakedState => {
    const nativeStakedState: cro.NativeStakedState = {
        nonce: stakedState.nonce.toNumber(),
        bonded: stakedState.bonded,
        unbonded: stakedState.unbonded,
        unbonded_from: stakedState.unbonded_from.toNumber(),
        address: stakedState.address,
    };

    return cro.parseStakedStateForNodelib(nativeStakedState);
};
