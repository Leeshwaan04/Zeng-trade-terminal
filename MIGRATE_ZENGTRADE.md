# ZengTrade — Cheapest Migration Plan (off AWS, ZengTrade only)

Goal: move **only ZengTrade** off the AWS eu-north-1 t3.medium (~$36/mo, ~150ms
latency from India) to a cheaper, India-region host — **without touching FreezMe**
(its t3.small + `freezme-alb` + 3 EIPs stay on AWS untouched).

What does NOT change: domain (`zengtrade.in`), Upstash Redis (external), the Kite
Connect app + its OAuth redirect URL (domain-based, IP-agnostic), the Docker Compose
stack, and the GitHub Actions deploy workflows (they target a self-hosted runner with
label `zeng-prod` + deploy dir `/opt/zengtrade` — so they work unchanged on any box
that has that runner).

---

## Step 0 — Pick the target (this is the only real decision)

| Option | Region | ~Monthly | India latency | Reliability | Effort note |
|--------|--------|----------|---------------|-------------|-------------|
| **Oracle Cloud Always-Free (ARM)** | Mumbai/Hyderabad | **$0** | ~15–25 ms | ⚠️ free tier can be reclaimed; signup/capacity finicky | ARM → rebuild Docker images for `linux/arm64` |
| **Hetzner** CPX21 (3vCPU/4GB) | Singapore | ~$9 | ~60–90 ms | ✅ solid | x86, drop-in |
| **Vultr** / **DigitalOcean** (2vCPU/4GB) | Mumbai / Bangalore | ~$18–24 | ~10–20 ms | ✅ solid | x86, drop-in |

- **Literal cheapest:** Oracle Free ($0) — but for a *trading* terminal the reliability
  risk matters; not recommended as primary unless you accept occasional reclaim.
- **Recommended (cheapest *sensible* for production):** **Vultr or DigitalOcean,
  Mumbai/Bangalore, ~$18–24/mo** — reliable, ~15ms to India and to Kite's Mumbai
  servers, x86 so the current Docker images work unchanged.
- **Cheapest reliable if region doesn't matter:** Hetzner ~$9 (Singapore, still 2×
  better than Stockholm).

Net saving vs today (~$36/mo AWS): **$12–18/mo** (Vultr/DO) up to **$36/mo** (Oracle $0).

> The steps below are identical for all targets. The only ARM-specific note is in
> Step 2 (Oracle only).

---

## Step 1 — Provision the box (~10 min)

1. Create an **Ubuntu 24.04 LTS**, 2 vCPU / 4 GB instance in the chosen region.
2. Firewall / security rules:
   - `80` and `443` from `0.0.0.0/0`
   - `22` from your IP only (`103.195.202.55/32` today — verify your current IP)
3. Note the public IP → call it `<NEWIP>`. (On Vultr/DO/Hetzner the primary IP is
   effectively a free static IP; on Oracle, reserve the ephemeral IP as static.)

## Step 2 — Bootstrap Docker + tooling (~10 min, over SSH)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
sudo apt-get update && sudo apt-get install -y certbot
sudo mkdir -p /opt/zengtrade/nginx && sudo chown -R $USER /opt/zengtrade
```

> **Oracle/ARM only:** the deploy builds images on-box via the runner, so ARM is
> handled automatically by `docker compose build` on an arm64 host. Just confirm the
> base images in the Dockerfiles are multi-arch (node:* and nginx:* official images
> are). No code changes expected.

## Step 3 — Stand up a self-hosted GitHub runner (~10 min)

The deploy workflows use `runs-on: [self-hosted, zeng-prod]`. Give the new box that
label so deploys land there.

```bash
# On the new box:
mkdir ~/actions-runner && cd ~/actions-runner
curl -o actions-runner-linux-x64.tar.gz -L \
  https://github.com/actions/runner/releases/latest/download/actions-runner-linux-x64-<ver>.tar.gz
tar xzf actions-runner-linux-x64.tar.gz
# Get a registration token (run from your laptop, needs gh CLI + repo admin):
#   gh api -X POST repos/Leeshwaan04/Zeng-trade-terminal/actions/runners/registration-token --jq .token
./config.sh --url https://github.com/Leeshwaan04/Zeng-trade-terminal \
  --token <TOKEN> --labels zeng-prod --name zeng-mumbai --unattended
sudo ./svc.sh install && sudo ./svc.sh start
```

(ARM target: use the `actions-runner-linux-arm64` tarball instead.)

## Step 4 — Runtime files + secrets (~5 min)

From your laptop:
```bash
scp docker-compose.prod.yml <user>@<NEWIP>:/opt/zengtrade/
scp nginx/default.conf       <user>@<NEWIP>:/opt/zengtrade/nginx/
scp .env.production.example  <user>@<NEWIP>:/opt/zengtrade/.env.production
```
Then edit `/opt/zengtrade/.env.production` on the box with real values (Kite key/secret,
Upstash URL/token, any app secrets). These are the same values currently on the AWS box
— pull them from there (`ssh ...@16.170.31.58 'cat /opt/zengtrade/.env.production'`)
while it's still alive, so nothing is lost.

## Step 5 — First deploy + test on the raw IP (before DNS) (~10 min)

```bash
cd /opt/zengtrade && docker compose -f docker-compose.prod.yml up -d --build
curl -so /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3000/   # app container
```
Or just push to `main` / re-run the deploy workflow — the new runner picks it up.
Don't cut DNS until the app container is healthy here.

## Step 6 — DNS cutover at Hostinger (~5 min + propagation)

`ws` is already TTL 60. Lower `@` and `www` (and `uat` if it's ZengTrade) to 300 first,
wait, then repoint **all ZengTrade records** to `<NEWIP>`:

| Type | Name | New value |
|------|------|-----------|
| A | `@` | `<NEWIP>` |
| A | `www` | `<NEWIP>` |
| A | `ws` | `<NEWIP>` |
| A | `uat` | `<NEWIP>` *(only if `uat` is ZengTrade — confirm; it currently points at the same AWS box)* |

Verify: `dig +short zengtrade.in` → `<NEWIP>`.

## Step 7 — TLS certificates (~10 min, after DNS resolves)

```bash
sudo certbot certonly --standalone \
  -d zengtrade.in -d www.zengtrade.in -d ws.zengtrade.in \
  --agree-tos -m sumitbagewadi6@gmail.com --non-interactive
# nginx runs in Docker holding :80, so add a renew hook:
echo 'pre_hook = docker stop zengtrade-nginx
post_hook = docker start zengtrade-nginx' | sudo tee -a /etc/letsencrypt/renewal/zengtrade.in.conf
cd /opt/zengtrade && docker compose -f docker-compose.prod.yml up -d
```

## Step 8 — Verify end-to-end (~10 min)

- `https://www.zengtrade.in/terminal` loads over HTTPS
- Real (non-mock) login: footer shows `FEED: LIVE` (relay reachable via `wss://ws.zengtrade.in`)
- `curl -so /dev/null -w 'TTFB %{time_starttransfer}s\n' https://www.zengtrade.in/`
  → expect well under 200 ms from India (vs Stockholm's ~150ms+ baseline)
- Place a mock order, check positions, option chain — smoke the core flows

## Step 9 — Decommission AWS ZengTrade ONLY (after 1–2 days stable)

**Leave FreezMe completely alone.** Only remove ZengTrade's resources:

```bash
# 1. Remove the old Stockholm GitHub runner so deploys only hit the new box:
#    (GitHub → repo → Settings → Actions → Runners → remove "zeng-ec2-prod")
# 2. Terminate ONLY the ZengTrade instance:
aws ec2 terminate-instances --region eu-north-1 --instance-ids i-0842f25c01b9cb965
# 3. Release ONLY the ZengTrade EIP (NOT the 3 freezme-alb EIPs):
aws ec2 release-address --region eu-north-1 --allocation-id <alloc-id-of-16.170.31.58>
# 4. The 30GB EBS deletes with the instance if DeleteOnTermination=true (verify).
```
**Do NOT touch:** `i-04cff7e41d71cc1ee` (freezme-api), `freezme-alb`, or EIPs
`13.49.147.36` / `16.170.125.99` / `16.192.39.182`.

Saving realised here: ~$36/mo of ZengTrade AWS cost removed.

---

## Rollback

DNS TTL is 60–300s, so reverting is fast: point the A records back to `16.170.31.58`
**before** Step 9 (while the AWS box still runs). Only do Step 9 once the new box has
been stable for a day or two. Zero-downtime: keep both boxes running during cutover.

## Cost outcome

| | Before | After (Vultr/DO Mumbai) | After (Oracle Free) |
|---|--------|--------------------------|----------------------|
| ZengTrade compute | ~$36/mo | ~$18–24/mo | **$0** |
| Latency to India | ~150 ms | ~15 ms | ~20 ms |
| FreezMe (unchanged) | ~$50–60/mo | ~$50–60/mo | ~$50–60/mo |
