import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppApprovals, cppPatrons } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { verifyWorldIdProof, type WorldIdProof } from "@/lib/world-id";
import { recordApprovalOnChain } from "@/lib/hedera";

// PATCH /api/corpus/:id/approvals/:approvalId — Approve/reject
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; approvalId: string }> }
) {
  const { id, approvalId } = await params;

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

    const existing = await db
      .select()
      .from(cppApprovals)
      .where(eq(cppApprovals.id, approvalId))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!existing || existing.corpusId !== id) {
      return Response.json({ error: "Approval not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status, decidedBy, worldIdProof } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return Response.json(
        { error: "status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    // World ID verification for human-in-the-loop approval decisions
    if (!worldIdProof) {
      return Response.json(
        { error: "World ID verification required for approval decisions" },
        { status: 400 }
      );
    }

    const worldIdResult = await verifyWorldIdProof(
      worldIdProof as WorldIdProof,
      process.env.WORLD_ACTION_APPROVE ?? "approve-decision",
      decidedBy ?? ""
    );

    if (!worldIdResult.success) {
      return Response.json(
        { error: worldIdResult.error ?? "World ID verification failed" },
        { status: 403 }
      );
    }

    // Verify the caller is an active Patron (Creator or Investor) of this Corpus
    console.log("[approval] decidedBy:", decidedBy, "corpusId:", id);
    if (decidedBy) {
      const patron = await db
        .select()
        .from(cppPatrons)
        .where(
          and(
            eq(cppPatrons.corpusId, id),
            eq(sql`lower(${cppPatrons.walletAddress})`, decidedBy.toLowerCase()),
            eq(cppPatrons.status, "active")
          )
        )
        .limit(1)
        .then((r) => r[0] ?? null);

      console.log("[approval] patron lookup result:", patron?.id ?? "NOT FOUND", "wallet:", decidedBy.toLowerCase());
      if (!patron) {
        return Response.json(
          { error: "Only active Patrons can approve or reject decisions" },
          { status: 403 }
        );
      }
    }

    const resolvedDecidedBy = decidedBy ?? worldIdResult.nullifier_hash;

    // Record approval decision on Hedera
    const onChainResult = await recordApprovalOnChain(
      approvalId, id, status, resolvedDecidedBy,
    );

    const [approval] = await db
      .update(cppApprovals)
      .set({
        status,
        decidedAt: new Date(),
        decidedBy: resolvedDecidedBy,
        txHash: onChainResult?.txHash ?? null,
      })
      .where(eq(cppApprovals.id, approvalId))
      .returning();

    return Response.json(approval);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
