import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppPlaybooks, cppPlaybookPurchases } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// PATCH /api/playbooks/:id/apply — Mark a purchased playbook as applied
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const { buyerAddress } = body;

    if (!buyerAddress) {
      return Response.json(
        { error: "buyerAddress is required" },
        { status: 400 }
      );
    }

    // Verify playbook exists
    const playbook = await db
      .select()
      .from(cppPlaybooks)
      .where(eq(cppPlaybooks.id, id))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!playbook) {
      return Response.json({ error: "Playbook not found" }, { status: 404 });
    }

    // Verify purchase exists
    const purchase = await db
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

    if (!purchase) {
      return Response.json(
        { error: "No purchase found for this playbook and wallet" },
        { status: 404 }
      );
    }

    if (purchase.appliedAt) {
      return Response.json(
        { error: "Playbook already applied", appliedAt: purchase.appliedAt },
        { status: 409 }
      );
    }

    // Mark as applied
    const [updated] = await db
      .update(cppPlaybookPurchases)
      .set({ appliedAt: new Date() })
      .where(eq(cppPlaybookPurchases.id, purchase.id))
      .returning();

    return Response.json({
      ...updated,
      content: playbook.content,
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
