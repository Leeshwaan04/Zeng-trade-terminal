# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_ vars are baked into the JS bundle at build time — must be supplied here
ARG NEXT_PUBLIC_EC2_WS_URL
ARG NEXT_PUBLIC_KITE_API_KEY
ENV NEXT_PUBLIC_EC2_WS_URL=$NEXT_PUBLIC_EC2_WS_URL
ENV NEXT_PUBLIC_KITE_API_KEY=$NEXT_PUBLIC_KITE_API_KEY
ENV NEXT_TELEMETRY_DISABLED=1

# Generate the standalone production build
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Optimize Node.js for an always-on server
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Run as non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

# server.js is created by Next.js standalone output
CMD ["node", "server.js"]
