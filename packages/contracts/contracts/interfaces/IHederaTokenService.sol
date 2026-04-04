// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title IHederaTokenService
 * @notice Minimal interface for the Hedera Token Service (HTS) system contract
 *         at address 0x0000000000000000000000000000000000000167.
 *         Only the functions used by CorpusRegistry are included.
 */
interface IHederaTokenService {
    struct HederaToken {
        string name;
        string symbol;
        address treasury;
        string memo;
        bool tokenSupplyType;   // false = INFINITE, true = FINITE
        int64 maxSupply;        // only relevant if tokenSupplyType = true
        bool freezeDefault;
        TokenKey[] tokenKeys;
        Expiry expiry;
    }

    struct TokenKey {
        uint256 keyType;        // bit flags: 1=admin, 2=kyc, 4=freeze, 8=wipe, 16=supply, 32=fee, 64=pause
        KeyValue key;
    }

    struct KeyValue {
        bool inheritAccountKey;
        address contractId;
        bytes ed25519;
        bytes ECDSA_secp256k1;
        address delegatableContractId;
    }

    struct Expiry {
        int64 second;           // 0 = use default
        address autoRenewAccount;
        int64 autoRenewPeriod;  // seconds (e.g. 7776000 = 90 days)
    }

    /// @notice Create a fungible token. Caller must send HBAR to cover creation fee.
    /// @return responseCode 22 = SUCCESS
    /// @return tokenAddress The created token's address
    function createFungibleToken(
        HederaToken memory token,
        int64 initialTotalSupply,
        int32 decimals
    ) external payable returns (int64 responseCode, address tokenAddress);

    /// @notice Transfer tokens between accounts. Caller must be the treasury or have approval.
    /// @return responseCode 22 = SUCCESS
    function transferToken(
        address token,
        address from,
        address to,
        int64 amount
    ) external returns (int64 responseCode);
}
