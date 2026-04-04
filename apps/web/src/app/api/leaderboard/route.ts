import { db } from "@/db";
import { cppCorpus } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

// GET /api/leaderboard — Ranking data
export async function GET() {
  try {
    const corpuses = await db.query.cppCorpus.findMany({
      orderBy: asc(cppCorpus.createdAt),
      with: {
        patrons: true,
        activities: true,
        revenues: true,
      },
    });

    const leaderboard = corpuses.map((c) => {
      const totalRevenue = c.revenues.reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );

      return {
        id: c.id,
        name: c.name,
        category: c.category,
        status: c.status,
        pulsePrice: c.pulsePrice,
        totalSupply: c.totalSupply,
        patronCount: c.patrons.length,
        activityCount: c.activities.length,
        totalRevenue,
        marketCap: Number(c.pulsePrice) * c.totalSupply,
      };
    });

    leaderboard.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return Response.json(leaderboard);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
