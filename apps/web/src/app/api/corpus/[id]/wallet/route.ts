import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyAgentApiKey } from "@/lib/auth";

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
