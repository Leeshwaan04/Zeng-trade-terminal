#!/bin/bash
# ============================================================
#  ZenG Trade — EC2 One-Shot Setup Script
#  Ubuntu 22.04 LTS | eu-north-1 (Stockholm)
# ============================================================
# Usage: sudo bash setup.sh <your-kite-api-key>
#
# What this does:
#   1. Updates system packages
#   2. Installs Node.js 20, Nginx, Certbot
#   3. Installs ws npm package
#   4. Copies proxy files
#   5. Creates systemd service via PM2
#   6. Configures Nginx with SSL
#   7. Sets up log rotation
# ============================================================

set -e  # Exit on any error

KITE_API_KEY="${1}"
DOMAIN="ws.zengtrade.in"
APP_DIR="/opt/zeng-proxy"
LOG_DIR="$APP_DIR/logs"
NODE_VERSION="20"

# ── Validate ──────────────────────────────────────────────────
if [ -z "$KITE_API_KEY" ]; then
    echo "❌ Usage: sudo bash setup.sh <KITE_API_KEY>"
    echo "   Example: sudo bash setup.sh abc123xyz"
    exit 1
fi

if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root: sudo bash setup.sh <KITE_API_KEY>"
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║  ZenG Trade EC2 Proxy Setup           ║"
echo "║  Domain: $DOMAIN          ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# ── Step 1: System packages ───────────────────────────────────
echo "📦 Updating system packages..."
apt-get update -qq
apt-get install -y -qq \
    curl wget git nginx certbot python3-certbot-nginx \
    ufw logrotate htop

# ── Step 2: Node.js 20 ───────────────────────────────────────
echo "🟢 Installing Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi

NODE_VER=$(node --version)
echo "   Node: $NODE_VER"

# ── Step 3: PM2 (global) ────────────────────────────────────
echo "⚙️  Installing PM2..."
npm install -g pm2 --quiet
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | bash || true

# ── Step 4: App directory ────────────────────────────────────
echo "📁 Setting up app directory: $APP_DIR"
mkdir -p "$APP_DIR" "$LOG_DIR"

# Copy proxy files (assumes this script is run from the ec2/ directory)
cp ./ws-proxy.js "$APP_DIR/"
cp ./ecosystem.config.js "$APP_DIR/"
cp ./package.json "$APP_DIR/" 2>/dev/null || true

# Install dependencies
cd "$APP_DIR"
if [ ! -f package.json ]; then
cat > package.json << 'EOF'
{
  "name": "zeng-ws-proxy",
  "version": "1.0.0",
  "description": "ZenG Trade Kite WebSocket Proxy",
  "main": "ws-proxy.js",
  "scripts": { "start": "node ws-proxy.js" },
  "dependencies": { "ws": "^8.16.0" }
}
EOF
fi
npm install --production --quiet

# ── Step 5: Environment Variables ────────────────────────────
echo "🔑 Writing environment config..."
cat > /etc/environment.d/zeng.conf << EOF
KITE_API_KEY=$KITE_API_KEY
WS_PORT=8080
API_PORT=8081
NODE_ENV=production
EOF

# Also write to PM2's env file
cat > "$APP_DIR/.env" << EOF
KITE_API_KEY=$KITE_API_KEY
WS_PORT=8080
API_PORT=8081
NODE_ENV=production
EOF
chmod 600 "$APP_DIR/.env"

# ── Step 6: Start PM2 ────────────────────────────────────────
echo "🚀 Starting proxy via PM2..."
cd "$APP_DIR"
KITE_API_KEY=$KITE_API_KEY pm2 start ecosystem.config.js
pm2 save
echo "   PM2 status:"
pm2 status

# ── Step 7: Firewall ─────────────────────────────────────────
echo "🔒 Configuring UFW firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80/tcp     # HTTP (for Certbot)
ufw allow 443/tcp    # HTTPS/WSS
ufw deny 8080        # Block direct port access from outside
ufw deny 8081
echo "   UFW rules set."

# ── Step 8: Nginx ────────────────────────────────────────────
echo "🌐 Configuring Nginx..."
cp "$(dirname "$0")/nginx.conf" /etc/nginx/sites-available/zeng-proxy
ln -sf /etc/nginx/sites-available/zeng-proxy /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

systemctl enable nginx
systemctl restart nginx

# ── Step 9: SSL with Certbot ─────────────────────────────────
echo "🔐 Obtaining SSL certificate for $DOMAIN..."
echo "   (Make sure DNS A record for $DOMAIN points to this server's IP)"
echo ""
read -p "   Press ENTER when DNS is ready, or Ctrl+C to skip SSL for now..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@zengtrade.in || {
    echo "⚠️  SSL setup failed. Run manually later: sudo certbot --nginx -d $DOMAIN"
}

# ── Step 10: Log Rotation ────────────────────────────────────
echo "📋 Setting up log rotation..."
cat > /etc/logrotate.d/zeng-proxy << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# ── Done ──────────────────────────────────────────────────────
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "unknown")

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║  ✅ ZenG Trade Proxy Setup Complete!          ║"
echo "╠═══════════════════════════════════════════════╣"
echo "║  EC2 Public IP:  $EC2_IP"
echo "║  WebSocket URL:  wss://$DOMAIN/ws"
echo "║  Health Check:   https://$DOMAIN/health"
echo "║  PM2 Status:     pm2 status"
echo "║  PM2 Logs:       pm2 logs zeng-ws-proxy"
echo "╠═══════════════════════════════════════════════╣"
echo "║  NEXT: Add to Vercel env:                     ║"
echo "║  NEXT_PUBLIC_EC2_WS_URL=wss://$DOMAIN/ws"
echo "╚═══════════════════════════════════════════════╝"
echo ""
