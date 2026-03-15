import { MARKET_INSTRUMENTS } from "../market-config";

export interface ChartCandle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

// ─── Interval maps — single source of truth for the whole app ─────────────────
//
// Covers every format any chart component might pass:
//   ChartControls  → "1m", "5m", "15m", "30m", "1H", "1D", "1W"
//   ChartHeader    → "1 minute", "3 minute", "5 minute", "10 minute",
//                    "15 minute", "30 minute", "60 minute", "day"
//   HyperChartWidget INTERVALS → "1minute", "5minute", "15minute", …
//   Bare numeric   → "1", "5", "15", "30", "60"
//   Kite passthrough → already-valid Kite strings
//
// Kite-supported intervals: minute · 3minute · 5minute · 10minute ·
//   15minute · 30minute · 60minute · day · week · month
export const INTERVAL_TO_KITE: Record<string, string> = {
    // ── ChartControls short forms ───────────────────────────────────────────
    "1m":  "minute",
    "5m":  "5minute",
    "15m": "15minute",
    "30m": "30minute",
    "1H":  "60minute",
    "1D":  "day",
    "1W":  "week",

    // ── Lowercase variants ─────────────────────────────────────────────────
    "1h":  "60minute",
    "1d":  "day",
    "1w":  "week",

    // ── Bare numeric ───────────────────────────────────────────────────────
    "1":  "minute",
    "3":  "3minute",
    "5":  "5minute",
    "10": "10minute",
    "15": "15minute",
    "30": "30minute",
    "60": "60minute",

    // ── Kite canonical passthroughs ────────────────────────────────────────
    "minute":   "minute",
    "3minute":  "3minute",
    "5minute":  "5minute",
    "10minute": "10minute",
    "15minute": "15minute",
    "30minute": "30minute",
    "60minute": "60minute",
    "day":      "day",
    "week":     "week",
    "month":    "month",

    // ── ChartHeader long-form strings ──────────────────────────────────────
    "1 minute":  "minute",
    "3 minute":  "3minute",
    "5 minute":  "5minute",
    "10 minute": "10minute",
    "15 minute": "15minute",
    "30 minute": "30minute",
    "60 minute": "60minute",
};

/**
 * How many days of history to request per interval.
 * Balances chart context vs. API payload size.
 * Kite hard limits: 1min=60d, 3/5/10min=100d, 15/30min=200d, 60min=400d, day/week/month=2000d.
 */
export const INTERVAL_LOOKBACK_DAYS: Record<string, number> = {
    "minute":   10,   // ~3,750 candles — enough for intraday context
    "3minute":  15,
    "5minute":  20,
    "10minute": 30,
    "15minute": 30,   // ~750 candles
    "30minute": 60,
    "60minute": 90,   // ~1,350 candles
    "day":      365,  // 1 year of daily bars
    "week":     1095, // 3 years of weekly bars
    "month":    1825, // 5 years of monthly bars
};

/** Seconds per bar for each Kite canonical interval */
export const KITE_INTERVAL_SECONDS: Record<string, number> = {
    "minute":   60,
    "3minute":  180,
    "5minute":  300,
    "10minute": 600,
    "15minute": 900,
    "30minute": 1800,
    "60minute": 3600,
    "day":      86400,
    "week":     604800,
    "month":    2592000,
};

/**
 * Convert any interval string (ChartControls, ChartHeader, bare numeric, Kite)
 * to the number of seconds in one bar.
 * Returns 900 (15 min) as a safe fallback for unknown strings.
 */
export function getIntervalSeconds(interval: string): number {
    const kite = INTERVAL_TO_KITE[interval] ?? interval;
    return KITE_INTERVAL_SECONDS[kite] ?? 900;
}

/**
 * Convert any interval string to the Kite API canonical string.
 * Returns the input unchanged if no mapping is found (safe passthrough).
 */
export function toKiteInterval(interval: string): string {
    return INTERVAL_TO_KITE[interval] ?? interval;
}

/**
 * Return the `from` timestamp (ms since epoch) for a historical fetch,
 * calibrated to the interval so shorter timeframes fetch less history
 * and longer timeframes fetch enough context to be useful.
 */
export function lookbackFrom(interval: string): number {
    const kite = toKiteInterval(interval);
    const days = INTERVAL_LOOKBACK_DAYS[kite] ?? 30;
    return Date.now() - days * 24 * 60 * 60 * 1000;
}

// ─── KiteDatafeed ─────────────────────────────────────────────────────────────
/**
 * KiteDatafeed — resolves instrument tokens and fetches
 * OHLC history from the Kite Connect API proxy.
 *
 * Supports any NSE/BSE symbol — uses the expanded market-config
 * for quick token lookup, and falls back to the instruments API.
 */
export class KiteDatafeed {
    private symbol: string;
    private interval: string;
    private onRealtimeCallback: ((candle: ChartCandle) => void) | null = null;

    constructor(symbol: string, interval: string = "15minute") {
        this.symbol = symbol;
        this.interval = interval;
    }

    /**
     * Resolve instrument token — first checks expanded market-config,
     * then falls back to the /api/kite/instruments search API.
     */
    private async resolveToken(): Promise<number | null> {
        // Quick lookup from local map
        const local = MARKET_INSTRUMENTS.find(i => i.symbol === this.symbol);
        if (local && local.token > 0) return local.token;

        // Dynamic lookup via instruments API
        try {
            const res = await fetch(`/api/kite/instruments?symbol=${encodeURIComponent(this.symbol)}&exchange=NSE`);
            const data = await res.json();
            if (data.token && data.token > 0) return data.token;
        } catch {
            // Silently fall through to mock
        }

        return null;
    }

    /**
     * Fetch historical OHLC bars from the backend proxy.
     * Automatically maps any interval format to the Kite API string.
     */
    async getHistory(from: number, to: number): Promise<ChartCandle[]> {
        const token = await this.resolveToken();
        if (!token) {
            console.warn(`[Datafeed] No token for symbol: ${this.symbol}`);
            return [];
        }

        const kiteInterval = toKiteInterval(this.interval);
        const fromDate = new Date(from).toISOString().split("T")[0];
        const toDate   = new Date(to).toISOString().split("T")[0];

        try {
            const url = `/api/kite/history?instrument_token=${token}&interval=${kiteInterval}&from=${fromDate}&to=${toDate}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            let res: Response;
            try {
                res = await fetch(url, { signal: controller.signal });
            } finally {
                clearTimeout(timeoutId);
            }
            const data = await res!.json();

            if (data.status === "success" && data.data?.candles?.length > 0) {
                return data.data.candles
                    .map((c: any[]) => {
                        // Kite returns IST timestamps without timezone suffix:
                        //   intraday → "2025-03-15 09:15:00"
                        //   daily    → "2025-03-15" (already UTC-safe as date-only)
                        // Append +05:30 so parsing is unambiguous on any server timezone.
                        const raw = String(c[0]);
                        const iso = (raw.includes("T") || raw.includes("+") || raw.length === 10)
                            ? raw                              // already ISO or date-only — leave as-is
                            : raw.replace(" ", "T") + "+05:30"; // "2025-03-15 09:15:00" → IST explicit
                        return {
                            time:   new Date(iso).getTime() / 1000,
                            open:   c[1],
                            high:   c[2],
                            low:    c[3],
                            close:  c[4],
                            volume: c[5] || 0,
                        };
                    })
                    .filter((c: ChartCandle) => c.time > 0 && c.close > 0);
            }
        } catch (error) {
            console.error("[Datafeed] History fetch error:", error);
        }
        return [];
    }

    // Real-time callback bridge
    subscribeBars(callback: (candle: ChartCandle) => void) {
        this.onRealtimeCallback = callback;
    }

    updateRealtime(tick: any) {
        if (!this.onRealtimeCallback || !tick?.last_price) return;

        const intervalSecs = getIntervalSeconds(this.interval);
        const barTime = Math.floor(Date.now() / (intervalSecs * 1000)) * intervalSecs;

        const bar: ChartCandle = {
            time:   barTime,
            open:   tick.ohlc?.open || tick.last_price,
            high:   tick.ohlc?.high || tick.last_price,
            low:    tick.ohlc?.low  || tick.last_price,
            close:  tick.last_price,
            volume: tick.volume || 0,
        };
        this.onRealtimeCallback(bar);
    }
}
