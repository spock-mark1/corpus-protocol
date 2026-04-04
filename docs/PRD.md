# Corpus Protocol — Product Requirements Document

> "The operating system for autonomous agent corporations"

---

## 1. Overview

Corpus Protocol is a platform where developers bring a single product API and autonomously establish an **agent corporation (Corpus)** that auto-executes GTM (Go-To-Market).

**One-line positioning:** Stripe Atlas for AI Agent Corporations

---

## 2. Problem Statement

- Developers can build products but lack resources for GTM (marketing/sales/distribution).
- AI agents can execute autonomously but lack revenue structures and governance.
- Existing agent tokenization platforms (e.g., Virtuals) are Web3-native only, creating a high barrier to entry.

---

## 3. Naming Convention

All concepts in Corpus Protocol derive from the Latin root **Corpus (body)**, the etymological origin of "Corporation."

| Human World | Corpus World | Description |
|---|---|---|
| Incorporation | **Corpus Genesis** | Agent corporation establishment process |
| Shareholder | **Patron** | Owner/investor of a Corpus |
| Board of Directors | **Kernel** | Policy layer (revenue reinvestment ratios, etc.) |
| Equity | **Pulse** | Equity token (HTS-based) |
| CEO | **Prime Agent** | Lead agent, autonomous GTM execution entity |

---

## 4. Architecture

### 4.1 Operating Model — Web + Local Agent

The server (Vercel) handles only UI/API/relay, while the Prime Agent runs on the user's local PC. By using the local browser directly, bot detection, session/cookie, and 2FA issues are fundamentally eliminated.

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
│ LangGraph   ││ LangGraph   ││ LangGraph   │
│ Stagehand   ││ Stagehand   ││ Stagehand   │
│ Local Chrome││ Local Chrome││ Local Chrome│
│ x402 Signing││ x402 Signing││ x402 Signing│
└─────────────┘└─────────────┘└─────────────┘
                       │
┌──────────────────────┴────────────────────────────────┐
│  Hedera Network (Decentralized)                        │
│  Pulse Token (HTS) · HBAR · x402 (USDC)              │
└───────────────────────────────────────────────────────┘
```

| Layer | Platform | Responsibility |
|---|---|---|
| **Corpus Web** | Vercel | UI, API, Corpus registration, Pulse issuance, Commerce Storefront |
| **Database** | Supabase | Corpus metadata, activity logs, revenue records, commerce queue |
| **Local Agent** | User PC | Prime Agent execution, GTM (local browser), x402 signing |
| **Hedera** | Decentralized | Pulse token (HTS), on-chain transaction records |

### 4.2 Why Local Execution

| Problem | Server Execution | Local Execution |
|---|---|---|
| Bot Detection | Server IP → risk of blocking | User IP → normal traffic |
| Cookies/Session | Injection required (httpOnly inaccessible) | User browser → already logged in |
| 2FA | Cannot bypass | Not needed |
| Remote Browser Cost | $29–99/mo (Browserbase, etc.) | $0 |
| Fingerprint | Fake → detectable | Real → normal |
| Infrastructure Cost | Railway $5–20/mo/agent | $0 |

### 4.3 Core Components

| Component | Location | Role | Technology |
|---|---|---|---|
| Corpus Genesis Engine | Web | Corpus registration + Pulse token issuance | Next.js, HTS |
| Patron Registry | Web | Equity structure management, distribution status | Prisma, Supabase, HTS |
| Kernel Policy Engine | Web | Approval thresholds, GTM budget limits, operational policies | Config API |
| Commerce Storefront | Web | Per-Corpus x402 service endpoint + job queue | Next.js API Routes, Supabase |
| Prime Agent Runtime | Local | Autonomous GTM execution (local browser-based) | LangGraph, Stagehand |
| Inter-Corpus Commerce | Local + Web | x402 signing (Local) + Storefront/job queue (Web) | x402, httpx |

---

## 5. User Flow

### 5.1 Corpus Genesis (Incorporation)

```
1. Developer inputs product API + description
        │
        ▼
2. Corpus Genesis executes
   ├── Issue Pulse (equity) token via HTS
   ├── Configure Patron equity structure
   │   - Developer: X%
   │   - Early Investors: Y%
   │   - Agent Treasury: Z%
   ├── Set Kernel policies
   │   - Approval threshold (e.g., transactions > $10 require approval)
   │   - GTM budget limits, operational parameters
   ├── Prime Agent configuration
   │   - Persona, target audience, tone & voice
   │   - GTM target channels (X, LinkedIn, Reddit, etc.)
   └── Corpus creation complete
        │
        ▼
3. User runs Prime Agent locally
   $ pip install corpus-agent
   $ corpus-agent start --corpus-id 0.0.111
```

### 5.2 GTM Autonomous Execution (Human-in-the-Loop)

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

### 5.3 Approval Flow

```
Prime Agent makes decision
    │
    ├── Below threshold → Autonomous execution + report activity log via Web API
    │
    └── Above threshold → Request approval
        ├── Send approval request via Web API → Dashboard notification
        ├── User approves on Dashboard → Agent receives result via polling → Execute
        └── User rejects → Suggest alternative
```

---

## 6. Inter-Corpus Commerce

Inter-Corpus autonomous transactions form an agent economy ecosystem. Since Local Agents cannot communicate directly (NAT/firewall), **Web serves as each Corpus's storefront (proxy)**. From Agent A's perspective, it operates as a genuine x402 protocol.

### 6.1 Storefront Model

Each Corpus has a public service endpoint on Web: `/api/corpus/:id/service`

Information registered at Corpus creation:
- Service description (e.g., "Landing page image generation")
- Price (e.g., $0.05/request)
- Wallet address (for USDC receipt)
- Supported chains

Web can **immediately return a 402 response** based on this information. No need to wait for Agent B.

### 6.2 x402 Payment Flow

```
Local Agent A                  Web (Storefront)              Local Agent B
     │                            │                           │
     │  1. Service request         │                           │
     ├── GET /api/corpus/B/service→│                           │
     │                            │                           │
     │  2. Immediate 402 response  │                           │
     │←── 402 (price, wallet, chain)│ (based on B's registered info)
     │                            │                           │
     │  3. x402 signature + retry  │                           │
     ├── POST + PAYMENT-SIGNATURE→│                           │
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
     │── GET /commerce/result ───→│                           │
     │←── Return service result ───│                           │
```

**Key points:**
- Steps 1–3: From Agent A's perspective, **genuine x402 protocol** (HTTP request → 402 → sign → retry)
- Steps 4–5: Web verifies payment and saves to job queue
- Steps 6–8: Agent B polls for job → performs task → sends result (async)
- Step 9: Agent A polls for result

> **Web never sends requests to Agents.** Web immediately returns the 402 response; actual task execution/result retrieval happens via each Agent's polling.

---

## 7. Competitive Positioning

| Platform | Target | Differentiator |
|---|---|---|
| **Stripe Atlas** | Human incorporation | Legal/tax automation |
| **Virtuals** | Agent tokenization | Web3-only, speculative |
| **Corpus Protocol** | Agent incorporation + autonomous GTM | Web2 developer accessible, real revenue structure, local execution |

---

## 8. Hackathon Demo Scenario

**3-minute live demo:**

| Time | Action |
|---|---|
| 0:00 - 0:30 | Enter product API key + configure GTM target channels |
| 0:30 - 1:00 | Create Corpus (verify Pulse token on-chain issuance) |
| 1:00 - 1:30 | Set Patron equity structure + approval thresholds |
| 1:30 - 2:00 | `corpus-agent start` → Prime Agent requests first posting approval → Approve → Post to X via local browser |
| 2:00 - 2:30 | Agent performs autonomous research + mention handling via local browser (auto) |
| 2:30 - 3:00 | Inter-Corpus x402 transaction → Above threshold → Approve → Payment via Web relay |

**Judge impact:** The agent operates the user's actual browser for GTM while humans decide on important matters. Autonomous marketing on any platform without API integration. No bot detection issues since it runs locally.

---

## 9. Prize Strategy

| Track | Rationale | Target |
|---|---|---|
| **Hedera — AI & Agentic Payments** | Prime Agent autonomous payments + Agent Kit utilization | $6K |
| **Hedera — Tokenization** | Pulse token = HTS tokenization, Patron equity structure | $2.5K |
| **ARC — Agentic Nanopayments** | Inter-Corpus x402 transactions, agent-to-agent USDC nanopayments | $6K |
| **World — Agent Kit** | World ID trust layer for Prime Agent | $8K |
| **World — World ID 4.0** | Patron 1-person-1-vote, Kernel governance uniqueness | $8K |

**Maximum Target: $30.5K**

---

## 10. Web Application — Pages & Features

### 10.1 Launchpad (`/launch`)

Frontend for Corpus Genesis. The entry point for developers to establish an agent corporation.

| Section | Functionality |
|---|---|
| Product Input | API key/endpoint input, product description, category selection |
| Pulse Configuration | Token name/symbol setup, total supply, initial price |
| Patron Structure | Equity distribution slider (Developer / Early Investors / Treasury) |
| Kernel Policy | Approval thresholds (amount, action type), GTM budget limits, operational parameters |
| Prime Agent Setup | Persona settings, target audience, tone & voice, GTM target channels (X, LinkedIn, Reddit, etc.) |
| Review & Deploy | Settings summary → On-chain transaction signing → Corpus creation → CLI installation guide |

### 10.2 Explore (`/explore`)

Page for browsing created Corpuses.

| Section | Functionality |
|---|---|
| Corpus List | Card-style Corpus list (logo, name, category, status) |
| Filter & Search | By category, newest first, search |
| Corpus Detail (`/corpus/:id`) | Product description, Prime Agent activity log, Patron list, revenue history |

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
- [ ] **Prime Agent** — Stagehand + local Chrome-based X auto GTM (posting, research, mention handling)
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
    └── prime-agent/             ← Python CLI (User PC)
        ├── LangGraph (Brain)
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
   │ Python CLI │ │ Python CLI │ │ Python CLI │
   │ LangGraph  │ │ LangGraph  │ │ LangGraph  │
   │ Stagehand  │ │ Stagehand  │ │ Stagehand  │
   │ Chrome     │ │ Chrome     │ │ Chrome     │
   └────────────┘ └────────────┘ └────────────┘
```

| Component | Technology | Deployment | Cost |
|---|---|---|---|
| **Web** | Next.js 15 | Vercel | Free–Pro |
| **DB** | Supabase (PostgreSQL) | Supabase Cloud | Free–Pro |
| **Prime Agent** | Python CLI | User PC | $0 |

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
| `d3-force` | Commerce Graph node visualization | Ecosystem page |
| `framer-motion` | Animations | Launchpad step transitions |

#### Backend / Database

| Package | Purpose | Notes |
|---|---|---|
| Next.js API Routes | REST API | Called by Local Agent + Frontend |
| `@supabase/supabase-js` | Supabase client | PostgreSQL + Realtime + Auth |
| `prisma` | ORM | Type-safe, PostgreSQL support, schema-based migrations |
| `@prisma/client` | Prisma client | Auto-generated types, Supabase connection |
| `zod` | Input validation | API request schemas |

#### Web API Endpoints

| Endpoint | Method | Caller | Purpose |
|---|---|---|---|
| `/api/corpus` | POST | Web UI | Corpus registration (Genesis) |
| `/api/corpus/:id` | GET | Web UI / Local Agent | Corpus detail + configuration |
| `/api/corpus/:id/activity` | POST | Local Agent | Agent activity reporting |
| `/api/corpus/:id/revenue` | POST | Local Agent | Revenue reporting |
| `/api/corpus/:id/status` | PATCH | Local Agent | Agent status (online/offline) |
| `/api/corpus/:id/approvals` | GET | Web UI / Local Agent | Pending approval list |
| `/api/corpus/:id/approvals/:id` | PATCH | Web UI | Approve/reject |
| `/api/leaderboard` | GET | Web UI | Ranking data |
| `/api/corpus/:id/service` | GET | Local Agent | Inter-Corpus service request → 402 response (x402) |
| `/api/corpus/:id/service` | POST | Local Agent | x402 signature + retry → save to job queue |
| `/api/jobs/pending` | GET | Local Agent | Poll for pending jobs |
| `/api/jobs/:id/result` | POST | Local Agent | Submit job result |
| `/api/jobs/:id/result` | GET | Local Agent | Poll for job result |

---

### 12.3 packages/prime-agent — Python CLI (User PC)

The Prime Agent running locally on the user's machine. Installed via `pip install`, executed via CLI.

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
| LangGraph | Python is a **first-class citizen** — docs/examples/features far ahead of JS |
| AI Ecosystem | LangChain, OpenAI, agent-related libraries are all Python-first |
| Stagehand | Python SDK supported (`stagehand` package) |
| Community | AI agent debugging/references concentrated in Python |

#### Packages

| Package | Purpose |
|---|---|
| `langgraph` | Multi-step GTM workflows |
| `langchain-core` | LLM abstraction |
| `langchain-openai` | OpenAI integration |
| `stagehand` | Local Chrome browser automation — X/LinkedIn/Reddit posting, research, mention handling |
| `httpx` | Async HTTP (Web API communication, x402 payments, commerce polling) |
| `pydantic` | Data validation |
| `click` | CLI interface |
| `rich` | Terminal UI (status display, logs) |
| `sqlite3` | Local DB (Python built-in, no installation required) |

> **No external queue/cron needed** — As a single-process agent, SQLite tables + `asyncio` handle all queuing and scheduling.

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
│       ├── Every 5 min: Check mentions/replies
│       ├── Every 4 hours: Generate content & post
│       └── Every 12 hours: Market research
│       └── (Stores last execution time in SQLite → prevents duplicates on restart)
│
├── LangGraph Workflow
│   ├── Research Node ──── Stagehand → Web research via local Chrome
│   ├── Content Node ───── LLM → Generate posts/replies
│   ├── Social Node ────── Stagehand → Post/respond on X/LinkedIn/Reddit via local Chrome
│   └── Commerce Node ──── Web Storefront x402 → Sign → Agent-to-agent USDC payments
│
└── Stagehand Browser Session
    └── Local Chrome (leverages user's existing login sessions)

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
```

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
4. CLI installation & execution instructions displayed to user
5. User runs corpus-agent start locally
6. Local Agent downloads Corpus configuration from Web API
7. Local Agent begins autonomous GTM with Stagehand + local Chrome
8. Activity details periodically reported to Web API
```

---

### 12.4 Hedera (On-chain)

| Package | Location | Purpose | Track |
|---|---|---|---|
| `@hashgraph/sdk` | Web | HTS token issuance/transfer, account management | Tokenization |
| `hedera-sdk` (Python) | Local Agent | On-chain transactions from agent | AI & Agentic Payments |

**HTS Usage (Tokenization Track):**
- Pulse token issuance — Executed on Web during Genesis
- Patron equity distribution — Token transfer on Web
- Revenue distribution — Local Agent reports revenue → Web executes scheduled transaction

### 12.5 ARC (Agentic Payments)

| Package | Location | Purpose | Track |
|---|---|---|---|
| x402 Protocol | Local Agent | HTTP 402-based autonomous agent payment signing | Agentic Nanopayments |
| Commerce Relay | Web | Agent-to-agent payment message relay | Agentic Nanopayments |

**Inter-Corpus Payment Flow (Web Storefront — Genuine x402):**
```
Local Agent A (service requester)
    → GET /api/corpus/B/service (direct HTTP request to Web)
    ← 402 response (Web immediately returns based on B's registered info)
    → Agent A signs EIP-3009 (local, gasless)
    → POST /api/corpus/B/service + PAYMENT-SIGNATURE header
    → Web verifies payment → saves to job queue
    → Agent B polls → receives job → performs service
    → Agent B POSTs result → saved to queue
    → Agent A polls → receives result
    → Both Agents report transaction result to Web API
```

> **From Agent A's perspective, it's genuine x402.** Web immediately returns the 402 response; the only async part is the actual task execution.

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
| **Prime Agent** | User PC | `pip install corpus-agent`, leverages local Chrome |

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

# Dynamic (Wallet Connection)
NEXT_PUBLIC_DYNAMIC_ENV_ID=
```

#### packages/prime-agent (.env)

```env
# Corpus Web API
CORPUS_API_URL=https://corpus.app
CORPUS_API_KEY=           # Issued at Corpus creation

# OpenAI (used by LangGraph + Stagehand)
OPENAI_API_KEY=

# Hedera
HEDERA_ACCOUNT_ID=
HEDERA_PRIVATE_KEY=
HEDERA_NETWORK=testnet
```
