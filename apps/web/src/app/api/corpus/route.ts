import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppPatrons, cppCommerceServices } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { createAgentWallet } from "@/lib/circle";

const VALID_CATEGORIES = ["Marketing", "Development", "Research", "Design", "Finance", "Analytics", "Operations", "Sales", "Support", "Education"];

// GET /api/corpus — List all corpuses
export async function GET() {
  try {
    const patronCount = db
      .select({
        corpusId: cppPatrons.corpusId,
        count: sql<number>`count(*)::int`.as("count"),
      })
      .from(cppPatrons)
      .groupBy(cppPatrons.corpusId)
      .as("patronCount");

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
      .orderBy(desc(cppCorpus.createdAt));

    const data = corpuses.map((c) => ({
      ...c,
      patrons: c.patrons ?? 0,
    }));

    return Response.json(data);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/corpus — Create a new Corpus (Genesis)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      category,
      description,
      totalSupply,
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
    } = body;

    // Required fields
    if (!name || !category || !description) {
      return Response.json(
        { error: "name, category, description are required" },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || name.length > 100) {
      return Response.json(
        { error: "name must be a string under 100 characters" },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return Response.json(
        { error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (typeof description !== "string" || description.length > 2000) {
      return Response.json(
        { error: "description must be a string under 2000 characters" },
        { status: 400 }
      );
    }

    // Validate numeric fields
    const supply = totalSupply ?? 1000000;
    if (typeof supply !== "number" || supply <= 0 || supply > 100_000_000) {
      return Response.json(
        { error: "totalSupply must be a positive number up to 100,000,000" },
        { status: 400 }
      );
    }

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
    const { serviceName, serviceDescription, servicePrice } = body;

    if (serviceName !== undefined || servicePrice !== undefined) {
      if (typeof serviceName !== "string" || serviceName.length === 0 || serviceName.length > 200) {
        return Response.json(
          { error: "serviceName must be a non-empty string under 200 characters" },
          { status: 400 }
        );
      }
      if (typeof servicePrice !== "number" || servicePrice <= 0 || servicePrice > 1_000_000) {
        return Response.json(
          { error: "servicePrice must be a positive number up to 1,000,000" },
          { status: 400 }
        );
      }
      if (serviceDescription !== undefined && (typeof serviceDescription !== "string" || serviceDescription.length > 2000)) {
        return Response.json(
          { error: "serviceDescription must be a string under 2000 characters" },
          { status: 400 }
        );
      }
    }

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
