---
eip: 7849
title: Fungible Token with gas rebates
description: Built-in gas rebates, secure signature validation, and optimized transfer mechanisms.
author: Amitesh Gautam (@blockchainDevAmitesh) <blockchaindev.amitesh@gmail.com>
discussions-to: https://ethereum-magicians.org/t/erc-7849-fungible-token-with-gas-rebates/22356
status: Draft
type: Standards Track
category: EIP
created: 2025-01-06
---

## Abstract

EIP-7849 introduces a new fungible token standard focused on security, efficiency, and interoperability. It extends traditional [ERC-20](https://ethereum.org/en/developers/docs/standards/tokens/erc-20/) functionality with built-in gas rebates, secure signature validation using [EIP-712](https://eips.ethereum.org/EIPS/eip-712), and optimized transfer mechanisms. The standard includes protections against common attack vectors while maintaining full compatibility with existing token interfaces.

## Motivation

Current fungible token standards lack built-in security features and gas optimization mechanisms. EIP-7849 addresses these limitations by incorporating:
- Native gas rebate system to reduce transaction costs
- [EIP-712](https://eips.ethereum.org/EIPS/eip-712) compliant signatures for gasless approvals
- Strong security measures against common vulnerabilities
- Efficient state management and error handling

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Installation

```bash
npm install
```

### Compiling

```bash
npm run compile
```

### Testing

```bash
npx hardhat test
```
or
```bash
npm run tests
```

### Starting a JSON-RPC server on top of Hardhat Network

```bash
npm run node
```

### Core Variables
- `name`: Token name
- `symbol`: Token symbol
- `decimals`: Number of decimal places
- `totalSupply`: Total token supply
- `_balances`: Mapping of address to token balance
- `_allowances`: Mapping of owner address to spender address to allowed amount

### Features
- Gas rebate system
- [EIP-712](https://eips.ethereum.org/EIPS/eip-712) signature validation
- Nonce tracking for replay protection

### Functions

#### View Functions

**`name()`**
- Returns the token name
- Type: `string`

**`symbol()`**
- Returns the token symbol
- Type: `string`

**`decimals()`**
- Returns number of decimals
- Type: `uint8`

**`totalSupply()`**
- Returns total token supply
- Type: `uint256`

**`balanceOf(address account)`**
- Returns token balance of specified account
- Type: `uint256`

**`allowance(address owner, address spender)`**
- Returns remaining allowance for spender
- Type: `uint256`

#### State-Changing Functions

**`transfer(address to, uint256 amount)`**
- Transfers tokens to specified address
- Includes gas rebate processing
- Returns: `bool`

**`approve(address spender, uint256 amount)`**
- Approves spender to spend tokens
- Returns: `bool`

**`transferFrom(address from, address to, uint256 amount)`**
- Transfers tokens between addresses
- Requires sufficient allowance
- Returns: `bool`

**`permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)`**
- Processes gasless approvals using [EIP-712](https://eips.ethereum.org/EIPS/eip-712) signatures
- Validates signature and deadline
- No return value

### Events

**`Transfer`**
- Emitted on token transfers
```solidity
event Transfer(address indexed from, address indexed to, uint256 value)
```

**`Approval`**
- Emitted on approval updates
```solidity
event Approval(address indexed owner, address indexed spender, uint256 value)
```

**`GasRebate`**
- Emitted when gas rebate is processed
```solidity
event GasRebate(address indexed user, uint256 amount)
```

### Gas Rebate System
- Limited to first 10,000 transactions
- Rebate amount = 25% of base transaction cost
- One-time rebate per user
- Requires contract to hold ETH for rebates

### Error Handling
Custom errors for common failure cases:
- `InsufficientBalance`
- `InsufficientAllowance`
- `InvalidSignature`
- `ExpiredDeadline`
- `MaxRebatesReached`
- `TransferToZeroAddress`
- `ApproveToZeroAddress`

## Rationale

The design choices in EIP-7849 prioritize:
1. Security through custom error handling and signature validation
2. Gas efficiency via rebate mechanisms
3. Interoperability through standard [EIP-712](https://eips.ethereum.org/EIPS/eip-712) implementation
4. User experience through gasless approvals

## Backwards Compatibility

EIP-7849 maintains full backwards compatibility with [ERC-20](https://ethereum.org/en/developers/docs/standards/tokens/erc-20/) while adding enhanced functionality.

## Security Considerations

- Implements nonce tracking for signature validation
- Uses custom errors for efficient error handling
- Includes checks against zero-address transfers
- Limits gas rebates to prevent abuse
- Validates [EIP-712](https://eips.ethereum.org/EIPS/eip-712) signatures for permit operations

## Copyright

Copyright and related rights waived via [MIT](./LICENSE).
