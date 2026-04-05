# TODOS

## Post-Hackathon — From Eng Review (2026-04-05)

### API Rate Limiting
- **What:** Add IP-based rate limiting to all 35 API routes
- **Why:** Zero rate limiting today. Unauthenticated endpoints (/api/corpus, /api/services, /api/activity) are vulnerable to enumeration, brute force, and DoS
- **Effort:** M (human) → S (CC+gstack) | **Priority:** P1
- **Depends on:** Auth middleware (shipping in current review)

### Broadcast + Fulfillment Atomicity
- **What:** Implement saga/compensation pattern for x402 payment flow
- **Why:** If broadcast succeeds but fulfillment throws, buyer paid but gets nothing. If fulfillment succeeds but broadcast reverts, seller works for free. No retry queue or compensation.
- **Effort:** L (human) → M (CC+gstack) | **Priority:** P1
- **Depends on:** Mandatory broadcast (shipping in current review)

### ensureFunded Vercel Timeout
- **What:** Move Circle wallet funding check to async/background or pre-fund wallets
- **Why:** ensureFunded polls for 15 seconds with 3s sleeps. Vercel default timeout is 10s. Will routinely timeout on first wallet creation.
- **Effort:** M (human) → S (CC+gstack) | **Priority:** P1
- **Depends on:** —

### Agent Approval State Machine
- **What:** Add pending-approval tracking to AgentContext so agents don't re-attempt purchases every 30s while waiting for human decision
- **Why:** When an agent hits approval threshold, it creates a request but next cycle has no memory of it. Agent likely loops forever re-attempting the purchase.
- **Effort:** M (human) → S (CC+gstack) | **Priority:** P2
- **Depends on:** —

### Circle Wallet Cleanup on Partial Failure
- **What:** Add cleanup/rollback when corpus creation fails after Circle wallet is created
- **Why:** If DB insert fails after wallet creation (e.g., unique constraint on agentName), the Circle wallet is orphaned. No cleanup.
- **Effort:** S (human) → S (CC+gstack) | **Priority:** P3
- **Depends on:** —

## Post-Hackathon — Original

### Supabase Realtime Migration
- **What:** Migrate polling-based Agent↔Web communication to Supabase Realtime WebSocket
- **Why:** 10-second polling will strain the connection pool as agent count grows
- **Effort:** M (human) → S (CC+gstack) | **Priority:** P2
- **Depends on:** After hackathon completion

### Multi-Channel GTM Expansion
- **What:** Add support for LinkedIn, Reddit, Product Hunt, and other channels beyond X
- **Why:** Easily extensible — only requires adding Stagehand actions
- **Effort:** M (human) → S (CC+gstack) | **Priority:** P2
- **Depends on:** After X channel stabilization

### Production Security Hardening
- **What:** API key rotation, scope restrictions, rate limiting, audit logging
- **Why:** Hackathon MVP uses a single Bearer token, but production requires robust security
- **Effort:** L (human) → M (CC+gstack) | **Priority:** P2
- **Depends on:** After hackathon completion

### Hedera Agent Kit Direct Integration
Currently prime-agent uses Hedera Agent Kit indirectly (Web API proxy + Mirror Node). Extend to directly connect the Agent Kit SDK and leverage its 43 on-chain tools.

#### Phase 1: Immediate wins (strengthen current GTM mission)
- **Effort:** S | **Priority:** P1
- **Depends on:** —
- [ ] Add `hedera_account_id`, `hedera_private_key` to `config.py`
- [ ] Replace Web API proxy in `payments/hedera_kit.py` with direct Agent Kit SDK calls
- [ ] Add new tools to `tools/hedera.py`:
  - `create_topic` + `submit_topic_message` — HCS audit log (record all agent activity on-chain)
  - `get_token_info` — query Pulse token state for informed decision-making
  - `associate_token` — auto-associate token to account before new Patrons receive Pulse
  - `get_exchange_rate` — HBAR→USD conversion for accurate dividend calculations
- [ ] Update Decision Framework in `agent/prompt.py` with HCS logging + exchange rate steps
- [ ] Add `hedera-agent-kit` dependency to `pyproject.toml`

#### Phase 2: DeFi plugins (autonomous treasury management)
- **Effort:** M | **Priority:** P2
- **Depends on:** Phase 1 complete
- [ ] SaucerSwap plugin — `swap_tokens`, `add_liquidity`, `remove_liquidity`
- [ ] Bonzo Finance plugin — `deposit`, `withdraw` (yield on idle assets)
- [ ] Pyth Network plugin — real-time price feeds for autonomous swap timing
- [ ] Add treasury management logic to Decision Framework:
  - Idle HBAR > $50 → check Pyth price → SaucerSwap swap
  - Idle USDC > $100 → Bonzo deposit for yield

#### Phase 3: NFT + advanced governance
- **Effort:** M | **Priority:** P3
- **Depends on:** Phase 2 complete
- [ ] `create_non_fungible_token` + `mint_non_fungible_token` — mint top-performing GTM content as NFTs
- [ ] `airdrop_fungible_token` — bulk automated Patron reward distribution
- [ ] `sign_schedule_transaction` — multi-sig governance voting
- [ ] Implement AUTONOMOUS vs RETURN_BYTES hybrid mode (threshold-based automatic switching)
