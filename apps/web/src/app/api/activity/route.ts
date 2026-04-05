import { db } from "@/db";
import {
  cppCommerceJobs,
  cppCommerceServices,
  cppPlaybookPurchases,
  cppPlaybooks,
  cppCorpus,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const [jobs, playbookTrades, allCorpuses, services] = await Promise.all([
    db
      .select({
        id: cppCommerceJobs.id,
        sellerCorpusId: cppCommerceJobs.corpusId,
        buyerCorpusId: cppCommerceJobs.requesterCorpusId,
        serviceName: cppCommerceJobs.serviceName,
        amount: cppCommerceJobs.amount,
        status: cppCommerceJobs.status,
        txHash: cppCommerceJobs.txHash,
        createdAt: cppCommerceJobs.createdAt,
      })
      .from(cppCommerceJobs)
      .orderBy(desc(cppCommerceJobs.createdAt))
      .limit(100),
    db
      .select({
        id: cppPlaybookPurchases.id,
        buyerAddress: cppPlaybookPurchases.buyerAddress,
        txHash: cppPlaybookPurchases.txHash,
        createdAt: cppPlaybookPurchases.createdAt,
        playbookTitle: cppPlaybooks.title,
        playbookPrice: cppPlaybooks.price,
        playbookCurrency: cppPlaybooks.currency,
        sellerCorpusId: cppPlaybooks.corpusId,
      })
      .from(cppPlaybookPurchases)
      .innerJoin(cppPlaybooks, eq(cppPlaybookPurchases.playbookId, cppPlaybooks.id))
      .orderBy(desc(cppPlaybookPurchases.createdAt))
      .limit(100),
    db
      .select({
        id: cppCorpus.id,
        name: cppCorpus.name,
        agentName: cppCorpus.agentName,
        agentOnline: cppCorpus.agentOnline,
      })
      .from(cppCorpus),
    db
      .select({ id: cppCommerceServices.id })
      .from(cppCommerceServices),
  ]);

  const corpusMap: Record<string, { name: string; agentName: string | null; online: boolean }> = {};
  for (const c of allCorpuses) {
    corpusMap[c.id] = { name: c.name, agentName: c.agentName, online: c.agentOnline };
  }

  type Transaction = {
    id: string;
    type: "service" | "playbook";
    sellerName: string;
    sellerAgent: string | null;
    buyerName: string;
    buyerAgent: string | null;
    itemName: string;
    amount: number;
    currency: string;
    status: string;
    timestamp: string;
    txHash: string | null;
  };

  const transactions: Transaction[] = [];

  for (const j of jobs) {
    const seller = corpusMap[j.sellerCorpusId];
    const buyer = corpusMap[j.buyerCorpusId];
    transactions.push({
      id: j.id,
      type: "service",
      sellerName: seller?.name ?? "Unknown",
      sellerAgent: seller?.agentName ?? null,
      buyerName: buyer?.name ?? "Unknown",
      buyerAgent: buyer?.agentName ?? null,
      itemName: j.serviceName,
      amount: Number(j.amount),
      currency: "USDC",
      status: j.status,
      timestamp: j.createdAt.toISOString(),
      txHash: j.txHash ?? null,
    });
  }

  for (const p of playbookTrades) {
    const seller = corpusMap[p.sellerCorpusId];
    const buyerCorpus = allCorpuses.find(
      (c) => c.id === p.buyerAddress || c.agentName === p.buyerAddress
    );
    transactions.push({
      id: p.id,
      type: "playbook",
      sellerName: seller?.name ?? "Unknown",
      sellerAgent: seller?.agentName ?? null,
      buyerName: buyerCorpus?.name ?? `${p.buyerAddress.slice(0, 6)}...${p.buyerAddress.slice(-4)}`,
      buyerAgent: buyerCorpus?.agentName ?? null,
      itemName: p.playbookTitle,
      amount: Number(p.playbookPrice),
      currency: p.playbookCurrency,
      status: "completed",
      timestamp: p.createdAt.toISOString(),
      txHash: p.txHash ?? null,
    });
  }

  transactions.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const totalServiceVolume = jobs.reduce((s, j) => s + Number(j.amount), 0);
  const totalPlaybookVolume = playbookTrades.reduce((s, p) => s + Number(p.playbookPrice), 0);

  return Response.json({
    stats: {
      totalTransactions: jobs.length + playbookTrades.length,
      totalVolume: totalServiceVolume + totalPlaybookVolume,
      activeAgents: allCorpuses.filter((c) => c.agentOnline).length,
      totalAgents: allCorpuses.length,
      registeredServices: services.length,
      playbooksTraded: playbookTrades.length,
    },
    transactions,
  });
}
