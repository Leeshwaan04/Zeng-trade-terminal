import { MARKET_INSTRUMENTS } from "../market-config";

export interface ChartCandle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

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
     * Automatically maps interval names to Kite format.
     */
    async getHistory(from: number, to: number): Promise<ChartCandle[]> {
        const token = await this.resolveToken();
        if (!token) {
            console.warn(`[Datafeed] No token for symbol: ${this.symbol}`);
            return [];
        }

        // Map friendly interval names to Kite API format
        const intervalMap: Record<string, string> = {
            "1": "minute",
            "1minute": "minute",
            "3": "3minute",
            "3minute": "3minute",
            "5": "5minute",
            "5minute": "5minute",
            "15": "15minute",
            "15minute": "15minute",
            "30": "30minute",
            "30minute": "30minute",
            "60": "60minute",
            "60minute": "60minute",
            "1h": "60minute",
            "day": "day",
            "1d": "day",
            "week": "week",
            "month": "month",
        };

        const kiteInterval = intervalMap[this.interval] || this.interval;
        const fromDate = new Date(from).toISOString().split("T")[0];
        const toDate = new Date(to).toISOString().split("T")[0];

        try {
            const url = `/api/kite/history?instrument_token=${token}&interval=${kiteInterval}&from=${fromDate}&to=${toDate}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.status === "success" && data.data?.candles?.length > 0) {
                return data.data.candles
                    .map((c: any[]) => ({
                        time: new Date(c[0]).getTime() / 1000,
                        open: c[1],
                        high: c[2],
                        low: c[3],
                        close: c[4],
                        volume: c[5] || 0,
                    }))
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

        const intervalSeconds = this.getIntervalSeconds();
        const barTime = Math.floor(Date.now() / (intervalSeconds * 1000)) * intervalSeconds;

        const bar: ChartCandle = {
            time: barTime,
            open: tick.ohlc?.open || tick.last_price,
            high: tick.ohlc?.high || tick.last_price,
            low: tick.ohlc?.low || tick.last_price,
            close: tick.last_price,
            volume: tick.volume || 0,
        };
        this.onRealtimeCallback(bar);
    }

    private getIntervalSeconds(): number {
        const map: Record<string, number> = {
            "minute": 60, "1minute": 60,
            "3minute": 180, "5minute": 300,
            "15minute": 900, "30minute": 1800,
            "60minute": 3600, "day": 86400,
        };
        return map[this.interval] || 900;
    }
}
