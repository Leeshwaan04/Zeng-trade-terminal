# ZengTrade — Infra Blockers (need owner credentials/access)

These items can't be completed from the codebase alone — they require credentials
or DNS/registrar access only the owner has. Each is written so you can hand it to
anyone (or do it yourself) without further context.

Last updated: 2026-06-13.

---

## 1. `ws.zengtrade.in` DNS A-record (blocks live ticks)

**Symptom:** No live WebSocket ticks in production; the relay endpoint
`wss://ws.zengtrade.in` does not resolve.

**Fix (Hostinger DNS panel):**
1. Log in to Hostinger → Domains → `zengtrade.in` → DNS / Nameservers.
2. Add an **A record**:
   - Type: `A`
   - Name/Host: `ws`
   - Points to: `16.170.31.58` (current EIP; **update to the Mumbai EIP** if/when migrated)
   - TTL: 300
3. Wait for propagation (`dig ws.zengtrade.in +short` should return the EIP).
4. The relay container already listens on the box; nginx must have a server block
   for `ws.zengtrade.in` with a TLS cert. If the cert is missing, run certbot on
   the EC2 box: `sudo certbot --nginx -d ws.zengtrade.in`.

**Verification:** In the terminal (real login, not mock), the footer should flip to
`FEED: LIVE` and `LATENCY: <n>ms` instead of `WAITING`.

---

## 2. Server-side Kite token + Upstash Redis env vars on EC2 (blocks OI snapshots)

**Symptom:** `/api/cron/oi-snapshot` returns 503; OI history / PCR / Max-Pain
server-side aggregation has no data outside market data the browser fetches.

**Fix:** On the EC2 box, edit `/opt/zengtrade/.env.production` and add:
```
KITE_SERVER_TOKEN=<a Kite access token refreshed daily ~6 AM IST>
UPSTASH_REDIS_REST_URL=<from Upstash console>
UPSTASH_REDIS_REST_TOKEN=<from Upstash console>
```
Then restart: `cd /opt/zengtrade && docker compose -f docker-compose.prod.yml up -d app`.

**Note:** `KITE_SERVER_TOKEN` expires daily at ~6 AM IST. Until the TOTP
auto-refresh service (item 5) is built, this must be pasted manually each morning
for server-side OI snapshots to work. The browser-side terminal does NOT depend on
this — it uses the user's own session.

**Verification:** `curl -s https://www.zengtrade.in/api/cron/oi-snapshot` (during
market hours) returns `{ saved: true, ... }` not a 503.

---

## 3. Delete the stale Vercel project

**Symptom:** Cosmetic — the old `pro-trade-terminal` project still shows failed
builds in the Vercel dashboard. `vercel.json` (`git.deploymentEnabled: false`)
already stops auto-deploys, so this is noise, not a live risk.

**Fix:** Vercel dashboard → `pro-trade-terminal` → Settings → Delete Project.
Deploys now run only via the self-hosted GitHub Actions runner on EC2.

---

## 4. Mumbai (ap-south-1) migration (latency for Indian users)

**Status:** Runbook ready in `DEPLOY_MUMBAI.md`. Current box is eu-north-1
(Stockholm) — ~150ms+ RTT from India. Migration moves the stack to ap-south-1
(Mumbai) for ~20–30ms RTT.

**Blocker:** Needs an ap-south-1 EC2 instance + EIP provisioned, then DNS cutover
(`zengtrade.in` A-record + `ws.` A-record to the new EIP). Owner must approve the
new instance cost and perform the registrar cutover.

---

## 5. Daily Kite token auto-refresh (TOTP service) — not built

**Status:** Not implemented. Server-side data (OI snapshots) needs a fresh Kite
token daily; right now that's manual (item 2).

**To build:** A small scheduled job (systemd timer already exists for OI) that logs
in to Kite via API key + secret + TOTP seed, captures the request token, exchanges
it for an access token, and writes `KITE_SERVER_TOKEN` into the app's env / a shared
store. Requires the owner's Kite **TOTP secret** (the base32 seed behind the
authenticator QR) stored securely on the box — never in git.

---

## 6. Uptime monitoring — not set up

**Status:** Not configured. The site was silently down for 11 days once
(2026-05-31 → recovery) with no alert.

**To do (owner picks one):** Better Uptime / UptimeRobot / Pingdom hitting
`https://www.zengtrade.in/` and `/api/health` every 1–5 min with email/SMS alerts.
Free tiers are sufficient. Needs the owner to create the account + add a contact.

---

## 7. Legal pages (Privacy Policy, Terms) — required, not present

**Status:** Missing. The product handles broker credentials and OAuth, which makes
a Privacy Policy + Terms of Service effectively mandatory (and Kite's app review
expects them). These are content/legal decisions, not code — owner must provide or
approve the copy before pages are added.
