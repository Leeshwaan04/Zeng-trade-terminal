# OI Snapshot Scheduler

Captures real NIFTY/BANKNIFTY option-chain Open Interest every 3 minutes during
market hours and stores a durable time-series in Upstash Redis.

## Why this design (not AWS EventBridge)

The job triggers an **internal** endpoint. The fastest, most reliable trigger is
from the EC2 box itself via `docker exec` into the app container's loopback —
no internet round-trip, no TLS, no cold start. AWS EventBridge Scheduler would
have to call the **public** HTTPS endpoint over the internet (slower, and adds a
service to manage). The box *is* AWS, so this is the AWS-optimal placement.

```
systemd timer (every 3 min, on EC2)
      └─ oi-snapshot.sh → docker exec zengtrade-app → http://127.0.0.1:3000/api/cron/oi-snapshot
                                                          ├─ gate: skip unless 09:15–15:30 IST Mon–Fri
                                                          ├─ getOptionChain() → ±10 strikes around ATM
                                                          ├─ getQuote() → REAL oi (one batched Kite call/index)
                                                          └─ saveSnapshot() → Upstash Redis (TTL 3d)
```

Reader: `/api/kite/oi-history` → `getSnapshots()` (same Redis store).

## Install on the box

```bash
# from a repo checkout on the EC2 box:
bash infra/oi-snapshot/install.sh
# inspect:
systemctl list-timers zeng-oi-snapshot.timer
journalctl -u zeng-oi-snapshot.service --since "10 min ago"
```

## Requirements (env in /opt/zengtrade/.env.production)

- `KITE_API_KEY` + `KITE_SERVER_TOKEN` — server-side Kite token. **Kite tokens
  expire daily (~06:00 IST); this must be refreshed each morning.** Until set,
  the route returns 503 and writes nothing (no fake data).
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — durable store. Without
  it the store falls back to in-process memory (non-durable) and logs nothing.
- `CRON_SECRET` — already set; authorizes the trigger.

## Future: automated daily token refresh

The remaining manual step is the daily Kite token. The robust fix is a small
service-account login (TOTP-based) that refreshes `KITE_SERVER_TOKEN` each
morning before the open. Tracked as a follow-up.
