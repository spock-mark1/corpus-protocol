import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  cppCorpus,
  cppPlaybooks,
  cppPlaybookPurchases,
  cppRevenues,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { broadcastTransferWithAuthorization, getUsdcBalance } from "@/lib/circle";

const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 5042002);
const USDC_ADDRESS =
  process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  "0x3600000000000000000000000000000000000000";

// POST /api/playbooks/:id/purchase — Purchase a playbook (requires x402 payment)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Authenticate buyer via Bearer token (timing-safe via verifyAgentApiKey)
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Missing Authorization header. Use: Bearer <api_key>" },
        { status: 401 }
      );
    }
    const apiKeyToken = authHeader.slice(7);
    const buyer = await db
      .select({ id: cppCorpus.id })
      .from(cppCorpus)
      .where(eq(cppCorpus.apiKey, apiKeyToken))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!buyer) {
      return Response.json({ error: "Invalid API key" }, { status: 403 });
    }

    const body = await request.json();
    const { buyerAddress, signature, from, to, value, nonce } = body;

    if (!buyerAddress || !signature || !from || !to || !value || !nonce) {
      return Response.json(
        { error: "buyerAddress, signature, from, to, value, and nonce are required" },
        { status: 400 }
      );
    }

    const playbook = await db
      .select()
      .from(cppPlaybooks)
      .where(eq(cppPlaybooks.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!playbook) {
      return Response.json({ error: "Playbook not found" }, { status: 404 });
    }

    if (playbook.status !== "active") {
      return Response.json(
        { error: "Playbook is not available for purchase" },
        { status: 400 }
      );
    }

    // 2. Verify payee matches the seller's wallet
    const sellerCorpus = await db
      .select({ agentWalletAddress: cppCorpus.agentWalletAddress, walletAddress: cppCorpus.walletAddress })
      .from(cppCorpus)
      .where(eq(cppCorpus.id, playbook.corpusId))
      .limit(1)
      .then((r) => r[0] ?? null);

    const expectedPayee = sellerCorpus?.agentWalletAddress || sellerCorpus?.walletAddress;
    if (expectedPayee && to.toLowerCase() !== expectedPayee.toLowerCase()) {
      return Response.json(
        { error: "Payment 'to' address does not match seller wallet" },
        { status: 400 }
      );
    }

    // 3. Verify payment amount (string-based to avoid float rounding)
    const paidAmount = BigInt(value);
    const priceParts = String(playbook.price).split(".");
    const whole = priceParts[0];
    const frac = (priceParts[1] ?? "").slice(0, 6).padEnd(6, "0");
    const requiredAmount = BigInt(whole + frac);

    if (paidAmount < requiredAmount) {
      return Response.json(
        { error: "Insufficient payment amount" },
        { status: 402 }
      );
    }

    // 4. Replay prevention — check signature against existing purchases
    const existingBySig = await db
      .select({ id: cppPlaybookPurchases.id })
      .from(cppPlaybookPurchases)
      .where(eq(cppPlaybookPurchases.txHash, signature))
      .limit(1)
      .then((r) => r[0] ?? null);
    if (existingBySig) {
      return Response.json({ error: "Payment signature already used (replay detected)" }, { status: 409 });
    }

    // 5. Verify EIP-3009 signature
    const { ethers } = await import("ethers");
    const EIP3009_DOMAIN = {
      name: "USDC",
      version: "2",
      chainId: ARC_CHAIN_ID,
      verifyingContract: USDC_ADDRESS,
    };
    const EIP3009_TYPES = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    };

    const now = Math.floor(Date.now() / 1000);
    const validAfter = Number(body.validAfter ?? 0);
    const validBefore = Number(body.validBefore ?? now + 300);

    if (now < validAfter || now > validBefore) {
      return Response.json(
        { error: "Payment signature expired or not yet valid" },
        { status: 403 }
      );
    }

    const sigValue = { from, to, value, validAfter, validBefore, nonce };
    const recovered = ethers.verifyTypedData(
      EIP3009_DOMAIN,
      EIP3009_TYPES,
      sigValue,
      signature
    );
    if (recovered.toLowerCase() !== from.toLowerCase()) {
      return Response.json(
        { error: "Invalid payment signature" },
        { status: 403 }
      );
    }

    // 6. Check for duplicate purchase (same buyer + same playbook)
    const existing = await db
      .select()
      .from(cppPlaybookPurchases)
      .where(
        and(
          eq(cppPlaybookPurchases.playbookId, id),
          eq(cppPlaybookPurchases.buyerAddress, buyerAddress)
        )
      )
      .limit(1)
      .then((r) => r[0] ?? null);

    if (existing) {
      return Response.json(
        { error: "Already purchased this playbook" },
        { status: 409 }
      );
    }

    // 7. Recheck payer balance before broadcast
    try {
      const payerBalance = await getUsdcBalance(from);
      if (payerBalance < paidAmount) {
        return Response.json({ error: "Insufficient USDC balance" }, { status: 402 });
      }
    } catch {
      return Response.json({ error: "Unable to verify payer balance" }, { status: 503 });
    }

    // 8. Broadcast payment on-chain (mandatory)
    if (!process.env.ARC_RELAYER_PRIVATE_KEY) {
      return Response.json({ error: "Payment infrastructure not configured" }, { status: 503 });
    }

    let txHash: string;
    try {
      const result = await broadcastTransferWithAuthorization({
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        signature,
        chainId: ARC_CHAIN_ID,
        tokenAddress: USDC_ADDRESS,
      });
      txHash = result.txHash;
    } catch (broadcastErr) {
      console.error("Playbook purchase broadcast failed:", broadcastErr);
      return Response.json(
        { error: "On-chain payment broadcast failed" },
        { status: 502 }
      );
    }

    // 9. Record purchase + revenue
    const [purchase] = await db
      .insert(cppPlaybookPurchases)
      .values({
        playbookId: id,
        buyerAddress,
        txHash,
      })
      .returning();

    await db.insert(cppRevenues).values({
      corpusId: playbook.corpusId,
      amount: playbook.price,
      currency: playbook.currency,
      source: "commerce",
      txHash,
    });

    return Response.json(purchase, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
