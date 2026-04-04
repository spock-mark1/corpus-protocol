// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IHederaTokenService.sol";

/**
 * @title CorpusRegistry
 * @notice On-chain registry for Corpus Protocol — the operating system for
 *         autonomous agent corporations. Each Corpus is an AI agent corporation
 *         with Patron (equity), Kernel (governance), and Pulse (token) configs.
 *
 *         On creation, the contract mints a Pulse token via HTS precompile,
 *         sends 3% as a launchpad fee to the protocol wallet, and transfers
 *         the remaining 97% to the Creator.
 */
contract CorpusRegistry {
    // ── Constants ────────────────────────────────────────────────────

    uint16 public constant LAUNCHPAD_FEE_BPS = 300; // 3.00%
    int64 public constant HTS_SUCCESS = 22;

    // ── Structs ─────────────────────────────────────────────────────

    struct PatronConfig {
        uint16 creatorShare;   // basis points (6000 = 60.00%)
        uint16 investorShare;
        uint16 treasuryShare;
        address creatorAddr;
        address investorAddr;
        address treasuryAddr;
    }

    struct KernelConfig {
        uint256 approvalThreshold; // USD cents (1000 = $10.00)
        uint256 gtmBudget;         // USD cents per month
        uint256 minPatronPulse;    // minimum Pulse to become Patron
    }

    struct PulseConfig {
        address hederaTokenAddr; // HTS token address (filled by contract on creation)
        uint256 totalSupply;
        uint256 priceUsdCents;   // USD cents per Pulse
    }

    struct Corpus {
        uint256 id;
        string name;
        string category;
        address creator;       // immutable after creation
        PatronConfig patron;
        KernelConfig kernel;
        PulseConfig pulse;
        uint256 createdAt;
        bool active;
    }

    // ── State ────────────────────────────────────────────────────────

    IHederaTokenService public immutable hts;
    address public immutable corpusProtocolWallet;

    mapping(uint256 => Corpus) private _corpuses;
    uint256 public nextCorpusId = 1; // start from 1, 0 = nonexistent

    // ── Events ───────────────────────────────────────────────────────

    event CorpusCreated(
        uint256 indexed corpusId,
        address indexed creator,
        string name
    );
    event PulseTokenCreated(
        uint256 indexed corpusId,
        address tokenAddress,
        uint256 totalSupply,
        uint256 protocolFee
    );
    event PatronUpdated(uint256 indexed corpusId);
    event KernelUpdated(uint256 indexed corpusId);
    event PulseUpdated(uint256 indexed corpusId);
    event CorpusDeactivated(uint256 indexed corpusId);

    // ── Errors ───────────────────────────────────────────────────────

    error NotCreator();
    error CorpusNotFound();
    error CorpusInactive();
    error InvalidShares();
    error InvalidAddress();
    error EmptyName();
    error EmptyTokenName();
    error SupplyTooLarge();
    error HTSCreateFailed(int64 responseCode);
    error HTSTransferFailed(int64 responseCode);

    // ── Constructor ──────────────────────────────────────────────────

    constructor(address _htsPrecompile, address _corpusProtocolWallet) {
        hts = IHederaTokenService(_htsPrecompile);
        corpusProtocolWallet = _corpusProtocolWallet;
    }

    // ── Modifiers ────────────────────────────────────────────────────

    modifier onlyCreator(uint256 corpusId) {
        if (_corpuses[corpusId].creator == address(0)) revert CorpusNotFound();
        if (_corpuses[corpusId].creator != msg.sender) revert NotCreator();
        _;
    }

    modifier corpusActive(uint256 corpusId) {
        if (!_corpuses[corpusId].active) revert CorpusInactive();
        _;
    }

    // ── Write Functions ──────────────────────────────────────────────

    /**
     * @notice Register a new Corpus (Genesis).
     *         Creates an HTS Pulse token, sends 3% launchpad fee to the
     *         protocol wallet, and transfers 97% to the Creator.
     *         Caller must send HBAR to cover HTS token creation fee (~1 HBAR).
     * @param tokenName  Name for the Pulse token (e.g. "ImageGen Pulse")
     * @param tokenSymbol Symbol for the Pulse token (e.g. "IMGS")
     * @return corpusId The on-chain ID of the newly created Corpus.
     */
    function createCorpus(
        string calldata name,
        string calldata category,
        PatronConfig calldata patron,
        KernelConfig calldata kernel,
        PulseConfig calldata pulse,
        string calldata tokenName,
        string calldata tokenSymbol
    ) external payable returns (uint256 corpusId) {
        if (bytes(name).length == 0) revert EmptyName();
        if (bytes(tokenName).length == 0) revert EmptyTokenName();
        if (pulse.totalSupply > uint256(uint64(type(int64).max))) revert SupplyTooLarge();
        _validateShares(patron);
        _validateAddresses(patron);

        corpusId = nextCorpusId++;

        // 1. Create HTS Pulse token (contract = treasury)
        address tokenAddr = _createPulseToken(
            tokenName,
            tokenSymbol,
            int64(uint64(pulse.totalSupply))
        );

        // 2. Distribute tokens: 3% protocol fee, 97% to creator
        uint256 fee = (pulse.totalSupply * LAUNCHPAD_FEE_BPS) / 10000;
        uint256 creatorAmount = pulse.totalSupply - fee;

        _transferPulse(tokenAddr, corpusProtocolWallet, int64(uint64(fee)));
        _transferPulse(tokenAddr, patron.creatorAddr, int64(uint64(creatorAmount)));

        // 3. Store corpus
        Corpus storage c = _corpuses[corpusId];
        c.id = corpusId;
        c.name = name;
        c.category = category;
        c.creator = msg.sender;
        c.patron = patron;
        c.kernel = kernel;
        c.pulse = pulse;
        c.pulse.hederaTokenAddr = tokenAddr;
        c.createdAt = block.timestamp;
        c.active = true;

        emit CorpusCreated(corpusId, msg.sender, name);
        emit PulseTokenCreated(corpusId, tokenAddr, pulse.totalSupply, fee);

        // Refund excess HBAR
        if (address(this).balance > 0) {
            (bool ok, ) = msg.sender.call{value: address(this).balance}("");
            require(ok, "refund failed");
        }
    }

    /**
     * @notice Update Patron (equity structure). Creator only.
     */
    function updatePatron(
        uint256 corpusId,
        PatronConfig calldata patron
    ) external onlyCreator(corpusId) corpusActive(corpusId) {
        _validateShares(patron);
        _validateAddresses(patron);
        _corpuses[corpusId].patron = patron;
        emit PatronUpdated(corpusId);
    }

    /**
     * @notice Update Kernel (governance policies). Creator only.
     */
    function updateKernel(
        uint256 corpusId,
        KernelConfig calldata kernel
    ) external onlyCreator(corpusId) corpusActive(corpusId) {
        _corpuses[corpusId].kernel = kernel;
        emit KernelUpdated(corpusId);
    }

    /**
     * @notice Update Pulse (token config — price only; token address is immutable).
     *         Creator only.
     */
    function updatePulse(
        uint256 corpusId,
        PulseConfig calldata pulse
    ) external onlyCreator(corpusId) corpusActive(corpusId) {
        _corpuses[corpusId].pulse = pulse;
        emit PulseUpdated(corpusId);
    }

    /**
     * @notice Deactivate a Corpus. Creator only. Irreversible.
     */
    function deactivateCorpus(
        uint256 corpusId
    ) external onlyCreator(corpusId) corpusActive(corpusId) {
        _corpuses[corpusId].active = false;
        emit CorpusDeactivated(corpusId);
    }

    // ── Read Functions ───────────────────────────────────────────────

    function getCorpus(uint256 corpusId) external view returns (Corpus memory) {
        if (_corpuses[corpusId].creator == address(0)) revert CorpusNotFound();
        return _corpuses[corpusId];
    }

    function isActive(uint256 corpusId) external view returns (bool) {
        return _corpuses[corpusId].active;
    }

    function creatorOf(uint256 corpusId) external view returns (address) {
        return _corpuses[corpusId].creator;
    }

    // ── Internal ─────────────────────────────────────────────────────

    function _createPulseToken(
        string calldata tokenName,
        string calldata tokenSymbol,
        int64 initialSupply
    ) internal returns (address) {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](0);

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken({
            name: tokenName,
            symbol: tokenSymbol,
            treasury: address(this),
            memo: "Corpus Pulse Token",
            tokenSupplyType: true,       // FINITE
            maxSupply: initialSupply,
            freezeDefault: false,
            tokenKeys: keys,
            expiry: IHederaTokenService.Expiry({
                second: int64(0),
                autoRenewAccount: address(this),
                autoRenewPeriod: int64(7776000) // 90 days
            })
        });

        (int64 responseCode, address tokenAddress) = hts.createFungibleToken{
            value: msg.value
        }(token, initialSupply, int32(6)); // 6 decimals

        if (responseCode != HTS_SUCCESS) revert HTSCreateFailed(responseCode);
        return tokenAddress;
    }

    function _transferPulse(
        address token,
        address to,
        int64 amount
    ) internal {
        if (amount == 0) return;
        int64 responseCode = hts.transferToken(token, address(this), to, amount);
        if (responseCode != HTS_SUCCESS) revert HTSTransferFailed(responseCode);
    }

    function _validateShares(PatronConfig calldata p) internal pure {
        if (
            uint256(p.creatorShare) +
                uint256(p.investorShare) +
                uint256(p.treasuryShare) !=
            10000
        ) revert InvalidShares();
    }

    function _validateAddresses(PatronConfig calldata p) internal pure {
        if (
            p.creatorAddr == address(0) ||
            p.investorAddr == address(0) ||
            p.treasuryAddr == address(0)
        ) revert InvalidAddress();
        if (
            p.creatorAddr == p.investorAddr ||
            p.creatorAddr == p.treasuryAddr ||
            p.investorAddr == p.treasuryAddr
        ) revert InvalidAddress();
    }

    /// @notice Allow contract to receive HBAR for HTS operations.
    receive() external payable {}
}
