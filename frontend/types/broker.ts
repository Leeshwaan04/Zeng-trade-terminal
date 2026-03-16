/**
 * Universal Broker Types
 * Standardizes data structures across Kite, Dhan, etc.
 */

export type BrokerID = "KITE" | "GROWW" | "DHAN" | "ANGEL";

export type BrokerType = "KITE" | "GROWW" | "DHAN" | "ANGEL" | "FYERS" | "5PAISA";

export interface UniversalTick {
    symbol: string;         // Standardized symbol (e.g., "NIFTY 50")
    brokerToken: string;    // Broker-specific ID (e.g., "256265" for Kite)
    lastPrice: number;
    volume: number;
    ohlc: {
        open: number;
        high: number;
        low: number;
        close: number;
    };
    depth?: {
        buy: OrderBookEntry[];
        sell: OrderBookEntry[];
    };
    change: number;         // Net change
    changePercent: number;
    timestamp: number;
    indicators?: {
        ema20?: number | null;
        rsi14?: number | null;
    };
}

export interface OrderBookEntry {
    price: number;
    quantity: number;
    orders: number;
}

export interface UniversalOrder {
    orderId: string;
    broker: BrokerID;
    symbol: string;
    transactionType: "BUY" | "SELL";
    orderType: "MARKET" | "LIMIT" | "SL" | "SL-M";
    quantity: number;
    price: number;
    triggerPrice?: number;
    status: "OPEN" | "COMPLETE" | "CANCELLED" | "REJECTED";
    timestamp: string;
}
