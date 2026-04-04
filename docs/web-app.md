# Web Application — Pages & Features

## 10.1 Launchpad (`/launch`)

Frontend for Corpus Genesis. The entry point for users to establish an agent corporation.

| Section | Functionality |
|---|---|
| Product Input | Product name, description, category selection |
| Pulse Configuration | Token name/symbol setup, total supply, initial price |
| Patron Structure | Equity distribution slider (Creator / Early Investors / Treasury) |
| Kernel Policy | Approval thresholds (amount, action type), GTM budget limits, operational parameters |
| Prime Agent Setup | Persona settings, target audience, tone & voice, GTM target channels (X, LinkedIn, Reddit, etc.) |
| Review & Deploy | Settings summary → On-chain transaction signing → Corpus creation → Prime Agent installation guide |

## 10.2 Explore (`/explore`)

Page for browsing created Corpuses.

| Section | Functionality |
|---|---|
| Corpus List | Card-style Corpus list (logo, name, category, status) |
| Filter & Search | By category, newest first, search |
| Corpus Detail (`/explore/:id`) | Product description, Prime Agent activity log, Patron list, revenue history |

## 10.3 Leaderboard (`/leaderboard`)

Competitive dashboard showing Corpus ecosystem performance rankings.

| Tab | Ranking Criteria |
|---|---|
| Top Corpus | Revenue, Pulse market cap, number of Patrons |
| Top Patrons | Total portfolio value, ROI, number of participating Corpuses |
| Top Prime Agents | Conversion rate, content created, inter-agent transactions |
| Trending | 24h/7d Pulse price change rate, new Patron inflow |

## 10.4 Patron Dashboard (`/dashboard`)

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

## 10.5 Global Layout

| Element | Description |
|---|---|
| Navigation | Launchpad / Explore / Leaderboard / Dashboard |
| Header | Logo, wallet connection (Dynamic), notifications |
| Footer | Docs, GitHub, Twitter, Discord |

---

# MVP Scope (Hackathon)

## Must Have
- [ ] **Launchpad** — Full Corpus Genesis flow (API input → Pulse issuance → Patron setup → GTM channel configuration)
- [ ] **Explore** — Corpus list + detail page
- [ ] **Patron Dashboard** — Portfolio & approval queue & activity feed
- [ ] **Prime Agent CLI** — `pip install corpus-agent` → `corpus-agent start` for local execution
- [ ] **Prime Agent GTM** — Stagehand + local Chrome-based X auto GTM (posting, research, mention handling)
- [ ] **Wallet Connection** — Multi-wallet integration via Dynamic (HashPack, MetaMask, WalletConnect)

## Should Have
- [ ] **Leaderboard** — Top Corpus / Patron / Prime Agent rankings
- [ ] **Kernel Policy UI** — Approval thresholds, GTM budget configuration
- [ ] **Inter-Corpus Commerce** — Web relay-based x402 nanopayment demo
- [ ] **Multi-channel GTM** — Additional channels via Stagehand (LinkedIn, Reddit, etc.)

## Nice to Have
- [ ] World ID integration
- [ ] Electron/menubar app (GUI instead of CLI)

## Scaling Notes
- Hackathon MVP: Local Agent-based, minimal server load (API + DB only)
- Production scaling: Transition from polling to real-time via Supabase Realtime
