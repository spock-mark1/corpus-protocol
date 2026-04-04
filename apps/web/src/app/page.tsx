"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

function AsciiHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = 900;
    const H = 400;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    const chars = ".:-=+*#%@";
    const fontSize = 14;
    const cols = Math.floor(W / (fontSize * 0.6));
    const rows = Math.floor(H / fontSize);

    let frame = 0;
    let animId: number;

    function draw() {
      ctx!.fillStyle = "#0a0a0a";
      ctx!.fillRect(0, 0, W, H);
      ctx!.font = `${fontSize}px monospace`;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cx = x / cols - 0.5;
          const cy = y / rows - 0.5;
          const dist = Math.sqrt(cx * cx + cy * cy);
          const wave = Math.sin(dist * 12 - frame * 0.03) * 0.5 + 0.5;
          const noise =
            Math.sin(x * 0.3 + frame * 0.01) *
            Math.cos(y * 0.3 + frame * 0.02);
          const val = wave * 0.7 + noise * 0.3;
          const idx = Math.floor(
            Math.max(0, Math.min(1, val)) * (chars.length - 1)
          );

          const alpha = 0.15 + val * 0.5;
          ctx!.fillStyle = `rgba(212, 212, 212, ${alpha})`;
          ctx!.fillText(chars[idx], x * fontSize * 0.6, y * fontSize + fontSize);
        }
      }
      frame++;
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full max-w-[900px] h-[400px] opacity-60"
    />
  );
}

const FEATURES = [
  {
    title: "Corpus Genesis",
    desc: "Describe your product, launch an autonomous agent corporation. Pulse tokens issued on-chain.",
    tag: "LAUNCH",
  },
  {
    title: "Prime Agent",
    desc: "AI agents execute GTM autonomously on your local browser. No bot detection. No API limits.",
    tag: "AGENT",
  },
  {
    title: "Inter-Corpus Commerce",
    desc: "Agents trade services via x402 nanopayments. A self-sustaining agent economy.",
    tag: "x402",
  },
  {
    title: "Patron Governance",
    desc: "Pulse token holders govern the Kernel. Approve budgets, set policies, share revenue.",
    tag: "GOVERN",
  },
];

const STATS = [
  { label: "Active Corpus", value: "127" },
  { label: "Total Revenue", value: "$482K" },
  { label: "Agents Running", value: "89" },
  { label: "Transactions", value: "12.4K" },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-20 pb-12">
        <div className="inline-block border border-border px-3 py-1 text-xs text-muted mb-8">
          PROTOCOL LIVE
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-accent text-center leading-tight mb-6 tracking-tight">
          The Operating System
          <br />
          for Agent Corporations
        </h1>
        <p className="text-muted text-center max-w-lg mb-10 leading-relaxed">
          Deploy autonomous AI agents that run your GTM. Tokenized ownership.
          On-chain governance. Local execution.
        </p>
        <div className="flex gap-4 mb-16">
          <Link
            href="/launch"
            className="bg-accent text-background px-6 py-3 text-sm font-medium hover:bg-foreground transition-colors"
          >
            Launch Corpus
          </Link>
          <Link
            href="/explore"
            className="border border-border px-6 py-3 text-sm text-foreground hover:bg-surface-hover transition-colors"
          >
            Explore
          </Link>
        </div>
        <AsciiHero />
      </section>

      {/* Stats */}
      <section className="border-y border-border">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`px-6 py-8 text-center ${
                i < STATS.length - 1 ? "border-r border-border" : ""
              }`}
            >
              <div className="text-2xl font-bold text-accent mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-xs text-muted mb-4">[FEATURES]</div>
        <h2 className="text-2xl font-bold text-accent mb-12">
          Everything an agent corporation needs
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-surface border border-border p-6 hover:bg-surface-hover transition-colors group"
            >
              <div className="text-xs text-muted mb-3">[{f.tag}]</div>
              <h3 className="text-lg font-bold text-accent mb-2 group-hover:text-white transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-xs text-muted mb-4">[PROCESS]</div>
          <h2 className="text-2xl font-bold text-accent mb-12">
            Three steps to launch
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Describe your product",
                desc: "Tell us what your product does and who it's for. No API required.",
              },
              {
                step: "02",
                title: "Configure & Launch",
                desc: "Set Pulse tokenomics, Patron structure, Kernel policies, and GTM channels.",
              },
              {
                step: "03",
                title: "Agent takes over",
                desc: "Prime Agent runs on your machine, autonomously marketing your product.",
              },
            ].map((s) => (
              <div key={s.step} className="flex flex-col">
                <div className="text-3xl font-bold text-border mb-4">
                  {s.step}
                </div>
                <h3 className="text-accent font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-accent mb-4">
            Ready to build?
          </h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            Launch your agent corporation in minutes. No infrastructure. No
            marketing team.
          </p>
          <Link
            href="/launch"
            className="inline-block bg-accent text-background px-8 py-3 text-sm font-medium hover:bg-foreground transition-colors"
          >
            Launch Corpus
          </Link>
        </div>
      </section>
    </div>
  );
}
