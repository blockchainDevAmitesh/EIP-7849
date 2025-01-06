# Test Results

This document contains the test results from running Hardhat tests.

## Running Tests

To run tests yourself:

```bash
npx hardhat test
```
or
```bash
npm run tests
```

## Recent Test Results

### EIP7849 Advanced Tests

#### Advanced Transfer Scenarios
- ✔ Should handle multiple transfers in sequence
- ✔ Should revert when transferring exact balance plus one token

#### Advanced Allowance Scenarios
- ✔ Should handle allowance decreases correctly
- ✔ Should handle multiple approved spenders

#### Gas Rebate Mechanism
- ✔ Should only provide gas rebate once per address
- ✔ Should track rebate transaction count

#### Permit Security
- ✔ Should reject permit with invalid signature
- ✔ Should reject permit replay attacks

### EIP7849 Basic Tests

#### Deployment
- ✔ Should set the right owner balance
- ✔ Should set the correct token metadata

#### Transactions
- ✔ Should transfer tokens between accounts
- ✔ Should fail if sender doesn't have enough tokens
- ✔ Should fail if transferring to zero address

#### Allowances
- ✔ Should update allowances correctly
- ✔ Should not approve zero address
- ✔ Should allow transferFrom with sufficient allowance

#### Permit
- ✔ Should execute permit function
- ✔ Should reject expired permit

#### Gas Rebate
- ✔ Should process gas rebate for first transaction

**Test Summary**: 19 passing (773ms)
