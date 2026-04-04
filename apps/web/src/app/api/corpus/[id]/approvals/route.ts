import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/corpus/:id/approvals — Pending approval list
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const corpus = await prisma.corpus.findUnique({ where: { id } });
    if (!corpus) {
      return Response.json({ error: "Corpus not found" }, { status: 404 });
    }

    const approvals = await prisma.approval.findMany({
      where: { corpusId: id },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(approvals);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/corpus/:id/approvals — Create approval request (from Local Agent)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const corpus = await prisma.corpus.findUnique({ where: { id } });
    if (!corpus) {
      return Response.json({ error: "Corpus not found" }, { status: 404 });
    }

    const body = await request.json();
    const { type, title, description, amount } = body;

    const validTypes = ["transaction", "strategy", "policy", "channel"];

    if (!type || !title) {
      return Response.json(
        { error: "type, title are required" },
        { status: 400 }
      );
    }

    if (!validTypes.includes(type)) {
      return Response.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (amount !== undefined && (typeof amount !== "number" || amount < 0)) {
      return Response.json(
        { error: "amount must be a non-negative number" },
        { status: 400 }
      );
    }

    const approval = await prisma.approval.create({
      data: {
        corpusId: id,
        type,
        title,
        description,
        amount,
      },
    });

    return Response.json(approval, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
