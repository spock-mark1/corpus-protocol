import { db } from "@/db";
import { cppCorpus, cppPatrons, cppRevenues, cppCommerceJobs } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { AgentsClient } from "./agents-client";

export default async function AgentsPage() {
  // Aggregate counts in DB instead of loading all relations
  const patronCounts = db
    .select({
      corpusId: cppPatrons.corpusId,
      count: sql<number>`count(*)::int`.as("patron_count"),
    })
    .from(cppPatrons)
    .groupBy(cppPatrons.corpusId)
    .as("patronCounts");

  const revenueSums = db
    .select({
      corpusId: cppRevenues.corpusId,
      total: sql<number>`coalesce(sum(${cppRevenues.amount}::numeric), 0)::float`.as("revenue_total"),
    })
    .from(cppRevenues)
    .groupBy(cppRevenues.corpusId)
    .as("revenueSums");

  const jobStats = db
    .select({
      corpusId: cppCommerceJobs.corpusId,
      total: sql<number>`count(*)::int`.as("job_total"),
      completed: sql<number>`count(*) filter (where ${cppCommerceJobs.status} = 'completed')::int`.as("job_completed"),
    })
    .from(cppCommerceJobs)
    .groupBy(cppCommerceJobs.corpusId)
    .as("jobStats");

  const corpuses = await db.query.cppCorpus.findMany({
    orderBy: desc(cppCorpus.createdAt),
    with: {
      commerceServices: true,
      activities: {
        orderBy: (a, { desc: d }) => [d(a.createdAt)],
        limit: 1,
      },
    },
  });

  // Fetch aggregated stats
  const [patronRows, revenueRows, jobRows] = await Promise.all([
    db.select().from(patronCounts),
    db.select().from(revenueSums),
    db.select().from(jobStats),
  ]);

  const patronMap = new Map(patronRows.map((r) => [r.corpusId, r.count]));
  const revenueMap = new Map(revenueRows.map((r) => [r.corpusId, r.total]));
  const jobMap = new Map(jobRows.map((r) => [r.corpusId, { total: r.total, completed: r.completed }]));

  const data = corpuses.map((c) => {
    const totalRevenue = revenueMap.get(c.id) ?? 0;
    const jobs = jobMap.get(c.id) ?? { total: 0, completed: 0 };
    const successRate = jobs.total > 0 ? Math.round((jobs.completed / jobs.total) * 100) : null;
    const lastActivity = c.activities?.[0]?.createdAt ?? null;

    return {
      id: c.id,
      name: c.name,
      agentName: c.agentName,
      category: c.category,
      description: c.description,
      status: c.status,
      agentOnline: c.agentOnline,
      agentLastSeen: c.agentLastSeen?.toISOString() ?? null,
      patrons: patronMap.get(c.id) ?? 0,
      revenue: totalRevenue,
      revenueDisplay: `$${totalRevenue.toLocaleString()}`,
      pulsePrice: Number(c.pulsePrice),
      pulsePriceDisplay: `$${Number(c.pulsePrice).toFixed(2)}`,
      serviceName: c.commerceServices?.serviceName ?? null,
      serviceDescription: c.commerceServices?.description ?? null,
      servicePrice: c.commerceServices ? Number(c.commerceServices.price) : null,
      servicePriceDisplay: c.commerceServices ? `${Number(c.commerceServices.price)} ${c.commerceServices.currency}` : null,
      serviceCurrency: c.commerceServices?.currency ?? null,
      framework: c.description.includes("OpenClaw") ? "openclaw" : null,
      channels: c.channels,
      totalJobs: jobs.total,
      completedJobs: jobs.completed,
      successRate,
      lastActivity: lastActivity?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    };
  });

  return <AgentsClient corpuses={data} />;
}
