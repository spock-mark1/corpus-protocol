import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppPatrons } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { verifyWorldIdProof, type WorldIdProof } from "@/lib/world-id";

// GET /api/corpus/:id/patrons — List patrons for a corpus
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const corpus = await db
      .select({ id: cppCorpus.id })
      .from(cppCorpus)
      .where(eq(cppCorpus.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!corpus) {
      return Response.json({ error: "Corpus not found" }, { status: 404 });
    }

    const patrons = await db
      .select()
      .from(cppPatrons)
      .where(and(eq(cppPatrons.corpusId, id), eq(cppPatrons.status, "active")))
      .orderBy(desc(cppPatrons.createdAt));

    return Response.json(patrons);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/corpus/:id/patrons — Register as patron (requires min Pulse holding)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const { walletAddress, pulseAmount, worldIdProof } = body;

    if (!walletAddress) {
      return Response.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    if (pulseAmount == null || typeof pulseAmount !== "number" || pulseAmount <= 0) {
      return Response.json(
        { error: "pulseAmount must be a positive number" },
        { status: 400 }
      );
    }

    const corpus = await db
      .select({
        id: cppCorpus.id,
        totalSupply: cppCorpus.totalSupply,
        minPatronPulse: cppCorpus.minPatronPulse,
      })
      .from(cppCorpus)
      .where(eq(cppCorpus.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!corpus) {
      return Response.json({ error: "Corpus not found" }, { status: 404 });
    }

    // Calculate minimum threshold: explicit setting or 0.1% of totalSupply
    const minRequired = corpus.minPatronPulse ?? Math.floor(corpus.totalSupply * 0.001);

    if (pulseAmount < minRequired) {
      return Response.json(
        {
          error: `Minimum ${minRequired} Pulse required to become Patron`,
          minRequired,
          current: pulseAmount,
        },
        { status: 403 }
      );
    }

    // Verify World ID proof (Sybil prevention — 1 person = 1 patron)
    if (!worldIdProof) {
      return Response.json(
        { error: "World ID verification required to become Patron" },
        { status: 400 }
      );
    }

    const worldIdResult = await verifyWorldIdProof(
      worldIdProof as WorldIdProof,
      process.env.WORLD_ACTION_PATRON ?? "become-patron",
      walletAddress
    );

    if (!worldIdResult.success) {
      return Response.json(
        { error: worldIdResult.error ?? "World ID verification failed" },
        { status: 403 }
      );
    }

    // Check if this World ID nullifier has already been used for this corpus
    const existingWorldId = await db
      .select()
      .from(cppPatrons)
      .where(
        and(
          eq(cppPatrons.corpusId, id),
          eq(cppPatrons.worldIdHash, worldIdResult.nullifier_hash),
          eq(cppPatrons.status, "active")
        )
      )
      .limit(1)
      .then((r) => r[0] ?? null);

    if (existingWorldId) {
      return Response.json(
        { error: "This World ID is already registered as a Patron for this Corpus" },
        { status: 409 }
      );
    }

    // Check for existing active patron
    const existing = await db
      .select()
      .from(cppPatrons)
      .where(
        and(eq(cppPatrons.corpusId, id), eq(cppPatrons.walletAddress, walletAddress))
      )
      .limit(1)
      .then((r) => r[0] ?? null);

    if (existing && existing.status === "active") {
      return Response.json(
        { error: "Already a Patron of this Corpus" },
        { status: 409 }
      );
    }

    // Calculate share based on holdings
    const sharePercent = ((pulseAmount / corpus.totalSupply) * 100).toFixed(2);

    // Re-activate revoked patron or create new one
    if (existing && existing.status === "revoked") {
      const [patron] = await db
        .update(cppPatrons)
        .set({ status: "active", pulseAmount, role: "Investor", share: sharePercent, worldIdHash: worldIdResult.nullifier_hash })
        .where(eq(cppPatrons.id, existing.id))
        .returning();
      return Response.json(patron, { status: 200 });
    }

    const [patron] = await db
      .insert(cppPatrons)
      .values({
        corpusId: id,
        walletAddress,
        role: "Investor",
        pulseAmount,
        share: sharePercent,
        worldIdHash: worldIdResult.nullifier_hash,
      })
      .returning();

    return Response.json(patron, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/corpus/:id/patrons — Withdraw patron status
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return Response.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    const patron = await db
      .select()
      .from(cppPatrons)
      .where(
        and(eq(cppPatrons.corpusId, id), eq(cppPatrons.walletAddress, walletAddress))
      )
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!patron || patron.status !== "active") {
      return Response.json(
        { error: "No active Patron found for this wallet" },
        { status: 404 }
      );
    }

    // Creator cannot withdraw
    if (patron.role === "Creator") {
      return Response.json(
        { error: "Creator cannot withdraw Patron status" },
        { status: 403 }
      );
    }

    const [updated] = await db
      .update(cppPatrons)
      .set({ status: "revoked" })
      .where(eq(cppPatrons.id, patron.id))
      .returning();

    return Response.json(updated);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
