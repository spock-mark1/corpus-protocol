/**
 * Seed script: registers 6 service agents + 1 demo product on the Corpus platform.
 *
 * Usage:
 *   cd apps/web
 *   npx tsx scripts/seed-demo-agents.ts
 *
 * Requires DATABASE_URL in .env
 */

import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import * as schema from "../src/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

function generateApiKey() {
  return `cpk_${createId()}${createId()}`;
}

// Deterministic demo wallet addresses (not real — for demo only)
const DEMO_WALLETS = {
  scoutAudience:    "0xDE01000000000000000000000000000000000001",
  scoutTrend:       "0xDE02000000000000000000000000000000000002",
  scoutCompetitor:  "0xDE03000000000000000000000000000000000003",
  prospectLeads:    "0xDE04000000000000000000000000000000000004",
  prospectEnrich:   "0xDE05000000000000000000000000000000000005",
  prospectSignal:   "0xDE06000000000000000000000000000000000006",
};

interface AgentDef {
  agentName: string;
  name: string;
  category: string;
  description: string;
  persona: string;
  walletKey: keyof typeof DEMO_WALLETS;
  service: {
    serviceName: string;
    description: string;
    price: number;
  };
}

const SERVICE_AGENTS: AgentDef[] = [
  {
    agentName: "scout-audience",
    name: "Scout Audience",
    category: "Analytics",
    description: "AI agent that analyzes target audiences — personas, communities, pain points, and channels.",
    persona: "Precise audience research analyst with deep knowledge of online communities and user behavior.",
    walletKey: "scoutAudience",
    service: {
      serviceName: "audience_insight",
      description: "Analyze target audience: personas, communities they frequent, pain points, and best channels to reach them.",
      price: 0.005,
    },
  },
  {
    agentName: "scout-trend",
    name: "Scout Trend",
    category: "Analytics",
    description: "AI agent that tracks market trends, hot topics, and emerging opportunities in real-time.",
    persona: "Trend analyst tracking discussions across X, Reddit, Hacker News, and Product Hunt.",
    walletKey: "scoutTrend",
    service: {
      serviceName: "trend_research",
      description: "Research latest trends and hot topics for a given market. Includes trending discussions, momentum, and opportunities.",
      price: 0.005,
    },
  },
  {
    agentName: "scout-competitor",
    name: "Scout Competitor",
    category: "Analytics",
    description: "AI agent that performs competitive intelligence — features, pricing, positioning, and market gaps.",
    persona: "Competitive intelligence analyst who dissects products and finds positioning opportunities.",
    walletKey: "scoutCompetitor",
    service: {
      serviceName: "competitor_analysis",
      description: "Analyze competitors: features, pricing, strengths/weaknesses, market gaps, and positioning recommendations.",
      price: 0.008,
    },
  },
  {
    agentName: "prospect-leads",
    name: "Prospect Leads",
    category: "Sales",
    description: "AI agent that finds potential customers on social platforms based on target profile and product fit.",
    persona: "Lead generation specialist who identifies high-relevance prospects from social signals.",
    walletKey: "prospectLeads",
    service: {
      serviceName: "find_leads",
      description: "Find potential customers on X, Reddit, GitHub who match a target profile and show interest in related topics.",
      price: 0.01,
    },
  },
  {
    agentName: "prospect-enrich",
    name: "Prospect Enrich",
    category: "Sales",
    description: "AI agent that enriches profiles with professional details, interests, and social links.",
    persona: "Profile enrichment specialist who builds comprehensive prospect profiles from public data.",
    walletKey: "prospectEnrich",
    service: {
      serviceName: "enrich_profile",
      description: "Enrich a person's profile: job title, company, interests, recent topics, and social links.",
      price: 0.008,
    },
  },
  {
    agentName: "prospect-signal",
    name: "Prospect Signal",
    category: "Sales",
    description: "AI agent that detects buying intent signals — people actively seeking solutions related to your product.",
    persona: "Intent signal analyst detecting 'looking for', 'need help', 'switching from' patterns across platforms.",
    walletKey: "prospectSignal",
    service: {
      serviceName: "intent_signal",
      description: "Detect buying intent signals: people seeking solutions, switching tools, or frustrated with alternatives.",
      price: 0.01,
    },
  },
];

async function main() {
  console.log("🌱 Seeding demo agents...\n");

  const results: { name: string; id: string; apiKey: string; service: string; price: number }[] = [];

  for (const agent of SERVICE_AGENTS) {
    const existing = await db
      .select({ id: schema.cppCorpus.id })
      .from(schema.cppCorpus)
      .where(eq(schema.cppCorpus.agentName, agent.agentName))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (existing) {
      console.log(`  ⏭  ${agent.agentName} already exists (${existing.id}), skipping`);
      continue;
    }

    const apiKey = generateApiKey();
    const walletAddress = DEMO_WALLETS[agent.walletKey];

    const [corpus] = await db
      .insert(schema.cppCorpus)
      .values({
        agentName: agent.agentName,
        name: agent.name,
        category: agent.category,
        description: agent.description,
        persona: agent.persona,
        status: "Active",
        agentOnline: true,
        agentLastSeen: new Date(),
        apiKey,
        walletAddress,
        agentWalletAddress: walletAddress,
        creatorAddress: walletAddress,
        channels: [],
        pulsePrice: "0.01",
        totalSupply: 1_000_000,
        creatorShare: 60,
        investorShare: 25,
        treasuryShare: 15,
        approvalThreshold: "10",
        gtmBudget: "200",
      })
      .returning();

    await db.insert(schema.cppCommerceServices).values({
      corpusId: corpus.id,
      serviceName: agent.service.serviceName,
      description: agent.service.description,
      price: String(agent.service.price),
      walletAddress,
      chains: ["arc"],
      fulfillmentMode: "instant",
    });

    results.push({ name: agent.agentName, id: corpus.id, apiKey, service: agent.service.serviceName, price: agent.service.price });
    console.log(`  ✅ ${agent.agentName} — ${agent.service.serviceName} @ $${agent.service.price}`);
  }

  // --- Print summary ---
  console.log("\n" + "═".repeat(70));
  console.log("  DEMO AGENTS SUMMARY");
  console.log("═".repeat(70));

  for (const r of results) {
    console.log(`\n  🤖 ${r.name}`);
    console.log(`     ID:      ${r.id}`);
    console.log(`     Service: ${r.service} @ $${r.price}`);
    console.log(`     API Key: ${r.apiKey}`);
  }

  console.log("\n" + "═".repeat(70));
  console.log("\n✨ Done! Service agents are ready to receive x402 requests.\n");

  await pool.end();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await pool.end();
  process.exit(1);
});
