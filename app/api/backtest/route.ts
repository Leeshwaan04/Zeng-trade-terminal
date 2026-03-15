import { NextRequest, NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
import { getHistoricalData } from "@/lib/kite-client";
import { HistoricalCache } from "@/lib/kite-cache";
import { InstrumentRegistry } from "@/lib/instrument-registry";
import { runBacktest } from "@/lib/backtest/strategy-executor";
import { z } from "zod";

// ─── Kite interval aliases ────────────────────────────────────────────────────
// Map user-facing period names → Kite API interval strings
const PERIOD_TO_KITE_INTERVAL: Record<string, string> = {
    minute:    "minute",
    "5minute":  "5minute",
    "15minute": "15minute",
    "30minute": "30minute",
    "60minute": "60minute",
    hour:      "60minute",
    day:       "day",
};

// ─── Input schema ─────────────────────────────────────────────────────────────
const backtestSchema = z.object({
    rule:             z.any(),
    symbol:           z.string(),
    instrument_token: z.string().optional(),   // override if caller already knows the token
    exchange:         z.string().default("NSE"),
    period:           z.string().default("minute"),
    from:             z.string().optional(),
    to:               z.string().optional(),
    slippage:         z.boolean().default(true),
    initial_capital:  z.number().default(100000),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Kite candle arrays [ts, o, h, l, c, v] → object format the executor expects */
function transformKiteCandles(raw: any[][]): any[] {
    return raw.map(([timestamp, open, high, low, close, volume]) => ({
        timestamp: typeof timestamp === "string" ? timestamp : new Date(timestamp).toISOString(),
        open,
        high,
        low,
        close,
        volume: volume ?? 0,
    }));
}

/**
 * Generate mock candles as a fallback when Kite auth is unavailable.
 * Uses a sine-wave trend + noise so indicator strategies actually produce signals.
 */
function generateMockCandles(count: number, basePrice = 25000): any[] {
    let price = basePrice;
    return Array.from({ length: count }, (_, i) => {
        const trend    = Math.sin(i / 20) * 500;
        const noise    = (Math.random() - 0.5) * 200;
        const open     = price;
        const close    = basePrice + trend + noise;
        const high     = Math.max(open, close) + Math.random() * 100;
        const low      = Math.min(open, close) - Math.random() * 100;
        price = close;
        return {
            timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
            open,
            high,
            low,
            close,
            volume: Math.floor(Math.random() * 10000),
        };
    });
}

/** Default date range: last N days, formatted for Kite API */
function defaultDateRange(period: string): { from: string; to: string } {
    const now  = new Date();
    // Minute-level data: last 10 days (Kite limit for 1-min is 60 days)
    // Day-level data: last 365 days
    const days = period === "day" ? 365 : 10;

    const from = new Date(now);
    from.setDate(from.getDate() - days);

    const fmt = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
    return { from: fmt(from), to: fmt(now) };
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const auth = await getAuthCredentials();

    try {
        const body = await req.json();
        const {
            rule,
            symbol,
            instrument_token: tokenOverride,
            exchange,
            period,
            from: fromParam,
            to:   toParam,
            slippage,
            initial_capital,
        } = backtestSchema.parse(body);

        const kiteInterval = PERIOD_TO_KITE_INTERVAL[period] ?? "minute";
        const { from: defaultFrom, to: defaultTo } = defaultDateRange(kiteInterval);
        const from = fromParam ?? defaultFrom;
        const to   = toParam   ?? defaultTo;

        let candles: any[];
        let dataSource: "kite" | "mock" = "mock";

        // ── Attempt to fetch real Kite data ────────────────────────────────
        if (auth?.broker === "KITE" && auth.apiKey && auth.accessToken) {
            const { apiKey, accessToken } = auth;

            try {
                // 1. Resolve instrument token (hardcoded map → instruments CSV)
                let instrumentToken: string | null = tokenOverride ?? null;
                if (!instrumentToken) {
                    const resolved = await InstrumentRegistry.resolve(symbol, exchange, apiKey, accessToken);
                    instrumentToken = resolved ? String(resolved) : null;
                }

                if (!instrumentToken) {
                    console.warn(`[Backtest] Token not found for "${symbol}" on ${exchange} — using mock`);
                    candles = generateMockCandles(500);
                } else {
                    // 2. Check cache (L1 in-memory → L2 Redis)
                    const cached = await HistoricalCache.get(instrumentToken, kiteInterval, from, to);

                    if (cached) {
                        console.log(`[Backtest] Cache HIT: ${symbol} (${instrumentToken}) ${kiteInterval}`);
                        candles = transformKiteCandles(cached);
                        dataSource = "kite";
                    } else {
                        // 3. Fetch from Kite (rate-limited internally in kite-client)
                        console.log(`[Backtest] Fetching history: ${symbol} (${instrumentToken}) ${kiteInterval} ${from} → ${to}`);
                        const raw = await getHistoricalData(apiKey, accessToken, instrumentToken, kiteInterval, from, to);

                        // 4. Cache for subsequent requests
                        HistoricalCache.set(instrumentToken, kiteInterval, from, to, raw);

                        candles = transformKiteCandles(raw);
                        dataSource = "kite";
                    }
                }
            } catch (fetchErr: any) {
                // Historical add-on not subscribed (403), network error, etc.
                console.warn(`[Backtest] History fetch failed: ${fetchErr.message} — falling back to mock`);
                candles = generateMockCandles(500);
            }
        } else {
            // No Kite auth — use mock data
            candles = generateMockCandles(500);
        }

        if (candles.length === 0) {
            return NextResponse.json(
                { error: "No historical data available for the selected period." },
                { status: 422 },
            );
        }

        // ── Run backtest with or without slippage simulation ───────────────
        const result = await runBacktest(rule, candles, initial_capital, slippage);

        return NextResponse.json({
            status: "success",
            data: {
                ...result,
                meta: {
                    symbol,
                    exchange,
                    period: kiteInterval,
                    from,
                    to,
                    candleCount:      candles.length,
                    slippageEnabled:  slippage,
                    dataSource,
                },
            },
        });
    } catch (error: any) {
        console.error("[Backtest] Unhandled error:", error);
        return NextResponse.json({ error: error.message || "Backtest failed" }, { status: 500 });
    }
}
