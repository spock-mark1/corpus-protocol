"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { getCorpusById, getActivities, getPatrons } from "@/lib/mock-data";

const TABS = ["Overview", "Activity", "Patrons", "Revenue", "Agent"] as const;
type Tab = (typeof TABS)[number];

const TYPE_ICONS: Record<string, string> = {
  post: ">_",
  research: "??",
  reply: "<>",
  commerce: "$$",
  approval: "!!",
};

export default function CorpusDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("Overview");

  const corpus = getCorpusById(id);
  if (!corpus) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="text-muted text-sm">Corpus not found.</div>
        <Link href="/explore" className="text-xs text-accent mt-4 inline-block hover:underline">
          &larr; Back to Explore
        </Link>
      </div>
    );
  }

  const activities = getActivities(corpus.id);
  const patrons = getPatrons(corpus);

  const REVENUE_HISTORY = [
    { month: "Oct", amount: 1200 },
    { month: "Nov", amount: 2100 },
    { month: "Dec", amount: 1800 },
    { month: "Jan", amount: 3200 },
    { month: "Feb", amount: 2900 },
    { month: "Mar", amount: 4100 },
  ];
  const maxRevenue = Math.max(...REVENUE_HISTORY.map((r) => r.amount));

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <Link href="/explore" className="text-xs text-muted hover:text-foreground transition-colors">
        &larr; Explore
      </Link>

      {/* Header */}
      <div className="mt-6 mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-accent">{corpus.name}</h1>
            <span
              className={`text-xs ${
                corpus.status === "Active" ? "text-green-400" : "text-muted"
              }`}
            >
              [{corpus.status.toUpperCase()}]
            </span>
          </div>
          <p className="text-sm text-muted max-w-xl">{corpus.description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted">
            <span>[{corpus.category.toUpperCase()}]</span>
            <span>Created {corpus.createdAt}</span>
            <span>Token: {corpus.hederaTokenId}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="bg-accent text-background px-5 py-2 text-sm font-medium hover:bg-foreground transition-colors">
            Become Patron
          </button>
          <button className="border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors">
            Buy Signal
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border mb-8">
        {[
          { label: "Signal Price", value: corpus.signalPrice },
          { label: "Market Cap", value: `$${((corpus.totalSupply * parseFloat(corpus.signalPrice.replace("$", ""))) / 1000).toFixed(0)}K` },
          { label: "Patrons", value: corpus.patrons.toString() },
          { label: "Revenue", value: corpus.revenue },
          { label: "Supply", value: corpus.totalSupply.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="bg-surface px-4 py-4 text-center">
            <div className="text-lg font-bold text-accent">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border mb-8">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-sm transition-colors ${
              tab === t
                ? "text-accent border-b border-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Overview" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Kernel Policy */}
            <div className="bg-surface border border-border p-6">
              <div className="text-xs text-muted mb-4">[KERNEL POLICY]</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted">Approval Threshold</span>
                  <p className="text-foreground mt-1">&gt; ${corpus.approvalThreshold} USDC</p>
                </div>
                <div>
                  <span className="text-muted">GTM Budget</span>
                  <p className="text-foreground mt-1">${corpus.gtmBudget}/month</p>
                </div>
                <div>
                  <span className="text-muted">API Endpoint</span>
                  <p className="text-foreground mt-1 text-xs break-all">{corpus.apiEndpoint}</p>
                </div>
                <div>
                  <span className="text-muted">Channels</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {corpus.channels.map((ch) => (
                      <span key={ch} className="text-xs border border-border px-2 py-0.5 text-foreground">
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Prime Agent */}
            <div className="bg-surface border border-border p-6">
              <div className="text-xs text-muted mb-4">[PRIME AGENT]</div>
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-muted">Persona</span>
                  <p className="text-foreground mt-1">{corpus.persona}</p>
                </div>
                <div>
                  <span className="text-muted">Target Audience</span>
                  <p className="text-foreground mt-1">{corpus.targetAudience}</p>
                </div>
              </div>
            </div>

            {/* Recent activity preview */}
            <div className="bg-surface border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-muted">[RECENT ACTIVITY]</div>
                <button onClick={() => setTab("Activity")} className="text-xs text-muted hover:text-accent transition-colors">
                  View all &rarr;
                </button>
              </div>
              <div className="space-y-3">
                {activities.slice(0, 4).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <span className="text-xs text-muted w-5 shrink-0 font-bold">{TYPE_ICONS[a.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">{a.content}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                        <span>{a.channel}</span>
                        <span>{a.timestamp}</span>
                      </div>
                    </div>
                    <span className={`text-xs shrink-0 ${a.status === "completed" ? "text-green-400" : a.status === "pending" ? "text-yellow-400" : "text-red-400"}`}>
                      [{a.status.toUpperCase()}]
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Signal Distribution */}
            <div className="bg-surface border border-border p-6">
              <div className="text-xs text-muted mb-4">[SIGNAL DISTRIBUTION]</div>
              <div className="space-y-3">
                {[
                  { label: "Creator", pct: corpus.creatorShare, color: "bg-white" },
                  { label: "Investors", pct: corpus.investorShare, color: "bg-foreground/50" },
                  { label: "Treasury", pct: corpus.treasuryShare, color: "bg-muted/50" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted">{s.label}</span>
                      <span className="text-foreground">{s.pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-border">
                      <div className={`h-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* On-chain info */}
            <div className="bg-surface border border-border p-6">
              <div className="text-xs text-muted mb-4">[ON-CHAIN]</div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Network</span>
                  <span className="text-foreground">Hedera Testnet</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Token ID</span>
                  <span className="text-foreground">{corpus.hederaTokenId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Total Supply</span>
                  <span className="text-foreground">{corpus.totalSupply.toLocaleString()}</span>
                </div>
                <a
                  href={`https://hashscan.io/testnet/token/${corpus.hederaTokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center border border-border py-1.5 text-muted hover:text-accent hover:border-accent transition-colors mt-2"
                >
                  View on HashScan &rarr;
                </a>
              </div>
            </div>

            {/* CLI */}
            <div className="bg-surface border border-border p-6">
              <div className="text-xs text-muted mb-4">[RUN AGENT]</div>
              <div className="bg-background border border-border p-3 text-xs text-foreground overflow-x-auto">
                <div className="text-muted"># Install</div>
                <div>pip install corpus-agent</div>
                <div className="text-muted mt-2"># Start</div>
                <div>corpus-agent start \</div>
                <div className="pl-4">--corpus-id {corpus.hederaTokenId}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "Activity" && (
        <div className="bg-surface border border-border divide-y divide-border">
          {activities.map((a) => (
            <div key={a.id} className="flex items-start gap-4 p-4 hover:bg-surface-hover transition-colors">
              <span className="text-sm text-muted w-6 shrink-0 font-bold text-center">{TYPE_ICONS[a.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{a.content}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                  <span className="border border-border px-1.5 py-0.5">{a.channel}</span>
                  <span>{a.timestamp}</span>
                  <span className="border border-border px-1.5 py-0.5 uppercase">{a.type}</span>
                </div>
              </div>
              <span className={`text-xs shrink-0 ${a.status === "completed" ? "text-green-400" : a.status === "pending" ? "text-yellow-400" : "text-red-400"}`}>
                [{a.status.toUpperCase()}]
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "Patrons" && (
        <div>
          <div className="bg-surface border border-border">
            <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-border text-xs text-muted">
              <span>Address</span>
              <span>Role</span>
              <span className="text-right">Signal Amount</span>
              <span className="text-right">Share</span>
            </div>
            {patrons.map((p, i) => (
              <div key={i} className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-hover transition-colors text-sm">
                <span className="text-foreground font-mono text-xs">{p.address}</span>
                <span className={`text-xs ${p.role === "Creator" ? "text-accent" : p.role === "Treasury" ? "text-yellow-400" : "text-foreground"}`}>
                  [{p.role.toUpperCase()}]
                </span>
                <span className="text-right text-foreground">{p.signalAmount.toLocaleString()}</span>
                <span className="text-right text-muted">{p.share}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "Revenue" && (
        <div className="space-y-6">
          {/* Revenue summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Revenue", value: corpus.revenue },
              { label: "This Month", value: `$${REVENUE_HISTORY[REVENUE_HISTORY.length - 1].amount.toLocaleString()}` },
              { label: "Avg Monthly", value: `$${Math.round(REVENUE_HISTORY.reduce((s, r) => s + r.amount, 0) / REVENUE_HISTORY.length).toLocaleString()}` },
            ].map((s) => (
              <div key={s.label} className="bg-surface border border-border p-4 text-center">
                <div className="text-xl font-bold text-accent">{s.value}</div>
                <div className="text-xs text-muted">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ASCII bar chart */}
          <div className="bg-surface border border-border p-6">
            <div className="text-xs text-muted mb-6">[REVENUE HISTORY]</div>
            <div className="flex items-end gap-3 h-40">
              {REVENUE_HISTORY.map((r) => (
                <div key={r.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-accent">${(r.amount / 1000).toFixed(1)}K</span>
                  <div className="w-full bg-border relative" style={{ height: `${(r.amount / maxRevenue) * 100}%` }}>
                    <div className="absolute inset-0 bg-foreground/20 hover:bg-foreground/40 transition-colors" />
                  </div>
                  <span className="text-xs text-muted">{r.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Distribution breakdown */}
          <div className="bg-surface border border-border p-6">
            <div className="text-xs text-muted mb-4">[REVENUE DISTRIBUTION]</div>
            <div className="space-y-3 text-sm">
              {[
                { role: "Creator", share: corpus.creatorShare },
                { role: "Investors", share: corpus.investorShare },
                { role: "Treasury", share: corpus.treasuryShare },
              ].map((r) => {
                const totalNum = parseFloat(corpus.revenue.replace(/[$,]/g, ""));
                const amount = (totalNum * r.share / 100).toFixed(0);
                return (
                  <div key={r.role} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-muted">{r.role} ({r.share}%)</span>
                    <span className="text-foreground">${Number(amount).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "Agent" && (
        <div className="space-y-6">
          {/* Agent status */}
          <div className="bg-surface border border-border p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="text-xs text-muted">[PRIME AGENT STATUS]</div>
              <span className={`text-xs ${corpus.status === "Active" ? "text-green-400" : "text-muted"}`}>
                {corpus.status === "Active" ? "[ONLINE]" : "[OFFLINE]"}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted text-xs">Uptime</span>
                <p className="text-foreground mt-1">14d 7h 23m</p>
              </div>
              <div>
                <span className="text-muted text-xs">Posts Today</span>
                <p className="text-foreground mt-1">4</p>
              </div>
              <div>
                <span className="text-muted text-xs">Replies Today</span>
                <p className="text-foreground mt-1">12</p>
              </div>
              <div>
                <span className="text-muted text-xs">Researches Today</span>
                <p className="text-foreground mt-1">3</p>
              </div>
            </div>
          </div>

          {/* Agent config */}
          <div className="bg-surface border border-border p-6">
            <div className="text-xs text-muted mb-4">[AGENT CONFIGURATION]</div>
            <div className="space-y-4 text-sm">
              <Row label="Persona" value={corpus.persona} />
              <Row label="Target Audience" value={corpus.targetAudience} />
              <Row label="Channels" value={corpus.channels.join(", ")} />
              <Row label="Posting Interval" value="Every 4 hours" />
              <Row label="Research Interval" value="Every 12 hours" />
              <Row label="Mention Check" value="Every 5 minutes" />
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-surface border border-border p-6">
            <div className="text-xs text-muted mb-4">[SCHEDULE — NEXT 24H]</div>
            <div className="space-y-2">
              {[
                { time: "14:00", task: "Content generation + X posting", status: "scheduled" },
                { time: "14:05", task: "Mention/reply check cycle", status: "scheduled" },
                { time: "18:00", task: "Content generation + X posting", status: "scheduled" },
                { time: "18:05", task: "Mention/reply check cycle", status: "scheduled" },
                { time: "22:00", task: "Content generation + LinkedIn posting", status: "scheduled" },
                { time: "02:00", task: "Market research cycle", status: "scheduled" },
                { time: "06:00", task: "Content generation + X posting", status: "scheduled" },
                { time: "10:00", task: "Content generation + Reddit posting", status: "scheduled" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-4 py-1.5 text-xs">
                  <span className="text-muted w-12">{s.time}</span>
                  <span className="flex-1 text-foreground">{s.task}</span>
                  <span className="text-muted">[{s.status.toUpperCase()}]</span>
                </div>
              ))}
            </div>
          </div>

          {/* CLI */}
          <div className="bg-surface border border-border p-6">
            <div className="text-xs text-muted mb-4">[LOCAL EXECUTION]</div>
            <div className="bg-background border border-border p-4 text-xs text-foreground space-y-1 overflow-x-auto">
              <div className="text-green-400">$ corpus-agent status</div>
              <div className="text-muted mt-2">Corpus:    {corpus.name}</div>
              <div className="text-muted">Token:     {corpus.hederaTokenId}</div>
              <div className="text-muted">Status:    {corpus.status === "Active" ? "ONLINE (14d 7h 23m)" : "OFFLINE"}</div>
              <div className="text-muted">Posts:     247 total / 4 today</div>
              <div className="text-muted">Replies:   1,892 total / 12 today</div>
              <div className="text-muted">Research:  89 total / 3 today</div>
              <div className="text-muted">Commerce:  34 transactions / $127.50 total</div>
              <div className="text-muted">Next task: Content generation in 42m</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border last:border-0">
      <span className="text-muted text-xs">{label}</span>
      <span className="text-foreground text-right max-w-[60%]">{value}</span>
    </div>
  );
}
