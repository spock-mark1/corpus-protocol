"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { WalletGate, useWallet } from "@/components/wallet-gate";
import {
  getRegistryContract,
  getNameServiceContract,
  getNameServiceReadOnly,
  getSignerFromDynamic,
  ensureHederaTestnet,
} from "@/lib/contracts";
import { BrowserProvider, ethers } from "ethers";

const STEPS = [
  "Product",
  "Patron",
  "Pulse",
  "Kernel",
  "Agent",
  "Review",
] as const;

const CHANNELS = ["X (Twitter)", "LinkedIn", "Reddit", "Product Hunt"];

export default function LaunchPage() {
  return (
    <WalletGate
      title="Connect Wallet to Launch"
      description="Creating a Corpus requires a wallet connection. Your wallet address will be registered as the Creator."
    >
      <LaunchForm />
    </WalletGate>
  );
}

function LaunchForm() {
  const { address } = useWallet();
  const { primaryWallet } = useDynamicContext();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    productName: "",
    productDesc: "",
    category: "marketing",
    tokenName: "",
    tokenSymbol: "",
    totalSupply: "1000000",
    initialPrice: "0.01",
    approvalThreshold: "10",
    gtmBudget: "100",
    persona: "",
    targetAudience: "",
    tone: "professional",
    creatorWallet: "",
    channels: ["X (Twitter)"] as string[],
    agentName: "",
    serviceName: "",
    serviceDescription: "",
    servicePrice: "",
    serviceCurrency: "USDC" as const,
  });
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [nameChecking, setNameChecking] = useState(false);
  const [deployStep, setDeployStep] = useState<string | null>(null);
  const [deployProgress, setDeployProgress] = useState(0); // 0-4 steps
  const [copied, setCopied] = useState(false);
  const [genesisResult, setGenesisResult] = useState<{
    corpusId: string;
    apiKey: string;
    onChainId: number;
    agentName: string;
  } | null>(null);

  const update = (key: string, value: string | number | string[]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const nameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkNameAvailability = useCallback((name: string) => {
    if (nameCheckTimer.current) clearTimeout(nameCheckTimer.current);
    if (!name || name.length < 3) {
      setNameAvailable(null);
      setNameChecking(false);
      return;
    }
    setNameChecking(true);
    nameCheckTimer.current = setTimeout(async () => {
      try {
        const ns = getNameServiceReadOnly();
        const available = await ns.isNameAvailable(name);
        setNameAvailable(available);
      } catch {
        const valid = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name) && !/--/.test(name);
        setNameAvailable(valid);
      } finally {
        setNameChecking(false);
      }
    }, 400);
  }, []);

  const canNext = () => {
    switch (step) {
      case 0:
        return form.productName && form.productDesc;
      case 1: // Patron — read-only, always passable
        return true;
      case 2: {
        const sym = form.tokenSymbol.trim();
        const supply = Number(form.totalSupply);
        const price = Number(form.initialPrice);
        return (
          form.tokenName.trim().length > 0 &&
          sym.length >= 2 && sym.length <= 8 &&
          /^[A-Za-z][A-Za-z0-9]*$/.test(sym) &&
          supply > 0 && supply <= 100_000_000 &&
          price > 0 && price <= 1_000_000
        );
      }
      case 3:
        return form.approvalThreshold && form.gtmBudget;
      case 4:
        return form.persona && form.targetAudience && form.channels.length > 0
          && form.agentName.length >= 3 && nameAvailable === true;
      default:
        return true;
    }
  };

  const handleLaunch = async () => {
    if (!primaryWallet) return;
    setSubmitting(true);
    setError(null);
    setDeployStep(null);
    setDeployProgress(0);

    try {
      // 1. Get signer from Dynamic wallet and verify network
      setDeployStep("Connecting wallet...");
      setDeployProgress(1);
      const signer = await getSignerFromDynamic(primaryWallet);
      setDeployStep("Verifying network...");
      await ensureHederaTestnet(signer.provider as BrowserProvider);

      // 2. Register Corpus on-chain
      setDeployStep("Registering Corpus on-chain...");
      setDeployProgress(2);
      const registry = getRegistryContract(signer);

      const creatorAddr = form.creatorWallet || address;
      // All revenue → Agent Treasury (no external distribution)
      // Contract requires unique addresses — use dummy placeholders for unused roles
      const patron = {
        creatorShare: 0,
        investorShare: 0,
        treasuryShare: 10000, // 100% in basis points
        creatorAddr,
        investorAddr: "0x0000000000000000000000000000000000000001", // placeholder — not used
        treasuryAddr: "0x0000000000000000000000000000000000000002", // placeholder — not used
      };
      const kernel = {
        approvalThreshold: BigInt(Math.round(Number(form.approvalThreshold) * 100)), // USD → cents
        gtmBudget: BigInt(Math.round(Number(form.gtmBudget) * 100)),
        minPatronPulse: BigInt(Math.floor(Number(form.totalSupply) / 1000)),
      };
      const pulse = {
        hederaTokenAddr: "0x0000000000000000000000000000000000000000",
        totalSupply: BigInt(form.totalSupply),
        priceUsdCents: BigInt(Math.round(Number(form.initialPrice) * 100)),
      };

      const createTx = await registry.createCorpus(
        form.productName,
        form.category.charAt(0).toUpperCase() + form.category.slice(1),
        patron,
        kernel,
        pulse,
        form.tokenName,
        form.tokenSymbol,
        { value: ethers.parseEther(process.env.NEXT_PUBLIC_CORPUS_CREATION_HBAR ?? "20") }, // HBAR for HTS token creation (excess refunded)
      );
      const receipt = await createTx.wait();

      // Extract corpusId from CorpusCreated event
      const createdEvent = receipt.logs
        .map((log: { topics: readonly string[]; data: string }) => {
          try { return registry.interface.parseLog(log); } catch { return null; }
        })
        .find((e: { name: string } | null) => e?.name === "CorpusCreated");

      if (!createdEvent) throw new Error("CorpusCreated event not found in receipt");
      const onChainId = Number(createdEvent.args[0]);

      // Extract Pulse token address from PulseTokenCreated event
      const pulseEvent = receipt.logs
        .map((log: { topics: readonly string[]; data: string }) => {
          try { return registry.interface.parseLog(log); } catch { return null; }
        })
        .find((e: { name: string } | null) => e?.name === "PulseTokenCreated");
      const pulseTokenAddr = pulseEvent?.args?.[1] ?? null;

      // 3. Register Prime Agent name on-chain (immutable)
      setDeployStep("Registering agent identity...");
      setDeployProgress(3);
      const nameService = getNameServiceContract(signer);
      const nameTx = await nameService.registerName(BigInt(onChainId), form.agentName);
      await nameTx.wait();

      // 4. Save to database
      setDeployStep("Saving to database...");
      setDeployProgress(4);
      let dbData: { id: string; apiKeyOnce: string } | null = null;
      try {
        const res = await fetch("/api/corpus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.productName,
            category: form.category.charAt(0).toUpperCase() + form.category.slice(1),
            description: form.productDesc,
            totalSupply: Number(form.totalSupply),
            persona: form.persona,
            targetAudience: form.targetAudience,
            channels: form.channels,
            toneVoice: form.tone,
            approvalThreshold: Number(form.approvalThreshold),
            gtmBudget: Number(form.gtmBudget),
            initialPrice: Number(form.initialPrice),
            minPatronPulse: Math.floor(Number(form.totalSupply) / 1000),
            creatorAddress: creatorAddr,
            walletAddress: address,
            onChainId,
            agentName: form.agentName,
            hederaTokenId: pulseTokenAddr,
            tokenSymbol: form.tokenSymbol,
            ...(form.serviceName && form.servicePrice
              ? {
                  serviceName: form.serviceName,
                  serviceDescription: form.serviceDescription || undefined,
                  servicePrice: Number(form.servicePrice),
                }
              : {}),
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to save corpus");
        }
        dbData = await res.json();
      } catch (dbErr) {
        // On-chain succeeded but DB failed — show recovery info
        const msg = dbErr instanceof Error ? dbErr.message : "Database save failed";
        setError(
          `On-chain registration succeeded (ID: ${onChainId}, Agent: ${form.agentName}.corpus) but database save failed: ${msg}. ` +
          `Please contact support with your on-chain ID to recover.`
        );
        return;
      }

      setGenesisResult({
        corpusId: dbData!.id,
        apiKey: dbData!.apiKeyOnce,
        onChainId,
        agentName: form.agentName,
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Transaction failed";
      // Translate common blockchain errors to user-friendly messages
      let message = raw;
      if (raw.includes("CALL_EXCEPTION") || raw.includes("missing revert data"))
        message = "Transaction reverted. Please check your wallet balance and try again.";
      else if (raw.includes("user rejected") || raw.includes("ACTION_REJECTED"))
        message = "Transaction was rejected in your wallet.";
      else if (raw.includes("insufficient funds"))
        message = "Insufficient HBAR balance for this transaction.";
      else if (raw.includes("Wrong network"))
        message = raw; // already user-friendly
      else if (raw.length > 200)
        message = "Transaction failed. Please try again or contact support.";
      setError(message);
    } finally {
      setSubmitting(false);
      setDeployStep(null);
      setDeployProgress(0);
    }
  };

  if (genesisResult) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="text-xs text-green-400 mb-2">[GENESIS COMPLETE]</div>
          <h1 className="text-2xl font-bold text-accent">Corpus Launched Successfully</h1>
        </div>

        <div className="bg-surface border border-green-900 p-8 mb-6 space-y-6">
          <div className="flex items-center gap-3 text-green-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="text-sm font-medium">On-chain registration confirmed (ID: {genesisResult.onChainId})</span>
          </div>

          <div>
            <div className="text-xs text-muted mb-2">Agent Identity</div>
            <div className="text-foreground font-mono text-sm">{genesisResult.agentName}.corpus</div>
          </div>

          <div>
            <div className="text-xs text-red-400 mb-2">API Key (shown only once — save it now)</div>
            <div className="bg-background border border-border p-3 font-mono text-xs text-accent break-all select-all">
              {genesisResult.apiKey}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted mb-4">Run your Prime Agent</div>
            <div className="bg-background border border-border p-4 text-xs text-foreground space-y-1 overflow-x-auto">
              <div className="text-muted"># 1. Install the agent CLI</div>
              <div>pip install corpus-agent</div>
              <div className="text-muted mt-3"># 2. Set your API key</div>
              <div>export CORPUS_API_KEY=&quot;{genesisResult.apiKey}&quot;</div>
              <div className="text-muted mt-3"># 3. Start your Prime Agent</div>
              <div>corpus-agent start --corpus-id {genesisResult.onChainId}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => {
              navigator.clipboard.writeText(genesisResult.apiKey).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className={`px-6 py-2.5 text-sm border transition-colors ${
              copied ? "border-green-400 text-green-400" : "border-border text-foreground hover:bg-surface-hover"
            }`}
          >
            {copied ? "Copied!" : "Copy API Key"}
          </button>
          <button
            onClick={() => router.push(`/explore/${genesisResult.corpusId}`)}
            className="px-8 py-2.5 text-sm bg-accent text-background font-medium hover:bg-foreground transition-colors"
          >
            View Corpus &rarr;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="text-xs text-muted mb-2">[CORPUS GENESIS]</div>
          <h1 className="text-2xl font-bold text-accent">Launch your Corpus</h1>
        </div>
        <button
          onClick={() => {
            setForm({
              productName: "Paymon",
              productDesc: "AI-powered payment agent that automates invoicing, subscription billing, and cross-border settlements. Integrates with major payment rails and provides real-time treasury analytics for Web3 businesses.",
              category: "finance",
              tokenName: "Paymon Pulse",
              tokenSymbol: "PAYMON",
              totalSupply: "1000000",
              initialPrice: "0.50",
              approvalThreshold: "100",
              gtmBudget: "500",
              persona: "A sharp, data-driven fintech strategist who speaks with authority on payments infrastructure. Combines deep technical knowledge with clear, actionable insights. Always backs claims with numbers.",
              targetAudience: "Web3 founders, CFOs, and treasury managers who need automated payment operations and real-time financial visibility.",
              tone: "professional",
              creatorWallet: "",
              channels: ["X (Twitter)", "LinkedIn"],
              agentName: "paymon",
              serviceName: "Payment Automation",
              serviceDescription: "Automates invoice generation, payment routing, and settlement reconciliation. Send a payment request and receive a fully processed transaction with compliance checks.",
              servicePrice: "2.50",
              serviceCurrency: "USDC",
            });
            setNameAvailable(true);
            setStep(0);
          }}
          className="px-4 py-2 text-xs border border-accent/30 text-accent hover:bg-surface-hover transition-colors"
        >
          Demo: Paymon
        </button>
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
              Register your product. Your Prime Agent will handle GTM and service delivery.
            </p>
            <Field label="Product Name" value={form.productName} onChange={(v) => update("productName", v)} placeholder="e.g. ImageGen Pro" />
            <Field label="Description" value={form.productDesc} onChange={(v) => update("productDesc", v)} placeholder="What does your product do? Who is it for?" multiline />
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
                <option value="finance">Finance</option>
                <option value="analytics">Analytics</option>
                <option value="operations">Operations</option>
                <option value="sales">Sales</option>
                <option value="support">Support</option>
                <option value="education">Education</option>
              </select>
            </div>

            <div className="pt-4 mt-2 border-t border-border">
              <div className="text-xs text-accent mb-1">[COMMERCE SERVICE]</div>
              <p className="text-xs text-muted mb-4">
                Define the paid service your agent offers to other agents via the x402 protocol. Optional — you can add this later.
              </p>
              <div className="space-y-4">
                <Field label="Service Name" value={form.serviceName} onChange={(v) => update("serviceName", v)} placeholder="e.g. SEO Content Generation" />
                <Field label="Service Description" value={form.serviceDescription} onChange={(v) => update("serviceDescription", v)} placeholder="What does this service do? What input/output should callers expect?" multiline />
                <div>
                  <label className="block text-xs text-muted mb-2">Price per Request (USDC)</label>
                  <input
                    type="number"
                    value={form.servicePrice}
                    onChange={(e) => update("servicePrice", e.target.value)}
                    placeholder="e.g. 5.00"
                    className="w-full bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-accent mb-1">Patron Configuration</h2>
            <p className="text-sm text-muted mb-6">
              The Creator is your wallet address. It is permanently linked to this Corpus and cannot be changed.
            </p>
            <div>
              <label className="block text-xs text-muted mb-2">Creator Address</label>
              <div className="w-full bg-background border border-border px-4 py-2.5 text-sm text-foreground/70 font-mono select-all">
                {form.creatorWallet || address || "—"}
              </div>
              <p className="text-xs text-muted mt-1">This wallet will be registered as the Corpus Creator on-chain.</p>
            </div>
            <div className="p-4 border border-border bg-background">
              <div className="text-xs text-accent mb-2">[REVENUE MODEL]</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Agent Treasury</span>
                  <span className="text-foreground font-medium">100%</span>
                </div>
              </div>
              <p className="text-xs text-muted mt-3">All revenue flows to the Agent Treasury controlled by the Creator.</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-accent mb-1">Pulse Configuration</h2>
            <p className="text-sm text-muted mb-6">
              Configure your Corpus&apos;s ownership token on Hedera.
            </p>
            <Field label="Token Name" value={form.tokenName} onChange={(v) => update("tokenName", v)} placeholder="e.g. ImageGen Pulse" />
            <div>
              <Field label="Token Symbol" value={form.tokenSymbol} onChange={(v) => update("tokenSymbol", v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} placeholder="e.g. IMGS" />
              <p className="text-xs text-muted mt-1">2-8 characters, letters and numbers only</p>
            </div>
            <div>
              <Field label="Total Supply" value={form.totalSupply} onChange={(v) => update("totalSupply", v)} type="number" />
              <p className="text-xs text-muted mt-1">Max 100,000,000</p>
            </div>
            <div>
              <Field label="Initial Price (USDC)" value={form.initialPrice} onChange={(v) => update("initialPrice", v)} type="number" />
              <p className="text-xs text-muted mt-1">Price per Pulse token in USDC</p>
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
            <div>
              <label className="block text-xs text-muted mb-2">Agent Identity (immutable)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={form.agentName}
                  onChange={(e) => {
                    const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                    update("agentName", v);
                    checkNameAvailability(v);
                  }}
                  placeholder="e.g. marketbot"
                  className="flex-1 bg-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent"
                />
                <span className="text-sm text-muted">.corpus</span>
              </div>
              <div className="mt-1.5 text-xs">
                {nameChecking && <span className="text-muted">Checking...</span>}
                {!nameChecking && nameAvailable === true && form.agentName.length >= 3 && (
                  <span className="text-green-400">{form.agentName}.corpus is available</span>
                )}
                {!nameChecking && nameAvailable === false && (
                  <span className="text-red-400">{form.agentName}.corpus is taken</span>
                )}
                {!nameChecking && nameAvailable === null && form.agentName.length > 0 && form.agentName.length < 3 && (
                  <span className="text-muted">Minimum 3 characters</span>
                )}
              </div>
              <p className="text-xs text-muted mt-1">This is your agent&apos;s permanent on-chain identity. It cannot be changed after registration.</p>
            </div>
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
              <ReviewRow label="Agent Identity" value={`${form.agentName}.corpus`} />
              <ReviewRow label="Revenue Model" value="100% Agent Treasury (no external distribution)" />
              <ReviewRow label="Creator Wallet" value={form.creatorWallet || address || ""} />
              <ReviewRow label="Approval" value={`> $${form.approvalThreshold}`} />
              <ReviewRow label="Budget" value={`$${form.gtmBudget}/mo`} />
              <ReviewRow label="Persona" value={form.persona} />
              <ReviewRow label="Audience" value={form.targetAudience} />
              <ReviewRow label="Channels" value={form.channels.join(", ")} />
              {form.serviceName && (
                <>
                  <ReviewRow label="Service" value={form.serviceName} />
                  <ReviewRow label="Service Price" value={form.servicePrice ? `${form.servicePrice} USDC` : "—"} />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {submitting && (
        <div className="mb-6 border border-accent/30 bg-surface p-6">
          <div className="flex items-center gap-3 mb-4">
            <svg className="animate-spin h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-accent">{deployStep || "Preparing..."}</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 transition-colors duration-300 ${
                  s <= deployProgress ? "bg-accent" : "bg-border"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted">
            <span>Wallet</span>
            <span>Registry</span>
            <span>Name</span>
            <span>Database</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

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
            className="px-6 py-2.5 text-sm bg-accent text-background font-medium hover:bg-foreground transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleLaunch}
            disabled={submitting}
            className="px-8 py-2.5 text-sm bg-accent text-background font-medium hover:bg-foreground transition-colors disabled:opacity-50"
          >
            {submitting ? (deployStep || "Deploying...") : "Launch Corpus"}
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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border">
      <span className="text-muted">{label}</span>
      <span className="text-foreground text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );
}
