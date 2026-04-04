// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CorpusRegistry.sol";

/**
 * @title CorpusNameService
 * @notice Immutable naming registry for Prime Agent identities.
 *         Each Corpus can register one name (e.g. "marketbot") displayed
 *         as "marketbot.corpus". Once set, the name can never be changed.
 */
contract CorpusNameService {
    CorpusRegistry public immutable registry;

    // corpusId → name (e.g. "marketbot")
    mapping(uint256 => string) private _corpusToName;
    // keccak256(name) → corpusId
    mapping(bytes32 => uint256) private _nameToCorpus;
    // corpusId → whether a name has been set
    mapping(uint256 => bool) private _nameSet;

    // ── Events ───────────────────────────────────────────────────────

    event NameRegistered(uint256 indexed corpusId, string name);

    // ── Errors ───────────────────────────────────────────────────────

    error NameAlreadySet();
    error NameTaken();
    error InvalidName();
    error NotCorpusCreator();
    error CorpusNotFound();

    // ── Constructor ──────────────────────────────────────────────────

    constructor(address payable _registry) {
        registry = CorpusRegistry(_registry);
    }

    // ── Write ────────────────────────────────────────────────────────

    /**
     * @notice Register a permanent name for a Corpus's Prime Agent.
     *         Can only be called once per Corpus by the Corpus creator.
     * @param corpusId The on-chain Corpus ID.
     * @param name     Lowercase alphanumeric + hyphens, 3-32 chars.
     */
    function registerName(uint256 corpusId, string calldata name) external {
        // Verify caller is corpus creator
        address creator = registry.creatorOf(corpusId);
        if (creator == address(0)) revert CorpusNotFound();
        if (creator != msg.sender) revert NotCorpusCreator();

        // One-time only
        if (_nameSet[corpusId]) revert NameAlreadySet();

        // Validate name format
        if (!_isValidName(name)) revert InvalidName();

        // Check availability
        bytes32 nameHash = keccak256(bytes(name));
        if (_nameToCorpus[nameHash] != 0) revert NameTaken();

        // Register
        _corpusToName[corpusId] = name;
        _nameToCorpus[nameHash] = corpusId;
        _nameSet[corpusId] = true;

        emit NameRegistered(corpusId, name);
    }

    // ── Read ─────────────────────────────────────────────────────────

    /**
     * @notice Resolve a name to its Corpus ID.
     * @return corpusId 0 if not found.
     */
    function resolveName(
        string calldata name
    ) external view returns (uint256) {
        return _nameToCorpus[keccak256(bytes(name))];
    }

    /**
     * @notice Get the name of a Corpus.
     * @return name Empty string if not set.
     */
    function nameOf(
        uint256 corpusId
    ) external view returns (string memory) {
        return _corpusToName[corpusId];
    }

    /**
     * @notice Check if a name is available for registration.
     */
    function isNameAvailable(
        string calldata name
    ) external view returns (bool) {
        if (!_isValidName(name)) return false;
        return _nameToCorpus[keccak256(bytes(name))] == 0;
    }

    /**
     * @notice Check if a Corpus already has a name set.
     */
    function hasName(uint256 corpusId) external view returns (bool) {
        return _nameSet[corpusId];
    }

    // ── Internal ─────────────────────────────────────────────────────

    /**
     * @dev Validate name: lowercase a-z, 0-9, hyphens. 3-32 chars.
     *      No leading/trailing hyphens, no consecutive hyphens.
     */
    function _isValidName(
        string calldata name
    ) internal pure returns (bool) {
        bytes calldata b = bytes(name);
        uint256 len = b.length;

        if (len < 3 || len > 32) return false;

        // No leading or trailing hyphen
        if (b[0] == 0x2D || b[len - 1] == 0x2D) return false;

        bool prevHyphen = false;
        for (uint256 i = 0; i < len; i++) {
            bytes1 ch = b[i];
            if (ch == 0x2D) {
                // hyphen
                if (prevHyphen) return false; // no consecutive hyphens
                prevHyphen = true;
            } else if (
                (ch >= 0x61 && ch <= 0x7A) || // a-z
                (ch >= 0x30 && ch <= 0x39)     // 0-9
            ) {
                prevHyphen = false;
            } else {
                return false; // invalid character
            }
        }

        return true;
    }
}
