import ow from 'ow';
import { NetworkConfig } from '../../network';
import { owAccountNonce, owStakingAddress } from '../../types';
import { owOptionalNetworkConfig } from '../../network/types';
import { BigNumber } from '../../utils';

export interface NodeJoinTransactionBuilderOptions {
    stakingAddress: string;
    nonce: BigNumber;
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
    // eslint-disable-next-line camelcase
    confidential_init: {
        cert: string;
    };
}

export const parseNodeMetaDataForNative = (
    nodeMetaData: NodeMetaData,
): NativeNodeMetaData => {
    // TODO: confidential init
    const cert = Buffer.from('FIXME');
    return {
        name: nodeMetaData.name,
        security_contact: nodeMetaData.securityContact
            ? nodeMetaData.securityContact
            : undefined,
        consensus_pubkey: nodeMetaData.consensusPublicKey,
        confidential_init: {
            cert: cert.toString('base64'),
        },
    };
};

export interface UnjailTransactionBuilderOptions {
    stakingAddress: string;
    nonce: BigNumber;
    network?: NetworkConfig;
}

export const owUnjailTransactionBuilderOptions = ow.object.exactShape({
    stakingAddress: owStakingAddress,
    nonce: owAccountNonce,
    network: owOptionalNetworkConfig,
});
