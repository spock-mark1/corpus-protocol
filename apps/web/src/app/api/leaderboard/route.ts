import { prisma } from "@/lib/prisma";

// GET /api/leaderboard — Ranking data
export async function GET() {
  try {
    const corpuses = await prisma.corpus.findMany({
      include: {
        _count: { select: { patrons: true, activities: true } },
        revenues: true,
      },
      orderBy: { createdAt: "asc" },
    });

    type CorpusRow = (typeof corpuses)[number];

    const leaderboard = corpuses.map((c: CorpusRow) => {
      const totalRevenue = c.revenues.reduce(
        (sum: number, r: CorpusRow["revenues"][number]) =>
          sum + Number(r.amount),
        0
      );

      return {
        id: c.id,
        name: c.name,
        category: c.category,
        status: c.status,
        pulsePrice: c.pulsePrice,
        totalSupply: c.totalSupply,
        patronCount: c._count.patrons,
        activityCount: c._count.activities,
        totalRevenue,
        marketCap: Number(c.pulsePrice) * c.totalSupply,
      };
    });

    leaderboard.sort(
      (a: (typeof leaderboard)[number], b: (typeof leaderboard)[number]) =>
        b.totalRevenue - a.totalRevenue
    );

    return Response.json(leaderboard);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
