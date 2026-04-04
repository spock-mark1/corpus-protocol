import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data
  await prisma.commerceJob.deleteMany();
  await prisma.commerceService.deleteMany();
  await prisma.revenue.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.patron.deleteMany();
  await prisma.corpus.deleteMany();

  // ─── Corpus Data ─────────────────────────────────────────
  const corpuses = [
    {
      name: "MarketBot Alpha",
      category: "Marketing",
      description:
        "Autonomous content generation and distribution agent optimized for B2B SaaS growth campaigns.",
      status: "Active",
      hederaTokenId: "0.0.4812753",
      pulsePrice: 0.34,
      totalSupply: 1000000,
      creatorShare: 60,
      investorShare: 25,
      treasuryShare: 15,
      apiEndpoint: "https://api.marketbot.io/v1",
      persona:
        "Sharp, data-driven growth marketer with a knack for viral content",
      targetAudience: "Indie SaaS developers and small startup teams",
      channels: ["X", "LinkedIn", "Reddit"],
      approvalThreshold: 10,
      gtmBudget: 200,
      creatorAddress: "0x7a3F...e4B2",
    },
    {
      name: "CodeForge v2",
      category: "Development",
      description:
        "Full-stack code generation corpus specializing in TypeScript microservices and API scaffolding.",
      status: "Active",
      hederaTokenId: "0.0.4813001",
      pulsePrice: 0.71,
      totalSupply: 500000,
      creatorShare: 70,
      investorShare: 20,
      treasuryShare: 10,
      apiEndpoint: "https://api.codeforge.dev/v2",
      persona: "Senior engineer who writes clean, well-tested TypeScript",
      targetAudience: "Backend developers building APIs and microservices",
      channels: ["X", "Reddit"],
      approvalThreshold: 25,
      gtmBudget: 150,
      creatorAddress: "0x8bD1...f3A9",
    },
    {
      name: "InsightMiner",
      category: "Research",
      description:
        "Deep research agent that synthesizes academic papers, patents, and market reports into actionable briefs.",
      status: "Active",
      hederaTokenId: "0.0.4811200",
      pulsePrice: 1.12,
      totalSupply: 2000000,
      creatorShare: 50,
      investorShare: 35,
      treasuryShare: 15,
      apiEndpoint: "https://api.insightminer.ai/v1",
      persona: "Meticulous research analyst with academic rigor",
      targetAudience:
        "Product managers and strategy teams at mid-size companies",
      channels: ["LinkedIn", "X"],
      approvalThreshold: 50,
      gtmBudget: 300,
      creatorAddress: "0x2cE7...b8D4",
    },
    {
      name: "PixelSmith",
      category: "Design",
      description:
        "UI component generation and design system maintenance agent for React-based applications.",
      status: "Inactive",
      hederaTokenId: "0.0.4814500",
      pulsePrice: 0.22,
      totalSupply: 750000,
      creatorShare: 65,
      investorShare: 20,
      treasuryShare: 15,
      apiEndpoint: "https://api.pixelsmith.design/v1",
      persona: "Design-obsessed craftsperson who sweats the details",
      targetAudience: "Frontend developers and design engineers",
      channels: ["X"],
      approvalThreshold: 15,
      gtmBudget: 100,
      creatorAddress: "0x5aF2...c1E6",
    },
    {
      name: "GrowthEngine",
      category: "Marketing",
      description:
        "Multi-channel attribution modeling and campaign optimization agent with real-time bid adjustments.",
      status: "Active",
      hederaTokenId: "0.0.4810050",
      pulsePrice: 2.05,
      totalSupply: 5000000,
      creatorShare: 45,
      investorShare: 40,
      treasuryShare: 15,
      apiEndpoint: "https://api.growthengine.io/v1",
      persona: "Aggressive growth hacker who optimizes everything",
      targetAudience: "B2B SaaS companies with $1M+ ARR",
      channels: ["X", "LinkedIn", "Reddit", "Product Hunt"],
      approvalThreshold: 100,
      gtmBudget: 500,
      creatorAddress: "0x9dE4...3a07",
    },
    {
      name: "DataWeaver",
      category: "Research",
      description:
        "ETL pipeline orchestration corpus that automates data cleaning, transformation, and warehouse loading.",
      status: "Inactive",
      hederaTokenId: "0.0.4815800",
      pulsePrice: 0.15,
      totalSupply: 400000,
      creatorShare: 75,
      investorShare: 15,
      treasuryShare: 10,
      apiEndpoint: "https://api.dataweaver.io/v1",
      persona: "Methodical data engineer focused on reliability",
      targetAudience: "Data teams at growing startups",
      channels: ["X", "Reddit"],
      approvalThreshold: 20,
      gtmBudget: 80,
      creatorAddress: "0x1bC9...8f21",
    },
  ];

  for (const c of corpuses) {
    const corpus = await prisma.corpus.create({
      data: {
        name: c.name,
        category: c.category,
        description: c.description,
        status: c.status,
        hederaTokenId: c.hederaTokenId,
        pulsePrice: c.pulsePrice,
        totalSupply: c.totalSupply,
        creatorShare: c.creatorShare,
        investorShare: c.investorShare,
        treasuryShare: c.treasuryShare,
        apiEndpoint: c.apiEndpoint,
        persona: c.persona,
        targetAudience: c.targetAudience,
        channels: c.channels,
        approvalThreshold: c.approvalThreshold,
        gtmBudget: c.gtmBudget,
        creatorAddress: c.creatorAddress,
        agentOnline: c.status === "Active",
      },
    });

    // Patrons
    await prisma.patron.createMany({
      data: [
        {
          corpusId: corpus.id,
          walletAddress: c.creatorAddress,
          role: "Creator",
          pulseAmount: Math.floor(
            (c.totalSupply * c.creatorShare) / 100
          ),
          share: c.creatorShare,
        },
        {
          corpusId: corpus.id,
          walletAddress: `0xInv_${corpus.id.slice(-6)}`,
          role: "Investor",
          pulseAmount: Math.floor(
            (c.totalSupply * c.investorShare) / 100
          ),
          share: c.investorShare,
        },
        {
          corpusId: corpus.id,
          walletAddress: "0xTreasury",
          role: "Treasury",
          pulseAmount: Math.floor(
            (c.totalSupply * c.treasuryShare) / 100
          ),
          share: c.treasuryShare,
        },
      ],
    });

    // Activities
    const activityTypes = [
      { type: "post", content: "Published thread: '5 underrated tools for indie devs in 2025'", channel: "X", status: "completed" },
      { type: "research", content: "Analyzed 23 competitor accounts, identified 4 content gaps", channel: "X", status: "completed" },
      { type: "reply", content: "Responded to @devtools_weekly mention about API performance", channel: "X", status: "completed" },
      { type: "commerce", content: "Purchased 'Reddit Community Seeding' playbook from CommunityBot", channel: "x402", status: "completed" },
      { type: "post", content: "Scheduled post: 'Why local-first AI agents beat cloud APIs'", channel: "LinkedIn", status: "pending" },
      { type: "approval", content: "Requested approval for $25 USDC commerce transaction", channel: "Dashboard", status: "pending" },
      { type: "research", content: "Scraped trending topics in #buildinpublic — found 3 engagement opportunities", channel: "X", status: "completed" },
      { type: "reply", content: "Engaged with 8 comments on yesterday's viral thread", channel: "X", status: "completed" },
    ];

    for (let i = 0; i < activityTypes.length; i++) {
      const a = activityTypes[i];
      await prisma.activity.create({
        data: {
          corpusId: corpus.id,
          type: a.type,
          content: a.content,
          channel: a.channel,
          status: a.status,
          createdAt: new Date(Date.now() - i * 3600000), // stagger by hours
        },
      });
    }

    // Approvals
    await prisma.approval.createMany({
      data: [
        {
          corpusId: corpus.id,
          type: "transaction",
          title: "$25 USDC commerce transaction with InsightMiner",
          description: "Purchase research playbook for market analysis",
          amount: 25,
          status: "pending",
        },
        {
          corpusId: corpus.id,
          type: "strategy",
          title: "Activate Reddit channel for GTM",
          description: "Start posting in r/SaaS and r/startups",
          status: "pending",
        },
      ],
    });

    // Revenue
    await prisma.revenue.createMany({
      data: [
        { corpusId: corpus.id, amount: 0.5, source: "commerce", currency: "USDC" },
        { corpusId: corpus.id, amount: 1.2, source: "commerce", currency: "USDC" },
        { corpusId: corpus.id, amount: 0.05, source: "commerce", currency: "USDC" },
      ],
    });

    console.log(`Seeded: ${corpus.name} (${corpus.id})`);
  }

  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
