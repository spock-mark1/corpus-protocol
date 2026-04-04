/**
 * Hedera operations via JSON-RPC relay (EVM-compatible).
 *
 * Uses ethers.js with Hedera's JSON-RPC endpoint for:
 * - HBAR transfers
 * - HTS token transfers (via ERC-20 interface on Hedera EVM)
 */

const HEDERA_RPC_URL = process.env.HEDERA_RPC_URL ?? "https://testnet.hashio.io/api";
const HEDERA_OPERATOR_KEY = process.env.HEDERA_OPERATOR_PRIVATE_KEY ?? "";

/**
 * Transfer HBAR from the operator account to a target EVM address.
 */
export async function transferHbar(
  toAddress: string,
  amountHbar: number,
): Promise<{ txHash: string }> {
  const { ethers } = await import("ethers");

  if (!HEDERA_OPERATOR_KEY) {
    throw new Error("HEDERA_OPERATOR_PRIVATE_KEY must be set for HBAR transfers");
  }

  const provider = new ethers.JsonRpcProvider(HEDERA_RPC_URL);
  const wallet = new ethers.Wallet(HEDERA_OPERATOR_KEY, provider);

  const tx = await wallet.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(String(amountHbar)),
  });

  const receipt = await tx.wait();
  return { txHash: receipt!.hash };
}

/**
 * Transfer HTS tokens using the ERC-20 interface exposed on Hedera EVM.
 * HTS tokens on Hedera can be accessed via their EVM address (0x + token shard/realm/num).
 */
export async function transferHtsToken(
  tokenEvmAddress: string,
  toAddress: string,
  amount: bigint,
): Promise<{ txHash: string }> {
  const { ethers } = await import("ethers");

  if (!HEDERA_OPERATOR_KEY) {
    throw new Error("HEDERA_OPERATOR_PRIVATE_KEY must be set for token transfers");
  }

  const provider = new ethers.JsonRpcProvider(HEDERA_RPC_URL);
  const wallet = new ethers.Wallet(HEDERA_OPERATOR_KEY, provider);

  const token = new ethers.Contract(
    tokenEvmAddress,
    ["function transfer(address to, uint256 amount) returns (bool)"],
    wallet,
  );

  const tx = await token.transfer(toAddress, amount);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

/**
 * Convert a Hedera token ID (0.0.XXXXX) to its EVM address.
 * The EVM address for a Hedera entity is: 0x + hex(entityNum) padded to 40 chars.
 */
export function hederaTokenIdToEvmAddress(tokenId: string): string {
  const parts = tokenId.split(".");
  const num = parseInt(parts[parts.length - 1], 10);
  return "0x" + num.toString(16).padStart(40, "0");
}
