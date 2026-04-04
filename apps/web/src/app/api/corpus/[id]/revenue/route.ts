import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppRevenues } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { verifyAgentApiKey } from "@/lib/auth";
import { distributeRevenue } from "@/lib/circle";

// GET /api/corpus/:id/revenue — Get revenue history
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const corpus = await db
      .select({ id: cppCorpus.id })
      .from(cppCorpus)
      .where(eq(cppCorpus.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!corpus) {
      return Response.json({ error: "Corpus not found" }, { status: 404 });
    }

    const revenues = await db
      .select()
      .from(cppRevenues)
      .where(eq(cppRevenues.corpusId, id))
      .orderBy(desc(cppRevenues.createdAt))
      .limit(50);

    return Response.json(revenues);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/corpus/:id/revenue — Report revenue (from Local Agent)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await verifyAgentApiKey(request, id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { amount, currency, source, txHash } = body;

    const validSources = ["commerce", "direct", "subscription"];
    const validCurrencies = ["USDC", "HBAR", "USDT"];

    if (amount === undefined || !source) {
      return Response.json(
        { error: "amount, source are required" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return Response.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    if (!validSources.includes(source)) {
      return Response.json(
        { error: `source must be one of: ${validSources.join(", ")}` },
        { status: 400 }
      );
    }

    if (currency && !validCurrencies.includes(currency)) {
      return Response.json(
        { error: `currency must be one of: ${validCurrencies.join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch corpus config for share ratios and wallet addresses
    const corpus = await db
      .select({
        creatorShare: cppCorpus.creatorShare,
        investorShare: cppCorpus.investorShare,
        treasuryShare: cppCorpus.treasuryShare,
        creatorAddress: cppCorpus.creatorAddress,
        investorAddress: cppCorpus.investorAddress,
        treasuryAddress: cppCorpus.treasuryAddress,
        agentWalletId: cppCorpus.agentWalletId,
        agentWalletAddress: cppCorpus.agentWalletAddress,
      })
      .from(cppCorpus)
      .where(eq(cppCorpus.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    // Record revenue in DB
    const [revenue] = await db
      .insert(cppRevenues)
      .values({
        corpusId: id,
        amount: String(amount),
        currency: currency ?? "USDC",
        source,
        txHash,
      })
      .returning();

    // Auto-distribute revenue to Creator/Investor/Treasury (best-effort, async)
    let distributions = null;
    if (corpus?.agentWalletId && corpus?.agentWalletAddress && (currency ?? "USDC") === "USDC") {
      const shares = [
        { address: corpus.creatorAddress ?? "", percent: corpus.creatorShare, label: "creator" },
        { address: corpus.investorAddress ?? "", percent: corpus.investorShare, label: "investor" },
        { address: corpus.treasuryAddress ?? "", percent: corpus.treasuryShare, label: "treasury" },
      ].filter((s) => s.address && s.percent > 0);

      if (shares.length > 0) {
        try {
          const result = await distributeRevenue({
            agentWalletId: corpus.agentWalletId,
            agentWalletAddress: corpus.agentWalletAddress,
            amountUsdc: amount,
            shares,
          });
          distributions = result.distributions;
        } catch (err) {
          console.error("Revenue distribution failed:", err);
        }
      }
    }

    return Response.json({ ...revenue, distributions }, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
