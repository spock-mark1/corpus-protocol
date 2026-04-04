import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CorpusDetailClient } from "./detail-client";

export default async function CorpusDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const corpus = await prisma.corpus.findUnique({
    where: { id },
    include: {
      patrons: true,
      activities: { orderBy: { createdAt: "desc" }, take: 20 },
      approvals: { orderBy: { createdAt: "desc" }, take: 10 },
      revenues: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!corpus) notFound();

  const totalRevenue = corpus.revenues.reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

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
    apiEndpoint: corpus.apiEndpoint ?? "",
    persona: corpus.persona ?? "",
    targetAudience: corpus.targetAudience ?? "",
    channels: corpus.channels,
    approvalThreshold: Number(corpus.approvalThreshold),
    gtmBudget: Number(corpus.gtmBudget),
    agentOnline: corpus.agentOnline,
    createdAt: corpus.createdAt.toISOString().split("T")[0],
    revenue: `$${totalRevenue.toLocaleString()}`,
    patronCount: corpus.patrons.length,
    patrons: corpus.patrons.map((p) => ({
      walletAddress: p.walletAddress,
      role: p.role,
      pulseAmount: p.pulseAmount,
      share: Number(p.share),
    })),
    activities: corpus.activities.map((a) => ({
      id: a.id,
      type: a.type,
      content: a.content,
      channel: a.channel,
      status: a.status,
      timestamp: getRelativeTime(a.createdAt),
    })),
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
