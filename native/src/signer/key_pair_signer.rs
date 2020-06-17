//! A signer that sign message using the provided key pair
use chain_core::common::Proof;
use chain_core::tx::data::address::ExtendedAddr;
use chain_core::tx::witness::tree::RawXOnlyPubkey;
use chain_core::tx::witness::TxInWitness;
use client_common::{ErrorKind, MultiSigAddress, PrivateKey, PublicKey, Result, ResultExt, SECP};
use secp256k1::recovery::RecoverableSignature;
use secp256k1::schnorrsig::{schnorr_sign, SchnorrSignature};
use secp256k1::{Message, SecretKey};

/// Signer from key pair
pub struct KeyPairSigner {
    proof: Proof<RawXOnlyPubkey>,
    private_key: PrivateKey,
}

impl KeyPairSigner {
    /// Create a new signer using the provided key pair
    #[inline]
    pub fn new(private_key: PrivateKey, public_key: PublicKey) -> Result<Self> {
        let (_, proof) = generate_extended_addr_and_proof(public_key)?;
        Ok(KeyPairSigner { proof, private_key })
    }
}

fn generate_extended_addr_and_proof(
    public_key: PublicKey,
) -> Result<(ExtendedAddr, Proof<RawXOnlyPubkey>)> {
    let require_signers = 1;
    let multi_sig_address = MultiSigAddress::new(
        vec![public_key.clone()],
        public_key.clone(),
        require_signers,
    )?;
    let proof = multi_sig_address
        .generate_proof(vec![public_key])?
        .chain(|| (ErrorKind::InvalidInput, "Unable to generate merkle proof"))?;
    let extended_addr = ExtendedAddr::from(multi_sig_address);

    Ok((extended_addr, proof))
}

impl KeyPairSigner {
    pub fn sign(&self, message: &[u8]) -> Result<RecoverableSignature> {
        let sign_message = Message::from_slice(&message).chain(|| {
            (
                ErrorKind::DeserializationError,
                "Unable to deserialize message to sign",
            )
        })?;
        let secret_key = SecretKey::from(&self.private_key);
        let signature = SECP.with(|secp| secp.sign_recoverable(&sign_message, &secret_key));
        Ok(signature)
    }

    pub fn schnorr_sign_txid(&self, txid: &[u8]) -> Result<TxInWitness> {
        Ok(TxInWitness::TreeSig(
            self.schnorr_sign(txid)?,
            self.proof.clone(),
        ))
    }

    pub fn schnorr_sign(&self, message: &[u8]) -> Result<SchnorrSignature> {
        let sign_message = Message::from_slice(&message).chain(|| {
            (
                ErrorKind::DeserializationError,
                "Unable to deserialize message to sign",
            )
        })?;
        let secret_key = SecretKey::from(&self.private_key);
        let signature = SECP.with(|secp| schnorr_sign(&secp, &sign_message, &secret_key));
        Ok(signature)
    }
}
