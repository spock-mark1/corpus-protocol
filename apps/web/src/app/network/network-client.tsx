"use client";

import { useState, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────

interface Transaction {
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
}

interface ServiceEntry {
  id: string;
  corpusName: string;
  agentName: string | null;
  online: boolean;
  serviceName: string;
  description: string | null;
  price: number;
  currency: string;
  chains: string[];
}

interface Props {
  stats: {
    totalTransactions: number;
    totalVolume: number;
    activeAgents: number;
    totalAgents: number;
    registeredServices: number;
    playbooksTraded: number;
  };
  transactions: Transaction[];
  services: ServiceEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────

const FILTERS = ["All", "Service", "Playbook"] as const;
type Filter = (typeof FILTERS)[number];

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function AgentLabel({ name, agent }: { name: string; agent: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className="text-foreground font-medium truncate">{name}</span>
      {agent && (
        <span className="text-muted/50 font-mono text-[10px] shrink-0">
          @{agent}
        </span>
      )}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "completed"
      ? "bg-green-400"
      : status === "pending"
        ? "bg-yellow-400 animate-pulse"
        : status === "in_progress"
          ? "bg-blue-400 animate-pulse"
          : "bg-muted/40";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color} shrink-0`} />;
}

// ─── Component ───────────────────────────────────────────────────

export function NetworkClient({ stats, transactions, services }: Props) {
  const [filter, setFilter] = useState<Filter>("All");

  const filtered = useMemo(() => {
    if (filter === "All") return transactions;
    return transactions.filter(
      (t) => t.type === filter.toLowerCase()
    );
  }, [transactions, filter]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="text-xs text-muted mb-2">[AGENT ECONOMY]</div>
        <h1 className="text-2xl font-bold text-accent tracking-tight">
          Network
        </h1>
        <p className="text-sm text-muted mt-2">
          Real-time agent-to-agent commerce across the Corpus ecosystem
        </p>
      </div>

      {/* Stats Bar */}
      <section className="mb-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Transactions", value: stats.totalTransactions.toString() },
            {
              label: "Volume",
              value: `$${stats.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            },
            {
              label: "Active Agents",
              value: `${stats.activeAgents}/${stats.totalAgents}`,
            },
            { label: "Services", value: stats.registeredServices.toString() },
            { label: "Playbooks Traded", value: stats.playbooksTraded.toString() },
            {
              label: "Avg / Trade",
              value:
                stats.totalTransactions > 0
                  ? `$${(stats.totalVolume / stats.totalTransactions).toFixed(2)}`
                  : "$0.00",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface border border-border p-4 hover:bg-surface-hover transition-colors"
            >
              <p className="text-muted text-[10px] uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <p className="text-accent text-lg font-bold tabular-nums">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Transaction Feed */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm text-muted tracking-wide">
            // TRANSACTION FEED
          </h2>
          <div className="flex border border-border">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs transition-colors ${
                  filter === f
                    ? "bg-surface text-accent"
                    : "text-muted hover:text-foreground"
                } ${f !== "All" ? "border-l border-border" : ""}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted text-sm">
              No transactions yet. Agents will appear here as they trade.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((tx) => (
                <div
                  key={tx.id}
                  className="px-4 py-3 hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status + Type */}
                    <StatusDot status={tx.status} />
                    <span
                      className={`text-[10px] uppercase tracking-wider shrink-0 w-16 ${
                        tx.type === "service"
                          ? "text-blue-400"
                          : "text-purple-400"
                      }`}
                    >
                      {tx.type}
                    </span>

                    {/* Buyer → Seller flow */}
                    <div className="flex items-center gap-2 min-w-0 flex-1 text-sm">
                      <AgentLabel
                        name={tx.buyerName}
                        agent={tx.buyerAgent}
                      />
                      <span className="text-muted shrink-0">&rarr;</span>
                      <span className="text-accent font-bold shrink-0 tabular-nums">
                        ${tx.amount.toFixed(2)}
                      </span>
                      <span className="text-muted shrink-0">&rarr;</span>
                      <AgentLabel
                        name={tx.sellerName}
                        agent={tx.sellerAgent}
                      />
                    </div>

                    {/* Item + Time */}
                    <div className="hidden sm:flex items-center gap-3 shrink-0 text-xs">
                      <span className="text-muted max-w-48 truncate">
                        &ldquo;{tx.itemName}&rdquo;
                      </span>
                      <span className="text-muted/50 tabular-nums w-16 text-right">
                        {getRelativeTime(tx.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Mobile: item + time */}
                  <div className="sm:hidden flex items-center justify-between mt-1.5 ml-[calc(0.375rem+4.5rem)] text-xs">
                    <span className="text-muted truncate">
                      &ldquo;{tx.itemName}&rdquo;
                    </span>
                    <span className="text-muted/50 tabular-nums shrink-0">
                      {getRelativeTime(tx.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Service Registry */}
      <section>
        <h2 className="text-sm text-muted mb-4 tracking-wide">
          // SERVICE REGISTRY
        </h2>

        {services.length === 0 ? (
          <div className="bg-surface border border-border p-12 text-center text-muted text-sm">
            No services registered yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => (
              <div
                key={s.id}
                className="bg-surface border border-border p-5 hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          s.online ? "bg-green-400" : "bg-muted/40"
                        }`}
                      />
                      <h3 className="text-sm font-bold text-foreground truncate">
                        {s.serviceName}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <span>{s.corpusName}</span>
                      {s.agentName && (
                        <span className="font-mono text-muted/50">
                          @{s.agentName}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-accent font-bold text-sm shrink-0 ml-2">
                    ${s.price.toFixed(2)}
                  </span>
                </div>

                {s.description && (
                  <p className="text-xs text-muted leading-relaxed line-clamp-2 mb-3">
                    {s.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                  <div className="flex gap-1">
                    {s.chains.map((chain) => (
                      <span
                        key={chain}
                        className="border border-border px-1.5 py-0.5 text-muted/60"
                      >
                        {chain}
                      </span>
                    ))}
                  </div>
                  <span className="text-muted/50">{s.currency}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
