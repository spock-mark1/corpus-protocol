"use client";

import { useState } from "react";
import { WalletGate } from "@/components/wallet-gate";

interface Props {
  stats: {
    totalValue: string;
    activeCorpus: number;
    totalRevenue: string;
    pendingCount: number;
  };
  approvals: {
    id: string;
    corpusId: string;
    corpusName: string;
    type: string;
    title: string;
    description: string | null;
    amount: string | null;
    timestamp: string;
  }[];
  activities: {
    id: string;
    corpusName: string;
    action: string;
    status: string;
    timestamp: string;
  }[];
  agents: {
    name: string;
    status: "online" | "offline";
    lastActive: string;
  }[];
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "completed" || status === "online"
      ? "text-green-500"
      : status === "pending"
        ? "text-yellow-500"
        : "text-muted";
  return (
    <span className={`text-xs ${color}`}>[{status.toUpperCase()}]</span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="text-xs text-muted">[{type.toUpperCase()}]</span>
  );
}

export function DashboardClient({ stats, approvals: initialApprovals, activities, agents }: Props) {
  return (
    <WalletGate
      title="Connect Wallet to Access Dashboard"
      description="Your patron dashboard shows your portfolio, pending approvals, and agent activity. Connect your wallet to view your Corpus holdings."
    >
      <DashboardContent stats={stats} approvals={initialApprovals} activities={activities} agents={agents} />
    </WalletGate>
  );
}

function DashboardContent({ stats, approvals: initialApprovals, activities, agents }: Props) {
  const [approvals, setApprovals] = useState(initialApprovals);

  async function handleDecision(id: string, corpusId: string, status: "approved" | "rejected") {
    await fetch(`/api/corpus/${corpusId}/approvals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  }

  const PORTFOLIO_STATS = [
    { label: "Total Value", value: stats.totalValue, delta: null },
    { label: "Active Corpus", value: stats.activeCorpus.toString(), delta: null },
    { label: "Total Revenue", value: stats.totalRevenue, delta: null },
    { label: "Pending Approvals", value: stats.pendingCount.toString(), delta: null },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-accent text-lg font-bold tracking-wider mb-1">DASHBOARD</h1>
        <p className="text-muted text-sm">patron control panel &mdash; portfolio overview, approvals, activity</p>
      </div>

      <section className="mb-10">
        <h2 className="text-sm text-muted mb-4 tracking-wide">// PORTFOLIO OVERVIEW</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PORTFOLIO_STATS.map((stat) => (
            <div key={stat.label} className="bg-surface border border-border p-5 hover:bg-surface-hover transition-colors">
              <p className="text-muted text-xs mb-2 uppercase tracking-wider">{stat.label}</p>
              <p className="text-accent text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <section className="lg:col-span-2">
          <h2 className="text-sm text-muted mb-4 tracking-wide">// APPROVAL QUEUE</h2>
          <div className="bg-surface border border-border divide-y divide-border">
            {approvals.length === 0 && (
              <div className="p-6 text-muted text-sm text-center">No pending approvals.</div>
            )}
            {approvals.map((item) => (
              <div key={item.id} className="p-4 hover:bg-surface-hover transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <TypeBadge type={item.type} />
                      <span className="text-xs text-muted">{item.corpusName}</span>
                      {item.amount && <span className="text-xs text-accent">{item.amount}</span>}
                    </div>
                    <p className="text-sm text-foreground truncate">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleDecision(item.id, item.corpusId, "approved")}
                      className="border border-green-800 text-green-500 px-3 py-1 text-xs hover:bg-green-950 transition-colors"
                    >
                      APPROVE
                    </button>
                    <button
                      onClick={() => handleDecision(item.id, item.corpusId, "rejected")}
                      className="border border-red-900 text-red-500 px-3 py-1 text-xs hover:bg-red-950 transition-colors"
                    >
                      REJECT
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm text-muted mb-4 tracking-wide">// AGENT STATUS</h2>
          <div className="bg-surface border border-border divide-y divide-border">
            {agents.map((agent) => (
              <div key={agent.name} className="p-4 flex items-center justify-between hover:bg-surface-hover transition-colors">
                <div>
                  <p className="text-sm text-foreground">{agent.name}</p>
                  <p className="text-xs text-muted mt-0.5">last: {agent.lastActive}</p>
                </div>
                <StatusBadge status={agent.status} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mb-10">
        <h2 className="text-sm text-muted mb-4 tracking-wide">// ACTIVITY FEED</h2>
        <div className="bg-surface border border-border">
          {activities.map((item, i) => (
            <div
              key={item.id}
              className={`p-4 flex items-start gap-4 hover:bg-surface-hover transition-colors ${
                i < activities.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex flex-col items-center pt-1.5 shrink-0">
                <div className={`w-1.5 h-1.5 rounded-full ${item.status === "completed" ? "bg-green-500" : "bg-yellow-500"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs text-muted font-mono">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted">&middot;</span>
                  <span className="text-xs text-accent">{item.corpusName}</span>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-sm text-foreground">{item.action}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
