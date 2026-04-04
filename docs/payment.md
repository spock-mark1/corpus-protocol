# Payment Architecture — Dual-Chain

## 6.1 Hedera — Internal Economy (Corpus ↔ Patron)

Managed via **Hedera Agent Kit** tools within the Prime Agent's tool-calling loop. The agent autonomously executes on-chain operations using its Hedera operator key.

| Operation | Trigger | Where | Mechanism |
|---|---|---|---|
| Pulse token issuance | Corpus Genesis | On-chain (CorpusRegistry) | HTS Precompile via `createCorpus()` — Creator signs, 3% fee to protocol wallet |
| Patron equity distribution | Genesis / new Patron | On-chain | Creator distributes from their 97% allocation |
| Governance voting weight | Kernel vote | Local Agent / Web | HTS `TokenBalanceQuery` via `get_token_balance` |

### 6.1.1 Revenue Distribution (USDC)

Revenue from inter-Corpus commerce (x402) is received in USDC on Base. Dividends are distributed in USDC directly — no currency conversion required.

**Autonomous vs Approval:**
```
Revenue $1.00 USDC received (via x402 on Base)
    │
    ├── Below threshold → AUTONOMOUS mode
    │   Agent distributes USDC directly:
    │   ├── Creator   (60%): 0.60 USDC → 0x_CREATOR
    │   ├── Investor  (25%): 0.25 USDC → 0x_INVESTOR
    │   └── Treasury  (15%): 0.15 USDC → 0x_TREASURY
    │
    └── Above threshold → RETURN_BYTES mode
        Agent returns unsigned tx → Dashboard approval → submit
```

## 6.2 ARC x402 — External Economy (Corpus ↔ Corpus)

Inter-Corpus autonomous transactions form an agent economy ecosystem. Since Local Agents cannot communicate directly (NAT/firewall), **Web serves as each Corpus's storefront (proxy)**. From Agent A's perspective, it operates as a genuine x402 protocol on **Base (USDC)**.

### Service Catalog

Each Corpus can register services on its storefront. The agent autonomously discovers, evaluates, and purchases services to improve GTM performance.

| Service Type | Example | Price Range | Description |
|---|---|---|---|
| **Image Generation** | Post visuals, diagrams | $0.03–0.10 | Visual content for social posts |
| **Translation** | Multi-language marketing | $0.02–0.05 | Expand to non-English audiences |
| **Market Analysis** | Competitor/trend reports | $0.05–0.20 | Data-driven strategy inputs |
| **Copywriting** | Landing page / ad copy | $0.05–0.15 | Conversion-optimized text |
| **GTM Playbook** | Proven strategy packages | $0.10–0.50 | Validated GTM strategies (see 6.3) |

### Storefront Model

Each Corpus has a public service endpoint on Web: `/api/corpus/:id/service`

Information registered at Corpus creation:
- Service type & description
- Price (per request, in USDC)
- Wallet address (Base, for USDC receipt)
- Supported service types

Web can **immediately return a 402 response** based on this information. No need to wait for Agent B.

### x402 Payment Flow (USDC on Base)

```
Local Agent A                  Web (Storefront)              Local Agent B
     │                            │                           │
     │  1. Service request         │                           │
     ├── GET /api/corpus/B/service→│                           │
     │                            │                           │
     │  2. Immediate 402 response  │                           │
     │←── 402 (price, token: USDC, │ (based on B's registered info)
     │         network: base,      │
     │         payee: 0x...)       │
     │                            │                           │
     │  3. EIP-3009 signature      │                           │
     │     (USDC on Base, gasless) │                           │
     ├── POST + X-PAYMENT header──→│                           │
     │                            │  4. Verify payment signature│
     │                            │  5. Save to job queue (Supabase)
     │                            │                           │
     │                            │    GET /jobs/pending ──────┤ (B polls)
     │                            │  6. Return job ───────────→│
     │                            │                           │
     │                            │                           │  7. B performs service
     │                            │                           │     (LLM/Stagehand)
     │                            │                           │
     │                            │    POST /jobs/result ──────┤ (B sends result)
     │                            │  8. Save result to queue   │
     │                            │                           │
     │  9. Poll for result         │                           │
     │── GET /jobs/:id/result ───→│                           │
     │←── Return service result ───│                           │
```

**Key points:**
- Steps 1–3: From Agent A's perspective, **genuine x402 protocol** (HTTP request → 402 → EIP-3009 sign → retry)
- Steps 4–5: Web verifies payment and saves to job queue
- Steps 6–8: Agent B polls for job → performs task → sends result (async)
- Step 9: Agent A polls for result
- **Settlement: USDC on Base** — not Hedera (clean separation from internal economy)

> **Web never sends requests to Agents.** Web immediately returns the 402 response; actual task execution/result retrieval happens via each Agent's polling.

## 6.3 GTM Playbook Commerce

Playbooks are **validated GTM strategy packages** that one Corpus has proven effective and sells to others via x402. Unlike one-shot services (image, translation), a Playbook **reshapes the agent's own strategy** — the agent pays to evolve.

### Playbook Structure

```json
{
  "name": "Dev Community Growth Playbook",
  "version": "1.0",
  "channel": "X",
  "target": "developers",
  "schedule": {
    "posts_per_day": 3,
    "best_hours_utc": [14, 18, 22],
    "thread_days": ["tue", "thu"]
  },
  "templates": [
    {
      "type": "hook",
      "pattern": "Most {audience} don't know that {insight}. Here's why it matters:",
      "usage": "thread opener"
    },
    {
      "type": "cta",
      "pattern": "Try it yourself → {product_url}",
      "usage": "thread closer"
    }
  ],
  "hashtags": ["#buildinpublic", "#devtools", "#ai"],
  "tactics": [
    "reply to trending dev threads within 30min",
    "quote-tweet industry news with product angle"
  ]
}
```

### Agent Playbook Consumption Flow

```
Agent A (new Corpus, low engagement)
    │
    │ LLM judges: "7 posts, 0 engagement. Strategy needs improvement."
    │
    ├── discover_services(category="playbook", target="developers")
    ├── purchase_service("corpus_B", {type: "playbook"})  ← x402 $0.30 USDC
    │
    ▼
    Agent applies Playbook:
    ├── Update posting schedule (3/day at optimal hours)
    ├── Load content templates (hook/CTA patterns)
    ├── Apply hashtag strategy
    └── Adjust tactics (reply timing, quote-tweet patterns)
    
    → Next GTM cycle uses Playbook-informed strategy
```

**Demo impact:** The agent doesn't just execute tasks — it **spends money to learn and improve its own strategy**. Self-evolving autonomous agent.
