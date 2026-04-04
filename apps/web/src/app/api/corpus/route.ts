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
      creatorShare,
      investorShare,
      treasuryShare,
      persona,
      targetAudience,
      channels,
      approvalThreshold,
      gtmBudget,
      creatorAddress,
      investorAddress,
      treasuryAddress,
      walletAddress,
      onChainId,
      agentName,
      toneVoice,
      initialPrice,
      minPatronPulse,
      hederaTokenId,
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

    // Validate share distribution
    const cShare = creatorShare ?? 60;
    const iShare = investorShare ?? 25;
    const tShare = treasuryShare ?? 15;

    if (cShare + iShare + tShare !== 100) {
      return Response.json(
        { error: "creatorShare + investorShare + treasuryShare must equal 100" },
        { status: 400 }
      );
    }

    if (cShare < 0 || iShare < 0 || tShare < 0) {
      return Response.json(
        { error: "share values must be non-negative" },
        { status: 400 }
      );
    }

    // Validate wallet address uniqueness
    const wallets = [creatorAddress, investorAddress, treasuryAddress].filter(Boolean);
    if (wallets.length >= 2 && new Set(wallets).size !== wallets.length) {
      return Response.json(
        { error: "creatorAddress, investorAddress, and treasuryAddress must be unique" },
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

    const [corpus] = await db
      .insert(cppCorpus)
      .values({
        name,
        category,
        description,
        apiKey,
        totalSupply: supply,
        creatorShare: cShare,
        investorShare: iShare,
        treasuryShare: tShare,
        persona,
        targetAudience,
        channels: channels ?? [],
        toneVoice: toneVoice ?? null,
        approvalThreshold: String(approvalThreshold ?? 10),
        gtmBudget: String(gtmBudget ?? 200),
        pulsePrice: String(initialPrice ?? 0),
        minPatronPulse: minPatronPulse ?? null,
        creatorAddress,
        investorAddress,
        treasuryAddress,
        walletAddress,
        onChainId: onChainId ?? null,
        agentName: agentName ?? null,
        hederaTokenId: hederaTokenId ?? null,
        agentWalletId,
        agentWalletAddress,
      })
      .returning();

    // Create initial Patron (Creator)
    if (creatorAddress) {
      await db.insert(cppPatrons).values({
        corpusId: corpus.id,
        walletAddress: creatorAddress,
        role: "Creator",
        pulseAmount: Math.floor((supply * cShare) / 100),
        share: String(cShare),
      });
    }

    // Create Commerce Service if service info provided
    const { serviceName, serviceDescription, servicePrice } = body;
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
