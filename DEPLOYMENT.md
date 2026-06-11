# ZenG Trade — Deployment (canonical)

**Production is 100% on AWS. Vercel is not used.** This is the single source of
truth for how zengtrade.in is built and deployed.

## Topology

```
GitHub (main)
   │  push
   ▼
Self-hosted GitHub Actions runner  ─── runs ON the EC2 box (zeng-ec2-prod)
   │  build + docker compose up
   ▼
AWS EC2  (eu-north-1, EIP 16.170.31.58)
   ├── zengtrade-nginx   :80/:443  TLS termination + reverse proxy (public)
   ├── zengtrade-app     :3000     Next.js standalone (internal)
   └── zengtrade-relay   :8080     Kite WebSocket relay (internal)
   │
DNS (Hostinger)  zengtrade.in / www → 16.170.31.58
                 ws.zengtrade.in    → 16.170.31.58   ← PENDING (enables live ticks)
```

## How a deploy happens

1. Push to `main`.
2. `.github/workflows/deploy-frontend.yml` / `deploy-relay.yml` trigger on the
   relevant paths and run on the **self-hosted runner** (label `zeng-prod`)
   installed on the EC2 box as a systemd service.
3. The job rsyncs source into `/opt/zengtrade`, runs
   `docker compose -f docker-compose.prod.yml build && up -d`, then gates on the
   container healthcheck.

No ECR, no AWS access keys in CI, no inbound SSH from GitHub — the runner pulls
jobs outbound, so the security group stays locked down (22 from admin IP only).

## Runner

- Service: `actions.runner.Leeshwaan04-Zeng-trade-terminal.zeng-ec2-prod`
- Location on box: `/opt/actions-runner` (auto-starts on reboot)
- Manage: `sudo /opt/actions-runner/svc.sh status|start|stop`

## First-time / disaster recovery on a fresh box

1. `cp .env.production.example .env.production` in `/opt/zengtrade` and fill in
   real values (Kite keys, Upstash, secrets).
2. `certbot certonly --standalone -d zengtrade.in -d www.zengtrade.in -d ws.zengtrade.in`
3. `docker compose -f docker-compose.prod.yml up -d --build`
4. Reinstall the runner (see GitHub → Settings → Actions → Runners → New).

See `DEPLOY_MUMBAI.md` for the planned migration to ap-south-1 (Mumbai) for
lower latency to Indian users.

## What is NOT deployed (roadmap scaffolding)

These directories are part of the product vision but are **not** in the
production runtime yet — don't expect them to be running:

- `services/` — Go/Rust microservices (broker-gateway/adapter are built in CI only)
- `infra/` — Kubernetes manifests, ClickHouse/Kafka pipeline
- `logstash/`, `docker-compose.yml`, `setup-elastic.sh` — ELK logging stack
- `database/schema.postgresql.sql` — Postgres schema for the services tier

Production today = `frontend` + `server/relay` + `nginx`, per
`docker-compose.prod.yml`.
