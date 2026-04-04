"use client";

import { useState } from "react";

const STEPS = [
  "Product",
  "Signal",
  "Patron",
  "Kernel",
  "Agent",
  "Review",
] as const;

const CHANNELS = ["X (Twitter)", "LinkedIn", "Reddit", "Product Hunt"];

export default function LaunchPage() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    productName: "",
    productDesc: "",
    apiEndpoint: "",
    apiKey: "",
    category: "marketing",
    tokenName: "",
    tokenSymbol: "",
    totalSupply: "1000000",
    initialPrice: "0.01",
    creatorShare: 60,
    investorShare: 25,
    treasuryShare: 15,
    approvalThreshold: "10",
    gtmBudget: "100",
    persona: "",
    targetAudience: "",
    tone: "professional",
    channels: ["X (Twitter)"] as string[],
  });

  const update = (key: string, value: string | number | string[]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canNext = () => {
    switch (step) {
      case 0:
        return form.productName && form.productDesc;
      case 1:
        return form.tokenName && form.tokenSymbol;
      case 2:
        return form.creatorShare + form.investorShare + form.treasuryShare === 100;
      case 3:
        return form.approvalThreshold && form.gtmBudget;
      case 4:
        return form.persona && form.targetAudience && form.channels.length > 0;
      default:
        return true;
    }
  };

  const handleLaunch = () => {
    setSubmitting(true);
    setTimeout(() => setSubmitting(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <div className="text-xs text-muted mb-2">[CORPUS GENESIS]</div>
        <h1 className="text-2xl font-bold text-accent">Launch your Corpus</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-10 overflow-x-auto">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i <= step && setStep(i)}
            className={`px-3 py-1.5 text-xs border transition-colors whitespace-nowrap ${
              i === step
                ? "border-accent text-accent bg-surface"
                : i < step
                ? "border-border text-foreground bg-surface cursor-pointer hover:bg-surface-hover"
                : "border-border text-muted bg-background cursor-default"
            }`}
          >
            {String(i + 1).padStart(2, "0")} {s}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-surface border border-border p-8 mb-6">
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-accent mb-1">Product Input</h2>
            <p className="text-sm text-muted mb-6">
              Tell us about the product your agent will market.
            </p>
            <Field label="Product Name" value={form.productName} onChange={(v) => update("productName", v)} placeholder="e.g. ImageGen Pro" />
            <Field label="Description" value={form.productDesc} onChange={(v) => update("productDesc", v)} placeholder="What does your product do?" multiline />
            <Field label="API Endpoint" value={form.apiEndpoint} onChange={(v) => update("apiEndpoint", v)} placeholder="https://api.example.com/v1" />
            <Field label="API Key" value={form.apiKey} onChange={(v) => update("apiKey", v)} placeholder="sk-..." type="password" />
            <div>
              <label className="block text-xs text-muted mb-2">Category</label>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="w-full bg-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent"
              >
                <option value="marketing">Marketing</option>
                <option value="development">Development</option>
                <option value="research">Research</option>
                <option value="design">Design</option>
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-accent mb-1">Signal Configuration</h2>
            <p className="text-sm text-muted mb-6">
              Configure your Corpus&apos;s ownership token on Hedera.
            </p>
            <Field label="Token Name" value={form.tokenName} onChange={(v) => update("tokenName", v)} placeholder="e.g. ImageGen Signal" />
            <Field label="Token Symbol" value={form.tokenSymbol} onChange={(v) => update("tokenSymbol", v)} placeholder="e.g. IMGS" />
            <Field label="Total Supply" value={form.totalSupply} onChange={(v) => update("totalSupply", v)} type="number" />
            <Field label="Initial Price (USDC)" value={form.initialPrice} onChange={(v) => update("initialPrice", v)} type="number" />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-accent mb-1">Patron Structure</h2>
            <p className="text-sm text-muted mb-6">
              Set the ownership distribution for your Corpus.
            </p>
            <SliderField label="Creator" value={form.creatorShare} onChange={(v) => {
              const diff = v - form.creatorShare;
              const newInvestor = Math.max(0, form.investorShare - diff);
              update("creatorShare", v);
              update("investorShare", newInvestor);
              update("treasuryShare", 100 - v - newInvestor);
            }} />
            <SliderField label="Investors" value={form.investorShare} onChange={(v) => {
              const diff = v - form.investorShare;
              const newTreasury = Math.max(0, form.treasuryShare - diff);
              update("investorShare", v);
              update("treasuryShare", newTreasury);
              update("creatorShare", 100 - v - newTreasury);
            }} />
            <SliderField label="Treasury" value={form.treasuryShare} onChange={(v) => {
              const diff = v - form.treasuryShare;
              const newCreator = Math.max(0, form.creatorShare - diff);
              update("treasuryShare", v);
              update("creatorShare", newCreator);
              update("investorShare", 100 - v - newCreator);
            }} />
            <div className="text-xs text-muted pt-2">
              Total: {form.creatorShare + form.investorShare + form.treasuryShare}%
              {form.creatorShare + form.investorShare + form.treasuryShare !== 100 && (
                <span className="text-red-400 ml-2">Must equal 100%</span>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-accent mb-1">Kernel Policy</h2>
            <p className="text-sm text-muted mb-6">
              Set the governance rules for your agent.
            </p>
            <Field label="Approval Threshold (USDC)" value={form.approvalThreshold} onChange={(v) => update("approvalThreshold", v)} type="number" placeholder="Transactions above this require approval" />
            <Field label="GTM Budget (USDC/month)" value={form.gtmBudget} onChange={(v) => update("gtmBudget", v)} type="number" placeholder="Monthly budget for GTM activities" />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-accent mb-1">Prime Agent Setup</h2>
            <p className="text-sm text-muted mb-6">
              Configure your AI agent&apos;s personality and targets.
            </p>
            <Field label="Persona" value={form.persona} onChange={(v) => update("persona", v)} placeholder="e.g. A sharp, witty tech commentator" multiline />
            <Field label="Target Audience" value={form.targetAudience} onChange={(v) => update("targetAudience", v)} placeholder="e.g. Indie developers building SaaS products" />
            <div>
              <label className="block text-xs text-muted mb-2">Tone</label>
              <select
                value={form.tone}
                onChange={(e) => update("tone", e.target.value)}
                className="w-full bg-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="witty">Witty</option>
                <option value="technical">Technical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-2">GTM Channels</label>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((ch) => (
                  <button
                    key={ch}
                    onClick={() => {
                      const channels = form.channels.includes(ch)
                        ? form.channels.filter((c) => c !== ch)
                        : [...form.channels, ch];
                      update("channels", channels);
                    }}
                    className={`px-3 py-1.5 text-xs border transition-colors ${
                      form.channels.includes(ch)
                        ? "border-accent text-accent bg-surface"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-accent mb-1">Review & Deploy</h2>
            <p className="text-sm text-muted mb-6">
              Confirm your Corpus configuration before on-chain deployment.
            </p>
            <div className="space-y-4 text-sm">
              <ReviewRow label="Product" value={form.productName} />
              <ReviewRow label="Category" value={form.category} />
              <ReviewRow label="Token" value={`${form.tokenName} (${form.tokenSymbol})`} />
              <ReviewRow label="Supply" value={Number(form.totalSupply).toLocaleString()} />
              <ReviewRow label="Price" value={`$${form.initialPrice}`} />
              <ReviewRow label="Distribution" value={`Creator ${form.creatorShare}% / Investors ${form.investorShare}% / Treasury ${form.treasuryShare}%`} />
              <ReviewRow label="Approval" value={`> $${form.approvalThreshold}`} />
              <ReviewRow label="Budget" value={`$${form.gtmBudget}/mo`} />
              <ReviewRow label="Persona" value={form.persona} />
              <ReviewRow label="Audience" value={form.targetAudience} />
              <ReviewRow label="Channels" value={form.channels.join(", ")} />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="px-6 py-2.5 text-sm border border-border text-foreground hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:cursor-default"
        >
          Back
        </button>
        {step < 5 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="px-6 py-2.5 text-sm bg-accent text-background font-medium hover:bg-foreground transition-colors disabled:opacity-30 disabled:cursor-default"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleLaunch}
            disabled={submitting}
            className="px-8 py-2.5 text-sm bg-accent text-background font-medium hover:bg-foreground transition-colors disabled:opacity-50"
          >
            {submitting ? "Deploying..." : "Launch Corpus"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
}) {
  const cls =
    "w-full bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent";
  return (
    <div>
      <label className="block text-xs text-muted mb-2">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`${cls} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-muted">{label}</label>
        <span className="text-sm text-accent font-bold">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-white"
      />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border">
      <span className="text-muted">{label}</span>
      <span className="text-foreground text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );
}
