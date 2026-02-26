import Fuse from 'fuse.js';

export interface SearchInstrument {
    symbol: string;
    description: string;
    exchange: "NSE" | "BSE" | "NFO" | "MCX";
    segment: "EQ" | "FUT" | "PE" | "CE";
    token: number;
    expiry?: string;
    lot_size?: number;
}

// A curated list of ~50 popular instruments for the Lite Engine
// In a real app, this would be 80k+ items loaded from a compressed JSON
const MASTER_INSTRUMENTS: SearchInstrument[] = [
    { symbol: "RELIANCE", description: "Reliance Industries", exchange: "NSE", segment: "EQ", token: 738561 },
    { symbol: "HDFCBANK", description: "HDFC Bank Ltd", exchange: "NSE", segment: "EQ", token: 341249 },
    { symbol: "INFY", description: "Infosys Ltd", exchange: "NSE", segment: "EQ", token: 408065 },
    { symbol: "TCS", description: "Tata Consultancy Services", exchange: "NSE", segment: "EQ", token: 2953213 },
    { symbol: "NIFTY 50", description: "Nifty 50 Index", exchange: "NSE", segment: "EQ", token: 256265 },
    { symbol: "BANKNIFTY", description: "Nifty Bank Index", exchange: "NSE", segment: "EQ", token: 260105 },
    { symbol: "SBIN", description: "State Bank of India", exchange: "NSE", segment: "EQ", token: 779521 },
    { symbol: "TATAMOTORS", description: "Tata Motors Ltd", exchange: "NSE", segment: "EQ", token: 884737 },
    { symbol: "ICICIBANK", description: "ICICI Bank Ltd", exchange: "NSE", segment: "EQ", token: 1270529 },
    { symbol: "AXISBANK", description: "Axis Bank Ltd", exchange: "NSE", segment: "EQ", token: 1510401 },
    { symbol: "MARUTI", description: "Maruti Suzuki India", exchange: "NSE", segment: "EQ", token: 2815745 },
    { symbol: "SUNPHARMA", description: "Sun Pharma Industries", exchange: "NSE", segment: "EQ", token: 857857 },
    { symbol: "ADANIENT", description: "Adani Enterprises", exchange: "NSE", segment: "EQ", token: 3861249 },
    { symbol: "WIPRO", description: "Wipro Ltd", exchange: "NSE", segment: "EQ", token: 969473 },
    { symbol: "ITC", description: "ITC Ltd", exchange: "NSE", segment: "EQ", token: 424961 },
    { symbol: "BAJFINANCE", description: "Bajaj Finance", exchange: "NSE", segment: "EQ", token: 81153 },
    { symbol: "NIFTY 27MAR24 FUT", description: "Nifty Futures Mar", exchange: "NFO", segment: "FUT", token: 0, expiry: "27 MAR" },
    { symbol: "BANKNIFTY 27MAR24 FUT", description: "Bank Nifty Futures Mar", exchange: "NFO", segment: "FUT", token: 0, expiry: "27 MAR" },
    { symbol: "CRUDEOIL 19APR24 FUT", description: "Crude Oil Futures", exchange: "MCX", segment: "FUT", token: 0, expiry: "19 APR" },
    { symbol: "GOLDPETAL 24APR24 FUT", description: "Gold Petal Futures", exchange: "MCX", segment: "FUT", token: 0, expiry: "24 APR" }
];

const fuse = new Fuse(MASTER_INSTRUMENTS, {
    keys: ['symbol', 'description'],
    threshold: 0.3,
    distance: 100
});

export const searchLite = (query: string): SearchInstrument[] => {
    if (!query) return [];
    return fuse.search(query).map(result => result.item);
};
