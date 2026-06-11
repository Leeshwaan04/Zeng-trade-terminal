# ZenG Trade — Mumbai (ap-south-1) Recovery & Deployment Runbook

Production status as of 2026-06-11: `zengtrade.in` / `www.zengtrade.in` point to a
dead EC2 instance in **eu-north-1 Stockholm** (`16.170.31.58`, all ports
unreachable) and `ws.zengtrade.in` has **no DNS record**. This runbook moves
production to **ap-south-1 (Mumbai)** — closest region to NSE/BSE and to Indian
users — using the existing Docker Compose + GitHub Actions pipeline.

> The old PM2-based setup in `ec2/` is superseded by `docker-compose.prod.yml`
> at the repo root + the `deploy-frontend` / `deploy-relay` workflows.

---

## Phase A — Triage the old Stockholm box (15 min)

1. AWS Console → **eu-north-1** → EC2 → Instances (include stopped/terminated).
2. If the instance still exists: check for anything worth keeping before
   terminating (`.env.production`, Let's Encrypt certs are re-creatable; the
   app has no local database — Redis is Upstash-hosted).
3. Release any Elastic IP in eu-north-1 (it bills while unattached).

## Phase B — Launch the Mumbai box (30 min)

1. AWS Console → **ap-south-1** → EC2 → Launch instance:
   - Ubuntu 24.04 LTS, **t3.medium** (2 vCPU / 4 GB — fits app + relay + nginx)
   - 30 GB gp3 root volume
   - Security group: `443` + `80` from `0.0.0.0/0`, `22` from your IP only
2. Allocate + associate an **Elastic IP** → note it as `<EIP>`.
3. SSH in and install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker ubuntu && newgrp docker
   sudo apt-get install -y certbot
   ```
4. Prepare the deploy directory (paths must match the CI workflows):
   ```bash
   sudo mkdir -p /opt/zengtrade/nginx && sudo chown -R ubuntu /opt/zengtrade
   ```
5. From your laptop, copy the runtime files:
   ```bash
   scp docker-compose.prod.yml ubuntu@<EIP>:/opt/zengtrade/
   scp nginx/default.conf      ubuntu@<EIP>:/opt/zengtrade/nginx/
   scp .env.production.example ubuntu@<EIP>:/opt/zengtrade/.env.production
   ```
6. On the box, edit `/opt/zengtrade/.env.production` with real values
   (Kite keys, Upstash, secrets — see comments in the file).

## Phase C — DNS cutover to Cloudflare (1 hr, mostly propagation)

The domain currently sits on Hostinger **parking** nameservers
(`ns1/ns2.dns-parking.com`) — no CDN, no DDoS protection, no health checks.

1. Create a free Cloudflare account → Add site `zengtrade.in`.
2. Create records (all **DNS-only / grey cloud** for now — certbot needs
   direct HTTP reachability):
   | Type | Name | Value |
   |------|------|-------|
   | A | `zengtrade.in` | `<EIP>` |
   | A | `www` | `<EIP>` |
   | A | `ws` | `<EIP>` |
3. At Hostinger (domain registrar panel): replace the parking nameservers
   with the two Cloudflare-assigned ones.
4. Wait until `dig +short zengtrade.in` returns `<EIP>`.
5. **After** the site is live and certs issued (Phase D), flip `zengtrade.in`
   and `www` to **Proxied (orange cloud)** for CDN + DDoS protection. Keep
   `ws` grey-cloud initially; Cloudflare does proxy WebSockets, so it can be
   flipped later once verified.

## Phase D — Certificates + first boot (20 min)

On the box (port 80 must be free, DNS must already resolve):

```bash
sudo certbot certonly --standalone \
  -d zengtrade.in -d www.zengtrade.in -d ws.zengtrade.in \
  --agree-tos -m sumitbagewadi6@gmail.com --non-interactive

cd /opt/zengtrade
docker compose -f docker-compose.prod.yml up -d --build
```

Auto-renewal: certbot's systemd timer is installed by default, but nginx runs
in Docker holding :80, so standalone renewal will fail. Add a renew hook:

```bash
echo 'pre_hook = docker stop zengtrade-nginx
post_hook = docker start zengtrade-nginx' | sudo tee -a /etc/letsencrypt/renewal/zengtrade.in.conf
```

## Phase E — Re-point CI/CD (10 min)

GitHub repo → Settings → Secrets and variables → Actions, update:

| Secret | New value |
|--------|-----------|
| `EC2_HOST` | `<EIP>` |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | private key for the new instance |
| `ECR_REGISTRY` | `<account>.dkr.ecr.ap-south-1.amazonaws.com` (create `zengtrade-frontend` + `zengtrade-relay` repos in ECR ap-south-1 if absent) |
| `NEXT_PUBLIC_EC2_WS_URL` | `wss://ws.zengtrade.in` |
| `NEXT_PUBLIC_KITE_API_KEY` | unchanged |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM user with ECR push (already region-agnostic) |

Then push to `main` (or re-run the two deploy workflows) — CI builds, pushes
to ECR, SSHes in, and `docker compose pull && up -d`.

## Phase F — Never be silently down again (15 min)

1. Free uptime monitor (UptimeRobot / Better Stack):
   - `https://www.zengtrade.in/` (expect 200)
   - `https://ws.zengtrade.in/health` (expect 200)
   - Alert → email + phone push.
2. Verify from an Indian vantage point (or just check TTFB):
   ```bash
   curl -so /dev/null -w 'HTTP %{http_code} | TTFB %{time_starttransfer}s\n' https://www.zengtrade.in/
   ```
   Target: TTFB well under 200 ms from India (was impossible from Stockholm).

---

## Verification checklist

- [ ] `https://www.zengtrade.in` loads, valid cert, no www/apex cert mismatch
- [ ] `https://ws.zengtrade.in/health` returns 200
- [ ] Browser terminal receives live ticks during market hours (9:15–15:30 IST)
- [ ] Kite login round-trip works (`/api/auth/*` → kite.zerodha.com → callback)
- [ ] A push to `main` auto-deploys via both workflows
- [ ] Uptime alerts fire when you `docker stop zengtrade-nginx` (test it once)
