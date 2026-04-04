import { db } from "@/db";
import { cppCorpus } from "@/db/schema";
import { asc } from "drizzle-orm";
import { LeaderboardClient } from "./leaderboard-client";

export default async function LeaderboardPage() {
  const corpuses = await db.query.cppCorpus.findMany({
    orderBy: asc(cppCorpus.createdAt),
    with: {
      patrons: true,
      revenues: true,
    },
  });

  const entries = corpuses
    .map((c) => {
      const totalRevenue = c.revenues.reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );
      return {
        id: c.id,
        name: c.name,
        category: c.category,
        revenue: totalRevenue,
        marketCap: Number(c.pulsePrice) * c.totalSupply,
        patrons: c.patrons.length,
        pulsePrice: Number(c.pulsePrice),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .map((e, i) => ({
      ...e,
      rank: i + 1,
      revenue: `$${e.revenue.toLocaleString()}`,
      marketCap: e.marketCap >= 1000000
        ? `$${(e.marketCap / 1000000).toFixed(1)}M`
        : `$${(e.marketCap / 1000).toFixed(0)}K`,
    }));

  return <LeaderboardClient entries={entries} />;
}
