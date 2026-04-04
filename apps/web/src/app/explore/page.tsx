import { db } from "@/db";
import { cppCorpus } from "@/db/schema";
import { desc } from "drizzle-orm";
import { ExploreClient } from "./explore-client";

export default async function ExplorePage() {
  const corpuses = await db.query.cppCorpus.findMany({
    orderBy: desc(cppCorpus.createdAt),
    with: {
      patrons: true,
      revenues: true,
    },
  });

  const data = corpuses.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    description: c.description,
    status: c.status,
    patrons: c.patrons.length,
    revenue: `$${c.revenues.reduce((sum, r) => sum + Number(r.amount), 0).toLocaleString()}`,
    pulsePrice: `$${Number(c.pulsePrice).toFixed(2)}`,
  }));

  return <ExploreClient corpuses={data} />;
}
