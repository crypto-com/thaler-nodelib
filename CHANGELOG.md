## 0.2.0 (Thaler Testnet v0.5)

### New features

- Introduce estimateFee() method to transfer and withdrawal transaction builder

### Breaking Changes

- Remove HTTP Tendermint support when encrypting transaction
- Rename npm script `nodemon` to `test:watch`

### Internal Changes

- Port KeyPair implementation into the library for future compatibility
