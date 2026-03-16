/**
 * Groww Trade API — Server-side REST client
 */

const GROWW_API_BASE = "https://api.groww.in/v1";

export interface GrowwOrderParams {
    trading_symbol: string;
    exchange: string;
    transaction_type: "BUY" | "SELL";
    order_type: "MARKET" | "LIMIT" | "SL" | "SL-M";
    quantity: number;
    price: number;
    product: "CNC" | "NRML" | "MIS";
    segment: "CASH" | "FNO";
    validity: "DAY" | "IOC";
}

export interface GrowwResponse<T = any> {
    status: "SUCCESS" | "FAILURE";
    payload?: T;
    error?: {
        code: string;
        message: string;
    };
}

async function growwRequest<T = any>(
    path: string,
    accessToken: string,
    options: RequestInit = {}
): Promise<GrowwResponse<T>> {
    const url = `${GROWW_API_BASE}${path}`;

    const res = await fetch(url, {
        ...options,
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "X-API-VERSION": "1.0",
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...(options.headers || {}),
        },
    });

    const json = await res.json();

    if (!res.ok || json.status === "FAILURE") {
        throw new Error(json.error?.message || `Groww API error: ${res.status}`);
    }

    return json as GrowwResponse<T>;
}

export async function getGrowwOrders(accessToken: string): Promise<any[]> {
    const res = await growwRequest<any[]>("/order/all", accessToken);
    return res.payload || [];
}

export async function placeGrowwOrder(
    accessToken: string,
    params: GrowwOrderParams
): Promise<{ groww_order_id: string }> {
    const res = await growwRequest<{ groww_order_id: string }>(
        "/order/create",
        accessToken,
        {
            method: "POST",
            body: JSON.stringify(params),
        }
    );
    return res.payload!;
}

export async function getGrowwPositions(accessToken: string): Promise<any[]> {
    const res = await growwRequest<any>("/portfolio/positions", accessToken);
    // Groww usually returns positions in a payload.positions or similar
    // Mapping to a flat array for unified UI
    return res.payload?.positions || [];
}

export async function getGrowwHoldings(accessToken: string): Promise<any[]> {
    const res = await growwRequest<any>("/portfolio/holdings", accessToken);
    return res.payload?.holdings || [];
}

export async function getHistoricalOHLC(
    accessToken: string,
    symbol: string,
    interval: string,
    from: string,
    to: string
): Promise<any[]> {
    const res = await growwRequest<any>(
        `/charts/ohlc?symbol=${symbol}&interval=${interval}&from=${from}&to=${to}`,
        accessToken
    );
    return res.payload?.candles || [];
}

export async function getOptionChainData(
    accessToken: string,
    symbol: string,
    expiry: string
): Promise<any> {
    const res = await growwRequest<any>(
        `/fno/option-chain?symbol=${symbol}&expiry=${expiry}`,
        accessToken
    );
    return res.payload;
}
