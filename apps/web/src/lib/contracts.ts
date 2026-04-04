import { BrowserProvider, Contract, type Signer } from "ethers";

// ── Contract Addresses (set after deployment) ────────────────────
const REGISTRY_ADDRESS =
  process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? "";
const NAME_SERVICE_ADDRESS =
  process.env.NEXT_PUBLIC_NAME_SERVICE_ADDRESS ?? "";

// ── ABIs (minimal, only the functions we call from the frontend) ─

export const REGISTRY_ABI = [
  // createCorpus (payable — sends HBAR for HTS token creation)
  // Note: patron tuple retained for on-chain ABI compatibility. Revenue model is 100% Agent Treasury off-chain.
  "function createCorpus(string name, string category, tuple(uint16 creatorShare, uint16 investorShare, uint16 treasuryShare, address creatorAddr, address investorAddr, address treasuryAddr) patron, tuple(uint256 approvalThreshold, uint256 gtmBudget, uint256 minPatronPulse) kernel, tuple(address hederaTokenAddr, uint256 totalSupply, uint256 priceUsdCents) pulse, string tokenName, string tokenSymbol) external payable returns (uint256)",
  // updates (patron shares no longer used for revenue distribution)
  "function updatePatron(uint256 corpusId, tuple(uint16 creatorShare, uint16 investorShare, uint16 treasuryShare, address creatorAddr, address investorAddr, address treasuryAddr) patron) external",
  "function updateKernel(uint256 corpusId, tuple(uint256 approvalThreshold, uint256 gtmBudget, uint256 minPatronPulse) kernel) external",
  "function updatePulse(uint256 corpusId, tuple(address hederaTokenAddr, uint256 totalSupply, uint256 priceUsdCents) pulse) external",
  "function deactivateCorpus(uint256 corpusId) external",
  // reads
  "function getCorpus(uint256 corpusId) external view returns (tuple(uint256 id, string name, string category, address creator, tuple(uint16 creatorShare, uint16 investorShare, uint16 treasuryShare, address creatorAddr, address investorAddr, address treasuryAddr) patron, tuple(uint256 approvalThreshold, uint256 gtmBudget, uint256 minPatronPulse) kernel, tuple(address hederaTokenAddr, uint256 totalSupply, uint256 priceUsdCents) pulse, uint256 createdAt, bool active))",
  "function nextCorpusId() external view returns (uint256)",
  "function creatorOf(uint256 corpusId) external view returns (address)",
  "function isActive(uint256 corpusId) external view returns (bool)",
  // events
  "event CorpusCreated(uint256 indexed corpusId, address indexed creator, string name)",
  "event PulseTokenCreated(uint256 indexed corpusId, address tokenAddress, uint256 totalSupply, uint256 protocolFee)",
] as const;

export const NAME_SERVICE_ABI = [
  "function registerName(uint256 corpusId, string name) external",
  "function resolveName(string name) external view returns (uint256)",
  "function nameOf(uint256 corpusId) external view returns (string)",
  "function isNameAvailable(string name) external view returns (bool)",
  "function hasName(uint256 corpusId) external view returns (bool)",
  "event NameRegistered(uint256 indexed corpusId, string name)",
] as const;

// ── Hedera Testnet ───────────────────────────────────────────────

export const HEDERA_TESTNET = {
  chainId: 296,
  name: "Hedera Testnet",
  rpcUrl: "https://testnet.hashio.io/api",
};

// ── Contract Instances ───────────────────────────────────────────

export function getRegistryContract(signer: Signer) {
  return new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
}

export function getNameServiceContract(signer: Signer) {
  return new Contract(NAME_SERVICE_ADDRESS, NAME_SERVICE_ABI, signer);
}

// Read-only (no signer needed)
export function getRegistryReadOnly() {
  const { JsonRpcProvider } = require("ethers") as typeof import("ethers");
  const provider = new JsonRpcProvider(HEDERA_TESTNET.rpcUrl);
  return new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
}

export function getNameServiceReadOnly() {
  const { JsonRpcProvider } = require("ethers") as typeof import("ethers");
  const provider = new JsonRpcProvider(HEDERA_TESTNET.rpcUrl);
  return new Contract(NAME_SERVICE_ADDRESS, NAME_SERVICE_ABI, provider);
}

// ── Network Validation ──────────────────────────────────────────

/**
 * Ensure the connected wallet is on Hedera Testnet.
 * Throws a user-friendly error if on the wrong network.
 */
export async function ensureHederaTestnet(provider: BrowserProvider): Promise<void> {
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== HEDERA_TESTNET.chainId) {
    throw new Error(
      `Wrong network: please switch to Hedera Testnet (chainId ${HEDERA_TESTNET.chainId}). Currently connected to chainId ${network.chainId}.`
    );
  }
}

// ── Signer from Dynamic Labs ──��───────────────────────────���─────

/**
 * Get an ethers.js Signer from a Dynamic Labs wallet.
 * Dynamic Labs connectors expose a viem WalletClient via getWalletClient().
 * We use the underlying EIP-1193 transport to create an ethers BrowserProvider.
 */
export async function getSignerFromDynamic(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallet: any
): Promise<Signer> {
  // Dynamic Labs EVM connectors expose getWalletClient() which has a transport
  const walletClient = wallet.connector?.getWalletClient?.();
  if (walletClient?.transport) {
    // Viem WalletClient transport has an EIP-1193 provider
    const provider = new BrowserProvider(walletClient.transport);
    return provider.getSigner();
  }
  // Fallback: try window.ethereum directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = typeof window !== "undefined" ? (window as any) : undefined;
  if (win?.ethereum) {
    const provider = new BrowserProvider(win.ethereum);
    return provider.getSigner();
  }
  throw new Error("No EVM provider found. Connect a wallet first.");
}
