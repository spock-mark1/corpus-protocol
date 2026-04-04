import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAgentApiKey } from "@/lib/auth";
import { transferHbar, transferHtsToken, hederaTokenIdToEvmAddress } from "@/lib/hedera";

// POST /api/corpus/:id/transfer — Execute HBAR or HTS token transfer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await verifyAgentApiKey(request, id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { to, amount, currency, tokenId } = body;

    if (!to || amount == null) {
      return Response.json(
        { error: "to and amount are required" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return Response.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    // Check approval threshold
    const corpus = await db
      .select({ approvalThreshold: cppCorpus.approvalThreshold })
      .from(cppCorpus)
      .where(eq(cppCorpus.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (corpus && amount > Number(corpus.approvalThreshold)) {
      return Response.json(
        {
          error: "Amount exceeds approval threshold. Create an approval request first.",
          amount,
          threshold: Number(corpus.approvalThreshold),
        },
        { status: 403 }
      );
    }

    if (currency === "HBAR" || (!currency && !tokenId)) {
      const result = await transferHbar(to, amount);
      return Response.json({
        status: "completed",
        currency: "HBAR",
        to,
        amount,
        txHash: result.txHash,
      });
    }

    // HTS token transfer (Pulse or other HTS tokens)
    if (tokenId) {
      const evmAddress = hederaTokenIdToEvmAddress(tokenId);
      const amountUnits = BigInt(Math.floor(amount)); // Pulse tokens are whole units
      const result = await transferHtsToken(evmAddress, to, amountUnits);
      return Response.json({
        status: "completed",
        currency: "HTS",
        tokenId,
        to,
        amount,
        txHash: result.txHash,
      });
    }

    return Response.json({ error: "Specify currency=HBAR or provide tokenId" }, { status: 400 });
  } catch (err) {
    console.error("Transfer error:", err);
    return Response.json({ error: "Transfer failed", details: String(err) }, { status: 500 });
  }
}
