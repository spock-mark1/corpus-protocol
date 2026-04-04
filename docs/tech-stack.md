# Tech Stack

## 12.1 Overview

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

## 12.2 apps/web — Corpus Web (Vercel)

Dashboard, Launchpad, Explore, Leaderboard. Frontend + REST API + Commerce Storefront.

### Frontend

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

### Backend / Database

| Package | Purpose | Notes |
|---|---|---|
| Next.js API Routes | REST API | Called by Local Agent + Frontend |
| `drizzle-orm` + `pg` | ORM + PostgreSQL driver | Type-safe queries, direct connection to Supabase PostgreSQL |
| `drizzle-kit` | Migration tool | Schema push, migration generation |
| `zod` | Input validation | API request schemas |

### Web API Endpoints

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

## 12.3 packages/prime-agent — Prime Agent (User PC)

The Prime Agent running locally on the user's machine. Installed via `pip install`, executed locally.

### Why Local Execution

| Advantage | Description |
|---|---|
| **Zero bot detection** | User IP + real browser → normal traffic |
| **Zero session issues** | Already logged into local Chrome → no cookie injection needed |
| **Zero 2FA issues** | User has already authenticated |
| **Zero infrastructure cost** | No browser running on server |
| **Instant multi-channel expansion** | Immediate access to all platforms where user is logged in |

### Why Python

| Criteria | Reason for Python |
|---|---|
| Hedera Agent Kit | Python SDK (`hedera-agent-kit`) provides 40+ tools as first-class citizen |
| AI Ecosystem | OpenAI, agent-related libraries are Python-first |
| Stagehand | Python SDK supported (`stagehand` package) |
| Community | AI agent debugging/references concentrated in Python |

### Architecture: Tool-Calling Agent Loop (No LangChain)

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

### Tool Categories

| Category | Tools | SDK |
|---|---|---|
| **Browser (GTM)** | `search_web`, `post_to_x`, `check_x_mentions`, `reply_on_x`, `browse_page` | Stagehand |
| **Hedera (Internal Economy)** | `create_token`, `airdrop_token`, `get_token_balance` | Hedera Agent Kit |
| **Commerce (External Economy)** | `discover_services`, `purchase_service`, `sign_x402_payment` | x402 + httpx |
| **Web API (Reporting)** | `report_activity`, `request_approval`, `check_approval` | httpx |
| **Internal** | `get_content_history`, `get_schedule_status`, `save_research_notes` | SQLite |

### Packages

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

### Installation & Execution

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

### Process Architecture

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

### Local DB (SQLite)

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

### Stagehand Browser GTM: Any Platform Without APIs

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

### Web ↔ Local Agent Communication

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

### Corpus Creation → Agent Execution Flow

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

## 12.4 Hedera — Internal Economy (On-chain)

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

## 12.5 ARC x402 — External Economy (Agentic Nanopayments)

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

## 12.6 World (Identity & Trust)

| Package | Location | Purpose | Track |
|---|---|---|---|
| `@worldcoin/idkit` | Web | World ID widget (React) | World ID 4.0 |
| `@worldcoin/idkit-core` | Web | Core verification library | World ID 4.0 |

**Use Cases:**
- 1-person-1-account guarantee via World ID during Patron signup (Sybil prevention) — Web
- Uniqueness verification during Kernel voting — Web

## 12.7 Deployment

| Service | Platform | Reason |
|---|---|---|
| **apps/web** | Vercel | Optimized for Next.js, serverless API Routes, auto-deploy |
| **Database** | Supabase | Managed PostgreSQL, Realtime subscriptions, Auth, free tier |
| **Prime Agent** | User PC (local execution) | `pip install corpus-agent`, leverages local Chrome |

## 12.8 Environment Variables

### apps/web (.env)

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

### packages/prime-agent (.env)

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
