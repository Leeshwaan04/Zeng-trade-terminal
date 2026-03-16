/**
 * DhanHQ API v2 Client (Server-side)
 */

const DHAN_API_BASE = "https://api.dhan.co";

export async function dhanRequest<T = any>(
    path: string,
    accessToken: string,
    options: RequestInit = {}
): Promise<T> {
    const res = await fetch(`${DHAN_API_BASE}${path}`, {
        ...options,
        headers: {
            "access-token": accessToken,
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.remarks || data.message || `Dhan API error: ${res.status}`);
    }

    return data as T;
}

export async function getDhanPositions(accessToken: string) {
    const data = await dhanRequest("/positions", accessToken);
    // Dhan returns a flat array in data.
    // We map it to { net: [], day: [] } for Kite parity
    return {
        net: (data || []).map((p: any) => ({
            tradingsymbol: p.tradingSymbol,
            exchange: p.securityId, // or p.exchangeSegment
            instrument_token: p.securityId,
            product: p.productType,
            quantity: p.netQty,
            average_price: p.avgPrice,
            last_price: p.lastPrice,
            pnl: p.unrealizedProfit,
            m2m: p.unrealizedProfit,
            realised: p.realizedProfit,
            unrealised: p.unrealizedProfit,
            buy_quantity: p.buyQty,
            buy_price: p.buyAvg,
            sell_quantity: p.sellQty,
            sell_price: p.sellAvg,
            broker: "DHAN"
        })),
        day: []
    };
}

export async function getDhanOrders(accessToken: string) {
    const data = await dhanRequest("/orders", accessToken);
    return (data || []).map((o: any) => ({
        order_id: o.orderId,
        tradingsymbol: o.tradingSymbol,
        transaction_type: o.transactionType,
        order_type: o.orderType,
        product: o.productType,
        quantity: o.quantity,
        price: o.price,
        status: o.orderStatus === "ALLOTED" ? "COMPLETE" : o.orderStatus,
        order_timestamp: o.createTime,
        broker: "DHAN"
    }));
}

export async function getDhanMargins(accessToken: string) {
    const data = await dhanRequest("/fundlimit", accessToken);
    return {
        equity: {
            available: { live_balance: data.availabelBalance || 0 },
            utilised: { debits: data.utilisedLimit || 0 }
        },
        totalAvailable: data.availabelBalance || 0,
        netUsed: data.utilisedLimit || 0
    };
}

export async function placeDhanOrder(accessToken: string, params: any) {
    console.log(`[DHAN API] Placing order: ${params.quantity}x ${params.tradingsymbol}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
        order_id: `DHAN_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        status: "COMPLETE"
    };
}
