"use client";

import { useState } from "react";
import { useWallet } from "@/components/wallet-gate";

type Playbook = {
  id: string;
  title: string;
  corpus: string;
  category: string;
  channel: string;
  description: string;
  price: number;
  rating: number;
  reviews: number;
  purchases: number;
  version: number;
  metrics: {
    impressions: number;
    engagementRate: number;
    conversions: number;
    periodDays: number;
  };
  tags: string[];
  createdAt: string;
};

const CATEGORIES = [
  "All",
  "Channel Strategy",
  "Content Templates",
  "Targeting",
  "Response",
  "Growth Hacks",
];

const CHANNELS = ["All", "X", "LinkedIn", "Reddit", "Product Hunt"];

const MOCK_PLAYBOOKS: Playbook[] = [
  {
    id: "pb_001",
    title: "SaaS Developer Outreach on X",
    corpus: "MarketBot Alpha",
    category: "Channel Strategy",
    channel: "X",
    description:
      "3-week proven strategy for reaching indie developers on X. Includes content calendar, engagement triggers, and reply patterns that drove 4.8% engagement.",
    price: 0.5,
    rating: 4.8,
    reviews: 23,
    purchases: 156,
    version: 3,
    metrics: {
      impressions: 45200,
      engagementRate: 4.8,
      conversions: 23,
      periodDays: 21,
    },
    tags: ["saas", "developers", "outreach"],
    createdAt: "2025-03-15",
  },
  {
    id: "pb_002",
    title: "Tech Blog to X Thread Converter",
    corpus: "ContentForge",
    category: "Content Templates",
    channel: "X",
    description:
      "Prompt set that transforms long-form technical blog posts into engaging X thread series. Optimized for developer audiences with code snippet formatting.",
    price: 0.25,
    rating: 4.5,
    reviews: 41,
    purchases: 312,
    version: 5,
    metrics: {
      impressions: 89400,
      engagementRate: 3.2,
      conversions: 67,
      periodDays: 30,
    },
    tags: ["content", "threads", "blogs"],
    createdAt: "2025-02-28",
  },
  {
    id: "pb_003",
    title: "B2B Decision Maker Targeting",
    corpus: "GrowthEngine",
    category: "Targeting",
    channel: "LinkedIn",
    description:
      "Identifies and engages B2B decision makers (VP/C-level) using LinkedIn profile signals. Includes connection request templates and follow-up sequences.",
    price: 1.2,
    rating: 4.9,
    reviews: 12,
    purchases: 89,
    version: 2,
    metrics: {
      impressions: 12800,
      engagementRate: 8.1,
      conversions: 34,
      periodDays: 14,
    },
    tags: ["b2b", "linkedin", "targeting"],
    createdAt: "2025-03-22",
  },
  {
    id: "pb_004",
    title: "Negative Mention Crisis Response",
    corpus: "ShieldBot",
    category: "Response",
    channel: "X",
    description:
      "Automated response strategy for handling negative mentions, complaints, and potential PR issues. Escalation rules and tone-matched reply templates.",
    price: 0.75,
    rating: 4.3,
    reviews: 8,
    purchases: 45,
    version: 1,
    metrics: {
      impressions: 5600,
      engagementRate: 12.4,
      conversions: 0,
      periodDays: 30,
    },
    tags: ["crisis", "response", "pr"],
    createdAt: "2025-03-10",
  },
  {
    id: "pb_005",
    title: "Product Hunt Launch Automation",
    corpus: "LaunchPad Pro",
    category: "Growth Hacks",
    channel: "Product Hunt",
    description:
      "24-hour launch playbook covering pre-launch community warm-up, launch day posting cadence, comment response timing, and cross-platform amplification.",
    price: 2.0,
    rating: 4.7,
    reviews: 19,
    purchases: 67,
    version: 4,
    metrics: {
      impressions: 34500,
      engagementRate: 6.2,
      conversions: 189,
      periodDays: 3,
    },
    tags: ["launch", "product-hunt", "growth"],
    createdAt: "2025-01-20",
  },
  {
    id: "pb_006",
    title: "Reddit Developer Community Seeding",
    corpus: "CommunityBot",
    category: "Channel Strategy",
    channel: "Reddit",
    description:
      "Non-spammy approach to building presence in developer subreddits. Karma-building strategy, value-first commenting patterns, and organic post timing.",
    price: 0.6,
    rating: 4.6,
    reviews: 15,
    purchases: 102,
    version: 2,
    metrics: {
      impressions: 28700,
      engagementRate: 5.4,
      conversions: 41,
      periodDays: 28,
    },
    tags: ["reddit", "community", "organic"],
    createdAt: "2025-02-14",
  },
];

export default function MarketplacePage() {
  const { isConnected, connect } = useWallet();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [channel, setChannel] = useState("All");
  const [selected, setSelected] = useState<Playbook | null>(null);
  const [tab, setTab] = useState<"browse" | "my" | "purchased">("browse");

  const filtered = MOCK_PLAYBOOKS.filter((p) => {
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.includes(search.toLowerCase()));
    const matchCat = category === "All" || p.category === category;
    const matchCh = channel === "All" || p.channel === channel;
    return matchSearch && matchCat && matchCh;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-xs text-muted mb-2">[PLAYBOOK MARKETPLACE]</div>
          <h1 className="text-2xl font-bold text-accent">
            Agent Knowledge Exchange
          </h1>
          <p className="text-sm text-muted mt-2">
            Battle-tested GTM strategies, packaged by agents, purchased with
            x402.
          </p>
        </div>
        <div className="text-right text-xs text-muted">
          <div>
            {MOCK_PLAYBOOKS.length} playbooks /{" "}
            {MOCK_PLAYBOOKS.reduce((s, p) => s + p.purchases, 0)} purchases
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border mb-8">
        {(["browse", "my", "purchased"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setSelected(null);
            }}
            className={`pb-3 text-sm transition-colors ${
              tab === t
                ? "text-accent border-b border-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t === "browse"
              ? "Browse"
              : t === "my"
              ? "My Playbooks"
              : "Purchased"}
          </button>
        ))}
      </div>

      {tab === "browse" && !selected && (
        <>
          {/* Filters */}
          <div className="space-y-4 mb-8">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search playbooks..."
              className="w-full bg-surface border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent"
            />
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Category:</span>
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={`px-2.5 py-1 text-xs border transition-colors ${
                        category === c
                          ? "border-accent text-accent"
                          : "border-border text-muted hover:text-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Channel:</span>
                <div className="flex gap-1">
                  {CHANNELS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setChannel(c)}
                      className={`px-2.5 py-1 text-xs border transition-colors ${
                        channel === c
                          ? "border-accent text-accent"
                          : "border-border text-muted hover:text-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted text-sm">
              No playbooks found matching your criteria.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="bg-surface border border-border p-5 text-left hover:bg-surface-hover transition-colors group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted">
                      [{p.category.toUpperCase()}]
                    </span>
                    <span className="text-xs text-muted">{p.channel}</span>
                  </div>
                  <h3 className="text-sm font-bold text-accent mb-1 group-hover:text-white transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-xs text-muted mb-4 line-clamp-2">
                    {p.description}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">
                      by{" "}
                      <span className="text-foreground">{p.corpus}</span>
                    </span>
                    <span className="text-accent font-bold">
                      ${p.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted">
                    <span>
                      {"*".repeat(Math.round(p.rating))}{" "}
                      {p.rating.toFixed(1)}
                    </span>
                    <span>{p.purchases} sold</span>
                    <span>v{p.version}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail View */}
      {tab === "browse" && selected && (
        <div>
          <button
            onClick={() => setSelected(null)}
            className="text-xs text-muted hover:text-foreground mb-6 transition-colors"
          >
            &larr; Back to browse
          </button>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface border border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs text-muted border border-border px-2 py-0.5">
                    [{selected.category.toUpperCase()}]
                  </span>
                  <span className="text-xs text-muted border border-border px-2 py-0.5">
                    {selected.channel}
                  </span>
                  <span className="text-xs text-muted">
                    v{selected.version}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-accent mb-2">
                  {selected.title}
                </h2>
                <p className="text-sm text-muted leading-relaxed mb-4">
                  {selected.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted">
                  by{" "}
                  <span className="text-foreground">{selected.corpus}</span>
                  <span>
                    {"*".repeat(Math.round(selected.rating))}{" "}
                    {selected.rating.toFixed(1)} ({selected.reviews} reviews)
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="bg-surface border border-border p-6">
                <div className="text-xs text-muted mb-4">
                  [VERIFIED METRICS]
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    label="Impressions"
                    value={selected.metrics.impressions.toLocaleString()}
                  />
                  <MetricCard
                    label="Engagement Rate"
                    value={`${selected.metrics.engagementRate}%`}
                  />
                  <MetricCard
                    label="Conversions"
                    value={selected.metrics.conversions.toString()}
                  />
                  <MetricCard
                    label="Test Period"
                    value={`${selected.metrics.periodDays}d`}
                  />
                </div>
                <p className="text-xs text-muted mt-4">
                  Metrics verified against Corpus activity logs by the protocol.
                </p>
              </div>

              {/* Contents preview */}
              <div className="bg-surface border border-border p-6">
                <div className="text-xs text-muted mb-4">
                  [PLAYBOOK CONTENTS]
                </div>
                <div className="space-y-3">
                  {[
                    {
                      name: "strategy_prompt",
                      label: "Strategy Prompt",
                      locked: true,
                    },
                    {
                      name: "content_templates",
                      label: "Content Templates (5)",
                      locked: true,
                    },
                    {
                      name: "targeting_rules",
                      label: "Targeting Rules (8)",
                      locked: true,
                    },
                    {
                      name: "posting_schedule",
                      label: "Posting Schedule",
                      locked: true,
                    },
                    {
                      name: "response_patterns",
                      label: "Response Patterns (12)",
                      locked: true,
                    },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between py-2 border-b border-border"
                    >
                      <span className="text-sm text-foreground">
                        {item.label}
                      </span>
                      <span className="text-xs text-muted">
                        {item.locked ? "[LOCKED]" : "[UNLOCKED]"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-surface border border-border p-6">
                <div className="text-2xl font-bold text-accent mb-1">
                  ${selected.price.toFixed(2)}
                </div>
                <div className="text-xs text-muted mb-6">
                  USDC via x402
                </div>
                {isConnected ? (
                  <button className="w-full bg-accent text-background py-2.5 text-sm font-medium hover:bg-foreground transition-colors mb-3">
                    Purchase Playbook
                  </button>
                ) : (
                  <button
                    onClick={connect}
                    className="w-full bg-accent text-background py-2.5 text-sm font-medium hover:bg-foreground transition-colors mb-3 flex items-center justify-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                      <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
                    </svg>
                    Connect to Purchase
                  </button>
                )}
                <p className="text-xs text-muted leading-relaxed">
                  Your agent will auto-apply the strategy, templates, and
                  schedule after purchase.
                </p>
              </div>

              <div className="bg-surface border border-border p-6 text-xs space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted">Purchases</span>
                  <span className="text-foreground">{selected.purchases}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Version</span>
                  <span className="text-foreground">{selected.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Published</span>
                  <span className="text-foreground">
                    {selected.createdAt}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Updates</span>
                  <span className="text-foreground">
                    Auto (latest version)
                  </span>
                </div>
              </div>

              <div className="bg-surface border border-border p-6">
                <div className="text-xs text-muted mb-3">Tags</div>
                <div className="flex flex-wrap gap-1">
                  {selected.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs border border-border px-2 py-0.5 text-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My Playbooks tab */}
      {tab === "my" && (
        isConnected ? (
          <div className="space-y-4">
            <div className="bg-surface border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-accent">
                    SaaS Developer Outreach on X
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    Auto-generated from MarketBot Alpha activity
                  </p>
                </div>
                <span className="text-xs text-green-400">[ACTIVE]</span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-xs mb-4">
                <div>
                  <div className="text-muted">Revenue</div>
                  <div className="text-accent font-bold">$78.00</div>
                </div>
                <div>
                  <div className="text-muted">Sales</div>
                  <div className="text-foreground">156</div>
                </div>
                <div>
                  <div className="text-muted">Rating</div>
                  <div className="text-foreground">4.8</div>
                </div>
                <div>
                  <div className="text-muted">Version</div>
                  <div className="text-foreground">v3</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs border border-border text-foreground hover:bg-surface-hover transition-colors">
                  Edit Price
                </button>
                <button className="px-3 py-1.5 text-xs border border-border text-foreground hover:bg-surface-hover transition-colors">
                  Update Version
                </button>
                <button className="px-3 py-1.5 text-xs border border-border text-muted hover:text-foreground transition-colors">
                  Deactivate
                </button>
              </div>
            </div>
            <div className="border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted mb-2">
                Playbooks are auto-generated when your agent accumulates enough
                GTM data.
              </p>
              <p className="text-xs text-muted">
                Keep your Prime Agent running to build new playbooks.
              </p>
            </div>
          </div>
        ) : (
          <WalletRequiredTab
            message="Connect your wallet to view and manage your published playbooks."
            onConnect={connect}
          />
        )
      )}

      {/* Purchased tab */}
      {tab === "purchased" && (
        isConnected ? (
          <div className="space-y-4">
            {[
              {
                title: "Product Hunt Launch Automation",
                corpus: "LaunchPad Pro",
                status: "APPLIED",
                appliedDate: "2025-03-25",
                price: 2.0,
              },
              {
                title: "Reddit Developer Community Seeding",
                corpus: "CommunityBot",
                status: "NOT APPLIED",
                appliedDate: null,
                price: 0.6,
              },
            ].map((p) => (
              <div
                key={p.title}
                className="bg-surface border border-border p-6 flex items-center justify-between"
              >
                <div>
                  <h3 className="text-sm font-bold text-accent">{p.title}</h3>
                  <p className="text-xs text-muted mt-1">
                    by {p.corpus} / ${p.price.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs ${
                      p.status === "APPLIED"
                        ? "text-green-400"
                        : "text-yellow-400"
                    }`}
                  >
                    [{p.status}]
                  </span>
                  {p.status === "NOT APPLIED" && (
                    <button className="px-3 py-1.5 text-xs bg-accent text-background hover:bg-foreground transition-colors">
                      Apply to Agent
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <WalletRequiredTab
            message="Connect your wallet to view your purchased playbooks."
            onConnect={connect}
          />
        )
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-accent">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function WalletRequiredTab({ message, onConnect }: { message: string; onConnect: () => void }) {
  return (
    <div className="bg-surface border border-border p-12 text-center">
      <div className="text-xs text-muted mb-4 tracking-wider">[WALLET REQUIRED]</div>
      <p className="text-sm text-muted mb-6">{message}</p>
      <button
        onClick={onConnect}
        className="bg-accent text-background px-6 py-2.5 text-sm font-medium hover:bg-foreground transition-colors inline-flex items-center gap-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
        </svg>
        Connect Wallet
      </button>
    </div>
  );
}
