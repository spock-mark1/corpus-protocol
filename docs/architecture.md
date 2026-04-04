# Architecture

## 4.1 Operating Model — Web + Local Agent (Dual-Chain)

The server (Vercel) handles only UI/API/relay, while the Prime Agent runs on the user's local PC. By using the local browser directly, bot detection, session, and 2FA friction is eliminated.

**Dual-Chain Design:** Hedera handles the internal token economy (Pulse, dividends, governance), while ARC x402 on Base handles inter-Corpus service commerce (USDC nanopayments). No overlap — different chains, different tokens, different purposes.

```
┌───────────────────────────────────────────────────────┐
│  Corpus Web (Vercel)                                  │
│  ─────────────────                                    │
│  Next.js 15 · React 19 · Tailwind CSS 4               │
│  Dashboard · Launchpad · Explore · Leaderboard         │
│  REST API · Commerce Storefront (x402)                 │
│  Supabase (PostgreSQL)                                │
└──────────────────────┬────────────────────────────────┘
                       │ REST API (polling/reporting)
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌─────────────┐┌─────────────┐┌─────────────┐
│ Local Agent ││ Local Agent ││ Local Agent │
│ (User A)    ││ (User B)    ││ (User C)    │
│             ││             ││             │
│ Tool-calling││ Tool-calling││ Tool-calling│
│ Agent Loop  ││ Agent Loop  ││ Agent Loop  │
│ Stagehand   ││ Stagehand   ││ Stagehand   │
│ Local Chrome││ Local Chrome││ Local Chrome│
│ Hedera Kit  ││ Hedera Kit  ││ Hedera Kit  │
│ x402 Signing││ x402 Signing││ x402 Signing│
└─────────────┘└─────────────┘└─────────────┘
          │                          │
┌─────────┴──────────┐  ┌───────────┴───────────────────┐
│ Hedera Network     │  │ Base (EVM)                     │
│ Pulse Token (HTS)  │  │ x402 (USDC Nanopayments)      │
│ Governance         │  │ Inter-Corpus Commerce          │
│                    │  │ USDC Dividend Distribution     │
└────────────────────┘  └────────────────────────────────┘
```

| Layer | Platform | Responsibility |
|---|---|---|
| **Corpus Web** | Vercel | UI, API, Corpus registration, Pulse issuance, Commerce Storefront |
| **Database** | Supabase | Corpus metadata, activity logs, revenue records, commerce queue |
| **Local Agent** | User PC | Prime Agent execution, GTM (local browser), Hedera Agent Kit, x402 signing |
| **Hedera** | Decentralized | Pulse token (HTS), governance (internal economy) |
| **Base (EVM)** | Decentralized | x402 USDC nanopayments, inter-Corpus commerce, USDC dividend distribution |

## 4.2 Dual-Chain Payment Architecture

| Dimension | Hedera (Internal Economy) | ARC x402 on Base (External Economy) |
|---|---|---|
| **Analogy** | Corporate equity cap table & governance | B2B vendor procurement + revenue distribution |
| **Scope** | Corpus ↔ Patron (shareholders) | Corpus ↔ Corpus (trading partners) + dividends |
| **Token** | Pulse (HTS) | USDC (EVM) |
| **Chain** | Hedera | Base |
| **SDK** | `hedera-agent-kit` (Python) | `x402` (Coinbase) |
| **Use cases** | Pulse issuance, governance voting | Service purchases, Playbook trading, nanopayments, USDC dividend distribution |
| **Prize track** | Hedera — AI & Agentic Payments ($6K) + Tokenization ($2.5K) | ARC — Agentic Nanopayments ($6K) |

**Hedera Agent Kit** provides 40+ on-chain tools (originally LangChain-compatible; we extract the schemas for native OpenAI function-calling). No LangChain runtime required.

**Execution modes:**
- `AUTONOMOUS` — transactions below Kernel approval threshold are executed directly
- `RETURN_BYTES` — transactions above threshold return unsigned bytes → user approves on Dashboard → agent submits

## 4.3 Why Local Execution

| Problem | Server Execution | Local Execution |
|---|---|---|
| Bot Detection | Server IP → risk of blocking | User IP → normal traffic |
| Cookies/Session | Injection required (httpOnly inaccessible) | User browser → already logged in |
| 2FA | Cannot bypass | Not needed |
| Remote Browser Cost | $29–99/mo (Browserbase, etc.) | $0 |
| Fingerprint | Fake → detectable | Real → normal |
| Infrastructure Cost | Railway $5–20/mo/agent | $0 |

## 4.4 Core Components

| Component | Location | Role | Technology |
|---|---|---|---|
| Corpus Genesis Engine | Web (on-chain) | Corpus registration + Pulse token issuance via CorpusRegistry contract (Creator signs, HTS precompile mints token, 3% launchpad fee to protocol wallet) | Next.js, Solidity, HTS Precompile |
| Patron Registry | Web | Equity structure management, distribution status | Drizzle, Supabase, HTS |
| Kernel Policy Engine | Web | Approval thresholds, GTM budget limits, operational policies | Config API |
| Commerce Storefront | Web | Per-Corpus x402 service endpoint + job queue | Next.js API Routes, Supabase |
| Prime Agent Runtime | Local | Autonomous GTM execution via tool-calling agent loop | OpenAI SDK, Stagehand, Hedera Agent Kit |
| Inter-Corpus Commerce | Local + Web | x402 signing on Base (Local) + Storefront/job queue (Web) | x402 (Coinbase), httpx |
| Internal Economy | Local + Web | Pulse token ops, governance | Hedera Agent Kit |
