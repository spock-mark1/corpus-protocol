"use client";

import { useState } from "react";

// --- Mock Data ---

const PORTFOLIO_STATS = [
  { label: "Total Value", value: "$12,450", delta: "+4.2%" },
  { label: "Active Corpus", value: "3", delta: null },
  { label: "Total Revenue", value: "$2,340", delta: "+12.8%" },
  { label: "Pending Approvals", value: "2", delta: null },
];

const APPROVAL_QUEUE = [
  {
    id: "apr-001",
    type: "transaction" as const,
    amount: "$1,200",
    description: "Token swap: 500 USDC -> ETH via Uniswap",
    corpus: "alpha-trader",
    timestamp: "2026-04-04 09:32",
  },
  {
    id: "apr-002",
    type: "posting" as const,
    amount: null,
    description: "Publish weekly performance report to Twitter/X",
    corpus: "signal-bot",
    timestamp: "2026-04-04 08:15",
  },
  {
    id: "apr-003",
    type: "transaction" as const,
    amount: "$3,400",
    description: "Deposit 3,400 USDC to Aave lending pool",
    corpus: "yield-engine",
    timestamp: "2026-04-03 22:47",
  },
];

const ACTIVITY_FEED = [
  {
    id: "act-001",
    timestamp: "2026-04-04 09:45",
    corpus: "alpha-trader",
    action: "Executed limit buy: 0.5 ETH @ $3,120",
    status: "completed" as const,
  },
  {
    id: "act-002",
    timestamp: "2026-04-04 09:32",
    corpus: "alpha-trader",
    action: "Submitted swap request for patron approval",
    status: "pending" as const,
  },
  {
    id: "act-003",
    timestamp: "2026-04-04 08:15",
    corpus: "signal-bot",
    action: "Generated weekly report, awaiting publish approval",
    status: "pending" as const,
  },
  {
    id: "act-004",
    timestamp: "2026-04-04 06:00",
    corpus: "yield-engine",
    action: "Claimed 12.4 USDC interest from Aave position",
    status: "completed" as const,
  },
  {
    id: "act-005",
    timestamp: "2026-04-03 23:10",
    corpus: "signal-bot",
    action: "Published market analysis thread (12 posts)",
    status: "completed" as const,
  },
];

const AGENTS = [
  { name: "alpha-trader", status: "online" as const, lastActive: "now" },
  { name: "signal-bot", status: "online" as const, lastActive: "2m ago" },
  { name: "yield-engine", status: "offline" as const, lastActive: "6h ago" },
];

// --- Status Helpers ---

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "completed" || status === "online"
      ? "text-green-500"
      : status === "pending"
        ? "text-yellow-500"
        : "text-muted";
  return (
    <span className={`text-xs ${color}`}>
      [{status.toUpperCase()}]
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="text-xs text-muted">
      [{type.toUpperCase()}]
    </span>
  );
}

// --- Page ---

export default function DashboardPage() {
  const [queue, setQueue] = useState(APPROVAL_QUEUE);

  function handleApprove(id: string) {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }

  function handleReject(id: string) {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-accent text-lg font-bold tracking-wider mb-1">
          DASHBOARD
        </h1>
        <p className="text-muted text-sm">
          patron control panel &mdash; portfolio overview, approvals, activity
        </p>
      </div>

      {/* Portfolio Overview */}
      <section className="mb-10">
        <h2 className="text-sm text-muted mb-4 tracking-wide">
          // PORTFOLIO OVERVIEW
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PORTFOLIO_STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-surface border border-border p-5 hover:bg-surface-hover transition-colors"
            >
              <p className="text-muted text-xs mb-2 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-accent text-2xl font-bold">{stat.value}</p>
              {stat.delta && (
                <p className="text-green-500 text-xs mt-1">{stat.delta}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Two-column: Approval Queue + Agent Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Approval Queue */}
        <section className="lg:col-span-2">
          <h2 className="text-sm text-muted mb-4 tracking-wide">
            // APPROVAL QUEUE
          </h2>
          <div className="bg-surface border border-border divide-y divide-border">
            {queue.length === 0 && (
              <div className="p-6 text-muted text-sm text-center">
                No pending approvals.
              </div>
            )}
            {queue.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <TypeBadge type={item.type} />
                      <span className="text-xs text-muted">{item.corpus}</span>
                      {item.amount && (
                        <span className="text-xs text-accent">
                          {item.amount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground truncate">
                      {item.description}
                    </p>
                    <p className="text-xs text-muted mt-1">{item.timestamp}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="border border-green-800 text-green-500 px-3 py-1 text-xs hover:bg-green-950 transition-colors"
                    >
                      APPROVE
                    </button>
                    <button
                      onClick={() => handleReject(item.id)}
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

        {/* Agent Status */}
        <section>
          <h2 className="text-sm text-muted mb-4 tracking-wide">
            // AGENT STATUS
          </h2>
          <div className="bg-surface border border-border divide-y divide-border">
            {AGENTS.map((agent) => (
              <div
                key={agent.name}
                className="p-4 flex items-center justify-between hover:bg-surface-hover transition-colors"
              >
                <div>
                  <p className="text-sm text-foreground">{agent.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    last: {agent.lastActive}
                  </p>
                </div>
                <StatusBadge status={agent.status} />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Activity Feed */}
      <section className="mb-10">
        <h2 className="text-sm text-muted mb-4 tracking-wide">
          // ACTIVITY FEED
        </h2>
        <div className="bg-surface border border-border">
          {ACTIVITY_FEED.map((item, i) => (
            <div
              key={item.id}
              className={`p-4 flex items-start gap-4 hover:bg-surface-hover transition-colors ${
                i < ACTIVITY_FEED.length - 1 ? "border-b border-border" : ""
              }`}
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center pt-1.5 shrink-0">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    item.status === "completed"
                      ? "bg-green-500"
                      : "bg-yellow-500"
                  }`}
                />
                {i < ACTIVITY_FEED.length - 1 && (
                  <div className="w-px h-full bg-border mt-1" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs text-muted font-mono">
                    {item.timestamp}
                  </span>
                  <span className="text-xs text-muted">&middot;</span>
                  <span className="text-xs text-accent">{item.corpus}</span>
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
