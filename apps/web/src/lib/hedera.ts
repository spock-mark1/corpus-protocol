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
 * Record an approval decision on-chain as a zero-value tx with memo.
 */
export async function recordApprovalOnChain(
  approvalId: string,
  corpusId: string,
  status: "approved" | "rejected",
  decidedBy: string,
): Promise<{ txHash: string } | null> {
  const { ethers } = await import("ethers");

  if (!HEDERA_OPERATOR_KEY) {
    console.warn("[hedera] HEDERA_OPERATOR_PRIVATE_KEY not set, skipping on-chain record");
    return null;
  }

  try {
    const provider = new ethers.JsonRpcProvider(HEDERA_RPC_URL);
    const wallet = new ethers.Wallet(HEDERA_OPERATOR_KEY, provider);

    const memo = JSON.stringify({
      type: "approval_decision",
      approvalId,
      corpusId,
      status,
      decidedBy,
      timestamp: new Date().toISOString(),
    });

    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: BigInt(0),
      data: ethers.hexlify(ethers.toUtf8Bytes(memo)),
    });

    const receipt = await tx.wait();
    return { txHash: receipt!.hash };
  } catch (err) {
    console.error("[hedera] Failed to record approval on-chain:", err);
    return null;
  }
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
