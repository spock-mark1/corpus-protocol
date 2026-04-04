# TODOS

## Post-Hackathon

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
