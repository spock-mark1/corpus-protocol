# Architecture

## 4.1 Operating Model — Web + Local Agent (Dual-Chain)

The server (Vercel) handles only UI/API/relay, while the Prime Agent runs on the user's local PC. By using the local browser directly, bot detection, session, and 2FA friction is eliminated.

**Dual-Chain Design:** Hedera handles the internal token economy (Pulse, governance), while x402 + Circle Nanopayments on Arc handles inter-Corpus service commerce (USDC nanopayments). All revenue stays in the Agent Treasury. No overlap — different chains, different tokens, different purposes.

```
┌───────────────────────────────────────────────────────┐
│  Corpus Web (Vercel)                                  │
│  ─────────────────                                    │
│  Next.js 16 · React 19 · Tailwind CSS 4               │
│  Dashboard · Launchpad · Explore · Marketplace · Network│
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
│ Circle+x402 ││ Circle+x402 ││ Circle+x402 │
└─────────────┘└─────────────┘└─────────────┘
          │                          │
┌─────────┴──────────┐  ┌───────────┴───────────────────┐
│ Hedera Network     │  │ Arc Network (EVM L1)           │
│ Pulse Token (HTS)  │  │ Circle Nanopayments + x402     │
│ Governance         │  │ Inter-Corpus Commerce (USDC)   │
│                    │  │ Agent Treasury (USDC)           │
└────────────────────┘  └────────────────────────────────┘
```

| Layer | Platform | Responsibility |
|---|---|---|
| **Corpus Web** | Vercel | UI, API, Corpus registration, Pulse issuance, Commerce Storefront |
| **Database** | Supabase | Corpus metadata, activity logs, revenue records, commerce queue |
| **Local Agent** | User PC | Prime Agent execution, GTM (local browser), Hedera Agent Kit, Circle Wallets + x402 signing |
| **Hedera** | Decentralized | Pulse token (HTS), governance (internal economy) |
| **Arc (EVM L1)** | Decentralized | Circle Nanopayments + x402, inter-Corpus commerce (USDC), Agent Treasury management |

## 4.2 Dual-Chain Payment Architecture

| Dimension | Hedera (Internal Economy) | x402 + Circle Nanopayments on Arc (External Economy) |
|---|---|---|
| **Analogy** | Corporate governance cap table | B2B vendor procurement + agent treasury |
| **Scope** | Corpus ↔ Patron (governance participants) | Corpus ↔ Corpus (trading partners) |
| **Token** | Pulse (HTS) | USDC (native on Arc) |
| **Chain** | Hedera | Arc (Circle's stablecoin-native EVM L1) |
| **SDK** | `hedera-agent-kit` (Python) | `x402` + `@circle-fin/developer-controlled-wallets` + Circle Nanopayments API |
| **Use cases** | Pulse issuance, governance voting | Service purchases, Playbook trading, gas-free nanopayments, Agent Treasury management |
| **Prize track** | Hedera — AI & Agentic Payments ($6K) + Tokenization ($2.5K) | ARC — Agentic Nanopayments ($6K) |

**Hedera Agent Kit** provides 40+ on-chain tools (originally LangChain-compatible; we extract the schemas for native OpenAI function-calling). The Prime Agent uses a subset of these tools selectively based on operational needs (e.g., `get_token_balance` for governance weight). No LangChain runtime required.

**Circle Nanopayments** enables gas-free USDC transfers as small as $0.000001 via offchain aggregation. Individual payments are signed with EIP-3009, validated by Circle's Nanopayments API, and settled in batches on Arc. Agent wallets are managed via Circle Developer-Controlled Wallets (MPC-secured, private keys never exposed to agent code).

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
| Patron Registry | Web | Governance participant management, voting weight | Drizzle, Supabase, HTS |
| Kernel Policy Engine | Web | Approval thresholds, GTM budget limits, operational policies | Config API |
| Commerce Storefront | Web | Per-Corpus x402 service endpoint + job queue | Next.js API Routes, Supabase |
| Prime Agent Runtime | Local | Autonomous GTM execution via tool-calling agent loop | OpenAI SDK, Stagehand, Hedera Agent Kit |
| Inter-Corpus Commerce | Local + Web | x402 signing on Arc (Local via Circle Wallets) + Storefront/job queue (Web) | x402, Circle Nanopayments, Circle Developer-Controlled Wallets |
| Internal Economy | Local + Web | Pulse token ops, governance | Hedera Agent Kit |
