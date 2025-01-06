// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title EIP7849
/// @author Amitesh Gautam
/// @notice A new fungible token standard built for maximum security, efficiency and interoperability
contract EIP7849 {
    // State variables
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    // Balances and allowances
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    // Gas rebate tracking
    uint256 private constant MAX_REBATE_TXS = 10000;
    uint256 private _rebateTransactionCount;
    mapping(address => bool) private _hasReceivedRebate;
    
    // Nonce tracking for signature validation
    mapping(address => uint256) private _nonces;
    
    // Domain separator for EIP-712
    bytes32 private immutable DOMAIN_SEPARATOR;
    
    // Constants for EIP-712
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    
    bytes32 private constant PERMIT_TYPEHASH = keccak256(
        "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
    );

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event GasRebate(address indexed user, uint256 amount);

    // Custom errors
    error InsufficientBalance();
    error InsufficientAllowance();
    error InvalidSignature();
    error ExpiredDeadline();
    error MaxRebatesReached();
    error TransferToZeroAddress();
    error ApproveToZeroAddress();

    /// @notice Contract constructor
    /// @param _name Token name
    /// @param _symbol Token symbol
    /// @param _decimals Token decimals
    /// @param initialSupply Initial token supply
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 initialSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = initialSupply;
        _balances[msg.sender] = initialSupply;

        // Initialize domain separator
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(_name)),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );

        emit Transfer(address(0), msg.sender, initialSupply);
    }

    /// @notice Get the balance of an account
    /// @param account The address to query
    /// @return The token balance
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    /// @notice Get the allowance for a spender
    /// @param owner The address of the owner
    /// @param spender The address of the spender
    /// @return The remaining allowance
    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    /// @notice Transfer tokens to a specified address
    /// @param to The address to transfer to
    /// @param amount The amount to transfer
    /// @return success Whether the transfer was successful
    function transfer(address to, uint256 amount) external returns (bool) {
        if (to == address(0)) revert TransferToZeroAddress();
        if (_balances[msg.sender] < amount) revert InsufficientBalance();

        _balances[msg.sender] -= amount;
        _balances[to] += amount;

        emit Transfer(msg.sender, to, amount);
        _processGasRebate(msg.sender);
        return true;
    }

    /// @notice Approve a spender to spend tokens
    /// @param spender The address to approve
    /// @param amount The amount to approve
    /// @return success Whether the approval was successful
    function approve(address spender, uint256 amount) external returns (bool) {
        if (spender == address(0)) revert ApproveToZeroAddress();
        
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /// @notice Transfer tokens from one address to another
    /// @param from The address to transfer from
    /// @param to The address to transfer to
    /// @param amount The amount to transfer
    /// @return success Whether the transfer was successful
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (to == address(0)) revert TransferToZeroAddress();
        if (_balances[from] < amount) revert InsufficientBalance();
        if (_allowances[from][msg.sender] < amount) revert InsufficientAllowance();

        _allowances[from][msg.sender] -= amount;
        _balances[from] -= amount;
        _balances[to] += amount;

        emit Transfer(from, to, amount);
        _processGasRebate(msg.sender);
        return true;
    }

    /// @notice Process gasless approval using EIP-712 signatures
    /// @param owner The token owner
    /// @param spender The spender address
    /// @param value The amount to approve
    /// @param deadline The deadline for the signature
    /// @param v The recovery byte of the signature
    /// @param r Half of the ECDSA signature pair
    /// @param s Half of the ECDSA signature pair
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        if (deadline < block.timestamp) revert ExpiredDeadline();

        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                owner,
                spender,
                value,
                _nonces[owner]++,
                deadline
            )
        );

        bytes32 hash = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        address signer = ecrecover(hash, v, r, s);
        if (signer != owner) revert InvalidSignature();

        _allowances[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    /// @notice Internal function to process gas rebates
    /// @param user The user to receive the rebate
    function _processGasRebate(address user) private {
        if (_rebateTransactionCount >= MAX_REBATE_TXS) revert MaxRebatesReached();
        if (_hasReceivedRebate[user]) return;

        _hasReceivedRebate[user] = true;
        _rebateTransactionCount++;

        // Simplified gas rebate calculation to avoid overflow
        uint256 rebateAmount = 21000 * tx.gasprice / 4; // 25% of base transaction cost

        // Only send rebate if contract has enough balance
        if (address(this).balance >= rebateAmount) {
            (bool success,) = user.call{value: rebateAmount}("");
            if (success) {
                emit GasRebate(user, rebateAmount);
            }
        }
    }

    /// @notice Allow the contract to receive ETH for gas rebates
    receive() external payable {}
}