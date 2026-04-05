import { db } from "@/db";
import {
  cppCommerceJobs,
  cppCommerceServices,
  cppPlaybookPurchases,
  cppPlaybooks,
  cppCorpus,
} from "@/db/schema";
import { desc, eq, sql, count } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export const dynamic = "force-dynamic";

export async function GET() {
  // Alias for buyer corpus lookup in jobs query
  const buyerCorpus = alias(cppCorpus, "buyerCorpus");

  // Alias for buyer corpus lookup in playbook purchases
  const pbBuyerCorpus = alias(cppCorpus, "pbBuyerCorpus");

  const [jobs, playbookTrades, stats] = await Promise.all([
    // Jobs with seller and buyer names joined directly
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
        sellerName: cppCorpus.name,
        sellerAgent: cppCorpus.agentName,
        buyerName: buyerCorpus.name,
        buyerAgent: buyerCorpus.agentName,
      })
      .from(cppCommerceJobs)
      .leftJoin(cppCorpus, eq(cppCommerceJobs.corpusId, cppCorpus.id))
      .leftJoin(buyerCorpus, eq(cppCommerceJobs.requesterCorpusId, buyerCorpus.id))
      .orderBy(desc(cppCommerceJobs.createdAt))
      .limit(100),

    // Playbook purchases with seller corpus name and buyer corpus lookup joined
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
        sellerName: cppCorpus.name,
        sellerAgent: cppCorpus.agentName,
        buyerName: pbBuyerCorpus.name,
        buyerAgent: pbBuyerCorpus.agentName,
      })
      .from(cppPlaybookPurchases)
      .innerJoin(cppPlaybooks, eq(cppPlaybookPurchases.playbookId, cppPlaybooks.id))
      .leftJoin(cppCorpus, eq(cppPlaybooks.corpusId, cppCorpus.id))
      .leftJoin(
        pbBuyerCorpus,
        sql`${pbBuyerCorpus.id} = ${cppPlaybookPurchases.buyerAddress} OR ${pbBuyerCorpus.agentName} = ${cppPlaybookPurchases.buyerAddress}`,
      )
      .orderBy(desc(cppPlaybookPurchases.createdAt))
      .limit(100),

    // Aggregate stats with COUNT queries instead of loading all rows
    db
      .select({
        totalAgents: count(cppCorpus.id),
        activeAgents: sql<number>`count(*) filter (where ${cppCorpus.agentOnline} = true)::int`,
      })
      .from(cppCorpus)
      .then((r) => r[0]),
  ]);

  const registeredServiceCount = await db
    .select({ count: count(cppCommerceServices.id) })
    .from(cppCommerceServices)
    .then((r) => r[0]?.count ?? 0);

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
    transactions.push({
      id: j.id,
      type: "service",
      sellerName: j.sellerName ?? "Unknown",
      sellerAgent: j.sellerAgent ?? null,
      buyerName: j.buyerName ?? "Unknown",
      buyerAgent: j.buyerAgent ?? null,
      itemName: j.serviceName,
      amount: Number(j.amount),
      currency: "USDC",
      status: j.status,
      timestamp: j.createdAt.toISOString(),
      txHash: j.txHash ?? null,
    });
  }

  for (const p of playbookTrades) {
    transactions.push({
      id: p.id,
      type: "playbook",
      sellerName: p.sellerName ?? "Unknown",
      sellerAgent: p.sellerAgent ?? null,
      buyerName: p.buyerName ?? `${p.buyerAddress.slice(0, 6)}...${p.buyerAddress.slice(-4)}`,
      buyerAgent: p.buyerAgent ?? null,
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
      activeAgents: stats?.activeAgents ?? 0,
      totalAgents: stats?.totalAgents ?? 0,
      registeredServices: registeredServiceCount,
      playbooksTraded: playbookTrades.length,
    },
    transactions,
  });
}
