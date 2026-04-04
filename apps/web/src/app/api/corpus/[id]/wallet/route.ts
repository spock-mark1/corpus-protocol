import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAgentApiKey } from "@/lib/auth";
import { createAgentWallet } from "@/lib/circle";

// GET /api/corpus/:id/wallet — Agent fetches its Circle wallet info at startup
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await verifyAgentApiKey(request, id);
    if (!auth.ok) return auth.response;

    const corpus = await db
      .select({
        agentWalletId: cppCorpus.agentWalletId,
        agentWalletAddress: cppCorpus.agentWalletAddress,
      })
      .from(cppCorpus)
      .where(eq(cppCorpus.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!corpus?.agentWalletId) {
      return Response.json({ error: "No agent wallet created for this Corpus" }, { status: 404 });
    }

    return Response.json({
      walletId: corpus.agentWalletId,
      address: corpus.agentWalletAddress,
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/corpus/:id/wallet — Create Circle wallet for a Corpus that doesn't have one
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await verifyAgentApiKey(request, id);
    if (!auth.ok) return auth.response;

    // Check if wallet already exists
    const corpus = await db
      .select({
        agentWalletId: cppCorpus.agentWalletId,
        agentWalletAddress: cppCorpus.agentWalletAddress,
      })
      .from(cppCorpus)
      .where(eq(cppCorpus.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (corpus?.agentWalletId) {
      return Response.json({
        walletId: corpus.agentWalletId,
        address: corpus.agentWalletAddress,
        created: false,
      });
    }

    // Create new Circle MPC wallet
    const wallet = await createAgentWallet();

    await db
      .update(cppCorpus)
      .set({
        agentWalletId: wallet.walletId,
        agentWalletAddress: wallet.address,
      })
      .where(eq(cppCorpus.id, id));

    return Response.json({
      walletId: wallet.walletId,
      address: wallet.address,
      created: true,
    }, { status: 201 });
  } catch (err) {
    return Response.json({ error: "Wallet creation failed", details: String(err) }, { status: 500 });
  }
}
