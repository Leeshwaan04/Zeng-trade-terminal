export const FYERS_EXCHANGE_SEGMENT = {
    NSE: "NSE",
    BSE: "BSE",
    NFO: "NFO",
    MCX: "MCX",
};

export const FYERS_INSTRUMENTS: Record<string, string> = {
    "NIFTY 50": "NSE:NIFTY50-INDEX",
    "BANKNIFTY": "NSE:NIFTYBANK-INDEX",
    "RELIANCE": "NSE:RELIANCE-EQ",
    "TCS": "NSE:TCS-EQ",
    // Add more...
};

export function getFyersInstrument(symbol: string) {
    return FYERS_INSTRUMENTS[symbol];
}
