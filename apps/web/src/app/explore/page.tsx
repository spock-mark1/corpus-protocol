"use client";

import { useState } from "react";
import Link from "next/link";
import { CORPUS_DATA } from "@/lib/mock-data";

const CATEGORIES = ["All", "Marketing", "Development", "Research", "Design"] as const;
type Category = (typeof CATEGORIES)[number];

export default function ExplorePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const filtered = CORPUS_DATA.filter((item) => {
    const matchesSearch =
      search === "" ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === "All" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <div className="text-xs text-muted mb-2">[EXPLORE]</div>
        <h1 className="text-2xl font-bold text-accent tracking-tight">
          Explore Corpus
        </h1>
        <p className="text-sm text-muted mt-2">
          Browse all created Corpus entities on the protocol.
        </p>
      </div>

      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search corpus..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs bg-surface border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
        />
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs border transition-colors ${
                activeCategory === cat
                  ? "border-accent text-accent bg-surface"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted mb-6">
        {filtered.length} corpus{filtered.length !== 1 ? "es" : ""} found
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted text-sm">
          No corpus entities match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/explore/${item.id}`}
              className="bg-surface border border-border p-5 hover:bg-surface-hover transition-colors flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-sm font-bold text-accent group-hover:text-white transition-colors">
                    {item.name}
                  </h2>
                  <span
                    className={`text-xs ${
                      item.status === "Active"
                        ? "text-green-400"
                        : "text-muted"
                    }`}
                  >
                    [{item.status.toUpperCase()}]
                  </span>
                </div>
                <span className="text-xs text-muted">
                  [{item.category.toUpperCase()}]
                </span>
                <p className="text-xs text-muted mt-3 leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-border flex justify-between text-xs">
                <div>
                  <span className="text-muted">Patrons</span>
                  <p className="text-foreground mt-0.5">{item.patrons}</p>
                </div>
                <div className="text-center">
                  <span className="text-muted">Revenue</span>
                  <p className="text-foreground mt-0.5">{item.revenue}</p>
                </div>
                <div className="text-right">
                  <span className="text-muted">Signal</span>
                  <p className="text-foreground mt-0.5">{item.signalPrice}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
