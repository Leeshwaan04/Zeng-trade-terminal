// Groww broker client — integration not yet implemented.
// These are honest stubs so the GROWW branches in API routes fail with a
// clear message instead of breaking the build. Callers already wrap these
// in try/catch and surface the error as a JSON response.

export interface GrowwOrderParams {
    exchange: string;
    order_type: "LIMIT" | "MARKET" | "SL" | "SL-M";
    quantity: number;
    product: string;
    validity: "DAY" | "IOC";
    segment: string;
    trading_symbol: string;
    price: number;
    transaction_type?: "BUY" | "SELL";
    trigger_price?: number;
}

export interface GrowwOrderResponse {
    order_id: string;
    status: string;
}

export async function placeGrowwOrder(
    _accessToken: string,
    _params: GrowwOrderParams
): Promise<GrowwOrderResponse> {
    throw new Error("Groww integration is not yet available. Please use a supported broker.");
}

export async function getGrowwHoldings(_accessToken: string): Promise<unknown[]> {
    throw new Error("Groww integration is not yet available. Please use a supported broker.");
}
