# ZenG Trade — EC2 WebSocket Proxy

## Architecture

```
Browser ──→ EC2 (wss://ws.zengtrade.in/ws)
               └── Kite WS (1 persistent connection per user session)
                       └── Broadcasts binary-parsed ticks to all browsers
```

Instead of Vercel SSE (max 300s timeout), the browser connects directly to EC2 via WebSocket.
EC2 maintains a 24/7 Kite WebSocket connection with automatic reconnection.

---

## EC2 Files

| File | Purpose |
|---|---|
| `ws-proxy.js` | Main proxy server (WebSocket + REST) |
| `ecosystem.config.js` | PM2 process manager config |
| `nginx.conf` | SSL + WebSocket reverse proxy |
| `setup.sh` | One-shot Ubuntu setup script |

---

## Deployment Steps

### 1. SSH into EC2
```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### 2. Upload files
```bash
scp -r -i your-key.pem ec2/ ubuntu@<EC2_PUBLIC_IP>:/home/ubuntu/zeng-proxy
```

### 3. Run setup (replace with your Kite API key)
```bash
cd /home/ubuntu/zeng-proxy
sudo bash setup.sh sxyz1234abc
```
This installs Node 20, Nginx, Certbot, PM2, configures firewall, and gets SSL cert.

### 4. Add DNS record
In your DNS provider, add an A record:
```
ws.zengtrade.in → <EC2_PUBLIC_IP>
```

### 5. Add env var in Vercel
```
NEXT_PUBLIC_EC2_WS_URL=wss://ws.zengtrade.in/ws
```
Vercel redeploy → browser auto-connects to EC2 instead of Vercel SSE.

---

## Monitoring
```bash
pm2 status                    # Process status
pm2 logs zeng-ws-proxy        # Live logs
pm2 monit                     # CPU/Memory dashboard
curl https://ws.zengtrade.in/health  # Health check
```

---

## Security
- EC2 ports 8080/8081 are **blocked** by UFW — only Nginx can reach them
- All browser traffic uses WSS (TLS 1.2/1.3) on port 443
- CORS locked to `https://www.zengtrade.in`
- Rate limited to 10 connections/second per IP

---

## Region Note
Current region: **eu-north-1 (Stockholm)**
Kite servers are in **ap-south-1 (Mumbai)** — adds ~150ms round trip.

**To minimize latency**: Add a Mumbai proxy, or migrate this instance to `ap-south-1`.
For highest performance: `ap-south-1` EC2 → Kite latency ~4ms vs ~154ms from Stockholm.
