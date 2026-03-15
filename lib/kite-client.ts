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

export interface KiteGTTParams {
    type: "single" | "two-leg";
    condition: any; // { exchange, tradingsymbol, trigger_values, last_price }
    orders: any[];  // [{ exchange, tradingsymbol, transaction_type, quantity, order_type, product, price }]
}

export interface KiteResponse<T = any> {
    status: "success" | "error";
    data: T;
    message?: string;
    error_type?: string;
}

// ─── Helper ──────────────────────────────────────────────────
const REQUEST_TIMEOUT_MS = 8000; // 8s — prevents indefinite hangs in serverless
const MAX_RETRIES = 2;           // retry on 429 / transient 5xx

export async function kiteRequest<T = any>(
    path: string,
    apiKey: string,
    accessToken: string,
    options: RequestInit = {},
    _retryCount = 0
): Promise<KiteResponse<T>> {
    const url = `${KITE_API_BASE}${path}`;

    // Rate-limit historical calls BEFORE sending (best-effort within a single process)
    if (path.includes("/historical/")) {
        await KiteRateLimiter.wait();
    }

    // AbortController prevents indefinite hangs on slow/unresponsive Kite API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
        res = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                "X-Kite-Version": KITE_VERSION,
                Authorization: `token ${apiKey}:${accessToken}`,
                ...(options.headers || {}),
            },
        });
    } finally {
        clearTimeout(timeoutId);
    }

    // 429 Too Many Requests — exponential backoff, then retry
    if (res.status === 429 && _retryCount < MAX_RETRIES) {
        const delay = 500 * Math.pow(2, _retryCount); // 500ms → 1000ms
        await new Promise(r => setTimeout(r, delay));
        return kiteRequest<T>(path, apiKey, accessToken, options, _retryCount + 1);
    }

    // 502/503 transient gateway errors — single retry after 1s
    if ((res.status === 502 || res.status === 503) && _retryCount < 1) {
        await new Promise(r => setTimeout(r, 1000));
        return kiteRequest<T>(path, apiKey, accessToken, options, _retryCount + 1);
    }

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

export async function modifyOrder(
    apiKey: string,
    accessToken: string,
    orderId: string,
    params: Partial<KiteOrderParams> & { variety?: string }
): Promise<{ order_id: string }> {
    const variety = params.variety || "regular";
    const body = new URLSearchParams();

    if (params.quantity) body.set("quantity", String(params.quantity));
    if (params.price) body.set("price", String(params.price));
    if (params.trigger_price) body.set("trigger_price", String(params.trigger_price));
    if (params.order_type) body.set("order_type", params.order_type);
    if (params.validity) body.set("validity", params.validity);
    if (params.disclosed_quantity) body.set("disclosed_quantity", String(params.disclosed_quantity));

    const res = await kiteRequest<{ order_id: string }>(
        `/orders/${variety}/${orderId}`,
        apiKey,
        accessToken,
        { method: "PUT", body }
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

// ─── GTT Orders ──────────────────────────────────────────────
export async function placeGTTOrder(
    apiKey: string,
    accessToken: string,
    params: KiteGTTParams
): Promise<{ trigger_id: number }> {
    const body = new URLSearchParams();
    body.set("type", params.type);
    body.set("condition", JSON.stringify(params.condition));
    body.set("orders", JSON.stringify(params.orders));

    const res = await kiteRequest<{ trigger_id: number }>(
        "/gtt/triggers",
        apiKey,
        accessToken,
        { method: "POST", body }
    );
    return res.data;
}

export async function cancelGTTOrder(
    apiKey: string,
    accessToken: string,
    triggerId: string
): Promise<{ trigger_id: string }> {
    const res = await kiteRequest<{ trigger_id: string }>(
        `/gtt/triggers/${triggerId}`,
        apiKey,
        accessToken,
        { method: "DELETE" }
    );
    return res.data;
}

export async function getGTTOrders(
    apiKey: string,
    accessToken: string
): Promise<any[]> {
    const res = await kiteRequest<any[]>("/gtt/triggers", apiKey, accessToken);
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
    instruments: string[]
): Promise<Record<string, any>> {
    // encodeURIComponent required — "NSE:NIFTY 50" has a space that breaks raw URLs
    const params = instruments.map(i => `i=${encodeURIComponent(i)}`).join("&");
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
    // encodeURIComponent required — "NSE:NIFTY 50" has a space that breaks raw URLs
    const params = instruments.map(i => `i=${encodeURIComponent(i)}`).join("&");
    const res = await kiteRequest<Record<string, any>>(
        `/quote/ohlc?${params}`,
        apiKey,
        accessToken
    );
    return res.data;
}

// ─── Order Trades (actual fills) ─────────────────────────────
/**
 * GET /orders/{order_id}/trades
 * Returns actual fill-level data for a placed order.
 * Used for post-trade attribution — gives real fill price,
 * fill quantity, and exchange timestamp (unlike average_price from /orders).
 */
export async function getOrderTrades(
    apiKey: string,
    accessToken: string,
    orderId: string
): Promise<any[]> {
    const res = await kiteRequest<any[]>(`/orders/${orderId}/trades`, apiKey, accessToken);
    return res.data;
}
// ─── Historical Data ──────────────────────────────────────────
export async function getHistoricalData(
    apiKey: string,
    accessToken: string,
    instrumentToken: string | number,
    interval: string,
    from: string,
    to: string
): Promise<any[]> {
    const path = `/instruments/historical/${instrumentToken}/${interval}?from=${from}&to=${to}`;
    const res = await kiteRequest<any>(path, apiKey, accessToken);
    return res.data.candles;
}

// ─── Pre-Trade Margin & Charges ──────────────────────────────
export interface KiteMarginOrder {
    exchange: string;
    tradingsymbol: string;
    transaction_type: "BUY" | "SELL";
    variety: string;
    product: string;
    order_type: string;
    quantity: number;
    price?: number;
    trigger_price?: number;
}

/**
 * Calculate required margin for one or more orders before placement.
 * POST /margins/orders — requires JSON body.
 */
export async function getOrderMargins(
    apiKey: string,
    accessToken: string,
    orders: KiteMarginOrder[]
): Promise<any[]> {
    const res = await kiteRequest<any[]>("/margins/orders", apiKey, accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orders),
    });
    return res.data;
}

/**
 * Calculate basket margin with spread benefit.
 * POST /margins/basket — returns initial vs final margin after netting.
 */
export async function getBasketMargins(
    apiKey: string,
    accessToken: string,
    orders: KiteMarginOrder[]
): Promise<{ initial: any; final: any }> {
    const res = await kiteRequest<{ initial: any; final: any }>("/margins/basket", apiKey, accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orders),
    });
    return res.data;
}

/**
 * Calculate brokerage + tax charges for proposed orders.
 * POST /charges/orders — returns per-order charge breakdown.
 */
export async function getOrderCharges(
    apiKey: string,
    accessToken: string,
    orders: KiteMarginOrder[]
): Promise<any[]> {
    const res = await kiteRequest<any[]>("/charges/orders", apiKey, accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orders),
    });
    return res.data;
}

// ─── Alerts ──────────────────────────────────────────────────
export async function getAlerts(
    apiKey: string,
    accessToken: string
): Promise<any[]> {
    const res = await kiteRequest<any[]>("/alerts", apiKey, accessToken);
    return res.data;
}

export async function createAlert(
    apiKey: string,
    accessToken: string,
    params: {
        name: string;
        lhs_exchange: string;
        lhs_tradingsymbol: string;
        lhs_attribute: string;
        operator: string;
        rhs_type: string;
        rhs_constant: number;
    }
): Promise<{ uuid: string }> {
    const body = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => body.set(k, String(v)));
    const res = await kiteRequest<{ uuid: string }>("/alerts", apiKey, accessToken, {
        method: "POST",
        body,
    });
    return res.data;
}

export async function deleteAlert(
    apiKey: string,
    accessToken: string,
    uuid: string
): Promise<void> {
    await kiteRequest(`/alerts?uuid=${uuid}`, apiKey, accessToken, {
        method: "DELETE",
    });
}

export async function getAlertHistory(
    apiKey: string,
    accessToken: string,
    uuid: string
): Promise<any[]> {
    const res = await kiteRequest<any[]>(`/alerts/${uuid}/history`, apiKey, accessToken);
    return res.data;
}

// ─── Rate Limiter ──────────────────────────────────────────────
class KiteRateLimiter {
    private static lastRequestAt = 0;
    private static minInterval = 350; // ~3 requests per second

    static async wait() {
        const now = Date.now();
        const diff = now - this.lastRequestAt;
        if (diff < this.minInterval) {
            const delay = this.minInterval - diff;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        this.lastRequestAt = Date.now();
    }
}
