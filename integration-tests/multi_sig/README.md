## MultiSig Integration Test

MultiSig integration test is based on [multisig-demo](https://github.com/crypto-com/multisig-demo#Use-case-example) to demonstrate a 2-of-3 multisignature scheme using NodeJS library natively for "Proof of Goods & Services Delivered" (PoGSD) collaterals.

### Normal Case

The normal case example demonstrates the interaction between customer, escrow and merchant in where the customer is purchase items from the merchant with "Proof of Goods and Services". The customer receives the goods and complete the order normally. At the end, the merchant will receive the payment amount and the customer will get back the deposit.

1. The customer and the merchant exchange the public keys, create multiSig addresses respectively. Notice that, the two multisig addresses should be the same.
2. The customer sends payment and deposit to multiSig address, at the same time the merchant will keep polling to check if the multiSig address has received the fund or not. After received, the merchant will send the goods to the customer offline.
3. The customer receives goods and create raw tx to close the order normally. The tx outputs should be firstly, sending the merchant payment and secondly, sending back the deposit to the customer.
4. The customer and merchant co-sign the raw tx following multiSig signing flow and broadcast the signed tx to complete the order.