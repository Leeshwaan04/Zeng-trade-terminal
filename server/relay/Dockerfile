# ZenG Trade — WebSocket Relay (EC2)
# Multi-stage build: TypeScript compile → minimal production image
# Build:  docker build -t zengtrade-relay .
# Run:    docker run -e PORT=8080 -e ALLOWED_ORIGINS=https://zengtrade.in -p 8080:8080 zengtrade-relay

# ── Stage 1: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev=false

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Only copy compiled output + production deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup --system --gid 1001 relay \
 && adduser  --system --uid 1001 --ingroup relay relay
USER relay

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "dist/index.js"]
