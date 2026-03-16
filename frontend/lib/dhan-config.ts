export const DHAN_EXCHANGE_SEGMENT = {
    NSE: "NSE_EQ",
    BSE: "BSE_EQ",
    NFO: "NSE_FNO",
    BFO: "BSE_FNO",
    MCX: "MCX_COMM",
    CDS: "NSE_CURR",
};

// Map Symbol -> Security ID (Mock for now, normally requires a huge CSV)
export const DHAN_INSTRUMENTS: Record<string, string> = {
    "NIFTY 50": "13", // Mock ID
    "BANKNIFTY": "25",
    "RELIANCE": "1333",
    "TCS": "11536",
    // Add more...
};

export function getDhanInstrument(symbol: string) {
    // Return { ExchangeSegment, SecurityId }
    // Logic: Check symbol map
    const id = DHAN_INSTRUMENTS[symbol];
    if (id) return { ExchangeSegment: "NSE_EQ", SecurityId: id }; // Default to NSE
    return null;
}
