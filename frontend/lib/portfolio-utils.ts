/**
 * Normalized Portfolio Types & Utilities
 * Provides a unified schema for multi-broker holdings and positions.
 */

export type BrokerType = "KITE" | "GROWW" | "ANGEL" | "DHAN" | "FYERS" | "5PAISA";

export interface NormalizedHolding {
    broker: BrokerType;
    tradingsymbol: string;
    exchange: string;
    isin: string;
    quantity: number;
    average_price: number;
    last_price: number;
    pnl: number;
    pnl_percentage: number;
    collateral_quantity: number;
    t1_quantity: number;
}

export interface NormalizedPosition {
    broker: BrokerType;
    tradingsymbol: string;
    exchange: string;
    instrument_token: string;
    product: string;
    quantity: number;
    overnight_quantity: number;
    multiplier: number;
    average_price: number;
    last_price: number;
    pnl: number;
    realised: number;
    unrealised: number;
    buy_quantity: number;
    sell_quantity: number;
    buy_price: number;
    sell_price: number;
}

// ─── Normalizers ─────────────────────────────────────────────

export function normalizeKiteHolding(kh: any): NormalizedHolding {
    return {
        broker: "KITE",
        tradingsymbol: kh.tradingsymbol,
        exchange: kh.exchange,
        isin: kh.isin,
        quantity: kh.quantity,
        average_price: kh.average_price,
        last_price: kh.last_price,
        pnl: kh.pnl,
        pnl_percentage: (kh.pnl / (kh.average_price * kh.quantity)) * 100 || 0,
        collateral_quantity: kh.collateral_quantity || 0,
        t1_quantity: kh.t1_quantity || 0,
    };
}
export function normalizeKitePosition(kp: any): NormalizedPosition {
    return {
        broker: "KITE",
        tradingsymbol: kp.tradingsymbol,
        exchange: kp.exchange,
        instrument_token: kp.instrument_token,
        product: kp.product,
        quantity: kp.quantity,
        overnight_quantity: kp.overnight_quantity,
        multiplier: kp.multiplier,
        average_price: kp.average_price,
        last_price: kp.last_price,
        pnl: kp.pnl,
        realised: kp.realised,
        unrealised: kp.unrealised,
        buy_quantity: kp.buy_quantity,
        sell_quantity: kp.sell_quantity,
        buy_price: kp.buy_price,
        sell_price: kp.sell_price,
    };
}
