// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IHederaTokenService.sol";

/**
 * @title MockHederaTokenService
 * @notice Mock for hardhat tests — simulates the HTS precompile at 0x167.
 *         Tracks balances so tests can assert token distribution.
 */
contract MockHederaTokenService {
    int64 public constant SUCCESS = 22;

    uint160 private _nextTokenId = 1;

    // token => account => balance
    mapping(address => mapping(address => int64)) public balanceOf;
    // token => treasury
    mapping(address => address) public treasuryOf;

    function createFungibleToken(
        IHederaTokenService.HederaToken memory token,
        int64 initialTotalSupply,
        int32 /* decimals */
    ) external payable returns (int64, address) {
        address tokenAddr = address(_nextTokenId++);
        treasuryOf[tokenAddr] = token.treasury;
        balanceOf[tokenAddr][token.treasury] = initialTotalSupply;
        return (SUCCESS, tokenAddr);
    }

    function transferToken(
        address token,
        address from,
        address to,
        int64 amount
    ) external returns (int64) {
        require(balanceOf[token][from] >= amount, "MockHTS: insufficient balance");
        balanceOf[token][from] -= amount;
        balanceOf[token][to] += amount;
        return SUCCESS;
    }
}
