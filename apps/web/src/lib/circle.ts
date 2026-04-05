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
 * Revenue model: all revenue stays in the Agent Treasury wallet.
 * No direct distribution to creator/investor/treasury.
 * Revenue is used for: agent operations, Pulse buyback & burn, service fees.
 */
