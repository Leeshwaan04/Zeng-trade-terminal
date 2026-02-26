/**
 * Upstox REST Client
 *
 * Server-side only — handles token exchange, market quotes,
 * WS URL authorization, and instrument data.
 */

const UPSTOX_API = "https://api.upstox.com/v2";
const INSTRUMENTS_CDN = "https://assets.upstox.com/market-quote/instruments/exchange";

// ─── Types ───────────────────────────────────────────────────
export interface UpstoxConfig {
    apiKey: string;
    apiSecret: string;
    redirectUri: string;
    accessToken: string;
}

export interface UpstoxQuote {
    ohlc: { open: number; high: number; low: number; close: number };
    depth: {
        buy: { quantity: number; price: number; orders: number }[];
        sell: { quantity: number; price: number; orders: number }[];
    };
    timestamp: string;
    instrument_token: string;
    symbol: string;
    last_price: number;
    volume: number;
    average_price: number;
    oi: number;
    net_change: number;
    total_buy_quantity: number;
    total_sell_quantity: number;
    lower_circuit_limit: number;
    upper_circuit_limit: number;
    last_trade_time: string;
}

export interface InstrumentEntry {
    instrument_key: string;
    exchange_token: string;
    tradingsymbol: string;
    name: string;
    instrument_type: string;
    exchange: string;
    lot_size: number;
    tick_size: number;
    expiry?: string;
    strike?: number;
    option_type?: string;
    isin?: string;
    segment?: string;
}

export class UpstoxError extends Error {
    constructor(message: string, public statusCode?: number) {
        super(message);
        this.name = "UpstoxError";
    }
}

// ─── Config Helper ───────────────────────────────────────────
export function getConfig(): UpstoxConfig {
    return {
        apiKey: process.env.UPSTOX_API_KEY || "",
        apiSecret: process.env.UPSTOX_API_SECRET || "",
        redirectUri: process.env.UPSTOX_REDIRECT_URI || "http://localhost:3000/api/upstox/auth/callback",
        accessToken: process.env.UPSTOX_ACCESS_TOKEN || "",
    };
}

function authHeaders(accessToken: string) {
    return {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
    };
}

// ─── OAuth Token Exchange ────────────────────────────────────
export async function exchangeToken(code: string): Promise<{
    access_token: string;
    token_type: string;
    email: string;
    user_name: string;
    user_id: string;
}> {
    const config = getConfig();

    const body = new URLSearchParams({
        code,
        client_id: config.apiKey,
        client_secret: config.apiSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
    });

    const res = await fetch(`${UPSTOX_API}/login/authorization/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
        },
        body,
    });

    const json = await res.json();

    if (!res.ok || json.status === "error") {
        throw new UpstoxError(
            json.message || json.errors?.[0]?.message || "Token exchange failed",
            res.status
        );
    }

    return json;
}

// ─── Get Authorized WebSocket URL V3 ─────────────────────────
export async function getAuthorizedWsUrl(accessToken: string): Promise<string> {
    const res = await fetch(`${UPSTOX_API}/feed/market-data-feed/authorize`, {
        method: "GET",
        headers: authHeaders(accessToken),
    });

    const json = await res.json();

    if (!res.ok || json.status !== "success") {
        throw new UpstoxError(
            json.message || "Failed to get WS URL",
            res.status
        );
    }

    return json.data.authorized_redirect_uri;
}

// ─── Full Market Quote (REST fallback) ───────────────────────
export async function fetchMarketQuotes(
    accessToken: string,
    instrumentKeys: string[]
): Promise<Record<string, UpstoxQuote>> {
    const params = new URLSearchParams();
    instrumentKeys.forEach((k) => params.append("instrument_key", k));

    const res = await fetch(
        `${UPSTOX_API}/market-quote/quotes?${params.toString()}`,
        {
            method: "GET",
            headers: authHeaders(accessToken),
        }
    );

    const json = await res.json();

    if (!res.ok || json.status !== "success") {
        throw new UpstoxError(
            json.message || "Market quote failed",
            res.status
        );
    }

    return json.data || {};
}

// ─── LTP Quote (lightweight fallback) ────────────────────────
export async function fetchLtp(
    accessToken: string,
    instrumentKeys: string[]
): Promise<Record<string, { last_price: number; instrument_token: string }>> {
    const params = new URLSearchParams();
    instrumentKeys.forEach((k) => params.append("instrument_key", k));

    const res = await fetch(
        `${UPSTOX_API}/market-quote/ltp?${params.toString()}`,
        {
            method: "GET",
            headers: authHeaders(accessToken),
        }
    );

    const json = await res.json();

    if (!res.ok || json.status !== "success") {
        throw new UpstoxError(json.message || "LTP fetch failed", res.status);
    }

    return json.data || {};
}

// ─── Instrument Master (JSON from CDN) ───────────────────────
type Exchange = "complete" | "NSE" | "BSE" | "MCX";

const instrumentCache = new Map<string, { data: InstrumentEntry[]; fetchedAt: number }>();
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

export async function fetchInstruments(exchange: Exchange = "NSE"): Promise<InstrumentEntry[]> {
    const cached = instrumentCache.get(exchange);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
        return cached.data;
    }

    const res = await fetch(`${INSTRUMENTS_CDN}/${exchange}.json.gz`);
    if (!res.ok) {
        throw new UpstoxError(`Instrument download failed: ${res.status}`);
    }

    const data: InstrumentEntry[] = await res.json();
    instrumentCache.set(exchange, { data, fetchedAt: Date.now() });
    return data;
}

// ─── WS Subscribe / Unsubscribe Message Builder ──────────────
export function buildWsSubscription(
    instrumentKeys: string[],
    mode: "ltpc" | "full" | "option_greeks" = "full",
    method: "sub" | "change_mode" | "unsub" = "sub"
): string {
    return JSON.stringify({
        guid: `ct_${Date.now()}`,
        method,
        data: {
            mode,
            instrumentKeys,
        },
    });
}

// ─── Build Login URL ─────────────────────────────────────────
export function buildLoginUrl(): string {
    const config = getConfig();
    return `${UPSTOX_API}/login/authorization/dialog?response_type=code&client_id=${config.apiKey}&redirect_uri=${encodeURIComponent(config.redirectUri)}`;
}
