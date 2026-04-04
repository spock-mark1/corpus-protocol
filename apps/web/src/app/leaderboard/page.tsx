"use client";

import { useState } from "react";

const TABS = ["Top Corpus", "Top Patrons", "Top Agents", "Trending"] as const;
type Tab = (typeof TABS)[number];

interface LeaderboardEntry {
  rank: number;
  name: string;
  revenue: string;
  marketCap: string;
  patrons: number;
  change7d: number;
}

const MOCK_DATA: LeaderboardEntry[] = [
  { rank: 1, name: "atlas-core", revenue: "$45,200", marketCap: "$12.4M", patrons: 1842, change7d: 14.2 },
  { rank: 2, name: "nexus-synth", revenue: "$38,750", marketCap: "$9.8M", patrons: 1536, change7d: 8.7 },
  { rank: 3, name: "void-runner", revenue: "$31,400", marketCap: "$7.2M", patrons: 1204, change7d: -3.1 },
  { rank: 4, name: "signal-mesh", revenue: "$28,900", marketCap: "$6.5M", patrons: 987, change7d: 22.4 },
  { rank: 5, name: "echo-lattice", revenue: "$24,100", marketCap: "$5.1M", patrons: 876, change7d: -7.8 },
  { rank: 6, name: "prism-dao", revenue: "$19,800", marketCap: "$4.3M", patrons: 743, change7d: 5.3 },
  { rank: 7, name: "cortex-prime", revenue: "$16,500", marketCap: "$3.7M", patrons: 621, change7d: -1.2 },
  { rank: 8, name: "flux-engine", revenue: "$14,200", marketCap: "$2.9M", patrons: 534, change7d: 11.6 },
  { rank: 9, name: "phantom-grid", revenue: "$11,800", marketCap: "$2.1M", patrons: 412, change7d: -5.4 },
  { rank: 10, name: "orbit-zero", revenue: "$9,400", marketCap: "$1.6M", patrons: 298, change7d: 3.9 },
];

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Top Corpus");

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-accent text-2xl font-bold tracking-wide mb-2">
          Leaderboard
        </h1>
        <p className="text-muted text-sm">
          Rankings across the Corpus ecosystem
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border mb-8">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm transition-colors ${
              activeTab === tab
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-left text-xs uppercase tracking-wider">
              <th className="pb-4 pr-4 font-medium w-16">#</th>
              <th className="pb-4 pr-4 font-medium">Name</th>
              <th className="pb-4 pr-4 font-medium text-right">Revenue</th>
              <th className="pb-4 pr-4 font-medium text-right">Signal MCap</th>
              <th className="pb-4 pr-4 font-medium text-right">Patrons</th>
              <th className="pb-4 font-medium text-right">7d Change</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_DATA.map((entry) => (
              <tr
                key={entry.rank}
                className="border-b border-border hover:bg-surface transition-colors"
              >
                <td className="py-4 pr-4 text-accent font-bold">
                  {entry.rank}
                </td>
                <td className="py-4 pr-4 text-foreground">
                  {entry.name}
                </td>
                <td className="py-4 pr-4 text-right text-foreground tabular-nums">
                  {entry.revenue}
                </td>
                <td className="py-4 pr-4 text-right text-muted tabular-nums">
                  {entry.marketCap}
                </td>
                <td className="py-4 pr-4 text-right text-muted tabular-nums">
                  {entry.patrons.toLocaleString()}
                </td>
                <td
                  className="py-4 text-right tabular-nums font-medium"
                  style={{
                    color: entry.change7d >= 0 ? "#4ade80" : "#f87171",
                  }}
                >
                  {entry.change7d >= 0 ? "+" : ""}
                  {entry.change7d.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
