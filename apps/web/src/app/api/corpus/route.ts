import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppPatrons, cppCommerceServices } from "@/db/schema";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { createAgentWallet } from "@/lib/circle";
import { createCorpusSchema, parseBody } from "@/lib/schemas";

// GET /api/corpus — List corpuses with cursor-based pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 100);

    const patronCount = db
      .select({
        corpusId: cppPatrons.corpusId,
        count: sql<number>`count(*)::int`.as("count"),
      })
      .from(cppPatrons)
      .groupBy(cppPatrons.corpusId)
      .as("patronCount");

    // Build cursor condition (createdAt DESC with id tiebreaker)
    const conditions = [];
    if (cursor) {
      // Cursor format: "<createdAt ISO>|<id>"
      const [cursorDate, cursorId] = cursor.split("|");
      if (cursorDate && cursorId) {
        conditions.push(
          or(
            lt(cppCorpus.createdAt, new Date(cursorDate)),
            and(
              eq(cppCorpus.createdAt, new Date(cursorDate)),
              lt(cppCorpus.id, cursorId),
            ),
          )!,
        );
      }
    }

    const corpuses = await db
      .select({
        id: cppCorpus.id,
        onChainId: cppCorpus.onChainId,
        agentName: cppCorpus.agentName,
        name: cppCorpus.name,
        category: cppCorpus.category,
        description: cppCorpus.description,
        status: cppCorpus.status,
        hederaTokenId: cppCorpus.hederaTokenId,
        pulsePrice: cppCorpus.pulsePrice,
        totalSupply: cppCorpus.totalSupply,
        creatorShare: cppCorpus.creatorShare,
        investorShare: cppCorpus.investorShare,
        treasuryShare: cppCorpus.treasuryShare,
        persona: cppCorpus.persona,
        targetAudience: cppCorpus.targetAudience,
        channels: cppCorpus.channels,
        toneVoice: cppCorpus.toneVoice,
        approvalThreshold: cppCorpus.approvalThreshold,
        gtmBudget: cppCorpus.gtmBudget,
        minPatronPulse: cppCorpus.minPatronPulse,
        agentOnline: cppCorpus.agentOnline,
        agentLastSeen: cppCorpus.agentLastSeen,
        walletAddress: cppCorpus.walletAddress,
        creatorAddress: cppCorpus.creatorAddress,
        investorAddress: cppCorpus.investorAddress,
        treasuryAddress: cppCorpus.treasuryAddress,
        createdAt: cppCorpus.createdAt,
        updatedAt: cppCorpus.updatedAt,
        patrons: patronCount.count,
      })
      .from(cppCorpus)
      .leftJoin(patronCount, eq(cppCorpus.id, patronCount.corpusId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(cppCorpus.createdAt), desc(cppCorpus.id))
      .limit(limit + 1);

    const hasMore = corpuses.length > limit;
    const page = hasMore ? corpuses.slice(0, limit) : corpuses;

    const data = page.map((c) => ({
      ...c,
      patrons: c.patrons ?? 0,
    }));

    const lastItem = page[page.length - 1];
    const nextCursor = hasMore && lastItem
      ? `${lastItem.createdAt.toISOString()}|${lastItem.id}`
      : null;

    return Response.json({ data, nextCursor });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/corpus — Create a new Corpus (Genesis)
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, createCorpusSchema);
    if (parsed.error) return parsed.error;

    const {
      name,
      category,
      description,
      totalSupply: supply,
      persona,
      targetAudience,
      channels,
      approvalThreshold,
      gtmBudget,
      creatorAddress,
      walletAddress,
      onChainId,
      agentName,
      toneVoice,
      initialPrice,
      minPatronPulse,
      hederaTokenId,
      tokenSymbol,
      serviceName,
      serviceDescription,
      servicePrice,
    } = parsed.data;

    // Generate API key for local agent
    const apiKey = `cpk_${randomBytes(24).toString("hex")}`;

    // Create Circle MPC wallet for Prime Agent (x402 payments on Arc)
    let agentWalletId: string | null = null;
    let agentWalletAddress: string | null = null;
    try {
      const wallet = await createAgentWallet();
      agentWalletId = wallet.walletId;
      agentWalletAddress = wallet.address;
    } catch (err) {
      console.error("Circle wallet creation failed:", err);
      // Non-blocking — corpus can still be created without agent wallet
    }

    // Revenue model: 100% to Agent Treasury (no external distribution)
    const [corpus] = await db
      .insert(cppCorpus)
      .values({
        name,
        category,
        description,
        apiKey,
        totalSupply: supply,
        creatorShare: 0,
        investorShare: 0,
        treasuryShare: 100,
        persona,
        targetAudience,
        channels: channels ?? [],
        toneVoice: toneVoice ?? null,
        approvalThreshold: String(approvalThreshold ?? 10),
        gtmBudget: String(gtmBudget ?? 200),
        pulsePrice: String(initialPrice ?? 0),
        minPatronPulse: minPatronPulse ?? null,
        creatorAddress,
        walletAddress,
        onChainId: onChainId ?? null,
        agentName: agentName ?? null,
        hederaTokenId: hederaTokenId ?? null,
        tokenSymbol: tokenSymbol ?? null,
        agentWalletId,
        agentWalletAddress,
      })
      .returning();

    // Create initial Patron (Creator — governance participant, no revenue share)
    // pulseAmount = governance voting weight (60% of supply)
    // share = revenue share percentage (always 0 under Agent Treasury model)
    const CREATOR_GOVERNANCE_FRACTION = 0.6;
    if (creatorAddress) {
      await db.insert(cppPatrons).values({
        corpusId: corpus.id,
        walletAddress: creatorAddress,
        role: "Creator",
        pulseAmount: Math.floor(supply * CREATOR_GOVERNANCE_FRACTION),
        share: "0",
      });
    }

    // Create Commerce Service if service info provided
    if (serviceName && servicePrice) {
      const serviceWallet = agentWalletAddress || creatorAddress || walletAddress;
      if (serviceWallet) {
        await db.insert(cppCommerceServices).values({
          corpusId: corpus.id,
          serviceName,
          description: serviceDescription ?? description,
          price: String(servicePrice),
          walletAddress: serviceWallet,
        });
      }
    }

    // Return corpus without apiKey (return it only once in a separate field)
    const { apiKey: generatedKey, ...safeCorpus } = corpus;
    return Response.json(
      { ...safeCorpus, apiKeyOnce: generatedKey },
      { status: 201 }
    );
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    console.error("POST /api/corpus error:", JSON.stringify({
      message: e?.message,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      constraint: e?.constraint,
      column: e?.column,
      table: e?.table,
      cause: e?.cause,
    }, null, 2));
    console.error("Full error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
