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
export async function requestTestnetFunding(address: string): Promise<void> {
  try {
    const apiKey = process.env.CIRCLE_API_KEY ?? "";
    if (!apiKey) {
      console.warn("Circle faucet: CIRCLE_API_KEY not set, skipping funding");
      return;
    }
    const res = await fetch("https://api.circle.com/v1/faucet/drips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        address,
        blockchain: "ARC-TESTNET",
        native: true,
        usdc: true,
      }),
    });
    if (res.ok) {
      console.log(`Circle faucet: funded ${address} with testnet USDC on ARC`);
    } else if (res.status === 429) {
      console.warn(`Circle faucet: rate limited for ${address} (retry-after: ${res.headers.get("retry-after")}s)`);
    } else {
      const body = await res.text().catch(() => "");
      console.warn(`Circle faucet returned ${res.status} for ${address}: ${body}`);
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
    name: "USDC",
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
    value: String(payload.value),
    validAfter: String(payload.validAfter),
    validBefore: String(payload.validBefore),
    nonce: payload.nonce,
  };

  // Circle SDK expects EIP-712 typed data as a JSON string
  // All uint256 values must be strings, domain.chainId must be a number
  const typedData = {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      ...types,
    },
    domain,
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

  const arcRpcUrl = process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network";
  const relayerKey = process.env.ARC_RELAYER_PRIVATE_KEY ?? "";
  if (!relayerKey) {
    throw new Error("ARC_RELAYER_PRIVATE_KEY must be set for on-chain broadcasts");
  }

  const provider = new ethers.JsonRpcProvider(arcRpcUrl);
  const relayer = new ethers.Wallet(relayerKey, provider);

  const tokenAddress =
    payload.tokenAddress ??
    process.env.NEXT_PUBLIC_USDC_ADDRESS ??
    "0x3600000000000000000000000000000000000000";

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
 * Check USDC balance for a wallet on Arc testnet.
 * Returns balance in smallest unit (6 decimals).
 */
export async function getUsdcBalance(walletAddress: string): Promise<bigint> {
  const { ethers } = await import("ethers");

  const arcRpcUrl = process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network";
  const tokenAddress =
    process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x3600000000000000000000000000000000000000";

  const provider = new ethers.JsonRpcProvider(arcRpcUrl);
  const usdc = new ethers.Contract(
    tokenAddress,
    ["function balanceOf(address) view returns (uint256)"],
    provider,
  );

  return usdc.balanceOf(walletAddress);
}

/**
 * Ensure a wallet has enough USDC for a payment.
 * If balance is insufficient, retries faucet funding and waits briefly.
 * Returns { sufficient, balance } so callers can decide what to do.
 */
export async function ensureFunded(
  walletAddress: string,
  requiredAmount: bigint,
): Promise<{ sufficient: boolean; balance: bigint }> {
  let balance = await getUsdcBalance(walletAddress);
  if (balance >= requiredAmount) {
    return { sufficient: true, balance };
  }

  // Attempt faucet funding and wait for it to land
  console.log(`Wallet ${walletAddress} has ${balance} USDC, need ${requiredAmount}. Requesting faucet...`);
  await requestTestnetFunding(walletAddress);

  // Wait up to 15 seconds for faucet tx to land
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    balance = await getUsdcBalance(walletAddress);
    if (balance >= requiredAmount) {
      return { sufficient: true, balance };
    }
  }

  return { sufficient: false, balance };
}

/**
 * Revenue model: all revenue stays in the Agent Treasury wallet.
 * No direct distribution to creator/investor/treasury.
 * Revenue is used for: agent operations, Pulse buyback & burn, service fees.
 */
