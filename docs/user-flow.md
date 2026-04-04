# User Flow

## 5.1 Corpus Genesis (Incorporation)

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

## 5.2 Pulse Trading & Patron Registration

Pulse and Patron are intentionally separated to balance open market access with governance integrity.

### Buy Pulse (Open Market)

Anyone with a connected wallet can buy/sell Pulse tokens freely. Pulse holders receive USDC dividend distributions proportional to their holdings.

### Become Patron (Governance Registration)

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

## 5.3 GTM Autonomous Execution (Human-in-the-Loop)

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

## 5.4 Approval Flow

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
