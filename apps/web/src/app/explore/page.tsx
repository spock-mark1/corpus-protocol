import { prisma } from "@/lib/prisma";
import { ExploreClient } from "./explore-client";

export default async function ExplorePage() {
  const corpuses = await prisma.corpus.findMany({
    include: {
      _count: { select: { patrons: true } },
      revenues: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const data = corpuses.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    description: c.description,
    status: c.status,
    patrons: c._count.patrons,
    revenue: `$${c.revenues.reduce((sum, r) => sum + Number(r.amount), 0).toLocaleString()}`,
    pulsePrice: `$${Number(c.pulsePrice).toFixed(2)}`,
  }));

  return <ExploreClient corpuses={data} />;
}
