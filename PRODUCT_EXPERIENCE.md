# ZengTrade — E2E Product Experience Spec

Owner: Sumit · Last updated: 2026-06-11 · Scope: India market (GCC deferred)

This is the single source of truth for the end-to-end user experience:
personas, journeys, scenario coverage, gap audit against the current code,
and the prioritized roadmap — written from the combined CPO / CTO / CUXO /
COO / CMO lens.

---

## 1. Positioning (CMO)

**One-liner:** The professional-grade trading terminal for Indian F&O traders —
your Zerodha account, supercharged.

**What we are NOT:** a broker, a tips service, or a robo-advisor. We never
hold funds or custody. Users connect their own broker account via official
APIs (Kite Connect). This is the core trust message and must appear on every
surface where we ask for credentials.

**Audience priority (India):**
1. **Active options traders** (weekly NIFTY/BANKNIFTY expiry traders) — need
   option chain + Greeks + payoff + fast execution. Largest paying segment.
2. **Discretionary intraday traders** — need charts, watchlist, one-tap orders,
   risk guardrails.
3. **Aspiring algo traders** — need rule builder + backtest without code.
   (Note: SEBI retail-algo rules require broker/exchange registration of
   strategies — position as "assisted automation" until compliance work done.)

**Competitive frame:** Sensibull (options analytics) + Streak (no-code algo) +
TradingView (charts) — one terminal, one subscription, BYO broker.

---

## 2. Personas

| Persona | Profile | Primary jobs-to-be-done | Success moment |
|---|---|---|---|
| **Expiry-day Esha** | 28, trades NIFTY weeklies, ₹3-5L capital, uses Sensibull free + Kite | See OI/PCR/max-pain at a glance; build a spread; know max loss before entry | Places a 2-leg spread from the payoff screen in <60s |
| **Scalper Sandeep** | 35, intraday equity + futures, multi-monitor | Sub-second quotes, hotkey orders, panic flatten | Flattens all positions with one key during a spike |
| **Builder Bharat** | 31, engineer, wants algo without infra | IF/THEN rules on indicators; paper-test first | First rule fires correctly in paper mode |

---

## 3. Pre-login journey (CMO + CUXO)

**Funnel: Visitor → Trust → Terminal → Connected broker**

| Stage | User question | Surface | Status |
|---|---|---|---|
| Land | "What is this?" | Hero: plain-language value prop | ✅ rebuilt (v2) |
| Believe | "Is this real / safe?" | How-it-works + Security section + Kite Connect partner badge | ✅ rebuilt (v2) |
| Evaluate | "Does it have what I need?" | Feature story mapped to real modules (chain, Greeks, payoff, risk, algo) | ✅ rebuilt (v2) |
| Object-handle | "What does it cost? Do I need an API key?" | FAQ (incl. Kite Connect ₹500/mo, what we store) | ✅ rebuilt (v2) |
| Act | "How do I start?" | Single primary CTA → /terminal; secondary anchors | ✅ rebuilt (v2) |
| Legal | "Who runs this?" | Footer: disclaimer, risk disclosure, contact | ✅ rebuilt (v2) |

**Copy rules:**
- Lead with trader outcomes, never implementation ("see max pain shift live",
  not "WebWorkers offload socket polling").
- Never invent numbers (users, AUM, latency we haven't measured). Claims must
  be feature-true.
- F&O risk disclosure in the footer (SEBI-style): required for credibility and
  compliance posture.

**SEO/Share (CTO+CMO):** real `<title>`/description, OpenGraph + Twitter
cards, JSON-LD SoftwareApplication, canonical URL. Status: ✅ in layout.tsx.

---

## 4. Login & broker-connect journey (CUXO + COO)

Flow (Kite): pick broker → enter API key+secret → `/api/auth/pre-auth`
(httpOnly temp cookie) → Kite OAuth → `/api/auth/callback` → token exchange →
terminal with `auth_success=1`.

**Scenario matrix:**

| # | Scenario | Expected behavior | Status |
|---|---|---|---|
| L1 | Happy path, valid key/secret | Redirect to Kite, back to terminal, session live | ✅ works |
| L2 | Invalid/expired API key | Inline error with cause + "check your app on kite.trade" link | ✅ fixed (was console-only) |
| L3 | Network failure on pre-auth | Inline error + retry | ✅ fixed |
| L4 | User has no API key | "How to get one" guidance incl. ₹500/mo Kite Connect cost + link | ✅ added to wizard |
| L5 | Kite OAuth denied/cancelled | Callback shows friendly error, returns to login | ⚠️ P1 — verify callback error branch |
| L6 | Token expiry mid-session (8h / daily 6am IST cutoff) | Session-expired banner with one-click re-auth, orders blocked safely | ⚠️ P1 — audit `AuthInitializer` |
| L7 | Coming-soon broker selected (Dhan/Fyers) | Clear "not yet", capture interest | ✅ disabled state exists |
| L8 | Multi-device login | Last login wins (Kite invalidates prior token) — warn user | P2 |

---

## 5. Post-login journey: activation → habit (CPO + CUXO)

**Activation definition (north-star): user sees live ticks AND places or
simulates one order in first session.**

| Stage | Moment | Surface | Status |
|---|---|---|---|
| First land | auth_success=1 | Welcome state → preset workspace (NOT blank canvas) | ⚠️ P1 — default to "Options Trader" preset on first login |
| Orient | "what can this do" | EmptyWorkspaceDesk + ⌘K tip + HeaderGuide | ✅ exists, good |
| First data | watchlist/chart ticks | Realtime via relay WS | ⚠️ **blocked: ws.zengtrade.in DNS record missing** |
| First trade | order ticket | Risk-gated order entry | ✅ exists |
| Safety net | "what if it goes wrong" | Panic Flatten + SafetyToggle + max-loss caps | ✅ exists — surface in onboarding |
| Return visit | day 2+ | Layout persisted, last workspace restored | ✅ exists |

**Failure/edge scenarios (COO):**

| # | Scenario | Expected | Status |
|---|---|---|---|
| T1 | Market closed | Banner "Market closed — opens 9:15 IST"; charts show last session; no dead spinners | P1 |
| T2 | WS disconnect | Auto-reconnect with visible status pill (LIVE / RECONNECTING / STALE) | ⚠️ verify relay client behavior |
| T3 | Kite rate-limit (429) | Backoff + cached data + toast, never blank widget | P1 |
| T4 | Order rejected (margin/RMS) | Human-readable rejection reason mapped from broker code | P1 |
| T5 | Risk cap breached | Trading disabled with explicit banner + override policy | ✅ risk engine exists — verify UX |
| T6 | Empty portfolio (new account) | Friendly empty states per widget, not zeros/NaN | P2 |

---

## 6. Trust & operations (COO + CTO)

- **Security page content (pre-login):** keys stored in httpOnly cookies, never
  in localStorage; we never see your password; no fund custody; revoke any time
  at kite.trade. ✅ summarized on landing; dedicated /security page P2.
- **Ops:** uptime monitor on `/` and `/health` (P0 — manual signup pending);
  status page (P2); error tracking (Sentry) P1; analytics funnel (PostHog/GA)
  P1 — measure land→terminal→connect→activate conversion.
- **Compliance posture:** F&O risk disclosure footer (✅); SEBI retail-algo
  registration before marketing auto-trading (P1 gate on Phase-3 features);
  privacy policy + terms pages (P1).

---

## 7. Prioritized roadmap

**P0 (this week)**
1. ws.zengtrade.in DNS record → live ticks (one A record at Hostinger). **Owner: Sumit**
2. Landing v2 + login error surfacing + SEO (✅ shipped in this change)
3. Uptime monitoring on / and /health. **Owner: Sumit (UptimeRobot signup)**

**P1 (next 2 weeks)**
4. First-login default workspace = Options Trader preset (skip blank canvas)
5. Session-expiry re-auth UX (L6) + OAuth-denied branch (L5)
6. Market-closed & WS-status pills (T1/T2); broker rejection mapping (T4)
7. Privacy policy + terms + /security page; Sentry + funnel analytics
8. Mumbai migration per DEPLOY_MUMBAI.md (latency: Stockholm→Mumbai)

**P2 (this month)**
9. Paper-trading mode as default for Builder persona (de-risks algo + SEBI)
10. Multi-device warning (L8), per-widget empty states (T6), status page
11. Pricing model: free terminal + paid analytics tier (Sensibull-style anchor)

---

## 8. KPIs (review weekly)

| Funnel step | Metric | Target |
|---|---|---|
| Land → Terminal click | CTR on primary CTA | >25% |
| Terminal → broker connected | completion of L1 | >40% |
| Connected → activated (tick + order/sim) | activation rate | >60% |
| D7 return | retained connected users | >30% |
| Reliability | uptime on / and /health | 99.9% |
