import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppPlaybooks, cppPlaybookPurchases } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// POST /api/playbooks/:id/purchase — Purchase a playbook
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const { buyerAddress, txHash } = body;

    if (!buyerAddress) {
      return Response.json(
        { error: "buyerAddress is required" },
        { status: 400 }
      );
    }

    const playbook = await db
      .select()
      .from(cppPlaybooks)
      .where(eq(cppPlaybooks.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!playbook) {
      return Response.json({ error: "Playbook not found" }, { status: 404 });
    }

    if (playbook.status !== "active") {
      return Response.json(
        { error: "Playbook is not available for purchase" },
        { status: 400 }
      );
    }

    // Check for duplicate purchase
    const existing = await db
      .select()
      .from(cppPlaybookPurchases)
      .where(
        and(
          eq(cppPlaybookPurchases.playbookId, id),
          eq(cppPlaybookPurchases.buyerAddress, buyerAddress)
        )
      )
      .limit(1)
      .then((r) => r[0] ?? null);

    if (existing) {
      return Response.json(
        { error: "Already purchased this playbook" },
        { status: 409 }
      );
    }

    const [purchase] = await db
      .insert(cppPlaybookPurchases)
      .values({
        playbookId: id,
        buyerAddress,
        txHash: txHash ?? null,
      })
      .returning();

    return Response.json(purchase, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
