/**
 * Kite Connect v3 — Server-side REST client
 *
 * Used ONLY in API routes (never imported from client components).
 * Signs every request with `Authorization: token api_key:access_token`.
 */

const KITE_API_BASE = "https://api.kite.trade";
const KITE_VERSION = "3";

// ─── Types ───────────────────────────────────────────────────
export interface KiteOrderParams {
    tradingsymbol: string;
    exchange: string;
    transaction_type: "BUY" | "SELL";
    order_type: "MARKET" | "LIMIT" | "SL" | "SL-M";
    quantity: number;
    product: "CNC" | "NRML" | "MIS" | "MTF";
    price?: number;
    trigger_price?: number;
    disclosed_quantity?: number;
    validity?: "DAY" | "IOC" | "TTL";
    variety?: "regular" | "amo" | "co" | "iceberg" | "auction";
    tag?: string;
}

export interface KiteResponse<T = any> {
    status: "success" | "error";
    data: T;
    message?: string;
    error_type?: string;
}

// ─── Helper ──────────────────────────────────────────────────
async function kiteRequest<T = any>(
    path: string,
    apiKey: string,
    accessToken: string,
    options: RequestInit = {}
): Promise<KiteResponse<T>> {
    const url = `${KITE_API_BASE}${path}`;

    const res = await fetch(url, {
        ...options,
        headers: {
            "X-Kite-Version": KITE_VERSION,
            Authorization: `token ${apiKey}:${accessToken}`,
            ...(options.headers || {}),
        },
    });

    const json = await res.json();

    if (!res.ok || json.status === "error") {
        throw new KiteError(
            json.message || `Kite API error: ${res.status}`,
            json.error_type || "GeneralException",
            res.status
        );
    }

    return json as KiteResponse<T>;
}

export class KiteError extends Error {
    constructor(
        message: string,
        public errorType: string,
        public httpStatus: number
    ) {
        super(message);
        this.name = "KiteError";
    }
}

// ─── Token Exchange ──────────────────────────────────────────
export async function exchangeToken(
    apiKey: string,
    apiSecret: string,
    requestToken: string
): Promise<KiteResponse> {
    const crypto = await import("crypto");
    const checksum = crypto
        .createHash("sha256")
        .update(apiKey + requestToken + apiSecret)
        .digest("hex");

    const body = new URLSearchParams({
        api_key: apiKey,
        request_token: requestToken,
        checksum,
    });

    const res = await fetch(`${KITE_API_BASE}/session/token`, {
        method: "POST",
        headers: { "X-Kite-Version": KITE_VERSION },
        body,
    });

    const json = await res.json();
    if (!res.ok || json.status === "error") {
        throw new KiteError(
            json.message || "Token exchange failed",
            json.error_type || "TokenException",
            res.status
        );
    }
    return json;
}

// ─── Session Invalidation ────────────────────────────────────
export async function invalidateSession(
    apiKey: string,
    accessToken: string
): Promise<void> {
    try {
        await fetch(`${KITE_API_BASE}/session/token`, {
            method: "DELETE",
            headers: {
                "X-Kite-Version": KITE_VERSION,
                Authorization: `token ${apiKey}:${accessToken}`,
            },
        });
    } catch {
        // Best-effort logout
    }
}

// ─── Orders ──────────────────────────────────────────────────
export async function placeOrder(
    apiKey: string,
    accessToken: string,
    params: KiteOrderParams
): Promise<{ order_id: string }> {
    const variety = params.variety || "regular";
    const body = new URLSearchParams();

    body.set("tradingsymbol", params.tradingsymbol);
    body.set("exchange", params.exchange);
    body.set("transaction_type", params.transaction_type);
    body.set("order_type", params.order_type);
    body.set("quantity", String(params.quantity));
    body.set("product", params.product);
    if (params.price) body.set("price", String(params.price));
    if (params.trigger_price) body.set("trigger_price", String(params.trigger_price));
    if (params.disclosed_quantity) body.set("disclosed_quantity", String(params.disclosed_quantity));
    if (params.validity) body.set("validity", params.validity);
    if (params.tag) body.set("tag", params.tag);

    const res = await kiteRequest<{ order_id: string }>(
        `/orders/${variety}`,
        apiKey,
        accessToken,
        { method: "POST", body }
    );
    return res.data;
}

export async function cancelOrder(
    apiKey: string,
    accessToken: string,
    orderId: string,
    variety: string = "regular"
): Promise<{ order_id: string }> {
    const res = await kiteRequest<{ order_id: string }>(
        `/orders/${variety}/${orderId}`,
        apiKey,
        accessToken,
        { method: "DELETE" }
    );
    return res.data;
}

export async function getOrders(
    apiKey: string,
    accessToken: string
): Promise<any[]> {
    const res = await kiteRequest<any[]>("/orders", apiKey, accessToken);
    return res.data;
}

// ─── Portfolio ───────────────────────────────────────────────
export async function getPositions(
    apiKey: string,
    accessToken: string
): Promise<{ net: any[]; day: any[] }> {
    const res = await kiteRequest<{ net: any[]; day: any[] }>(
        "/portfolio/positions",
        apiKey,
        accessToken
    );
    return res.data;
}

export async function getHoldings(
    apiKey: string,
    accessToken: string
): Promise<any[]> {
    const res = await kiteRequest<any[]>("/portfolio/holdings", apiKey, accessToken);
    return res.data;
}

// ─── User ────────────────────────────────────────────────────
export async function getProfile(
    apiKey: string,
    accessToken: string
): Promise<any> {
    const res = await kiteRequest("/user/profile", apiKey, accessToken);
    return res.data;
}

export async function getMargins(
    apiKey: string,
    accessToken: string,
    segment?: "equity" | "commodity"
): Promise<any> {
    const path = segment
        ? `/user/margins/${segment}`
        : "/user/margins";
    const res = await kiteRequest(path, apiKey, accessToken);
    return res.data;
}

// ─── Market Quotes ───────────────────────────────────────────
export async function getQuote(
    apiKey: string,
    accessToken: string,
    instruments: string[] // e.g. ["NSE:NIFTY 50", "BSE:SENSEX"] or instrument_tokens
): Promise<Record<string, any>> {
    // If instruments are tokens (numbers), passed as strings, use i= format
    // Kite API expects `i=NSE:INFY&i=BSE:INFY` format
    const params = instruments.map(i => `i=${i}`).join("&");
    const res = await kiteRequest<Record<string, any>>(
        `/quote?${params}`,
        apiKey,
        accessToken
    );
    return res.data;
}

export async function getOHLC(
    apiKey: string,
    accessToken: string,
    instruments: string[]
): Promise<Record<string, any>> {
    const params = instruments.map(i => `i=${i}`).join("&");
    const res = await kiteRequest<Record<string, any>>(
        `/quote/ohlc?${params}`,
        apiKey,
        accessToken
    );
    return res.data;
}
