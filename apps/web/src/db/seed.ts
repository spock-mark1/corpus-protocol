import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import {
  cppCorpus,
  cppPatrons,
  cppActivities,
  cppApprovals,
  cppRevenues,
  cppPlaybooks,
  cppPlaybookPurchases,
  cppCommerceJobs,
  cppCommerceServices,
} from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool);

async function main() {
  // Clear existing data (FK order)
  await db.delete(cppPlaybookPurchases);
  await db.delete(cppPlaybooks);
  await db.delete(cppCommerceJobs);
  await db.delete(cppCommerceServices);
  await db.delete(cppRevenues);
  await db.delete(cppApprovals);
  await db.delete(cppActivities);
  await db.delete(cppPatrons);
  await db.delete(cppCorpus);

  // ─── Corpus Data ─────────────────────────────────────────
  const corpusData = [
    {
      name: "MarketBot Alpha",
      category: "Marketing",
      description:
        "Autonomous content generation and distribution agent optimized for B2B SaaS growth campaigns.",
      status: "Active",
      hederaTokenId: "0.0.4812753",
      pulsePrice: "0.34",
      totalSupply: 1000000,
      creatorShare: 60,
      investorShare: 25,
      treasuryShare: 15,
      persona:
        "Sharp, data-driven growth marketer with a knack for viral content",
      targetAudience: "Indie SaaS developers and small startup teams",
      channels: ["X", "LinkedIn", "Reddit"],
      approvalThreshold: "10",
      gtmBudget: "200",
      creatorAddress: "0x7a3F...e4B2",
      onChainId: 101,
      agentName: "marketbot-alpha",
    },
    {
      name: "CodeForge v2",
      category: "Development",
      description:
        "Full-stack code generation corpus specializing in TypeScript microservices and API scaffolding.",
      status: "Active",
      hederaTokenId: "0.0.4813001",
      pulsePrice: "0.71",
      totalSupply: 500000,
      creatorShare: 70,
      investorShare: 20,
      treasuryShare: 10,
      persona: "Senior engineer who writes clean, well-tested TypeScript",
      targetAudience: "Backend developers building APIs and microservices",
      channels: ["X", "Reddit"],
      approvalThreshold: "25",
      gtmBudget: "150",
      creatorAddress: "0x8bD1...f3A9",
      onChainId: 102,
      agentName: "codeforge",
    },
    {
      name: "InsightMiner",
      category: "Research",
      description:
        "Deep research agent that synthesizes academic papers, patents, and market reports into actionable briefs.",
      status: "Active",
      hederaTokenId: "0.0.4811200",
      pulsePrice: "1.12",
      totalSupply: 2000000,
      creatorShare: 50,
      investorShare: 35,
      treasuryShare: 15,
      persona: "Meticulous research analyst with academic rigor",
      targetAudience:
        "Product managers and strategy teams at mid-size companies",
      channels: ["LinkedIn", "X"],
      approvalThreshold: "50",
      gtmBudget: "300",
      creatorAddress: "0x2cE7...b8D4",
      onChainId: 103,
      agentName: "insightminer",
    },
    {
      name: "PixelSmith",
      category: "Design",
      description:
        "UI component generation and design system maintenance agent for React-based applications.",
      status: "Inactive",
      hederaTokenId: "0.0.4814500",
      pulsePrice: "0.22",
      totalSupply: 750000,
      creatorShare: 65,
      investorShare: 20,
      treasuryShare: 15,
      persona: "Design-obsessed craftsperson who sweats the details",
      targetAudience: "Frontend developers and design engineers",
      channels: ["X"],
      approvalThreshold: "15",
      gtmBudget: "100",
      creatorAddress: "0x5aF2...c1E6",
      onChainId: 104,
      agentName: "pixelsmith",
    },
    {
      name: "GrowthEngine",
      category: "Marketing",
      description:
        "Multi-channel attribution modeling and campaign optimization agent with real-time bid adjustments.",
      status: "Active",
      hederaTokenId: "0.0.4810050",
      pulsePrice: "2.05",
      totalSupply: 5000000,
      creatorShare: 45,
      investorShare: 40,
      treasuryShare: 15,
      persona: "Aggressive growth hacker who optimizes everything",
      targetAudience: "B2B SaaS companies with $1M+ ARR",
      channels: ["X", "LinkedIn", "Reddit", "Product Hunt"],
      approvalThreshold: "100",
      gtmBudget: "500",
      creatorAddress: "0x9dE4...3a07",
      onChainId: 105,
      agentName: "growthengine",
    },
    {
      name: "DataWeaver",
      category: "Research",
      description:
        "ETL pipeline orchestration corpus that automates data cleaning, transformation, and warehouse loading.",
      status: "Inactive",
      hederaTokenId: "0.0.4815800",
      pulsePrice: "0.15",
      totalSupply: 400000,
      creatorShare: 75,
      investorShare: 15,
      treasuryShare: 10,
      persona: "Methodical data engineer focused on reliability",
      targetAudience: "Data teams at growing startups",
      channels: ["X", "Reddit"],
      approvalThreshold: "20",
      gtmBudget: "80",
      creatorAddress: "0x1bC9...8f21",
      onChainId: 106,
      agentName: "dataweaver",
    },
  ];

  for (const c of corpusData) {
    const [corpus] = await db
      .insert(cppCorpus)
      .values({
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
        persona: c.persona,
        targetAudience: c.targetAudience,
        channels: c.channels,
        approvalThreshold: c.approvalThreshold,
        gtmBudget: c.gtmBudget,
        creatorAddress: c.creatorAddress,
        onChainId: c.onChainId,
        agentName: c.agentName,
        agentOnline: c.status === "Active",
      })
      .returning();

    // Patrons
    await db.insert(cppPatrons).values([
      {
        corpusId: corpus.id,
        walletAddress: c.creatorAddress,
        role: "Creator",
        pulseAmount: Math.floor((c.totalSupply * c.creatorShare) / 100),
        share: String(c.creatorShare),
      },
      {
        corpusId: corpus.id,
        walletAddress: `0xInv_${corpus.id.slice(-6)}`,
        role: "Investor",
        pulseAmount: Math.floor((c.totalSupply * c.investorShare) / 100),
        share: String(c.investorShare),
      },
      {
        corpusId: corpus.id,
        walletAddress: "0xTreasury",
        role: "Treasury",
        pulseAmount: Math.floor((c.totalSupply * c.treasuryShare) / 100),
        share: String(c.treasuryShare),
      },
    ]);

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
      await db.insert(cppActivities).values({
        corpusId: corpus.id,
        type: a.type,
        content: a.content,
        channel: a.channel,
        status: a.status,
        createdAt: new Date(Date.now() - i * 3600000),
      });
    }

    // Approvals
    await db.insert(cppApprovals).values([
      {
        corpusId: corpus.id,
        type: "transaction",
        title: "$25 USDC commerce transaction with InsightMiner",
        description: "Purchase research playbook for market analysis",
        amount: "25",
        status: "pending",
      },
      {
        corpusId: corpus.id,
        type: "strategy",
        title: "Activate Reddit channel for GTM",
        description: "Start posting in r/SaaS and r/startups",
        status: "pending",
      },
    ]);

    // Revenue
    await db.insert(cppRevenues).values([
      { corpusId: corpus.id, amount: "0.5", source: "commerce", currency: "USDC" },
      { corpusId: corpus.id, amount: "1.2", source: "commerce", currency: "USDC" },
      { corpusId: corpus.id, amount: "0.05", source: "commerce", currency: "USDC" },
    ]);

    console.log(`Seeded: ${corpus.name} (${corpus.id})`);
  }

  // ─── Playbook Data ──────────────────────────────────────
  const allCorpuses = await db
    .select({ id: cppCorpus.id, name: cppCorpus.name })
    .from(cppCorpus);
  const corpusMap = new Map(allCorpuses.map((c) => [c.name, c.id]));

  const playbookData = [
    {
      corpusName: "MarketBot Alpha",
      title: "SaaS Developer Outreach on X",
      category: "Channel Strategy",
      channel: "X",
      description:
        "3-week proven strategy for reaching indie developers on X. Includes content calendar, engagement triggers, and reply patterns that drove 4.8% engagement.",
      price: "0.5",
      version: 3,
      tags: ["saas", "developers", "outreach"],
      impressions: 45200,
      engagementRate: "4.8",
      conversions: 23,
      periodDays: 21,
      content: {
        schedule: { posts_per_day: 3, best_hours_utc: [14, 18, 22], thread_days: ["tue", "thu"] },
        templates: [
          { type: "hook", pattern: "Most {audience} don't know that {insight}. Here's why it matters:", usage: "thread opener" },
          { type: "listicle", pattern: "{n} things I learned building {product} this week:", usage: "engagement post" },
          { type: "cta", pattern: "Try it yourself → {product_url}", usage: "thread closer" },
        ],
        hashtags: ["#buildinpublic", "#devtools", "#saas", "#indiehacker"],
        tactics: [
          "reply to trending dev threads within 30min",
          "quote-tweet industry news with product angle",
          "engage with 5 developer accounts daily before posting",
        ],
      },
    },
    {
      corpusName: "MarketBot Alpha",
      title: "Tech Blog to X Thread Converter",
      category: "Content Templates",
      channel: "X",
      description:
        "Prompt set that transforms long-form technical blog posts into engaging X thread series. Optimized for developer audiences with code snippet formatting.",
      price: "0.25",
      version: 5,
      tags: ["content", "threads", "blogs"],
      impressions: 89400,
      engagementRate: "3.2",
      conversions: 67,
      periodDays: 30,
      content: {
        schedule: { posts_per_day: 1, best_hours_utc: [15, 20], thread_days: ["mon", "wed", "fri"] },
        templates: [
          { type: "hook", pattern: "I just read about {topic} and here's what most devs are missing:", usage: "thread opener" },
          { type: "technical", pattern: "Here's the code:\n```\n{code_snippet}\n```\nWhy this matters:", usage: "mid-thread" },
          { type: "cta", pattern: "Full blog post with examples → {blog_url}\nRT if this helped!", usage: "thread closer" },
        ],
        hashtags: ["#coding", "#webdev", "#typescript", "#buildinpublic"],
        tactics: [
          "convert each H2 section into a tweet",
          "add code screenshots for complex snippets",
          "tag original author if referencing external content",
        ],
      },
    },
    {
      corpusName: "GrowthEngine",
      title: "B2B Decision Maker Targeting",
      category: "Targeting",
      channel: "LinkedIn",
      description:
        "Identifies and engages B2B decision makers (VP/C-level) using LinkedIn profile signals. Includes connection request templates and follow-up sequences.",
      price: "1.2",
      version: 2,
      tags: ["b2b", "linkedin", "targeting"],
      impressions: 12800,
      engagementRate: "8.1",
      conversions: 34,
      periodDays: 14,
      content: {
        schedule: { posts_per_day: 2, best_hours_utc: [9, 13, 17], thread_days: ["tue", "thu"] },
        templates: [
          { type: "connection", pattern: "Hi {name}, I noticed your work on {topic} at {company}. Would love to connect.", usage: "connection request" },
          { type: "follow_up", pattern: "Thanks for connecting! I've been working on {product} which helps teams like {company} with {problem}.", usage: "first follow-up" },
        ],
        hashtags: ["#B2B", "#SaaS", "#leadership", "#productmanagement"],
        tactics: [
          "target profiles with 'VP' or 'Head of' in title",
          "engage with their posts before sending connection request",
          "wait 3 days between connection and first message",
        ],
      },
    },
    {
      corpusName: "MarketBot Alpha",
      title: "Negative Mention Crisis Response",
      category: "Response",
      channel: "X",
      description:
        "Automated response strategy for handling negative mentions, complaints, and potential PR issues. Escalation rules and tone-matched reply templates.",
      price: "0.75",
      version: 1,
      tags: ["crisis", "response", "pr"],
      impressions: 5600,
      engagementRate: "12.4",
      conversions: 0,
      periodDays: 30,
      content: {
        schedule: { posts_per_day: 0, best_hours_utc: [], thread_days: [] },
        templates: [
          { type: "acknowledgment", pattern: "Thanks for flagging this, {user}. We're looking into it right now.", usage: "immediate response" },
          { type: "resolution", pattern: "Update: We've identified the issue and {fix_description}. Thanks for your patience.", usage: "follow-up" },
          { type: "escalation", pattern: "This needs human review — forwarding to the team.", usage: "internal escalation" },
        ],
        hashtags: [],
        tactics: [
          "respond to negative mentions within 15 minutes",
          "never argue publicly — acknowledge and move to DM",
          "escalate mentions with >100 likes to approval queue",
        ],
      },
    },
    {
      corpusName: "GrowthEngine",
      title: "Product Hunt Launch Automation",
      category: "Growth Hacks",
      channel: "Product Hunt",
      description:
        "24-hour launch playbook covering pre-launch community warm-up, launch day posting cadence, comment response timing, and cross-platform amplification.",
      price: "2.0",
      version: 4,
      tags: ["launch", "product-hunt", "growth"],
      impressions: 34500,
      engagementRate: "6.2",
      conversions: 189,
      periodDays: 3,
      content: {
        schedule: { posts_per_day: 8, best_hours_utc: [0, 3, 6, 9, 12, 15, 18, 21], thread_days: ["launch_day"] },
        templates: [
          { type: "launch", pattern: "We just launched {product} on Product Hunt! {one_liner}\n\nCheck it out → {ph_url}", usage: "cross-platform announcement" },
          { type: "comment_reply", pattern: "Great question! {answer}\n\nWe built this because {motivation}.", usage: "PH comment response" },
        ],
        hashtags: ["#producthunt", "#launch", "#startup", "#buildinpublic"],
        tactics: [
          "warm up community 1 week before launch",
          "respond to every PH comment within 30 minutes",
          "cross-post to X and LinkedIn at launch",
          "send personal DMs to supporters asking for upvotes",
        ],
      },
    },
    {
      corpusName: "MarketBot Alpha",
      title: "Reddit Developer Community Seeding",
      category: "Channel Strategy",
      channel: "Reddit",
      description:
        "Non-spammy approach to building presence in developer subreddits. Karma-building strategy, value-first commenting patterns, and organic post timing.",
      price: "0.6",
      version: 2,
      tags: ["reddit", "community", "organic"],
      impressions: 28700,
      engagementRate: "5.4",
      conversions: 41,
      periodDays: 28,
      content: {
        schedule: { posts_per_day: 2, best_hours_utc: [14, 19], thread_days: ["mon", "wed", "fri"] },
        templates: [
          { type: "value_post", pattern: "I've been working on {topic} and learned {insight}. Here's what helped me:", usage: "value-first post" },
          { type: "comment", pattern: "Good point. In my experience with {product_category}, {helpful_insight}.", usage: "helpful comment" },
        ],
        hashtags: [],
        tactics: [
          "build karma with helpful comments for 2 weeks before posting",
          "never directly link product in first post",
          "target r/SaaS, r/startups, r/webdev based on product fit",
          "follow subreddit rules strictly — one ban kills the strategy",
        ],
      },
    },
  ];

  for (const pb of playbookData) {
    const corpusId = corpusMap.get(pb.corpusName);
    if (!corpusId) continue;

    await db.insert(cppPlaybooks).values({
      corpusId,
      title: pb.title,
      category: pb.category,
      channel: pb.channel,
      description: pb.description,
      price: pb.price,
      version: pb.version,
      tags: pb.tags,
      content: pb.content,
      impressions: pb.impressions,
      engagementRate: pb.engagementRate,
      conversions: pb.conversions,
      periodDays: pb.periodDays,
    });
    console.log(`  Playbook: ${pb.title}`);
  }

  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
