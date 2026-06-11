/**
 * OI Snapshot Store — durable, shared time-series for option Open Interest.
 *
 * Replaces the old in-process `global.oiSnapshots` (lost on every redeploy,
 * not shared across replicas). Backed by Upstash Redis when configured, with
 * an in-process fallback so dev / unconfigured environments still render.
 *
 * Writer: /api/cron/oi-snapshot (the scheduled job)
 * Reader: /api/kite/oi-history  (the OI heatmap / multi-strike widgets)
 */
import { Redis } from "@upstash/redis";

export interface OISnapshot {
    time: string;   // "HH:MM" IST
    ts: number;     // epoch ms
    spot: number;
    expiry: string;
    ce_total: number;
    pe_total: number;
    pcr: number;    // put/call ratio by OI
    strikes: Record<number, { ce_oi: number; pe_oi: number }>;
}

const MAX_SNAPSHOTS = 200;          // ~1 trading day at 2–3 min cadence
const TTL_SECONDS = 3 * 24 * 60 * 60; // keep 3 days

let redis: Redis | null = null;
try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }
} catch {
    redis = null;
}

export const isRedisConfigured = () => redis !== null;

/** Parts of the current time in IST, independent of server timezone (box is UTC). */
function istParts(d = new Date()) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        weekday: "short", hour: "2-digit", minute: "2-digit",
        year: "numeric", month: "2-digit", day: "2-digit", hour12: false,
    });
    const p = Object.fromEntries(fmt.formatToParts(d).map(x => [x.type, x.value]));
    return {
        weekday: p.weekday as string,                 // "Mon".."Sun"
        hhmm: `${p.hour}:${p.minute}`,                // "09:15"
        minutes: parseInt(p.hour) * 60 + parseInt(p.minute),
        dateKey: `${p.year}-${p.month}-${p.day}`,     // "2026-06-11" in IST
    };
}

/** NSE equity-derivatives session: Mon–Fri, 09:15–15:30 IST. */
export function isMarketOpen(d = new Date()): boolean {
    const { weekday, minutes } = istParts(d);
    const isWeekday = !["Sat", "Sun"].includes(weekday);
    return isWeekday && minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 30;
}

export function nowIST() {
    return istParts();
}

const keyFor = (index: string, dateKey: string) => `oi:snap:${index}:${dateKey}`;

export async function saveSnapshot(index: string, snap: OISnapshot): Promise<void> {
    const { dateKey } = istParts();
    if (redis) {
        const key = keyFor(index, dateKey);
        await redis.rpush(key, JSON.stringify(snap));
        await redis.ltrim(key, -MAX_SNAPSHOTS, -1);
        await redis.expire(key, TTL_SECONDS);
        return;
    }
    // Fallback: in-process (non-durable)
    const g = globalThis as any;
    g.oiSnapshots = g.oiSnapshots || {};
    g.oiSnapshots[index] = g.oiSnapshots[index] || [];
    g.oiSnapshots[index].push(snap);
    if (g.oiSnapshots[index].length > MAX_SNAPSHOTS) g.oiSnapshots[index].shift();
}

export async function getSnapshots(index: string): Promise<OISnapshot[]> {
    const { dateKey } = istParts();
    if (redis) {
        const raw = await redis.lrange<string | OISnapshot>(keyFor(index, dateKey), 0, -1);
        return raw.map(r => (typeof r === "string" ? JSON.parse(r) : r)) as OISnapshot[];
    }
    const g = globalThis as any;
    return (g.oiSnapshots?.[index] || []) as OISnapshot[];
}
