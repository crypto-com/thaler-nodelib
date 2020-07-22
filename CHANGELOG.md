## 0.3.0 (Thaler Testnet v0.5)

### New features

- Introduce `toUnsignedHex()` method to staking account related transaction builders
- Introduce `toSignedPlainHex()` method to`WithdrawUnbondedTransactionBuilder`
- Introduce `compressedPublicKey` property to`KeyPair`

### Breaking Changes

- `cro.network.Devnet()` now requires fee configuration
- `cro.network.fromChainId()` now returns the chain enum instead of network configuraiton
- All transaction builders now use fee configuration defined in the network
- `WithdrawUnbondedTransactionBuilder` now accepts nonce and staking address instead of the whole staking state
- Staking account related transaction builders now accepts nonce in BigNumber (before it accepts a number)

### Bug FIxes

- Fixed transaction builders previously supported account nonce up to 2^16, now it accepts up to 2^32 through `BigNumber`
- Fixed `pakcage.json` main is pointing to the wrong index file

### Internal Changes

- `WithdrawUnbondedTransactionBuilder` now no longer check for valid from validity and output amount validity because it no longer accepts staking state

-----

## 0.2.0 (Thaler Testnet v0.5)

### New features

- Introduce estimateFee() method to transfer and withdrawal transaction builder

### Breaking Changes

- Remove HTTP Tendermint support when encrypting transaction
- Rename npm script `nodemon` to `test:watch`

### Internal Changes

- Port KeyPair implementation into the library for future compatibility
