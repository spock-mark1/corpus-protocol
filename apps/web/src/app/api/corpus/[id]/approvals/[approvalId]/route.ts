import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/corpus/:id/approvals/:approvalId — Approve/reject
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; approvalId: string }> }
) {
  const { id, approvalId } = await params;

  try {
    const corpus = await prisma.corpus.findUnique({ where: { id } });
    if (!corpus) {
      return Response.json({ error: "Corpus not found" }, { status: 404 });
    }

    const existing = await prisma.approval.findUnique({
      where: { id: approvalId },
    });
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

    const approval = await prisma.approval.update({
      where: { id: approvalId },
      data: {
        status,
        decidedAt: new Date(),
        decidedBy,
      },
    });

    return Response.json(approval);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
