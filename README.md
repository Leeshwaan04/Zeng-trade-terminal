# ZenG Trade — Pro Trading Terminal

Institutional-grade trading terminal built with Next.js and Kite Connect v3. Features low-latency WebSocket ticking, advanced charting, and pre-trade intelligence.

## 🚀 Production Deployment (EC2)

This terminal is optimized for deployment on a single EC2 instance (Ubuntu/Linux) using Docker Compose. This architecture fixes Vercel's SSE timeouts and session limitations.

### 1. Prerequisites
- EC2 instance (t3.medium or better recommended)
- Docker & Docker Compose installed
- A domain pointed to your EC2 IP (e.g., `zengtrade.in` and `ws.zengtrade.in`)
- SSL Certificates via Certbot:
  ```bash
  sudo certbot certonly --standalone -d zengtrade.in -d www.zengtrade.in -d ws.zengtrade.in
  ```

### 2. Configure Environment
Copy `.env.production.example` to `.env.production` and fill in your secrets:
- `KITE_API_KEY` & `KITE_API_SECRET`
- `UPSTASH_REDIS_REST_*` (for historical data caching)
- Ensure `NEXT_PUBLIC_EC2_WS_URL` is set to `wss://ws.zengtrade.in`

### 3. Build and Start
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 🔐 GitHub Secrets (CI/CD)

The deployment workflows (`.github/workflows/`) require these repository secrets. Configure them at **Settings > Secrets and variables > Actions** in your GitHub repo.

| Secret | Used by | Description |
|--------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | deploy-frontend, deploy-relay | AWS IAM access key for ECR push |
| `AWS_SECRET_ACCESS_KEY` | deploy-frontend, deploy-relay | AWS IAM secret key |
| `ECR_REGISTRY` | deploy-frontend, deploy-relay | ECR registry URI (e.g. `123456789.dkr.ecr.ap-south-1.amazonaws.com`) |
| `EC2_HOST` | deploy-frontend, deploy-relay | EC2 instance public IP or hostname |
| `EC2_USER` | deploy-frontend, deploy-relay | SSH username (typically `ubuntu`) |
| `EC2_SSH_KEY` | deploy-frontend, deploy-relay | Private SSH key for EC2 access |
| `NEXT_PUBLIC_EC2_WS_URL` | deploy-frontend | WebSocket endpoint (e.g. `wss://ws.zengtrade.in`) |
| `NEXT_PUBLIC_KITE_API_KEY` | deploy-frontend | Kite Connect API key for the frontend build |

### Why do my secrets look empty on GitHub?

This is normal. GitHub **never** displays stored secret values — the "Value" field is always blank when you open the "Update secret" page. This is a security measure to prevent credentials from being exposed in the browser.

- A blank field does **not** mean the secret is empty or missing.
- Your workflows will use the stored value as expected.
- Only enter a new value if you want to **replace** the existing secret.
- Clicking "Update secret" without entering a value will show a validation error — this confirms the field requires input, not that your secret is gone.

### CI/CD Setup Checklist

Run these commands on your local machine (requires `aws` and `gh` CLI authenticated):

```bash
# 1. Create ECR repositories (one-time)
aws ecr create-repository --repository-name zengtrade-frontend --region ap-south-1
aws ecr create-repository --repository-name zengtrade-relay --region ap-south-1

# 2. Get your ECR registry URI (use this for the ECR_REGISTRY secret)
aws sts get-caller-identity --query Account --output text
# Registry format: <account-id>.dkr.ecr.ap-south-1.amazonaws.com

# 3. Ensure /opt/zengtrade exists on EC2 with docker-compose.prod.yml
ssh -i /path/to/key.pem ubuntu@<EC2_HOST> "sudo mkdir -p /opt/zengtrade"
scp -i /path/to/key.pem docker-compose.prod.yml ubuntu@<EC2_HOST>:/opt/zengtrade/

# 4. Set all GitHub secrets via CLI
gh secret set AWS_ACCESS_KEY_ID --body "<your-access-key>"
gh secret set AWS_SECRET_ACCESS_KEY --body "<your-secret-key>"
gh secret set ECR_REGISTRY --body "<account-id>.dkr.ecr.ap-south-1.amazonaws.com"
gh secret set EC2_HOST --body "<ec2-public-ip>"
gh secret set EC2_USER --body "ubuntu"
gh secret set EC2_SSH_KEY < /path/to/your-key.pem
gh secret set NEXT_PUBLIC_EC2_WS_URL --body "wss://ws.zengtrade.in"
gh secret set NEXT_PUBLIC_KITE_API_KEY --body "<your-kite-api-key>"

# 5. Trigger a deploy to verify everything works
gh workflow run deploy-frontend.yml --ref main
gh run watch
```

## 🛠️ Key Features
- **Binary Tick Engine**: Off-main-thread tick parsing via Web Workers.
- **Intelligent Modes**: Automatic sub-second switching between `ltp`, `quote`, and `full` subscription modes for bandwidth efficiency.
- **Execution Audit**: Post-trade analysis with VWAP and fill-fragment visibility.
- **Hardened Security**: `httpOnly` secure cookies for token management.
- **L2 Cache**: Server-side historical data caching via Upstash Redis.

## 📈 Local Development
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to start trading.
