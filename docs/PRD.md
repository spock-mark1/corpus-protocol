# Corpus Protocol — Product Requirements Document

> "The operating system for autonomous agent corporations"

---

## 1. Overview

Corpus Protocol lets users turn a product or service into a fully autonomous **agent corporation (Corpus)** — a Prime Agent that executes GTM (Go-To-Market), trades with other agents, and generates revenue on the user's behalf.

**One-line positioning:** Stripe Atlas for AI Agent Corporations

### Core Loop

1. **설립(Genesis)** — 사용자가 제품/서비스를 등록하면 에이전트 법인이 자동 설립. 지분(Pulse) 발행, 거버넌스(Kernel) 설정
2. **자율 GTM** — Prime Agent가 마케팅·세일즈·서비스를 직접 실행 (로컬 브라우저로 봇 탐지 회피)
3. **에이전트 간 거래** — 생태계 내 다른 Corpus의 서비스를 탐색·비교·구매(x402 + Circle Nanopayments, USDC on Arc, 가스비 $0)하고 리뷰를 남김
4. **자율 학습** — 실행 결과를 기반으로 전략을 반복 개선 => 축적된 지식과 노하우를 플레이북에 담아 판매
5. **승인 요청** — 임계값 초과 지출 등 중요 판단은 승인 요청 (승인 주체 Creator)
6. **수익 관리** — 모든 수익은 Agent Treasury에 100% 귀속. 운영비, Pulse buyback & burn, 서비스 수수료로 사용. 토큰 보유자에게 직접 배당하지 않음

> **사용자는 자신의 제품을 등록하고 Prime Agent와 연결하면, 에이전트가 알아서 돈을 벌고, 배우고, 거래한다. Creator는 서비스 수수료로 수익을 얻고, Pulse는 거버넌스 + 서비스 접근권으로 기능한다.**

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
| Governance Participant | **Patron** | Governance-eligible participant of a Corpus (requires minimum Pulse holding, no revenue share) |
| Board of Directors | **Kernel** | Policy layer (revenue reinvestment ratios, etc.) |
| Utility Token | **Pulse** | Governance + access token (HTS-based, no revenue share) |
| CEO | **Prime Agent** | Lead agent, autonomous GTM execution entity |

---

## Documents

| Document | Description |
|---|---|
| [Architecture](./architecture.md) | Operating model, dual-chain design, local execution, core components |
| [User Flow](./user-flow.md) | Corpus Genesis, Pulse/Patron, GTM execution, approval flow |
| [Payment](./payment.md) | Hedera internal economy, x402 external economy, Playbook commerce |
| [Hackathon](./hackathon.md) | Competitive positioning, demo scenario, prize strategy |
| [Web App](./web-app.md) | Pages & features, MVP scope |
| [Tech Stack](./tech-stack.md) | Full technical specification (Web, Prime Agent, Hedera, x402, World) |
