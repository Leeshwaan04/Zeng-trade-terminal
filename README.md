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
