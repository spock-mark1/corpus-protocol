/**
 * Circle Developer-Controlled Wallets — Agent wallet management & signing proxy.
 *
 * All Circle keys live here (server-only). Prime Agents never touch private keys.
 */

import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY ?? "";
const CIRCLE_ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET ?? "";
const CIRCLE_WALLET_SET_ID = process.env.CIRCLE_WALLET_SET_ID ?? "";

let _client: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null;

function getClient() {
  if (_client) return _client;
  if (!CIRCLE_API_KEY || !CIRCLE_ENTITY_SECRET) {
    throw new Error("CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET must be set");
  }
  _client = initiateDeveloperControlledWalletsClient({
    apiKey: CIRCLE_API_KEY,
    entitySecret: CIRCLE_ENTITY_SECRET,
  });
  return _client;
}

/**
 * Create a new agent wallet on Arc (called during Corpus Genesis).
 * Returns { walletId, address }.
 */
export async function createAgentWallet(): Promise<{
  walletId: string;
  address: string;
}> {
  const client = getClient();

  const response = await client.createWallets({
    walletSetId: CIRCLE_WALLET_SET_ID,
    blockchains: ["EVM-TESTNET"],
    count: 1,
    accountType: "EOA",
  });

  const wallet = response.data?.wallets?.[0];
  if (!wallet?.id || !wallet?.address) {
    throw new Error("Failed to create Circle wallet");
  }

  // Auto-fund from Circle testnet faucet (best-effort, non-blocking)
  requestTestnetFunding(wallet.address).catch(() => {});

  return {
    walletId: wallet.id,
    address: wallet.address,
  };
}

/**
 * Request testnet USDC from Circle faucet.
 * Best-effort — failure doesn't block wallet creation.
 */
async function requestTestnetFunding(address: string): Promise<void> {
  try {
    const res = await fetch("https://faucet.circle.com/api/drip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        blockchain: "EVM",
        native: false,
        usdc: true,
      }),
    });
    if (res.ok) {
      console.log(`Circle faucet: funded ${address} with testnet USDC`);
    } else {
      console.warn(`Circle faucet returned ${res.status} for ${address}`);
    }
  } catch (err) {
    console.warn("Circle faucet request failed:", err);
  }
}

/**
 * Sign EIP-3009 transferWithAuthorization via Circle MPC.
 * Agent calls this through POST /api/corpus/:id/sign.
 */
export async function signPayment(
  walletId: string,
  payload: {
    from: string;
    to: string;
    value: string;
    validAfter: number;
    validBefore: number;
    nonce: string;
    chainId: number;
    tokenAddress: string;
  }
): Promise<{ signature: string }> {
  const client = getClient();

  const domain = {
    name: "USD Coin",
    version: "2",
    chainId: payload.chainId,
    verifyingContract: payload.tokenAddress,
  };

  const types = {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  };

  const message = {
    from: payload.from,
    to: payload.to,
    value: payload.value,
    validAfter: payload.validAfter,
    validBefore: payload.validBefore,
    nonce: payload.nonce,
  };

  const typedData = {
    domain,
    types,
    primaryType: "TransferWithAuthorization" as const,
    message,
  };

  const response = await client.signTypedData({
    walletId,
    data: JSON.stringify(typedData),
  });

  const signature = response.data?.signature;
  if (!signature) {
    throw new Error("Circle MPC signing failed — no signature returned");
  }

  return { signature };
}

/**
 * Broadcast EIP-3009 transferWithAuthorization to Arc network.
 * Calls the USDC contract's transferWithAuthorization function on-chain.
 * Returns the transaction hash.
 */
export async function broadcastTransferWithAuthorization(payload: {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  signature: string;
  chainId?: number;
  tokenAddress?: string;
}): Promise<{ txHash: string }> {
  const { ethers } = await import("ethers");

  const arcRpcUrl = process.env.ARC_RPC_URL ?? "https://rpc.arc.money";
  const relayerKey = process.env.ARC_RELAYER_PRIVATE_KEY ?? "";
  if (!relayerKey) {
    throw new Error("ARC_RELAYER_PRIVATE_KEY must be set for on-chain broadcasts");
  }

  const provider = new ethers.JsonRpcProvider(arcRpcUrl);
  const relayer = new ethers.Wallet(relayerKey, provider);

  const tokenAddress =
    payload.tokenAddress ??
    process.env.NEXT_PUBLIC_USDC_ADDRESS ??
    "0x79A02482A880bCE3B13e09Da970dC34db4CD24d1";

  // EIP-3009 transferWithAuthorization ABI
  const usdc = new ethers.Contract(
    tokenAddress,
    [
      "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
    ],
    relayer,
  );

  // Split signature into v, r, s
  const sig = ethers.Signature.from(payload.signature);

  const tx = await usdc.transferWithAuthorization(
    payload.from,
    payload.to,
    payload.value,
    payload.validAfter,
    payload.validBefore,
    payload.nonce,
    sig.v,
    sig.r,
    sig.s,
  );

  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

/**
 * Distribute revenue by sending USDC from the agent wallet to
 * Creator, Investor, and Treasury wallets based on share percentages.
 *
 * Uses Circle MPC signing + Arc broadcast for each transfer.
 */
export async function distributeRevenue(params: {
  agentWalletId: string;
  agentWalletAddress: string;
  amountUsdc: number; // e.g. 10.5 (human-readable)
  shares: { address: string; percent: number; label: string }[];
}): Promise<{ distributions: { label: string; address: string; amount: number; txHash: string | null }[] }> {
  const { ethers } = await import("ethers");
  const distributions: { label: string; address: string; amount: number; txHash: string | null }[] = [];

  const chainId = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 480);
  const tokenAddress =
    process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x79A02482A880bCE3B13e09Da970dC34db4CD24d1";
  const hasRelayer = !!process.env.ARC_RELAYER_PRIVATE_KEY;

  for (const share of params.shares) {
    if (!share.address || share.percent <= 0) continue;

    const shareAmount = params.amountUsdc * (share.percent / 100);
    if (shareAmount <= 0) continue;

    const amountUnits = Math.floor(shareAmount * 1_000_000); // USDC 6 decimals
    const now = Math.floor(Date.now() / 1000);
    const nonce = "0x" + (await import("crypto")).randomBytes(32).toString("hex");

    try {
      // Sign via Circle MPC
      const sigResult = await signPayment(params.agentWalletId, {
        from: params.agentWalletAddress,
        to: share.address,
        value: String(amountUnits),
        validAfter: 0,
        validBefore: now + 3600,
        nonce,
        chainId,
        tokenAddress,
      });

      let txHash: string | null = null;

      // Broadcast if relayer is configured
      if (hasRelayer) {
        try {
          const broadcastResult = await broadcastTransferWithAuthorization({
            from: params.agentWalletAddress,
            to: share.address,
            value: String(amountUnits),
            validAfter: 0,
            validBefore: now + 3600,
            nonce,
            signature: sigResult.signature,
            chainId,
            tokenAddress,
          });
          txHash = broadcastResult.txHash;
        } catch (err) {
          console.error(`Revenue distribution broadcast failed for ${share.label}:`, err);
        }
      }

      distributions.push({
        label: share.label,
        address: share.address,
        amount: shareAmount,
        txHash,
      });
    } catch (err) {
      console.error(`Revenue distribution signing failed for ${share.label}:`, err);
      distributions.push({
        label: share.label,
        address: share.address,
        amount: shareAmount,
        txHash: null,
      });
    }
  }

  return { distributions };
}
