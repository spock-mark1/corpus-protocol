import { db } from "@/db";
import { cppCorpus, cppPatrons, cppActivities, cppRevenues } from "@/db/schema";
import { asc, desc, eq, sql } from "drizzle-orm";

// GET /api/leaderboard — Ranking data
export async function GET() {
  try {
    const patronCount = db
      .select({
        corpusId: cppPatrons.corpusId,
        count: sql<number>`count(*)::int`.as("patronCount"),
      })
      .from(cppPatrons)
      .groupBy(cppPatrons.corpusId)
      .as("patronCount");

    const activityCount = db
      .select({
        corpusId: cppActivities.corpusId,
        count: sql<number>`count(*)::int`.as("activityCount"),
      })
      .from(cppActivities)
      .groupBy(cppActivities.corpusId)
      .as("activityCount");

    const revenueSum = db
      .select({
        corpusId: cppRevenues.corpusId,
        total: sql<number>`coalesce(sum(${cppRevenues.amount}), 0)::float`.as("revenueTotal"),
      })
      .from(cppRevenues)
      .groupBy(cppRevenues.corpusId)
      .as("revenueSum");

    const rows = await db
      .select({
        id: cppCorpus.id,
        name: cppCorpus.name,
        category: cppCorpus.category,
        status: cppCorpus.status,
        pulsePrice: cppCorpus.pulsePrice,
        totalSupply: cppCorpus.totalSupply,
        patronCount: patronCount.count,
        activityCount: activityCount.count,
        totalRevenue: revenueSum.total,
      })
      .from(cppCorpus)
      .leftJoin(patronCount, eq(cppCorpus.id, patronCount.corpusId))
      .leftJoin(activityCount, eq(cppCorpus.id, activityCount.corpusId))
      .leftJoin(revenueSum, eq(cppCorpus.id, revenueSum.corpusId));

    const leaderboard = rows.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      status: c.status,
      pulsePrice: c.pulsePrice,
      totalSupply: c.totalSupply,
      patronCount: c.patronCount ?? 0,
      activityCount: c.activityCount ?? 0,
      totalRevenue: c.totalRevenue ?? 0,
      marketCap: Number(c.pulsePrice) * c.totalSupply,
    }));

    leaderboard.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return Response.json(leaderboard);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
