import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

// POST /api/corpus/:id/regenerate-key — Regenerate API key (invalidates old key)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return Response.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    const corpus = await db.query.cppCorpus.findFirst({
      where: eq(cppCorpus.id, id),
    });

    if (!corpus) {
      return Response.json({ error: "Corpus not found" }, { status: 404 });
    }

    // Only the creator wallet can regenerate
    if (
      corpus.walletAddress?.toLowerCase() !== walletAddress.toLowerCase() &&
      corpus.creatorAddress?.toLowerCase() !== walletAddress.toLowerCase()
    ) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const newApiKey = `cpk_${randomBytes(24).toString("hex")}`;

    await db
      .update(cppCorpus)
      .set({ apiKey: newApiKey })
      .where(eq(cppCorpus.id, id));

    return Response.json({ apiKey: newApiKey });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
