import ow from 'ow';
import { NetworkConfig } from '../../network';
import { owAccountNonce, owStakingAddress } from '../../types';
import { owOptionalNetworkConfig } from '../../network/types';

export interface NodeJoinTransactionBuilderOptions {
    stakingAddress: string;
    nonce: number;
    nodeMetaData: NodeMetaData;
    network?: NetworkConfig;
}

export interface NodeMetaData {
    name: string;
    securityContact?: string;
    consensusPublicKey: NodePublicKey;
}

export interface NodePublicKey {
    type: NodePublicKeyType;
    value: string;
}

export enum NodePublicKeyType {
    Ed25519 = 'tendermint/PubKeyEd25519',
}

export const owNodePublicKeyType = ow.string.oneOf(
    Object.values(NodePublicKeyType),
);

export const owNodePublicKey = ow.object.exactShape({
    type: owNodePublicKeyType,
    value: ow.string,
});

export const owNodeMetaData = ow.object.exactShape({
    name: ow.string,
    securityContact: ow.optional.string,
    consensusPublicKey: owNodePublicKey,
});

export const owNodeJoinTransactionBuilderOptions = ow.object.exactShape({
    stakingAddress: owStakingAddress,
    nonce: owAccountNonce,
    nodeMetaData: owNodeMetaData,
    network: owOptionalNetworkConfig,
});

export interface NativeNodeMetaData {
    name: string;
    // eslint-disable-next-line camelcase
    security_contact?: string;
    // eslint-disable-next-line camelcase
    consensus_pubkey: NodePublicKey;
}

export const parseNodeMetaDataForNative = (
    nodeMetaData: NodeMetaData,
): NativeNodeMetaData => {
    return {
        name: nodeMetaData.name,
        security_contact: nodeMetaData.securityContact
            ? nodeMetaData.securityContact
            : undefined,
        consensus_pubkey: nodeMetaData.consensusPublicKey,
    };
};

export interface UnjailTransactionBuilderOptions {
    stakingAddress: string;
    nonce: number;
    network?: NetworkConfig;
}

export const owUnjailTransactionBuilderOptions = ow.object.exactShape({
    stakingAddress: owStakingAddress,
    nonce: owAccountNonce,
    network: owOptionalNetworkConfig,
});
