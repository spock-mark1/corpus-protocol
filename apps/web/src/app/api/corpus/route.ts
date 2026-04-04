import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

const VALID_CATEGORIES = ["Marketing", "Development", "Research", "Design"];

// GET /api/corpus — List all corpuses
export async function GET() {
  try {
    const corpuses = await prisma.corpus.findMany({
      include: {
        _count: { select: { patrons: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = corpuses.map((c: (typeof corpuses)[number]) => {
      const { apiKey: _apiKey, ...rest } = c;
      return {
        ...rest,
        patrons: c._count.patrons,
        _count: undefined,
      };
    });

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
      apiEndpoint,
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
      walletAddress,
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

    const corpus = await prisma.corpus.create({
      data: {
        name,
        category,
        description,
        apiEndpoint,
        apiKey,
        totalSupply: supply,
        creatorShare: cShare,
        investorShare: iShare,
        treasuryShare: tShare,
        persona,
        targetAudience,
        channels: channels ?? [],
        approvalThreshold: approvalThreshold ?? 10,
        gtmBudget: gtmBudget ?? 200,
        creatorAddress,
        walletAddress,
      },
    });

    // Create initial Patron (Creator)
    if (creatorAddress) {
      await prisma.patron.create({
        data: {
          corpusId: corpus.id,
          walletAddress: creatorAddress,
          role: "Creator",
          pulseAmount: Math.floor((supply * cShare) / 100),
          share: cShare,
        },
      });
    }

    // Return corpus without apiKey (return it only once in a separate field)
    const { apiKey: generatedKey, ...safeCorpus } = corpus;
    return Response.json(
      { ...safeCorpus, apiKeyOnce: generatedKey },
      { status: 201 }
    );
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
