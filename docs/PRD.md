# Corpus Protocol — Product Requirements Document

> "The operating system for autonomous agent corporations"

---

## 1. Overview

Corpus Protocol lets users turn a product or service description into a fully autonomous **agent corporation (Corpus)** — a Prime Agent that executes GTM (Go-To-Market), trades with other agents, and generates revenue on the user's behalf.

**One-line positioning:** Stripe Atlas for AI Agent Corporations

### Core Loop

1. **설립(Genesis)** — 사용자가 제품/서비스를 등록하면 에이전트 법인이 자동 설립. 지분(Pulse) 발행, 거버넌스(Kernel) 설정
2. **자율 GTM** — Prime Agent가 마케팅·세일즈·서비스를 직접 실행 (로컬 브라우저로 봇 탐지 회피)
3. **에이전트 간 거래** — 생태계 내 다른 Corpus의 서비스를 탐색·비교·구매(x402 USDC 나노결제)하고 리뷰를 남김
4. **자율 학습** — 실행 결과를 기반으로 전략을 반복 개선 => 축적된 지식과 노하우를 플레이북에 담아 판매
5. **승인 요청** — 임계값 초과 지출 등 중요 판단은 승인 요청 (승인 주체 Creator)
6. **수익 분배** — 수익 발생 시 Creator / Investor / Treasury에 USDC로 자동 배분

> **사용자는 자신의 제품을 등록하고 Prime Agent와 연결하면, 에이전트가 알아서 돈을 벌고, 배우고, 거래하고, 수익을 나눈다.**

---

## 2. Problem Statement

- Users have products or services ready to sell but lack the resources to execute GTM (marketing/sales/distribution).
- AI agents can execute tasks autonomously but have no built-in way to earn revenue, distribute profits, or enforce governance.
- Existing agent tokenization platforms (e.g., Virtuals) are Web3-native only, making them inaccessible to non-crypto users.

---

## 3. Naming Convention

All concepts in Corpus Protocol derive from the Latin root **Corpus (body)**, the etymological origin of "Corporation."

| Human World | Corpus World | Description |
|---|---|---|
| Incorporation | **Corpus Genesis** | Agent corporation establishment process |
| Shareholder | **Patron** | Governance-eligible owner of a Corpus (requires minimum Pulse holding) |
| Board of Directors | **Kernel** | Policy layer (revenue reinvestment ratios, etc.) |
| Equity | **Pulse** | Equity token (HTS-based) |
| CEO | **Prime Agent** | Lead agent, autonomous GTM execution entity |

---

## 4. Architecture

### 4.1 Operating Model — Web + Local Agent (Dual-Chain)

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

### 4.2 Dual-Chain Payment Architecture

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

### 4.3 Why Local Execution

| Problem | Server Execution | Local Execution |
|---|---|---|
| Bot Detection | Server IP → risk of blocking | User IP → normal traffic |
| Cookies/Session | Injection required (httpOnly inaccessible) | User browser → already logged in |
| 2FA | Cannot bypass | Not needed |
| Remote Browser Cost | $29–99/mo (Browserbase, etc.) | $0 |
| Fingerprint | Fake → detectable | Real → normal |
| Infrastructure Cost | Railway $5–20/mo/agent | $0 |

### 4.4 Core Components

| Component | Location | Role | Technology |
|---|---|---|---|
| Corpus Genesis Engine | Web (on-chain) | Corpus registration + Pulse token issuance via CorpusRegistry contract (Creator signs, HTS precompile mints token, 3% launchpad fee to protocol wallet) | Next.js, Solidity, HTS Precompile |
| Patron Registry | Web | Equity structure management, distribution status | Drizzle, Supabase, HTS |
| Kernel Policy Engine | Web | Approval thresholds, GTM budget limits, operational policies | Config API |
| Commerce Storefront | Web | Per-Corpus x402 service endpoint + job queue | Next.js API Routes, Supabase |
| Prime Agent Runtime | Local | Autonomous GTM execution via tool-calling agent loop | OpenAI SDK, Stagehand, Hedera Agent Kit |
| Inter-Corpus Commerce | Local + Web | x402 signing on Base (Local) + Storefront/job queue (Web) | x402 (Coinbase), httpx |
| Internal Economy | Local + Web | Pulse token ops, governance | Hedera Agent Kit |

---

## 5. User Flow

### 5.1 Corpus Genesis (Incorporation)

```
1. User inputs product/service description + token config
        │
        ▼
2. Corpus Genesis executes (Creator signs on-chain tx)
   ├── CorpusRegistry.createCorpus() called
   │   ├── HTS Precompile mints Pulse token (contract = treasury)
   │   ├── 3% launchpad fee → Corpus Protocol wallet
   │   └── 97% → Creator wallet
   ├── Configure Patron equity structure
   │   - Creator: X%
   │   - Early Investors: Y%
   │   - Agent Treasury: Z%
   ├── Set Kernel policies
   │   - Approval threshold (e.g., transactions > $10 require approval)
   │   - GTM budget limits, operational parameters
   ├── CorpusNameService.registerName() — immutable agent identity
   ├── Prime Agent configuration
   │   - Persona, target audience, tone & voice
   │   - GTM target channels (X, LinkedIn, Reddit, etc.)
   └── Corpus creation complete + API key issued
        │
        ▼
3. User runs Prime Agent locally
   $ pip install corpus-agent
   $ corpus-agent start --corpus-id 0.0.111
```

**Launchpad Fee:** 3% of total Pulse supply is sent to the Corpus Protocol wallet on every Genesis as a platform fee. This is enforced on-chain in the CorpusRegistry contract (`LAUNCHPAD_FEE_BPS = 300`).

### 5.2 Pulse Trading & Patron Registration

Pulse and Patron are intentionally separated to balance open market access with governance integrity.

#### Buy Pulse (Open Market)

Anyone with a connected wallet can buy/sell Pulse tokens freely. Pulse holders receive USDC dividend distributions proportional to their holdings.

#### Become Patron (Governance Registration)

Patron status grants governance rights (Kernel voting, policy proposals) but requires a **minimum Pulse holding threshold**. This prevents spam governance while keeping token trading open.

**Minimum threshold:** `totalSupply × 0.1%` (configurable per Corpus via Kernel policy, stored as `minPatronPulse`)

```
Wallet connected → Buy Pulse (free market)
                       ↓
               Holding ≥ minPatronPulse?
                  No → "Become Patron" disabled (tooltip: "N Pulse 이상 필요")
                  Yes → "Become Patron" enabled
                       ↓
               Click → Patron registration (on-chain record)
                       ↓
               Governance rights activated
                       ↓
               Holding drops below threshold?
                  → Patron status auto-revoked
```

| Action | Condition | Rights |
|---|---|---|
| **Buy Pulse** | Wallet connected | USDC dividends |
| **Become Patron** | Pulse holding ≥ `minPatronPulse` | Dividends + governance voting + Kernel policy proposals |

### 5.3 GTM Autonomous Execution (Human-in-the-Loop)

The Prime Agent autonomously executes GTM on the user's local PC using Stagehand + local Chrome, with important decisions requiring user approval.

```
3. Prime Agent autonomous execution (local browser-based)
   │
   ├── Autonomous (Agent decides)
   │   ├── Target user/market research via Stagehand (local Chrome web browsing)
   │   ├── Content draft generation (LLM)
   │   ├── Posting & mention/reply handling on X/LinkedIn/Reddit via Stagehand
   │   ├── Routine posting schedule execution
   │   └── Small x402 transactions (below threshold)
   │
   └── Approval Required (User confirmation)
       ├── First posting tone & voice approval
       ├── Large Inter-Corpus transactions
       ├── Kernel policy changes
       ├── New channel/strategy activation
       └── Spending above threshold
```

### 5.4 Approval Flow

```
Prime Agent makes decision
    │
    ├── Below threshold → Autonomous execution + report activity log via Web API
    │
    └── Above threshold → Request approval
        ├── Send approval request via Web API → Dashboard notification
        ├── Approved on Dashboard → Agent receives result via polling → Execute
        └── Rejected → Suggest alternative
```

---

## 6. Payment Architecture — Dual-Chain

### 6.1 Hedera — Internal Economy (Corpus ↔ Patron)

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

### 6.2 ARC x402 — External Economy (Corpus ↔ Corpus)

Inter-Corpus autonomous transactions form an agent economy ecosystem. Since Local Agents cannot communicate directly (NAT/firewall), **Web serves as each Corpus's storefront (proxy)**. From Agent A's perspective, it operates as a genuine x402 protocol on **Base (USDC)**.

#### Service Catalog

Each Corpus can register services on its storefront. The agent autonomously discovers, evaluates, and purchases services to improve GTM performance.

| Service Type | Example | Price Range | Description |
|---|---|---|---|
| **Image Generation** | Post visuals, diagrams | $0.03–0.10 | Visual content for social posts |
| **Translation** | Multi-language marketing | $0.02–0.05 | Expand to non-English audiences |
| **Market Analysis** | Competitor/trend reports | $0.05–0.20 | Data-driven strategy inputs |
| **Copywriting** | Landing page / ad copy | $0.05–0.15 | Conversion-optimized text |
| **GTM Playbook** | Proven strategy packages | $0.10–0.50 | Validated GTM strategies (see 6.3) |

#### Storefront Model

Each Corpus has a public service endpoint on Web: `/api/corpus/:id/service`

Information registered at Corpus creation:
- Service type & description
- Price (per request, in USDC)
- Wallet address (Base, for USDC receipt)
- Supported service types

Web can **immediately return a 402 response** based on this information. No need to wait for Agent B.

#### x402 Payment Flow (USDC on Base)

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

### 6.3 GTM Playbook Commerce

Playbooks are **validated GTM strategy packages** that one Corpus has proven effective and sells to others via x402. Unlike one-shot services (image, translation), a Playbook **reshapes the agent's own strategy** — the agent pays to evolve.

#### Playbook Structure

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

#### Agent Playbook Consumption Flow

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

---

## 7. Competitive Positioning

| Platform | Target | Differentiator |
|---|---|---|
| **Stripe Atlas** | Human incorporation | Legal/tax automation |
| **Virtuals** | Agent tokenization | Web3-only, speculative |
| **Corpus Protocol** | Agent incorporation + autonomous GTM | Accessible to anyone, real revenue structure, local execution |

---

## 8. Hackathon Demo Scenario

**3-minute live demo:**

| Time | Action |
|---|---|
| 0:00 - 0:30 | Enter product + configure GTM channels → Creator signs `createCorpus` tx |
| 0:30 - 1:00 | Pulse token minted on-chain via HTS precompile → 97% to Creator, 3% launchpad fee to protocol wallet **(Hedera Tokenization)** |
| 1:00 - 1:30 | `corpus-agent start` → Agent requests first posting approval → Approve → Post to X via local Chrome |
| 1:30 - 2:00 | Agent autonomously decides: "need an image" → discovers Corpus B service → x402 $0.05 USDC auto-payment on Base → image received → posts with image **(ARC Nanopayments)** |
| 2:00 - 2:30 | Agent judges low engagement → purchases GTM Playbook via x402 → applies new strategy → next post uses Playbook templates **(ARC — self-evolving agent)** |
| 2:30 - 3:00 | Revenue from sold service → Agent autonomously distributes USDC dividends to Patrons **(Revenue Distribution)** |

**Judge impact:**
- **Hedera judges:** Agent autonomously manages a token economy — issues equity (Pulse), handles governance on Hedera
- **ARC judges:** Agent-to-agent HTTP 402 nanopayments (USDC on Base) — service purchases + Playbook trading + USDC dividend distribution, self-evolving strategy
- **Both:** The agent operates the user's actual browser, makes autonomous payment decisions with human-in-the-loop for high-value transactions

---

## 9. Prize Strategy

| Track | What We Show | No Overlap With | Target |
|---|---|---|---|
| **Hedera — AI & Agentic Payments** | Hedera Agent Kit autonomous Pulse token operations, governance, equity management | ARC (different chain, different token, different purpose) | $6K |
| **Hedera — Tokenization** | Pulse token (HTS), Patron equity structure, governance voting weight | ARC (Pulse is internal equity, not commerce) | $2.5K |
| **ARC — Agentic Nanopayments** | x402 HTTP 402 protocol, USDC on Base, inter-Corpus service marketplace + Playbook trading + USDC dividend distribution | Hedera (different chain, different token, different purpose) | $6K |
| **World — Agent Kit** | World ID trust layer for Prime Agent | — | $8K |
| **World — World ID 4.0** | Patron 1-person-1-vote, Kernel governance uniqueness | — | $8K |

**Maximum Target: $30.5K**

**Clean separation pitch:**
- Hedera = "The agent's **equity cap table and governance**" (Pulse on Hedera)
- ARC = "The agent's **procurement department and bank account**" (USDC on Base via x402)

---

## 10. Web Application — Pages & Features

### 10.1 Launchpad (`/launch`)

Frontend for Corpus Genesis. The entry point for users to establish an agent corporation.

| Section | Functionality |
|---|---|
| Product Input | Product name, description, category selection |
| Pulse Configuration | Token name/symbol setup, total supply, initial price |
| Patron Structure | Equity distribution slider (Creator / Early Investors / Treasury) |
| Kernel Policy | Approval thresholds (amount, action type), GTM budget limits, operational parameters |
| Prime Agent Setup | Persona settings, target audience, tone & voice, GTM target channels (X, LinkedIn, Reddit, etc.) |
| Review & Deploy | Settings summary → On-chain transaction signing → Corpus creation → Prime Agent installation guide |

### 10.2 Explore (`/explore`)

Page for browsing created Corpuses.

| Section | Functionality |
|---|---|
| Corpus List | Card-style Corpus list (logo, name, category, status) |
| Filter & Search | By category, newest first, search |
| Corpus Detail (`/explore/:id`) | Product description, Prime Agent activity log, Patron list, revenue history |

### 10.3 Leaderboard (`/leaderboard`)

Competitive dashboard showing Corpus ecosystem performance rankings.

| Tab | Ranking Criteria |
|---|---|
| Top Corpus | Revenue, Pulse market cap, number of Patrons |
| Top Patrons | Total portfolio value, ROI, number of participating Corpuses |
| Top Prime Agents | Conversion rate, content created, inter-agent transactions |
| Trending | 24h/7d Pulse price change rate, new Patron inflow |

### 10.4 Patron Dashboard (`/dashboard`)

Portfolio management hub for Patrons (investors).

| Section | Functionality |
|---|---|
| Portfolio Overview | Held Pulse list, total value, return rate chart |
| Revenue Stream | Per-Corpus revenue distribution details, claimable amount, distribution history |
| Approval Queue | Prime Agent approval request list, approve/reject actions, view alternatives |
| Corpus Management | Kernel voting for participating Corpuses, policy change proposals |
| Activity Feed | Agent activity log, approval history, Corpus status changes |
| Agent Status | Local Agent online/offline status, last activity timestamp |
| On-chain Status | Hedera account balance, Pulse token holdings (read-only) |

### 10.5 Global Layout

| Element | Description |
|---|---|
| Navigation | Launchpad / Explore / Leaderboard / Dashboard |
| Header | Logo, wallet connection (Dynamic), notifications |
| Footer | Docs, GitHub, Twitter, Discord |

---

## 11. MVP Scope (Hackathon)

### Must Have
- [ ] **Launchpad** — Full Corpus Genesis flow (API input → Pulse issuance → Patron setup → GTM channel configuration)
- [ ] **Explore** — Corpus list + detail page
- [ ] **Patron Dashboard** — Portfolio & approval queue & activity feed
- [ ] **Prime Agent CLI** — `pip install corpus-agent` → `corpus-agent start` for local execution
- [ ] **Prime Agent GTM** — Stagehand + local Chrome-based X auto GTM (posting, research, mention handling)
- [ ] **Wallet Connection** — Multi-wallet integration via Dynamic (HashPack, MetaMask, WalletConnect)

### Should Have
- [ ] **Leaderboard** — Top Corpus / Patron / Prime Agent rankings
- [ ] **Kernel Policy UI** — Approval thresholds, GTM budget configuration
- [ ] **Inter-Corpus Commerce** — Web relay-based x402 nanopayment demo
- [ ] **Multi-channel GTM** — Additional channels via Stagehand (LinkedIn, Reddit, etc.)

### Nice to Have
- [ ] World ID integration
- [ ] Electron/menubar app (GUI instead of CLI)

### Scaling Notes
- Hackathon MVP: Local Agent-based, minimal server load (API + DB only)
- Production scaling: Transition from polling to real-time via Supabase Realtime

---

## 12. Tech Stack

### 12.1 Overview

```
corpus/
├── apps/
│   └── web/                     ← Next.js 15 (Vercel)
│       ├── Frontend (Dashboard, Launchpad, Explore, etc.)
│       ├── REST API
│       └── Commerce Storefront (x402)
│
└── packages/
    └── prime-agent/             ← Python (User PC)
        ├── OpenAI Tool-Calling Agent Loop (Brain)
        ├── Stagehand + Local Chrome (Hands)
        └── x402 Signing (Payments)
```

```
┌─────────────────────────────────────────────────────────┐
│           Vercel — apps/web                              │
│  Next.js 15 · React 19 · Tailwind CSS 4                 │
│  Dashboard · Launchpad · Explore · Leaderboard           │
│  Supabase (PostgreSQL) · @worldcoin/idkit                │
│  REST API · Commerce Storefront (x402)                   │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌────────────┐ ┌────────────┐ ┌────────────┐
   │ Local Agent│ │ Local Agent│ │ Local Agent│
   │ Python     │ │ Python     │ │ Python     │
   │ OpenAI SDK │ │ OpenAI SDK │ │ OpenAI SDK │
   │ Stagehand  │ │ Stagehand  │ │ Stagehand  │
   │ Chrome     │ │ Chrome     │ │ Chrome     │
   └────────────┘ └────────────┘ └────────────┘
```

| Component | Technology | Deployment | Cost |
|---|---|---|---|
| **Web** | Next.js 15 | Vercel | Free–Pro |
| **DB** | Supabase (PostgreSQL) | Supabase Cloud | Free–Pro |
| **Prime Agent** | Python | User PC (local execution) | $0 |

---

### 12.2 apps/web — Corpus Web (Vercel)

Dashboard, Launchpad, Explore, Leaderboard. Frontend + REST API + Commerce Storefront.

#### Frontend

| Package | Purpose | Notes |
|---|---|---|
| `next` 15 | App Router, SSR/SSG, API Routes | Full-stack framework |
| `react` 19 | UI rendering | Leverages Server Components |
| `tailwindcss` 4 | Styling | Utility-first |
| `@worldcoin/idkit` | World ID widget | Patron uniqueness verification |
| `@dynamic-labs/sdk-react-core` | Dynamic wallet SDK | Multi-wallet connection (HashPack, MetaMask, WalletConnect) |
| `@dynamic-labs/wallet-connect` | WalletConnect connector | WalletConnect protocol support |
| `recharts` | Pulse charts, revenue graphs | Dashboard/Leaderboard |
| `framer-motion` | Animations | Launchpad step transitions |

#### Backend / Database

| Package | Purpose | Notes |
|---|---|---|
| Next.js API Routes | REST API | Called by Local Agent + Frontend |
| `drizzle-orm` + `pg` | ORM + PostgreSQL driver | Type-safe queries, direct connection to Supabase PostgreSQL |
| `drizzle-kit` | Migration tool | Schema push, migration generation |
| `zod` | Input validation | API request schemas |

#### Web API Endpoints

| Endpoint | Method | Caller | Purpose |
|---|---|---|---|
| `/api/corpus` | POST | Web UI | Corpus registration (Genesis) |
| `/api/corpus/:id` | GET | Web UI / Local Agent | Corpus detail + configuration |
| `/api/corpus/:id/activity` | POST | Local Agent | Agent activity reporting |
| `/api/corpus/:id/revenue` | POST | Local Agent | Revenue reporting |
| `/api/corpus/:id/status` | PATCH | Local Agent | Agent status (online/offline) |
| `/api/corpus/:id/patrons` | GET | Web UI | Patron list for Corpus |
| `/api/corpus/:id/patrons` | POST | Web UI | Register as Patron (requires min Pulse holding) |
| `/api/corpus/:id/patrons` | DELETE | Web UI | Withdraw Patron status |
| `/api/corpus/:id/approvals` | GET | Web UI / Local Agent | Pending approval list |
| `/api/corpus/:id/approvals/:id` | PATCH | Web UI | Approve/reject |
| `/api/leaderboard` | GET | Web UI | Ranking data |
| `/api/corpus/:id/service` | GET | Local Agent | Inter-Corpus service request → 402 response (x402) |
| `/api/corpus/:id/service` | POST | Local Agent | x402 signature + retry → save to job queue |
| `/api/jobs/pending` | GET | Local Agent | Poll for pending jobs |
| `/api/jobs/:id/result` | POST | Local Agent | Submit job result |
| `/api/jobs/:id/result` | GET | Local Agent | Poll for job result |

---

### 12.3 packages/prime-agent — Prime Agent (User PC)

The Prime Agent running locally on the user's machine. Installed via `pip install`, executed locally.

#### Why Local Execution

| Advantage | Description |
|---|---|
| **Zero bot detection** | User IP + real browser → normal traffic |
| **Zero session issues** | Already logged into local Chrome → no cookie injection needed |
| **Zero 2FA issues** | User has already authenticated |
| **Zero infrastructure cost** | No browser running on server |
| **Instant multi-channel expansion** | Immediate access to all platforms where user is logged in |

#### Why Python

| Criteria | Reason for Python |
|---|---|
| Hedera Agent Kit | Python SDK (`hedera-agent-kit`) provides 40+ tools as first-class citizen |
| AI Ecosystem | OpenAI, agent-related libraries are Python-first |
| Stagehand | Python SDK supported (`stagehand` package) |
| Community | AI agent debugging/references concentrated in Python |

#### Architecture: Tool-Calling Agent Loop (No LangChain)

The Prime Agent uses a **ReAct-style tool-calling loop** powered by the OpenAI SDK's native function calling. No LangChain/LangGraph dependency — the LLM autonomously decides which tools to invoke based on context.

```
┌─────────────────────────────────────────┐
│ System Prompt (persona, config, context)│
└──────────────────┬──────────────────────┘
                   │
          ┌────────▼────────┐
          │   LLM decides   │◄──────────────┐
          │  next action(s) │               │
          └────────┬────────┘               │
                   │ tool_calls             │ tool_results
          ┌────────▼────────┐               │
          │  Execute tools  │───────────────┘
          └─────────────────┘
          (no tool_calls → cycle ends)
```

**Why not LangChain/LangGraph:**
- The workflow is a single autonomous agent choosing tools — `while True` + `tool_calls` is sufficient
- LangGraph adds value for multi-agent orchestration with sub-graphs, not needed here
- 3 fewer dependencies, half the code, 10x easier debugging
- Hedera Agent Kit tool schemas are extracted and converted to OpenAI function-calling format

#### Tool Categories

| Category | Tools | SDK |
|---|---|---|
| **Browser (GTM)** | `search_web`, `post_to_x`, `check_x_mentions`, `reply_on_x`, `browse_page` | Stagehand |
| **Hedera (Internal Economy)** | `create_token`, `airdrop_token`, `get_token_balance` | Hedera Agent Kit |
| **Commerce (External Economy)** | `discover_services`, `purchase_service`, `sign_x402_payment` | x402 + httpx |
| **Web API (Reporting)** | `report_activity`, `request_approval`, `check_approval` | httpx |
| **Internal** | `get_content_history`, `get_schedule_status`, `save_research_notes` | SQLite |

#### Packages

| Package | Purpose |
|---|---|
| `openai` | LLM tool-calling (direct SDK, no LangChain wrapper) |
| `hedera-agent-kit` | Hedera Agent Kit — 40+ on-chain tools (Pulse, HBAR, governance) |
| `stagehand` | Local Chrome browser automation — X/LinkedIn/Reddit posting, research, mention handling |
| `httpx` | Async HTTP (Web API communication, x402 payments, commerce polling) |
| `x402` | x402 payment signing (EIP-3009, USDC on Base) |
| `pydantic` | Data validation + settings |
| `click` | CLI interface |
| `rich` | Terminal UI (status display, logs) |
| `sqlite3` | Local DB (Python built-in, no installation required) |

> **No external queue/cron needed** — As a single-process agent, SQLite tables + `asyncio` handle all queuing and scheduling.
> **No LangChain needed** — OpenAI native tool-calling + Hedera Agent Kit tool schemas provide full agentic capability.

#### Installation & Execution

```bash
# Install
pip install corpus-agent

# Configure (one-time)
corpus-agent config --api-key <OPENAI_KEY> --hedera-key <HEDERA_KEY>

# Run
corpus-agent start --corpus-id 0.0.111

# Check status
corpus-agent status
```

#### Process Architecture

```
User PC (corpus-agent start)
│
├── Main Process (asyncio event loop)
│   ├── Web API Poller — Polls Web for config/approvals/commerce requests
│   ├── Health Reporter — Periodically reports online status to Web
│   ├── Local SQLite DB — Schedule state, queue, activity log cache
│   └── Scheduler (asyncio + SQLite)
│       ├── Every 5 min: Agent Loop cycle (LLM decides what to do)
│       ├── Every 60 sec: Health heartbeat
│       ├── Every 10 sec: Polling (approvals, jobs)
│       └── (Stores last execution time in SQLite → prevents duplicates on restart)
│
├── Tool-Calling Agent Loop (per cycle)
│   ├── LLM receives: system prompt + context (today's activity, pending mentions, etc.)
│   ├── LLM decides: which tools to call, in what order
│   ├── Available tools:
│   │   ├── Browser ──── Stagehand → Web research, social posting via local Chrome
│   │   ├── Hedera ───── Agent Kit → Pulse ops, governance
│   │   ├── Commerce ─── x402 → Inter-Corpus service/Playbook purchases (USDC on Base)
│   │   └── Web API ──── httpx → Activity reporting, approval requests
│   └── Loop ends when LLM returns no tool_calls
│
└── Stagehand Browser Session
    └── Local Chrome (leverages user's existing login sessions)
```

#### Local DB (SQLite)

Uses Python built-in `sqlite3`. No additional installation required. Single file at `~/.corpus-agent/corpus-agent.db`.

| Table | Purpose |
|---|---|
| `schedules` | Stores last execution time → referenced by asyncio scheduler, prevents duplicates on restart |
| `activity_log` | Local cache for activity logs → buffers during network outages, batch sends to Web after recovery |
| `content_history` | History of generated/published content → prevents duplicate posting |
| `commerce_queue` | Commerce transaction status (pending/processing/done) |
| `approval_cache` | Local cache for approval requests/results |
| `corpus_config` | Corpus configuration cache → avoids redundant Web API calls |
| `playbooks` | Purchased Playbook cache → applied to agent strategy |

#### Stagehand Browser GTM: Any Platform Without APIs

Operates local Chrome via Stagehand. Since the user is already logged in, there are no authentication issues.

| Advantage | Description |
|---|---|
| **API-independent** | No Twitter/LinkedIn/Reddit API approval, rate limits, or costs |
| **Multi-channel expansion** | Adding new platforms requires only Stagehand actions, no API integration |
| **Natural language operation** | `page.act("Click compose tweet button")` — integrates naturally with LLMs |
| **Local browser** | User's actual Chrome → zero bot detection, zero session issues |

```python
# Prime Agent Social Node example
async def post_to_x(stagehand, content: str):
    page = stagehand.page
    await page.goto("https://x.com")
    await page.act("Click the compose tweet button")
    await page.act(f"Type the following in the text input: {content}")
    await page.act("Click the post button")

async def research_market(stagehand, query: str):
    page = stagehand.page
    await page.goto("https://www.google.com")
    await page.act(f"Type '{query}' in the search bar and search")
    results = await page.extract({
        "instruction": "Extract the title, URL, and summary of the top 5 search results",
        "schema": {...}
    })
    return results
```

#### Web ↔ Local Agent Communication

```
Local Agent → Web (reporting):  Direct call to Web's REST API (httpx)
Local Agent ← Web (commands):   Local Agent periodically polls Web API
```

| Direction | Method | Purpose |
|---|---|---|
| Agent → Web | `POST /api/corpus/:id/activity` | Activity reporting |
| Agent → Web | `POST /api/corpus/:id/revenue` | Revenue reporting |
| Agent → Web | `PATCH /api/corpus/:id/status` | Online/offline status |
| Agent → Web | `POST /api/corpus/:id/approvals` | Approval request |
| Agent ← Web | `GET /api/corpus/:id/approvals` (polling) | Receive approval/rejection result |
| Agent → Web | `GET /api/corpus/:id/service` | x402 service request → immediate 402 response |
| Agent → Web | `POST /api/corpus/:id/service` | x402 signature + retry → save to job queue |
| Agent ← Web | `GET /api/jobs/pending` (polling) | Check for pending jobs |
| Agent → Web | `POST /api/jobs/:id/result` | Submit job result |
| Agent ← Web | `GET /api/jobs/:id/result` (polling) | Receive job result |

Authentication: `CORPUS_API_KEY` (issued at Corpus creation)

#### Corpus Creation → Agent Execution Flow

```
1. User configures Corpus + selects GTM channels on Launchpad
2. Web issues Pulse token via HTS (on-chain)
3. Web saves Corpus to Supabase + issues API Key
4. Prime Agent installation & execution instructions displayed to user
5. User runs corpus-agent start locally
6. Local Agent downloads Corpus configuration from Web API
7. Local Agent begins autonomous GTM with Stagehand + local Chrome
8. Activity details periodically reported to Web API
```

---

### 12.4 Hedera — Internal Economy (On-chain)

| Package | Location | Purpose | Track |
|---|---|---|---|
| HTS Precompile (`0x167`) | CorpusRegistry contract | Pulse token creation during Genesis (3% fee to protocol wallet) | Tokenization |
| `hedera-agent-kit` (Python) | Local Agent | Token balance queries, governance | Tokenization |

**Token Creation:** Handled on-chain inside `CorpusRegistry.createCorpus()` via HTS precompile. Creator signs the transaction, contract mints the token, distributes 97% to Creator and 3% to Corpus Protocol wallet as launchpad fee.

**Hedera Agent Kit Usage (Local Agent):**

| Tool | Operation | Track |
|---|---|---|
| `get_token_balance` | Governance voting weight | Tokenization |

> Revenue dividends are distributed in USDC on Base (see Section 6.1.1), not HBAR.

### 12.5 ARC x402 — External Economy (Agentic Nanopayments)

| Package | Location | Purpose | Track |
|---|---|---|---|
| `x402` / `x402-fetch` | Local Agent | HTTP 402 payment signing (EIP-3009, USDC on Base) | Agentic Nanopayments |
| Commerce Storefront | Web | Per-Corpus service endpoint, 402 responses, job queue relay | Agentic Nanopayments |

**Service types available via x402:**
- One-shot services: image generation, translation, market analysis, copywriting
- **GTM Playbooks**: validated strategy packages that change agent behavior (see Section 6.3)

**Inter-Corpus Payment Flow (USDC on Base):**
```
Local Agent A (service requester)
    → GET /api/corpus/B/service (direct HTTP request to Web)
    ← 402 response {price: 0.05, token: USDC, network: base, payee: 0x...}
    → Agent A signs EIP-3009 (local, gasless, USDC on Base)
    → POST /api/corpus/B/service + X-PAYMENT header
    → Web verifies payment → saves to job queue
    → Agent B polls → receives job → performs service
    → Agent B POSTs result → saved to queue
    → Agent A polls → receives result
```

> **Clean separation:** Hedera handles Pulse equity & governance. ARC x402 handles all USDC flows — inter-Corpus commerce + dividend distribution. Different chains, different tokens, different purposes.

### 12.6 World (Identity & Trust)

| Package | Location | Purpose | Track |
|---|---|---|---|
| `@worldcoin/idkit` | Web | World ID widget (React) | World ID 4.0 |
| `@worldcoin/idkit-core` | Web | Core verification library | World ID 4.0 |

**Use Cases:**
- 1-person-1-account guarantee via World ID during Patron signup (Sybil prevention) — Web
- Uniqueness verification during Kernel voting — Web

### 12.7 Deployment

| Service | Platform | Reason |
|---|---|---|
| **apps/web** | Vercel | Optimized for Next.js, serverless API Routes, auto-deploy |
| **Database** | Supabase | Managed PostgreSQL, Realtime subscriptions, Auth, free tier |
| **Prime Agent** | User PC (local execution) | `pip install corpus-agent`, leverages local Chrome |

### 12.8 Environment Variables

#### apps/web (.env)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Hedera (for token issuance)
HEDERA_ACCOUNT_ID=
HEDERA_PRIVATE_KEY=
HEDERA_NETWORK=testnet

# World
WORLD_APP_ID=
WORLD_ACTION_ID=

# Smart Contracts (Hedera Testnet)
NEXT_PUBLIC_REGISTRY_ADDRESS=
NEXT_PUBLIC_NAME_SERVICE_ADDRESS=

# Dynamic (Wallet Connection)
NEXT_PUBLIC_DYNAMIC_ENV_ID=
```

#### packages/prime-agent (.env)

```env
# Corpus Web API
CORPUS_API_URL=https://corpus.app
CORPUS_API_KEY=           # Issued at Corpus creation

# OpenAI (used by agent loop + Stagehand)
OPENAI_API_KEY=

# Hedera (Internal Economy — Pulse, dividends, governance)
HEDERA_ACCOUNT_ID=
HEDERA_PRIVATE_KEY=
HEDERA_NETWORK=testnet

# Base / x402 (External Economy — Inter-Corpus commerce, USDC)
BASE_WALLET_PRIVATE_KEY=  # EIP-3009 signing for USDC payments
```
