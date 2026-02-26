export const MARKET_INSTRUMENTS = [
    { symbol: "NIFTY 50", token: 256265, exchange: "NSE", upstox_token: "NSE_INDEX|Nifty 50", groww_token: "NIDX:26000" },
    { symbol: "BANKNIFTY", token: 260105, exchange: "NSE", upstox_token: "NSE_INDEX|Nifty Bank", groww_token: "NIDX:26009" },
    { symbol: "RELIANCE", token: 738561, exchange: "NSE", upstox_token: "NSE_EQ|INE002A01018", groww_token: "NSE:2885" },
    { symbol: "HDFCBANK", token: 341249, exchange: "NSE", upstox_token: "NSE_EQ|INE040A01034", groww_token: "NSE:1333" },
    { symbol: "INFY", token: 408065, exchange: "NSE", upstox_token: "NSE_EQ|INE009A01021", groww_token: "NSE:1594" },
    { symbol: "TCS", token: 2953213, exchange: "NSE", upstox_token: "NSE_EQ|INE467B01029", groww_token: "NSE:11536" },
    { symbol: "ICICIBANK", token: 1270529, exchange: "NSE", upstox_token: "NSE_EQ|INE090A01021", groww_token: "NSE:4963" },
    { symbol: "SBIN", token: 779521, exchange: "NSE", upstox_token: "NSE_EQ|INE062A01020", groww_token: "NSE:3045" },
    { symbol: "AXISBANK", token: 1510401, exchange: "NSE", upstox_token: "NSE_EQ|INE238A01034", groww_token: "NSE:5900" },
    { symbol: "TATASTEEL", token: 897537, exchange: "NSE", upstox_token: "NSE_EQ|INE081A01012", groww_token: "NSE:3499" },
    // Sectoral Indices (Tokens need verification)
    { symbol: "NIFTY IT", token: 19585, exchange: "NSE", upstox_token: "NSE_INDEX|Nifty IT" },
    { symbol: "NIFTY AUTO", token: 16641, exchange: "NSE", upstox_token: "NSE_INDEX|Nifty Auto" },
    { symbol: "NIFTY METAL", token: 17409, exchange: "NSE", upstox_token: "NSE_INDEX|Nifty Metal" },
    { symbol: "NIFTY NEXT 50", token: 257025, exchange: "NSE", upstox_token: "NSE_INDEX|Nifty Next 50" },
    // Global Indices (Proxies or Futures)
    { symbol: "NIKKEI 225", token: 0, exchange: "GLOBAL", upstox_token: "" },
    { symbol: "DAX", token: 0, exchange: "GLOBAL", upstox_token: "" },
    { symbol: "NASDAQ", token: 0, exchange: "GLOBAL", upstox_token: "" },
    { symbol: "DOW JONES", token: 0, exchange: "GLOBAL", upstox_token: "" },
];

export const getInstrumentToken = (symbol: string) => {
    return MARKET_INSTRUMENTS.find(i => i.symbol === symbol)?.token;
};

export const getUpstoxToken = (symbol: string) => {
    return MARKET_INSTRUMENTS.find(i => i.symbol === symbol)?.upstox_token;
};

export const getGrowwToken = (symbol: string) => {
    return MARKET_INSTRUMENTS.find(i => i.symbol === symbol)?.groww_token;
};
