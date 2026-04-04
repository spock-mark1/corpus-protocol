import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppApprovals } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    const { status, decidedBy } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return Response.json(
        { error: "status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    const [approval] = await db
      .update(cppApprovals)
      .set({
        status,
        decidedAt: new Date(),
        decidedBy,
      })
      .where(eq(cppApprovals.id, approvalId))
      .returning();

    return Response.json(approval);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
