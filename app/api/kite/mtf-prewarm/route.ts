/**
 * MTF Pre-warm Endpoint
 *
 * Called once at login to populate the server-side HistoricalCache with
 * multi-timeframe data for key indices. This means:
 *  - Charts for NIFTY / BANKNIFTY load instantly (cache hit).
 *  - Backtests over these instruments skip the Kite API fetch entirely.
 *  - Subsequent 1-min signals can immediately be cross-referenced against
 *    higher-timeframe trend context.
 *
 * Guardrails (Zerodha compliance):
 *  - Sequential fetches with KiteRateLimiter (350ms gap) via getHistoricalData().
 *  - Results cached at interval-appropriate TTLs (kite-cache.ts).
 *  - Returns partial success — a failure on one instrument/interval does not
 *    abort the entire pre-warm.
 *
 * POST /api/kite/mtf-prewarm
 * Body: { symbols?: string[] }   — optional override; defaults to indices
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getHistoricalData } from "@/lib/kite-client";
import { HistoricalCache } from "@/lib/kite-cache";

// ─── Pre-warm targets ─────────────────────────────────────────────────────────
// Well-known token map (same source-of-truth as InstrumentRegistry KNOWN_TOKENS)
const INDEX_TOKENS: Record<string, number> = {
    "NIFTY 50":   256265,
    "BANKNIFTY":  260105,
    "FINNIFTY":   257801,
    "MIDCPNIFTY": 288009,
};

// Timeframes to pre-warm per instrument
const INTERVALS = ["day", "60minute", "15minute"] as const;

// Look-back windows per interval (days)
const LOOKBACK_DAYS: Record<string, number> = {
    day:       365,   // 1 year of daily candles
    "60minute": 60,   // 60 days of hourly candles
    "15minute": 30,   // 30 days of 15-min candles
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dateRange(daysBack: number): { from: string; to: string } {
    const now  = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - daysBack);

    const fmt = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
    return { from: fmt(from), to: fmt(now) };
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("kite_access_token")?.value;
    const apiKey      = process.env.KITE_API_KEY;

    if (!accessToken || !apiKey) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow caller to restrict which symbols to prewarm
    let symbolFilter: string[] | null = null;
    try {
        const body = await req.json().catch(() => ({}));
        if (Array.isArray(body.symbols) && body.symbols.length > 0) {
            symbolFilter = body.symbols.map((s: string) => s.toUpperCase().trim());
        }
    } catch {
        // no body — fine, use defaults
    }

    const targets = Object.entries(INDEX_TOKENS).filter(
        ([name]) => !symbolFilter || symbolFilter.includes(name.toUpperCase()),
    );

    const results: { symbol: string; interval: string; status: "cached" | "fetched" | "error"; candles?: number; error?: string }[] = [];

    // Sequential — each getHistoricalData call already rate-limits itself
    for (const [symbol, token] of targets) {
        for (const interval of INTERVALS) {
            const { from, to } = dateRange(LOOKBACK_DAYS[interval]);

            // Skip if already cached (avoids redundant API calls on double-call)
            const existing = await HistoricalCache.get(token, interval, from, to);
            if (existing) {
                results.push({ symbol, interval, status: "cached", candles: existing.length });
                continue;
            }

            try {
                const candles = await getHistoricalData(apiKey, accessToken, token, interval, from, to);
                HistoricalCache.set(token, interval, from, to, candles);

                console.log(`[MTF Prewarm] ${symbol} ${interval}: ${candles.length} candles`);
                results.push({ symbol, interval, status: "fetched", candles: candles.length });
            } catch (err: any) {
                console.warn(`[MTF Prewarm] FAILED ${symbol} ${interval}: ${err.message}`);
                results.push({ symbol, interval, status: "error", error: err.message });
            }
        }
    }

    const fetched = results.filter(r => r.status === "fetched").length;
    const cached  = results.filter(r => r.status === "cached").length;
    const errors  = results.filter(r => r.status === "error").length;

    return NextResponse.json({
        status: "success",
        summary: { fetched, cached, errors, total: results.length },
        results,
    });
}
