/**
 * Kite Historical Cache — Two-Tier Architecture
 *
 * L1: In-process Map  — zero-latency, cleared on every serverless cold start
 * L2: Upstash Redis   — shared across ALL concurrent Vercel function instances,
 *                        survives cold starts, eliminates duplicate Kite API calls
 *                        when 4 charts load simultaneously.
 *
 * Graceful degradation: if UPSTASH_REDIS_REST_URL is not set, runs as pure L1.
 *
 * TTL calibrated per interval — closed candles are immutable, longer bars
 * can be cached longer. Zerodha guidance: never cache the current forming candle.
 */

import { Redis } from "@upstash/redis";

interface CacheEntry {
    data: any[];
    timestamp: number;
    expiry: number;
    hits: number;
}

// ─── L1: In-process Map ──────────────────────────────────────
const l1 = new Map<string, CacheEntry>();

// ─── L2: Redis (optional — graceful no-op if env not set) ────
let redis: Redis | null = null;
try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }
} catch {
    // Redis unavailable — L1-only mode
}

// ─── TTL per interval ────────────────────────────────────────
const INTERVAL_TTL_MS: Record<string, number> = {
    day:        60 * 60 * 1000,   // 1 hr  — daily bars rarely change post-close
    "60minute": 30 * 60 * 1000,  // 30 min
    "30minute": 15 * 60 * 1000,  // 15 min
    "15minute": 10 * 60 * 1000,  // 10 min
    "5minute":   5 * 60 * 1000,  //  5 min
    minute:      60 * 1000,       //  1 min — minimum per Zerodha guidance
};

function ttlMs(interval: string): number {
    return INTERVAL_TTL_MS[interval] ?? 60_000;
}

function cacheKey(token: string | number, interval: string, from: string, to: string): string {
    return `${token}:${interval}:${from}:${to}`;
}

function redisKey(k: string): string {
    return `zeng:hist:${k}`;
}

// ─── Public API ───────────────────────────────────────────────
export const HistoricalCache = {
    /**
     * Check L1 first (sync-fast), then L2 (Redis, async).
     * Populates L1 from L2 on miss so subsequent calls within
     * the same invocation are instant.
     */
    async get(token: string | number, interval: string, from: string, to: string): Promise<any[] | null> {
        const key = cacheKey(token, interval, from, to);

        // ── L1 check ─────────────────────────────────────────
        const l1Entry = l1.get(key);
        if (l1Entry) {
            if (Date.now() <= l1Entry.expiry) {
                l1Entry.hits++;
                return l1Entry.data;
            }
            l1.delete(key);
        }

        // ── L2 check (Redis) ──────────────────────────────────
        if (redis) {
            try {
                const stored = await redis.get<any[]>(redisKey(key));
                if (stored && Array.isArray(stored)) {
                    // Warm L1 from Redis so same-invocation calls are instant
                    const ttl = ttlMs(interval);
                    l1.set(key, { data: stored, timestamp: Date.now(), expiry: Date.now() + ttl, hits: 0 });
                    return stored;
                }
            } catch {
                // Redis read failure — fall through to Kite fetch
            }
        }

        return null;
    },

    /**
     * Write to both L1 and L2.
     * Redis write is fire-and-forget (non-blocking) to avoid adding latency
     * to the API response — if it fails, the next request simply re-fetches.
     */
    set(token: string | number, interval: string, from: string, to: string, data: any[]): void {
        const key = cacheKey(token, interval, from, to);
        const ttl = ttlMs(interval);
        const expiry = Date.now() + ttl;

        // L1 write (sync)
        l1.set(key, { data, timestamp: Date.now(), expiry, hits: 0 });

        // L2 write (async, non-blocking)
        if (redis) {
            redis.set(redisKey(key), data, { ex: Math.floor(ttl / 1000) }).catch(() => {
                // Fire-and-forget — Redis write failure is acceptable
            });
        }
    },

    clear(): void {
        l1.clear();
        // Redis keys have TTLs — no bulk clear needed for correctness
    },

    /** Evict all L1 entries for a specific instrument token. */
    invalidateToken(token: string | number): void {
        const prefix = `${token}:`;
        for (const key of l1.keys()) {
            if (key.startsWith(prefix)) l1.delete(key);
        }
        // Redis entries will naturally expire via TTL
    },

    stats(): { l1_size: number; redis_enabled: boolean; entries: { key: string; hits: number; expiresIn: number }[] } {
        const now = Date.now();
        return {
            l1_size: l1.size,
            redis_enabled: !!redis,
            entries: Array.from(l1.entries()).map(([key, e]) => ({
                key,
                hits: e.hits,
                expiresIn: Math.max(0, Math.round((e.expiry - now) / 1000)),
            })),
        };
    },
};
