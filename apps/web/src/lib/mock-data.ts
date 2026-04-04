export type CorpusStatus = "Active" | "Inactive";
export type Category = "Marketing" | "Development" | "Research" | "Design";

export interface CorpusItem {
  id: string;
  name: string;
  category: Category;
  description: string;
  patrons: number;
  revenue: string;
  pulsePrice: string;
  status: CorpusStatus;
  hederaTokenId: string;
  totalSupply: number;
  creatorShare: number;
  investorShare: number;
  treasuryShare: number;
  apiEndpoint: string;
  createdAt: string;
  persona: string;
  targetAudience: string;
  channels: string[];
  approvalThreshold: number;
  gtmBudget: number;
}

export interface Activity {
  id: string;
  type: "post" | "research" | "reply" | "commerce" | "approval";
  content: string;
  channel: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
}

export interface Patron {
  address: string;
  role: "Creator" | "Investor" | "Treasury";
  pulseAmount: number;
  share: number;
}

export const CORPUS_DATA: CorpusItem[] = [
  {
    id: "corpus-001",
    name: "MarketBot Alpha",
    category: "Marketing",
    description:
      "Autonomous content generation and distribution agent optimized for B2B SaaS growth campaigns.",
    patrons: 142,
    revenue: "$12,840",
    pulsePrice: "$0.34",
    status: "Active",
    hederaTokenId: "0.0.4812753",
    totalSupply: 1000000,
    creatorShare: 60,
    investorShare: 25,
    treasuryShare: 15,
    apiEndpoint: "https://api.marketbot.io/v1",
    createdAt: "2025-02-14",
    persona: "Sharp, data-driven growth marketer with a knack for viral content",
    targetAudience: "Indie SaaS developers and small startup teams",
    channels: ["X", "LinkedIn", "Reddit"],
    approvalThreshold: 10,
    gtmBudget: 200,
  },
  {
    id: "corpus-002",
    name: "CodeForge v2",
    category: "Development",
    description:
      "Full-stack code generation corpus specializing in TypeScript microservices and API scaffolding.",
    patrons: 89,
    revenue: "$8,210",
    pulsePrice: "$0.71",
    status: "Active",
    hederaTokenId: "0.0.4813001",
    totalSupply: 500000,
    creatorShare: 70,
    investorShare: 20,
    treasuryShare: 10,
    apiEndpoint: "https://api.codeforge.dev/v2",
    createdAt: "2025-03-01",
    persona: "Senior engineer who writes clean, well-tested TypeScript",
    targetAudience: "Backend developers building APIs and microservices",
    channels: ["X", "Reddit"],
    approvalThreshold: 25,
    gtmBudget: 150,
  },
  {
    id: "corpus-003",
    name: "InsightMiner",
    category: "Research",
    description:
      "Deep research agent that synthesizes academic papers, patents, and market reports into actionable briefs.",
    patrons: 203,
    revenue: "$24,500",
    pulsePrice: "$1.12",
    status: "Active",
    hederaTokenId: "0.0.4811200",
    totalSupply: 2000000,
    creatorShare: 50,
    investorShare: 35,
    treasuryShare: 15,
    apiEndpoint: "https://api.insightminer.ai/v1",
    createdAt: "2025-01-20",
    persona: "Meticulous research analyst with academic rigor",
    targetAudience: "Product managers and strategy teams at mid-size companies",
    channels: ["LinkedIn", "X"],
    approvalThreshold: 50,
    gtmBudget: 300,
  },
  {
    id: "corpus-004",
    name: "PixelSmith",
    category: "Design",
    description:
      "UI component generation and design system maintenance agent for React-based applications.",
    patrons: 67,
    revenue: "$5,430",
    pulsePrice: "$0.22",
    status: "Inactive",
    hederaTokenId: "0.0.4814500",
    totalSupply: 750000,
    creatorShare: 65,
    investorShare: 20,
    treasuryShare: 15,
    apiEndpoint: "https://api.pixelsmith.design/v1",
    createdAt: "2025-03-10",
    persona: "Design-obsessed craftsperson who sweats the details",
    targetAudience: "Frontend developers and design engineers",
    channels: ["X"],
    approvalThreshold: 15,
    gtmBudget: 100,
  },
  {
    id: "corpus-005",
    name: "GrowthEngine",
    category: "Marketing",
    description:
      "Multi-channel attribution modeling and campaign optimization agent with real-time bid adjustments.",
    patrons: 318,
    revenue: "$41,200",
    pulsePrice: "$2.05",
    status: "Active",
    hederaTokenId: "0.0.4810050",
    totalSupply: 5000000,
    creatorShare: 45,
    investorShare: 40,
    treasuryShare: 15,
    apiEndpoint: "https://api.growthengine.io/v1",
    createdAt: "2025-01-05",
    persona: "Aggressive growth hacker who optimizes everything",
    targetAudience: "B2B SaaS companies with $1M+ ARR",
    channels: ["X", "LinkedIn", "Reddit", "Product Hunt"],
    approvalThreshold: 100,
    gtmBudget: 500,
  },
  {
    id: "corpus-006",
    name: "DataWeaver",
    category: "Research",
    description:
      "ETL pipeline orchestration corpus that automates data cleaning, transformation, and warehouse loading.",
    patrons: 54,
    revenue: "$3,780",
    pulsePrice: "$0.15",
    status: "Inactive",
    hederaTokenId: "0.0.4815800",
    totalSupply: 400000,
    creatorShare: 75,
    investorShare: 15,
    treasuryShare: 10,
    apiEndpoint: "https://api.dataweaver.io/v1",
    createdAt: "2025-03-18",
    persona: "Methodical data engineer focused on reliability",
    targetAudience: "Data teams at growing startups",
    channels: ["X", "Reddit"],
    approvalThreshold: 20,
    gtmBudget: 80,
  },
];

export function getCorpusById(id: string): CorpusItem | undefined {
  return CORPUS_DATA.find((c) => c.id === id);
}

export function getActivities(corpusId: string): Activity[] {
  const base: Activity[] = [
    { id: "a1", type: "post", content: "Published thread: '5 underrated tools for indie devs in 2025'", channel: "X", timestamp: "2 min ago", status: "completed" },
    { id: "a2", type: "research", content: "Analyzed 23 competitor accounts, identified 4 content gaps", channel: "X", timestamp: "18 min ago", status: "completed" },
    { id: "a3", type: "reply", content: "Responded to @devtools_weekly mention about API performance", channel: "X", timestamp: "34 min ago", status: "completed" },
    { id: "a4", type: "commerce", content: "Purchased 'Reddit Community Seeding' playbook from CommunityBot", channel: "x402", timestamp: "1 hour ago", status: "completed" },
    { id: "a5", type: "post", content: "Scheduled post: 'Why local-first AI agents beat cloud APIs'", channel: "LinkedIn", timestamp: "2 hours ago", status: "pending" },
    { id: "a6", type: "approval", content: "Requested approval for $25 USDC commerce transaction", channel: "Dashboard", timestamp: "3 hours ago", status: "pending" },
    { id: "a7", type: "research", content: "Scraped trending topics in #buildinpublic — found 3 engagement opportunities", channel: "X", timestamp: "4 hours ago", status: "completed" },
    { id: "a8", type: "reply", content: "Engaged with 8 comments on yesterday's viral thread", channel: "X", timestamp: "5 hours ago", status: "completed" },
    { id: "a9", type: "post", content: "Cross-posted research brief to r/SaaS with custom intro", channel: "Reddit", timestamp: "6 hours ago", status: "completed" },
    { id: "a10", type: "commerce", content: "Sold 'SaaS Developer Outreach' playbook to InsightMiner for $0.50", channel: "x402", timestamp: "8 hours ago", status: "completed" },
  ];
  return base.map((a) => ({ ...a, id: `${corpusId}-${a.id}` }));
}

export function getPatrons(corpus: CorpusItem): Patron[] {
  return [
    { address: "0x7a3F...e4B2", role: "Creator", pulseAmount: corpus.totalSupply * corpus.creatorShare / 100, share: corpus.creatorShare },
    { address: "0x1bC9...8f21", role: "Investor", pulseAmount: corpus.totalSupply * corpus.investorShare / 100, share: corpus.investorShare },
    { address: "0x9dE4...3a07", role: "Investor", pulseAmount: Math.floor(corpus.totalSupply * corpus.investorShare / 200), share: Math.floor(corpus.investorShare / 2) },
    { address: "0xTreasury", role: "Treasury", pulseAmount: corpus.totalSupply * corpus.treasuryShare / 100, share: corpus.treasuryShare },
  ];
}
