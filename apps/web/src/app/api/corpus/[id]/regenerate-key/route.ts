import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { regenerateKeySchema, parseBody } from "@/lib/schemas";

// POST /api/corpus/:id/regenerate-key — Regenerate API key (invalidates old key)
// Requires EIP-191 personal_sign proof of wallet ownership.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const parsed = await parseBody(request, regenerateKeySchema);
    if (parsed.error) return parsed.error;

    const { walletAddress, signature, message } = parsed.data;

    // Verify the message contains the corpus ID to prevent replay across corpuses
    if (!message.includes(id)) {
      return Response.json(
        { error: "Signature message must contain the corpus ID" },
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

    // Verify EIP-191 signature proves wallet ownership
    const { ethers } = await import("ethers");
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return Response.json({ error: "Invalid signature" }, { status: 403 });
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
