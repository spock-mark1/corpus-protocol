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

export type Transaction = {
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

export type ActivityStats = {
  totalTransactions: number;
  totalVolume: number;
  activeAgents: number;
  totalAgents: number;
  registeredServices: number;
  playbooksTraded: number;
};

export async function fetchActivityStats(): Promise<ActivityStats> {
  const [agentStats, registeredServiceCount, jobTotal, pbTotal] = await Promise.all([
    db
      .select({
        totalAgents: count(cppCorpus.id),
        activeAgents: sql<number>`count(*) filter (where ${cppCorpus.agentOnline} = true)::int`,
      })
      .from(cppCorpus)
      .then((r) => r[0]),
    db
      .select({ count: count(cppCommerceServices.id) })
      .from(cppCommerceServices)
      .then((r) => r[0]?.count ?? 0),
    db.select({ count: count(cppCommerceJobs.id), vol: sql<number>`coalesce(sum(${cppCommerceJobs.amount}::numeric), 0)::float` }).from(cppCommerceJobs).then((r) => r[0]),
    db.select({ count: count(cppPlaybookPurchases.id), vol: sql<number>`coalesce(sum(${cppPlaybooks.price}::numeric), 0)::float` }).from(cppPlaybookPurchases).innerJoin(cppPlaybooks, eq(cppPlaybookPurchases.playbookId, cppPlaybooks.id)).then((r) => r[0]),
  ]);

  return {
    totalTransactions: (jobTotal?.count ?? 0) + (pbTotal?.count ?? 0),
    totalVolume: (jobTotal?.vol ?? 0) + (pbTotal?.vol ?? 0),
    activeAgents: agentStats?.activeAgents ?? 0,
    totalAgents: agentStats?.totalAgents ?? 0,
    registeredServices: registeredServiceCount,
    playbooksTraded: pbTotal?.count ?? 0,
  };
}

export async function fetchActivityTransactions(
  limit: number,
  cursor?: string | null,
): Promise<{ transactions: Transaction[]; nextCursor: string | null }> {
  const buyerCorpus = alias(cppCorpus, "buyerCorpus");
  const pbBuyerCorpus = alias(cppCorpus, "pbBuyerCorpus");

  let cursorDate: Date | null = null;
  if (cursor) {
    const dateStr = cursor.split("|")[0];
    if (dateStr) cursorDate = new Date(dateStr);
  }

  const jobCursorCond = cursorDate
    ? [sql`${cppCommerceJobs.createdAt} < ${cursorDate}`]
    : [];
  const pbCursorCond = cursorDate
    ? [sql`${cppPlaybookPurchases.createdAt} < ${cursorDate}`]
    : [];

  const [jobs, playbookTrades] = await Promise.all([
    db
      .select({
        id: cppCommerceJobs.id,
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
      .where(jobCursorCond.length ? jobCursorCond[0] : undefined)
      .orderBy(desc(cppCommerceJobs.createdAt))
      .limit(limit + 1),

    db
      .select({
        id: cppPlaybookPurchases.id,
        buyerAddress: cppPlaybookPurchases.buyerAddress,
        txHash: cppPlaybookPurchases.txHash,
        createdAt: cppPlaybookPurchases.createdAt,
        playbookTitle: cppPlaybooks.title,
        playbookPrice: cppPlaybooks.price,
        playbookCurrency: cppPlaybooks.currency,
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
      .where(pbCursorCond.length ? pbCursorCond[0] : undefined)
      .orderBy(desc(cppPlaybookPurchases.createdAt))
      .limit(limit + 1),
  ]);

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

  const hasMore = transactions.length > limit;
  const page = hasMore ? transactions.slice(0, limit) : transactions;

  const lastItem = page[page.length - 1];
  const nextCursor = hasMore && lastItem ? lastItem.timestamp : null;

  return { transactions: page, nextCursor };
}
