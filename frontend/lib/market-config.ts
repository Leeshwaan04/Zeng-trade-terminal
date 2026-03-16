export const MARKET_INSTRUMENTS = [
    // ── Major Indices ─────────────────────────────────────────
    { symbol: "NIFTY 50", token: 256265, exchange: "NSE", groww_token: "NIDX:26000" },
    { symbol: "BANKNIFTY", token: 260105, exchange: "NSE", groww_token: "NIDX:26009" },
    { symbol: "FINNIFTY", token: 257801, exchange: "NSE" },
    { symbol: "MIDCPNIFTY", token: 288009, exchange: "NSE" },
    { symbol: "NIFTY NEXT 50", token: 257025, exchange: "NSE" },
    { symbol: "NIFTY IT", token: 19585, exchange: "NSE" },
    { symbol: "NIFTY AUTO", token: 16641, exchange: "NSE" },
    { symbol: "NIFTY METAL", token: 17409, exchange: "NSE" },
    { symbol: "NIFTY PHARMA", token: 19459, exchange: "NSE" },
    { symbol: "NIFTY BANK", token: 260105, exchange: "NSE" },
    { symbol: "NIFTY FMCG", token: 20483, exchange: "NSE" },
    { symbol: "INDIA VIX", token: 264969, exchange: "NSE" },
    { symbol: "SENSEX", token: 265, exchange: "BSE" },

    // ── Large Cap Stocks ─────────────────────────────────────
    { symbol: "RELIANCE", token: 738561, exchange: "NSE", groww_token: "NSE:2885" },
    { symbol: "HDFCBANK", token: 341249, exchange: "NSE", groww_token: "NSE:1333" },
    { symbol: "INFY", token: 408065, exchange: "NSE", groww_token: "NSE:1594" },
    { symbol: "TCS", token: 2953213, exchange: "NSE", groww_token: "NSE:11536" },
    { symbol: "ICICIBANK", token: 1270529, exchange: "NSE", groww_token: "NSE:4963" },
    { symbol: "SBIN", token: 779521, exchange: "NSE", groww_token: "NSE:3045" },
    { symbol: "AXISBANK", token: 1510401, exchange: "NSE", groww_token: "NSE:5900" },
    { symbol: "TATASTEEL", token: 897537, exchange: "NSE", groww_token: "NSE:3499" },
    { symbol: "WIPRO", token: 969473, exchange: "NSE" },
    { symbol: "HCLTECH", token: 1850625, exchange: "NSE" },
    { symbol: "LT", token: 2939649, exchange: "NSE" },
    { symbol: "MARUTI", token: 2815745, exchange: "NSE" },
    { symbol: "BAJFINANCE", token: 81153, exchange: "NSE" },
    { symbol: "BAJAJFINSV", token: 54273, exchange: "NSE" },
    { symbol: "HINDUNILVR", token: 356865, exchange: "NSE" },
    { symbol: "TITAN", token: 897473, exchange: "NSE" },
    { symbol: "ITC", token: 424961, exchange: "NSE" },
    { symbol: "KOTAKBANK", token: 492033, exchange: "NSE" },
    { symbol: "ASIANPAINT", token: 60417, exchange: "NSE" },
    { symbol: "ULTRACEMCO", token: 2952193, exchange: "NSE" },
    { symbol: "BHARTIARTL", token: 2714625, exchange: "NSE" },
    { symbol: "SUNPHARMA", token: 857857, exchange: "NSE" },
    { symbol: "ADANIPORTS", token: 3861249, exchange: "NSE" },
    { symbol: "NTPC", token: 2977281, exchange: "NSE" },
    { symbol: "POWERGRID", token: 3834113, exchange: "NSE" },
    { symbol: "NESTLEIND", token: 4598529, exchange: "NSE" },
    { symbol: "TECHM", token: 3465729, exchange: "NSE" },
    { symbol: "M&M", token: 519937, exchange: "NSE" },
    { symbol: "DRREDDY", token: 225537, exchange: "NSE" },
    { symbol: "CIPLA", token: 177665, exchange: "NSE" },
    { symbol: "ONGC", token: 633601, exchange: "NSE" },
    { symbol: "COALINDIA", token: 5215745, exchange: "NSE" },
    { symbol: "HINDALCO", token: 348929, exchange: "NSE" },
    { symbol: "JSWSTEEL", token: 3001089, exchange: "NSE" },
    { symbol: "GRASIM", token: 315393, exchange: "NSE" },
    { symbol: "INDUSINDBK", token: 1346049, exchange: "NSE" },
    { symbol: "TATACONSUM", token: 878593, exchange: "NSE" },

    // ── Global (placeholder tokens — no live data from Kite) ──
    { symbol: "NIKKEI 225", token: 0, exchange: "GLOBAL" },
    { symbol: "DAX", token: 0, exchange: "GLOBAL" },
    { symbol: "NASDAQ", token: 0, exchange: "GLOBAL" },
    { symbol: "DOW JONES", token: 0, exchange: "GLOBAL" },
    { symbol: "GIFT NIFTY", token: 0, exchange: "GLOBAL" },
    { symbol: "US 500", token: 0, exchange: "GLOBAL" },
];

export const getInstrumentToken = (symbol: string): number | undefined => {
    const inst = MARKET_INSTRUMENTS.find(i => i.symbol === symbol);
    return inst?.token || undefined;
};

export const getSymbolByToken = (token: number): string | undefined => {
    return MARKET_INSTRUMENTS.find(i => i.token === token)?.symbol;
};

export const getGrowwToken = (symbol: string): string | undefined => {
    return MARKET_INSTRUMENTS.find(i => i.symbol === symbol)?.groww_token;
};

/** Returns all index tokens (non-zero) for initial subscription */
export const getDefaultSubscriptionTokens = (): number[] => {
    return [256265, 260105, 257801, 288009, 264969, 265] // NIFTY50, BANKNIFTY, FINNIFTY, MIDCPNIFTY, INDIAVIX, SENSEX
        .filter(Boolean);
};
