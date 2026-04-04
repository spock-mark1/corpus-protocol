import { db } from "@/db";
import { cppCorpus } from "@/db/schema";
import { desc } from "drizzle-orm";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const corpuses = await db.query.cppCorpus.findMany({
    with: {
      approvals: { orderBy: (a, { desc: d }) => [d(a.createdAt)] },
      activities: { orderBy: (a, { desc: d }) => [d(a.createdAt)], limit: 10 },
      revenues: true,
      patrons: true,
    },
  });

  const totalValue = corpuses.reduce(
    (sum, c) => sum + Number(c.pulsePrice) * c.totalSupply,
    0
  );
  const totalRevenue = corpuses.reduce(
    (sum, c) => sum + c.revenues.reduce((rs, r) => rs + Number(r.amount), 0),
    0
  );
  const pendingApprovals = corpuses.flatMap((c) =>
    c.approvals
      .filter((a) => a.status === "pending")
      .map((a) => ({
        id: a.id,
        corpusId: c.id,
        corpusName: c.name,
        type: a.type,
        title: a.title,
        description: a.description,
        amount: a.amount ? `$${Number(a.amount)}` : null,
        timestamp: a.createdAt.toISOString(),
      }))
  );
  const allActivities = corpuses
    .flatMap((c) =>
      c.activities.map((a) => ({
        id: a.id,
        corpusName: c.name,
        action: a.content,
        status: a.status,
        timestamp: a.createdAt.toISOString(),
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const agents = corpuses.map((c) => ({
    name: c.name,
    status: c.agentOnline ? ("online" as const) : ("offline" as const),
    lastActive: c.agentLastSeen
      ? getRelativeTime(c.agentLastSeen)
      : "never",
  }));

  return (
    <DashboardClient
      stats={{
        totalValue: `$${Math.round(totalValue).toLocaleString()}`,
        activeCorpus: corpuses.filter((c) => c.status === "Active").length,
        totalRevenue: `$${totalRevenue.toFixed(2)}`,
        pendingCount: pendingApprovals.length,
      }}
      approvals={pendingApprovals}
      activities={allActivities}
      agents={agents}
    />
  );
}

function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
