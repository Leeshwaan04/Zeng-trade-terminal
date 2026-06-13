# ZengTrade — Live E2E QA Report & C-Suite Analysis

Tested: 2026-06-11, production (https://www.zengtrade.in/terminal), headless Chrome,
Mock Trading Mode + Kite flow (up to Zerodha redirect; no real login).
Evidence: /tmp/zeng-qa/screenshots/ (session). Console errors in session: **218**.

## Verdict

The shell is impressive; the spine is broken. A new user who clicks the three most
prominent buttons on first run hits three dead ends. The only working path to a
usable desk is buried (Customize Layout → Create Layout). Mock mode — the natural
demo/growth engine — half-works: spot ticks update, but orders/positions APIs
reject mock sessions in an infinite error loop and the option chain renders empty.

## Findings

### P0 — blocks activation
1. **First-run dead end.** On the empty desk: "Switch AI Profile" → selecting any
   preset (mouse or keyboard) does nothing; "+ WIDGETS" gallery → adding a widget
   does nothing; "Add Widget" → nothing. Root cause hypothesis: `activeWorkspaceId`
   is the `empty-desk` sentinel with no workspace object; preset/addWidget write
   into a workspace that doesn't exist. Only LayoutCustomizer → CREATE LAYOUT
   creates a real workspace (verified working).
2. **Mock-mode API loop.** `/api/orders/list?mock=true` and
   `/api/portfolio/positions?mock=true` return "Session Expired" forever; pollers
   retry with no backoff (218 errors/15 min). Mock endpoints must not require a session.
3. **Intermittent white-screen crash on the login screen** (reproduced once;
   recovered on reload). No error boundary fallback, no telemetry to catch it.

### P1 — core loop broken/degraded
4. **Invalid API key → off-site dead end.** Pre-auth does no validation; user is
   redirected to kite.zerodha.com which returns raw JSON `Invalid api_key` with no
   way back.
5. **"Coming Soon" brokers open working credential forms** (Dhan ACTIVATE) —
   `ready:false` doesn't gate clicks; badges say "LINKABLE" while copy says Coming
   Soon. Security caption is broker-unaware ("You log in on Zerodha's page" under Dhan).
6. **Option chain body empty in mock mode** (header + spot only) → Strategy
   Builder and Payoff unusable downstream (no legs can be added).
7. **Funds & Ledger does nothing.** Order Entry tab exposed no ticket form.
8. **Customize Layout opens after a multi-second delay** with no loading feedback
   (feels broken; caused mis-clicks during testing).

### P2 — polish/truthfulness
9. Mock index strip shows nonsense (VIX 1,001.46, SENSEX 1,000.356, BANK value
   duplicated); status bar says **KITE LIVE** in mock; **MARGIN ₹0** despite the
   promised ₹10L virtual capital; **SYNC INTEGRITY: 20%** is cryptic and alarming.
10. Jargon empty-states ("PORTFOLIO VOID", "INITIALIZE FUSED VIEW", "TACTICAL")
    read cool but erode trust when adjacent to broken controls.

### Working well ✅
Terminal shell + bottom dock render fast; workspace creation via Customize Layout
(good dialog: AI profiles, grid templates, widget assignment); Panic Flatten has a
proper confirmation gate ("CANCEL — KEEP POSITIONS"); safety toggle present; ⌘K
opens; mock spot price ticks (25000.48 → 25002.50 observed); login screen visuals;
the two crash fixes from earlier today are holding.

## C-suite lenses (fix → enhance → level-up)

**CPO** — Activation is the product right now: fix P0-1/2/6 before building
anything new. Make mock mode the flagship demo: full fake chain, ₹10L margin,
placeable orders, P&L. Define activation = "created desk + placed 1 mock order."
Cut Dhan/Fyers cards from UI until real (scope honesty). Then: order ticket E2E,
alerts wiring, GTT manager verification.

**CTO** — Add Sentry (these bugs were invisible); add polling backoff + circuit
breaker; unify a `MockDataProvider` so every API honors mock consistently; error
boundary with reload CTA on login; Playwright smoke in CI (repo has playwright
config with 1 stale test — wire "load terminal → create desk → see chain rows"
as deploy gate); ws.zengtrade.in DNS + Mumbai migration pending; daily Kite token
auto-refresh (TOTP service) for server-side data.

**CUXO** — First 60 seconds must be magical: land in mock mode pre-loaded with a
default desk (skip the empty state entirely for first-timers). Loading skeletons
for the customizer delay. Every silent failure needs a visible toast. Replace
cryptic labels with plain language (or tooltip them). Guided 4-step tour on first
desk. Honest status pill: MOCK / LIVE / DISCONNECTED.

**CBO** — Mock mode = lead magnet: instrument the funnel (land → mock → desk →
mock order → connect-broker intent), add "Connect your broker" upsell at the
moment of mock-order fill. Pricing page + early-access tier. Kite Connect ₹500/mo
friction: offer demo-first journey and document the cost honestly (done on landing).
Social proof: ship a changelog + builder-in-public posts; list on Kite forum/showcase.

**COO** — Uptime monitoring (still not set up — 11-day silent outage already
happened once); legal pages (Privacy, Terms) are missing for a product that
handles broker credentials; support channel beyond mailto; define the daily
6 AM IST token-refresh runbook until automated; analytics (PostHog/GA4) for ops
visibility.

**CXO** — The trust gap is the brand risk: landing promises institutional-grade;
in-app reality is dead buttons and raw JSON dead ends. Truthfulness fixes are
cheap and high-impact (KITE LIVE→MOCK, ₹10L real margin, kill SYNC INTEGRITY %).
Principle: one perfect journey (mock options trade E2E) before ten half-journeys.

## Priority order

| Wave | Items |
|------|-------|
| **Now (this week)** | P0-1 workspace no-ops; P0-2 mock session bug + backoff; P0-3 error boundary + Sentry; P1-4 validate key in-app before redirect; P1-5 truly disable coming-soon brokers + broker-aware copy; P2-9 truthful mock strip/margin/status |
| **Next (2 wks)** | P1-6 mock chain strikes → legs → payoff → mock order E2E; P1-7 Funds & Ledger + order ticket; onboarding tour + default first desk; uptime + analytics; legal pages; ws DNS; token auto-refresh |
| **Later** | Mumbai migration; live-broker E2E smoke with founder's login; marketplace/algo per SEBI; pricing launch |

---

## Round 2 — re-test after fixes (2026-06-12, production)

### Verified fixed ✅
- Preset loading works: Options Trader desk renders (chain + chart + ticket + payoff), workspace tabs appear
- Widget add works on an active workspace (Watchlist added live)
- Mock margin shows ₹10,00,000; status pill shows amber MOCK MODE; VIX 13.8 / SENSEX 82,393 realistic
- Console errors: **218 → 0** in an equivalent session
- Dhan/Fyers properly disabled with COMING SOON badges; click stays on broker select
- No off-site redirect with malformed keys
- Round-1 "intermittent white-screen crash" RETRACTED: reproduced as `about:blank` navigation caused by the
  automation browser (Meta+K browser shortcut), not an app bug

### New findings (round 2)
| # | Sev | Finding |
|---|-----|---------|
| R2-1 | **P0** | **SAFE mode doesn't block orders** — clicked BUY with safety toggle in SAFE ("Orders Blocked") and got ORDER PLACED toast. The safety gate is cosmetic. |
| R2-2 | **P0** | **Mock order is toast-theater** — "ORDER PLACED — BUY 50 qty @ 22450.00" but Orders tab says "No orders found" and no position is created. The aha-journey dead-ends at its final step. |
| R2-3 | P1 | Order defaulted to qty 50 @ ₹22,450 while LTP was ₹24,999 — stale hardcoded ticket defaults. |
| R2-4 | P1 | Option chain body still empty in mock (spot ticks, no strike rows) — blocks legs→payoff→strategy journey. |
| R2-5 | P2 | Funds & Ledger menu item still does nothing (round-1 finding persists). |
| R2-6 | P2 | Mock chart prints a vertical price spike at the right edge (last-candle glitch). |
| R2-7 | P2 | Command-palette/login cards re-render constantly (refs churn ~1/s) — suggests permanent animation loops; minor CPU cost, complicates automation. |

### Next wave (proposed)
1. R2-1: gate order submission on safety state (real check in order path, not just UI)
2. R2-2: mock order lifecycle in useOrderStore (order → fill → position → P&L) so the demo loop completes
3. R2-3: ticket defaults from live LTP; qty default = 1 lot of instrument
4. R2-4: synthesize mock chain strikes around spot (reuse payoff math for plausible premiums)

---

## Round 3 — fixes shipped + live re-verification (2026-06-13, production)

Verified headless Chromium against `https://www.zengtrade.in` at **desktop 1440×900**
and **mobile 390×844**. Evidence: `/tmp/zeng-verify/shots*`. Console errors: **0**.

### All R2 items resolved ✅
| # | Status | What shipped |
|---|--------|--------------|
| R2-1 | ✅ | `placeOrder` throws on SAFE mode → toast reads "🔒 Blocked by Safety Lock" (no more false "Order Placed"). |
| R2-2 | ✅ | Mock order lifecycle: instant fill → position → P&L; `useAccountSync` skips overwriting local orders in mock. |
| R2-3 | ✅ | Order ticket price initialises from live LTP (verified showing 24999.95 vs spot, not the old 22,450). |
| R2-4 | ✅ | **Root cause was the wrong component** — terminal uses `NeuralOptionChain → useLiveOptionChain`, not `OptionChainWidget`. Added mock synthesis there; chain now shows 24 strikes (desktop) / 21 (mobile) with per-second ticks. |
| R2-5 | ✅ | Funds & Ledger drawer built (available capital, margin, P&L cards, per-broker, transaction ledger). Wired from ProfileMenu + header "Unified Funds" pill. |
| R2-6 | ✅ | Chart edge-spike killed: new candles open at prev close; ticks deviating >25% rejected. |
| R2-7 | ✅(non-bug) | "~1/s churn" is CSS keyframe animation, GPU-composited — not a React render loop. No fix needed. |

### Responsiveness (web + mobile) ✅
- **Zero horizontal overflow** on landing / login / mock-terminal at both viewports.
- Mobile nav no longer clips widgets (`pb-16`); footer hidden on mobile (was overflowing & covered).
- Login card scales down (`p-5/p-4`) at 390px — verified not cramped.
- First-run lands on **populated Standard desk** (was empty-desk dead-end).

### Activation + honesty ✅
- Footer truthful in mock: `MOCK MODE`, `FEED: SIMULATED`, `LATENCY: SIM`, `MARGIN ₹10,00,000`.
- Header connection dot shows amber **"Sim"** in mock (was green "Live"); mobile "Sim" badge added.
- Empty desk turned into one-click preset launcher (Standard / Options / Scalper / Multi-Chart).
- Also silenced a `/api/kite/instruments` 400 that logged on every terminal load.

### Still open (need owner access — see INFRA_BLOCKERS.md)
ws.zengtrade.in DNS; EC2 Kite token + Upstash env vars; delete stale Vercel project;
Mumbai migration; daily token auto-refresh (TOTP); uptime monitoring; legal pages.
