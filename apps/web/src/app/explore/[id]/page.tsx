import { db } from "@/db";
import { cppCorpus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CorpusDetailClient } from "./detail-client";

export default async function CorpusDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const corpus = await db.query.cppCorpus.findFirst({
    where: eq(cppCorpus.id, id),
    with: {
      patrons: true,
      activities: { orderBy: (a, { desc }) => [desc(a.createdAt)], limit: 20 },
      approvals: { orderBy: (a, { desc }) => [desc(a.createdAt)], limit: 10 },
      revenues: { orderBy: (r, { desc }) => [desc(r.createdAt)], limit: 20 },
    },
  });

  if (!corpus) notFound();

  const totalRevenue = corpus.revenues.reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

  // Aggregate revenue by month
  const revenueByMonth = new Map<string, number>();
  for (const r of corpus.revenues) {
    const d = new Date(r.createdAt);
    const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + Number(r.amount));
  }
  const revenueHistory = Array.from(revenueByMonth.entries())
    .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }))
    .slice(-6);

  // Agent activity stats (today)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayActivities = corpus.activities.filter(
    (a) => new Date(a.createdAt) >= todayStart
  );
  const agentStats = {
    postsToday: todayActivities.filter((a) => a.type === "post").length,
    repliesToday: todayActivities.filter((a) => a.type === "reply").length,
    researchesToday: todayActivities.filter((a) => a.type === "research").length,
  };

  // Serialize for client
  const data = {
    id: corpus.id,
    name: corpus.name,
    category: corpus.category,
    description: corpus.description,
    status: corpus.status,
    hederaTokenId: corpus.hederaTokenId ?? "",
    pulsePrice: `$${Number(corpus.pulsePrice).toFixed(2)}`,
    totalSupply: corpus.totalSupply,
    creatorShare: corpus.creatorShare,
    investorShare: corpus.investorShare,
    treasuryShare: corpus.treasuryShare,
    persona: corpus.persona ?? "",
    targetAudience: corpus.targetAudience ?? "",
    channels: corpus.channels,
    approvalThreshold: Number(corpus.approvalThreshold),
    gtmBudget: Number(corpus.gtmBudget),
    minPatronPulse: corpus.minPatronPulse,
    agentOnline: corpus.agentOnline,
    createdAt: corpus.createdAt.toISOString().split("T")[0],
    revenue: `$${totalRevenue.toLocaleString()}`,
    patronCount: corpus.patrons.length,
    patrons: corpus.patrons.map((p) => ({
      walletAddress: p.walletAddress,
      role: p.role,
      pulseAmount: p.pulseAmount,
      share: Number(p.share),
      status: p.status,
    })),
    activities: corpus.activities.map((a) => ({
      id: a.id,
      type: a.type,
      content: a.content,
      channel: a.channel,
      status: a.status,
      timestamp: getRelativeTime(a.createdAt),
    })),
    revenueHistory,
    agentStats,
  };

  return <CorpusDetailClient corpus={data} />;
}

function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}
