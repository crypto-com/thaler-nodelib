import BigNumber from 'bignumber.js';

import * as cro from '../../lib/src';

/* eslint-disable camelcase */
export interface RPCStakedState {
    nonce: BigNumber;
    bonded: string;
    unbonded: string;
    unbonded_from: BigNumber;
    address: string;
    punishment?: {
        kind: string;
        jailed_until: BigNumber;
        slash_amount: string;
    };
    council_node?: RPCCouncilNode;
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
}
/* eslint-enable camelcase */
export const parseRPCCouncilNodeFromNodeMetaData = (
    nodeMetaData: cro.transaction.councilNode.NodeMetaData,
): RPCCouncilNode => ({
    name: nodeMetaData.name,
    security_contact: nodeMetaData.securityContact,
    consensus_pubkey: nodeMetaData.consensusPublicKey,
});

export const parseStakedStateFromRPC = (
    stakedState: RPCStakedState,
): cro.StakedState => {
    const nativeStakedState: cro.NativeStakedState = {
        ...stakedState,
        nonce: stakedState.nonce.toNumber(),
        unbonded_from: stakedState.unbonded_from.toNumber(),
        punishment: stakedState.punishment
            ? {
                  ...stakedState.punishment,
                  jailed_until: stakedState.punishment!.jailed_until.toNumber(),
              }
            : undefined,
    };

    return cro.parseStakedStateForNodelib(nativeStakedState);
};
