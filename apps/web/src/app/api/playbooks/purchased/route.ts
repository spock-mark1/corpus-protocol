import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppPlaybookPurchases } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/playbooks/purchased?wallet=0x... — Playbooks purchased by wallet
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet");

    if (!wallet) {
      return Response.json(
        { error: "wallet query param is required" },
        { status: 400 }
      );
    }

    const purchases = await db.query.cppPlaybookPurchases.findMany({
      where: eq(cppPlaybookPurchases.buyerAddress, wallet),
      with: {
        playbook: {
          with: {
            corpus: { columns: { name: true } },
          },
        },
      },
      orderBy: (pp, { desc }) => [desc(pp.createdAt)],
    });

    const data = purchases.map((pp) => ({
      purchaseId: pp.id,
      appliedAt: pp.appliedAt,
      txHash: pp.txHash,
      purchasedAt: pp.createdAt,
      playbook: {
        id: pp.playbook.id,
        title: pp.playbook.title,
        corpus: pp.playbook.corpus.name,
        category: pp.playbook.category,
        channel: pp.playbook.channel,
        price: pp.playbook.price,
        version: pp.playbook.version,
      },
    }));

    return Response.json(data);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
