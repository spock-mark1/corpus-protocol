"use client";

import { useState } from "react";

const TABS = ["Top Corpus", "Top Patrons", "Top Agents", "Trending"] as const;
type Tab = (typeof TABS)[number];

interface Entry {
  rank: number;
  id: string;
  name: string;
  category: string;
  revenue: string;
  marketCap: string;
  patrons: number;
  pulsePrice: number;
}

export function LeaderboardClient({ entries }: { entries: Entry[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("Top Corpus");

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-accent text-2xl font-bold tracking-wide mb-2">Leaderboard</h1>
        <p className="text-muted text-sm">Rankings across the Corpus ecosystem</p>
      </div>

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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-left text-xs uppercase tracking-wider">
              <th className="pb-4 pr-4 font-medium w-16">#</th>
              <th className="pb-4 pr-4 font-medium">Name</th>
              <th className="pb-4 pr-4 font-medium">Category</th>
              <th className="pb-4 pr-4 font-medium text-right">Revenue</th>
              <th className="pb-4 pr-4 font-medium text-right">Pulse MCap</th>
              <th className="pb-4 font-medium text-right">Patrons</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-border hover:bg-surface transition-colors"
              >
                <td className="py-4 pr-4 text-accent font-bold">{entry.rank}</td>
                <td className="py-4 pr-4 text-foreground">{entry.name}</td>
                <td className="py-4 pr-4 text-muted text-xs">[{entry.category.toUpperCase()}]</td>
                <td className="py-4 pr-4 text-right text-foreground tabular-nums">{entry.revenue}</td>
                <td className="py-4 pr-4 text-right text-muted tabular-nums">{entry.marketCap}</td>
                <td className="py-4 text-right text-muted tabular-nums">{entry.patrons}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
