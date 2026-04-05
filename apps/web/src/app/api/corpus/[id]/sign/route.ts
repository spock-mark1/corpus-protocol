import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAgentApiKey } from "@/lib/auth";
import { signPayment, ensureFunded } from "@/lib/circle";
import crypto from "crypto";

const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID ?? 5042002);
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "0x3600000000000000000000000000000000000000";

// POST /api/corpus/:id/sign — Signing proxy for x402 payments
// Agent sends payment details, Web signs via Circle MPC, returns signature
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Authenticate agent
    const auth = await verifyAgentApiKey(request, id);
    if (!auth.ok) return auth.response;

    // 2. Get corpus wallet info
    const corpus = await db
      .select({
        agentWalletId: cppCorpus.agentWalletId,
        agentWalletAddress: cppCorpus.agentWalletAddress,
        approvalThreshold: cppCorpus.approvalThreshold,
      })
      .from(cppCorpus)
      .where(eq(cppCorpus.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!corpus?.agentWalletId || !corpus?.agentWalletAddress) {
      return Response.json({ error: "No agent wallet for this Corpus" }, { status: 404 });
    }

    // 3. Parse request
    const body = await request.json();
    const { payee, amount, tokenAddress, chainId } = body;

    if (!payee || amount == null) {
      return Response.json({ error: "payee and amount are required" }, { status: 400 });
    }

    // 4. Check against Kernel approval threshold (amount is in USDC, 6 decimals)
    const amountUsd = Number(amount) / 1_000_000;
    const threshold = Number(corpus.approvalThreshold);
    if (amountUsd > threshold) {
      return Response.json(
        {
          error: "Amount exceeds approval threshold",
          amountUsd,
          threshold,
          message: "Create an approval request first",
        },
        { status: 403 }
      );
    }

    // 5. Check USDC balance before signing (avoid signing then failing at broadcast)
    const requiredAmount = BigInt(amount);
    const { sufficient, balance } = await ensureFunded(corpus.agentWalletAddress, requiredAmount);
    if (!sufficient) {
      return Response.json(
        {
          error: "Insufficient USDC balance",
          balance: balance.toString(),
          required: requiredAmount.toString(),
          amountUsd,
          walletAddress: corpus.agentWalletAddress,
          message: "Agent wallet does not have enough USDC. Faucet funding was attempted but balance is still insufficient.",
        },
        { status: 402 },
      );
    }

    // 6. Build EIP-3009 payload and sign via Circle MPC
    const now = Math.floor(Date.now() / 1000);
    const nonce = "0x" + crypto.randomBytes(32).toString("hex");

    const signature = await signPayment(corpus.agentWalletId, {
      from: corpus.agentWalletAddress,
      to: payee,
      value: String(amount),
      validAfter: 0,
      validBefore: now + 3600,
      nonce,
      chainId: chainId ?? ARC_CHAIN_ID,
      tokenAddress: tokenAddress ?? USDC_ADDRESS,
    });

    // 7. Return full X-PAYMENT header value
    const paymentHeader = JSON.stringify({
      signature: signature.signature,
      from: corpus.agentWalletAddress,
      to: payee,
      value: String(amount),
      validAfter: 0,
      validBefore: now + 3600,
      nonce,
      token: tokenAddress ?? USDC_ADDRESS,
      chainId: chainId ?? ARC_CHAIN_ID,
    });

    return Response.json({
      paymentHeader,
      from: corpus.agentWalletAddress,
      to: payee,
      amount: String(amount),
    });
  } catch (err) {
    console.error("Signing error:", err);
    return Response.json({ error: "Signing failed", details: String(err) }, { status: 500 });
  }
}
