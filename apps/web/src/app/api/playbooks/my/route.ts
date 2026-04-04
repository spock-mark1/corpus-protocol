import { NextRequest } from "next/server";
import { db } from "@/db";
import { cppCorpus, cppPlaybooks, cppPlaybookPurchases } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

// GET /api/playbooks/my?wallet=0x... — Playbooks created by my corpuses
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get("wallet");

    if (!wallet) {
      return Response.json(
        { error: "wallet query param is required" },
        { status: 400 }
      );
    }

    const purchaseCount = db
      .select({
        playbookId: cppPlaybookPurchases.playbookId,
        count: sql<number>`count(*)::int`.as("count"),
      })
      .from(cppPlaybookPurchases)
      .groupBy(cppPlaybookPurchases.playbookId)
      .as("purchaseCount");

    const playbooks = await db
      .select({
        id: cppPlaybooks.id,
        corpusId: cppPlaybooks.corpusId,
        corpusName: cppCorpus.name,
        title: cppPlaybooks.title,
        category: cppPlaybooks.category,
        channel: cppPlaybooks.channel,
        description: cppPlaybooks.description,
        price: cppPlaybooks.price,
        currency: cppPlaybooks.currency,
        version: cppPlaybooks.version,
        tags: cppPlaybooks.tags,
        status: cppPlaybooks.status,
        impressions: cppPlaybooks.impressions,
        engagementRate: cppPlaybooks.engagementRate,
        conversions: cppPlaybooks.conversions,
        periodDays: cppPlaybooks.periodDays,
        purchases: purchaseCount.count,
        createdAt: cppPlaybooks.createdAt,
      })
      .from(cppPlaybooks)
      .innerJoin(cppCorpus, eq(cppPlaybooks.corpusId, cppCorpus.id))
      .leftJoin(purchaseCount, eq(cppPlaybooks.id, purchaseCount.playbookId))
      .where(eq(cppCorpus.creatorAddress, wallet))
      .orderBy(desc(cppPlaybooks.createdAt));

    const data = playbooks.map((p) => ({
      ...p,
      corpus: p.corpusName,
      corpusName: undefined,
      purchases: p.purchases ?? 0,
    }));

    return Response.json(data);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
