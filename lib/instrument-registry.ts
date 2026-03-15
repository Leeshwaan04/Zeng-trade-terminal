/**
 * Instrument Registry — Server-side singleton
 *
 * Resolves trading symbols → Kite instrument tokens.
 *
 * Strategy (in order):
 * 1. Check KNOWN_TOKENS hardcoded map (zero API calls for indices).
 * 2. Check in-memory instrument cache (fetched once per 24h session).
 * 3. Batch-fetch Kite instruments CSV and populate cache.
 *
 * Zerodha Guardrail: The instruments CSV (~7MB) is fetched at most once
 * per day. This is the only safe way to resolve arbitrary symbols without
 * hammering the rate-limited historical/quote APIs symbol-by-symbol.
 *
 * Server-side ONLY. Never import from client components.
 */

const KITE_API_BASE = "https://api.kite.trade";
const KITE_VERSION = "3";

// ─── Well-known Index Tokens ──────────────────────────────────────────────────
// These are stable and never need an API call to resolve.
const KNOWN_TOKENS: Record<string, number> = {
    // Nifty indices
    "NIFTY 50":       256265,
    "NIFTY":          256265,
    "NIFTY50":        256265,
    "BANKNIFTY":      260105,
    "BANK NIFTY":     260105,
    "NIFTY BANK":     260105,
    "FINNIFTY":       257801,
    "NIFTY FIN SERVICE": 257801,
    "MIDCPNIFTY":     288009,
    "NIFTY MIDCAP":   288009,
    "SENSEX":         265,
    "BSE SENSEX":     265,
    // Common large-caps (NSE equity tokens)
    "RELIANCE":       738561,
    "TCS":            2953217,
    "INFY":           408065,
    "HDFCBANK":       341249,
    "ICICIBANK":      1270529,
    "SBIN":           779521,
    "WIPRO":          969473,
    "TATAMOTORS":     884737,
    "ADANIENT":       25,
    "BAJFINANCE":     81153,
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface InstrumentEntry {
    instrument_token: number;
    tradingsymbol: string;
    exchange: string;
    name: string;
    instrument_type: string;
    segment: string;
}

// ─── Module-level cache (survives across requests in the same server process) ─
let instrumentCache: InstrumentEntry[] | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── CSV Parser ───────────────────────────────────────────────────────────────
// Kite instruments CSV columns (0-indexed):
// 0: instrument_token, 1: exchange_token, 2: tradingsymbol, 3: name,
// 4: last_price, 5: expiry, 6: strike, 7: tick_size, 8: lot_size,
// 9: instrument_type, 10: segment, 11: exchange
function parseInstrumentCSV(csv: string): InstrumentEntry[] {
    const lines = csv.split("\n");
    if (lines.length < 2) return [];

    return lines
        .slice(1) // skip header
        .filter(line => line.trim().length > 0)
        .map(line => {
            const cols = line.split(",");
            return {
                instrument_token: parseInt(cols[0], 10),
                tradingsymbol:    (cols[2] ?? "").trim().replace(/"/g, ""),
                name:             (cols[3] ?? "").trim().replace(/"/g, ""),
                instrument_type:  (cols[9] ?? "").trim().replace(/"/g, ""),
                segment:          (cols[10] ?? "").trim().replace(/"/g, ""),
                exchange:         (cols[11] ?? "").trim().replace(/"/g, ""),
            };
        })
        .filter(i => !isNaN(i.instrument_token) && i.tradingsymbol.length > 0);
}

// ─── Registry ─────────────────────────────────────────────────────────────────
export const InstrumentRegistry = {
    /**
     * Resolve a trading symbol to its Kite instrument token.
     *
     * @param symbol       Trading symbol, e.g. "NIFTY 50", "RELIANCE"
     * @param exchange     Exchange, e.g. "NSE", "BSE", "NFO" (default: "NSE")
     * @param apiKey       Kite API key (needed only if not in KNOWN_TOKENS)
     * @param accessToken  Kite access token (needed only if not in KNOWN_TOKENS)
     * @returns            Instrument token number, or null if not found
     */
    async resolve(
        symbol: string,
        exchange = "NSE",
        apiKey?: string,
        accessToken?: string,
    ): Promise<number | null> {
        const normalized = symbol.toUpperCase().trim();

        // 1. Fast path: hardcoded well-known tokens
        if (KNOWN_TOKENS[normalized] !== undefined) {
            return KNOWN_TOKENS[normalized];
        }

        // 2. Need auth to go further
        if (!apiKey || !accessToken) return null;

        // 3. Ensure cache is warm
        await this._loadCache(apiKey, accessToken);
        if (!instrumentCache) return null;

        const upperExchange = exchange.toUpperCase();

        // Exact match first
        const exact = instrumentCache.find(
            i => i.tradingsymbol === normalized && i.exchange === upperExchange,
        );
        if (exact) return exact.instrument_token;

        // Fallback: match across any exchange (useful for indices on NFO)
        const loose = instrumentCache.find(i => i.tradingsymbol === normalized);
        return loose ? loose.instrument_token : null;
    },

    /**
     * Resolve multiple symbols in a single cache lookup (no extra API calls).
     * Use this when resolving watchlist symbols at boot.
     */
    async resolveMany(
        symbols: { symbol: string; exchange?: string }[],
        apiKey?: string,
        accessToken?: string,
    ): Promise<Record<string, number>> {
        // Ensure cache is warm once, then do all lookups synchronously.
        if (apiKey && accessToken) {
            await this._loadCache(apiKey, accessToken);
        }

        const result: Record<string, number> = {};
        for (const { symbol, exchange = "NSE" } of symbols) {
            const token = await this.resolve(symbol, exchange, apiKey, accessToken);
            if (token !== null) result[symbol] = token;
        }
        return result;
    },

    /**
     * Force-reload the instrument cache (e.g., after midnight).
     */
    async reload(apiKey: string, accessToken: string): Promise<void> {
        cacheLoadedAt = 0;
        await this._loadCache(apiKey, accessToken);
    },

    clear(): void {
        instrumentCache = null;
        cacheLoadedAt = 0;
    },

    stats(): { loaded: boolean; count: number; ageMinutes: number } {
        return {
            loaded: instrumentCache !== null,
            count: instrumentCache?.length ?? 0,
            ageMinutes: cacheLoadedAt > 0 ? Math.round((Date.now() - cacheLoadedAt) / 60000) : -1,
        };
    },

    // ─── Internal ───────────────────────────────────────────────────────────
    async _loadCache(apiKey: string, accessToken: string): Promise<void> {
        if (instrumentCache && Date.now() - cacheLoadedAt < CACHE_TTL_MS) return;

        console.log("[InstrumentRegistry] Fetching Kite instruments CSV…");
        try {
            const res = await fetch(`${KITE_API_BASE}/instruments`, {
                headers: {
                    "X-Kite-Version": KITE_VERSION,
                    Authorization: `token ${apiKey}:${accessToken}`,
                },
                // Next.js built-in deduplication: revalidate once per day
                next: { revalidate: 86400 },
            } as RequestInit & { next?: { revalidate: number } });

            if (!res.ok) {
                console.warn(`[InstrumentRegistry] HTTP ${res.status} — skipping cache load`);
                return;
            }

            const csv = await res.text();
            instrumentCache = parseInstrumentCSV(csv);
            cacheLoadedAt = Date.now();
            console.log(`[InstrumentRegistry] Loaded ${instrumentCache.length} instruments`);
        } catch (err) {
            console.warn("[InstrumentRegistry] Failed to load instruments:", err);
        }
    },
};
