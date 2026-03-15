import { create } from 'zustand';
import { MARKET_INSTRUMENTS } from '@/lib/market-config';

// O(1) token→symbol lookup built once at module init.
// Replaces the O(n) MARKET_INSTRUMENTS.find() called on every single tick.
const TOKEN_TO_SYMBOL = new Map<number | string, string>(
    MARKET_INSTRUMENTS
        .filter(i => i.token > 0)
        .map(i => [i.token, i.symbol] as [number, string])
);
const GROWW_TOKEN_TO_SYMBOL = new Map<string, string>(
    MARKET_INSTRUMENTS
        .filter(i => i.groww_token)
        .map(i => [i.groww_token!, i.symbol])
);

export interface TickerData {
    symbol: string;
    instrument_token: number | string;
    last_price: number;
    fused_price?: number;
    last_quantity: number;
    volume: number;
    average_price: number;
    oi: number;
    net_change: number;
    change_percent: number;
    oi_change?: number; // Cyber-Nerve Delta
    ohlc: {
        open: number;
        high: number;
        low: number;
        close: number;
    };
    depth: {
        buy: { price: number; quantity: number; orders: number }[];
        sell: { price: number; quantity: number; orders: number }[];
    };
    timestamp: number;
    indicators?: {
        ema20?: number | null;
        rsi14?: number | null;
    };
}

export interface MarketSentiment {
    indiaVix: number;
    vixChange: number;
    advances: number;
    declines: number;
    total: number;
}

interface MarketState {
    tickers: Record<string, TickerData>;
    secondaryTickers: Record<string, TickerData>;
    updateTicker: (data: TickerData) => void;
    updateTickers: (dataArray: TickerData[]) => void;
    updateSecondaryTicker: (data: TickerData) => void;
    updateSecondaryTickers: (dataArray: TickerData[]) => void;
    unifiedMargin: { totalMargin: number; brokers: Record<string, any> };
    updateUnifiedMargin: (data: any) => void;
    // Unified Subscription Management
    subscribe: (identifiers: (string | number)[]) => void;
    unsubscribe: (identifiers: (string | number)[]) => void;
    marketSentiment: MarketSentiment;
    updateSentiment: (data: Partial<MarketSentiment>) => void;
    connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
    setConnectionStatus: (status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING') => void;
    metrics: { latency: number; integrity: number };
    updateMetrics: (data: { latency?: number; integrity?: number }) => void;
    subscribedTokens: Set<number>;
    subscribedLtpTokens: Set<number>;
    subscribedQuoteTokens: Set<number>;
    subscribedFullTokens: Set<number>;
    subscribeMode: (identifiers: (string | number)[], mode: 'ltp' | 'quote' | 'full') => void;
    unsubscribeMode: (identifiers: (string | number)[], mode: 'ltp' | 'quote' | 'full') => void;
}

// Empty initial state — show "—" until live WebSocket data arrives
const EMPTY_TICKER = (symbol: string, token = "0"): TickerData => ({
    symbol, instrument_token: token, last_price: 0, last_quantity: 0, volume: 0,
    average_price: 0, oi: 0, net_change: 0, change_percent: 0,
    ohlc: { open: 0, high: 0, low: 0, close: 0 },
    depth: { buy: [], sell: [] }, timestamp: 0,
});

const INITIAL_TICKERS: Record<string, TickerData> = {
    // Core NSE/BSE — real Kite tokens, will receive live data when authenticated
    "NIFTY 50": EMPTY_TICKER("NIFTY 50", "256265"),
    "NIFTY BANK": EMPTY_TICKER("NIFTY BANK", "260105"),
    "NIFTY FIN SERVICE": EMPTY_TICKER("NIFTY FIN SERVICE", "257801"),
    "NIFTY MID SELECT": EMPTY_TICKER("NIFTY MID SELECT", "288009"),
    "SENSEX": EMPTY_TICKER("SENSEX", "265"),
    "BANKEX": EMPTY_TICKER("BANKEX", "274"),
    "INDIA VIX": EMPTY_TICKER("INDIA VIX", "264969"),
    // Sectoral — real Kite NSE index tokens
    "NIFTY IT": EMPTY_TICKER("NIFTY IT", "262153"),
    "NIFTY AUTO": EMPTY_TICKER("NIFTY AUTO", "262921"),
    "NIFTY METAL": EMPTY_TICKER("NIFTY METAL", "262409"),
    "NIFTY NEXT 50": EMPTY_TICKER("NIFTY NEXT 50", "270857"),
    "NIFTY PHARMA": EMPTY_TICKER("NIFTY PHARMA", "261641"),
    "NIFTY FMCG": EMPTY_TICKER("NIFTY FMCG", "261897"),
    "NIFTY REALTY": EMPTY_TICKER("NIFTY REALTY", "263689"),
    "NIFTY ENERGY": EMPTY_TICKER("NIFTY ENERGY", "262665"),
};

export const useMarketStore = create<MarketState>((set) => ({
    tickers: INITIAL_TICKERS,
    secondaryTickers: {},
    updateTicker: (data) =>
        set((state) => {
            const newTickers = { ...state.tickers, [data.symbol]: data };
            // Also index by token string so OptionChain lookup-by-token works
            if (data.instrument_token) {
                newTickers[String(data.instrument_token)] = data;
            }
            return { tickers: newTickers };
        }),
    updateTickers: (dataArray) =>
        set((state) => {
            const newTickers = { ...state.tickers };
            for (const data of dataArray) {
                let symbol = data.symbol;
                // O(1) lookup via pre-built Maps — was O(n) MARKET_INSTRUMENTS.find() per tick
                if (!symbol && data.instrument_token) {
                    symbol =
                        TOKEN_TO_SYMBOL.get(Number(data.instrument_token)) ||
                        GROWW_TOKEN_TO_SYMBOL.get(String(data.instrument_token)) ||
                        undefined;
                }
                if (symbol) {
                    newTickers[symbol] = { ...data, symbol };
                }
                // Also index by token string — lets OptionChain & Depth do O(1) token lookup
                if (data.instrument_token) {
                    newTickers[String(data.instrument_token)] = { ...data, symbol: symbol || String(data.instrument_token) };
                }
            }
            return { tickers: newTickers };
        }),
    updateSecondaryTicker: (data) =>
        set((state) => ({
            secondaryTickers: {
                ...state.secondaryTickers,
                [data.symbol]: data,
            },
        })),
    updateSecondaryTickers: (dataArray) =>
        set((state) => {
            const newTickers = { ...state.secondaryTickers };
            for (const data of dataArray) {
                newTickers[data.symbol] = data;
            }
            return { secondaryTickers: newTickers };
        }),
    unifiedMargin: { totalMargin: 0, brokers: {} },
    updateUnifiedMargin: (data) => set({ unifiedMargin: data }),
    subscribe: (identifiers) => set((state) => {
        const newTokens = new Set(state.subscribedTokens);
        identifiers.forEach(id => {
            if (typeof id === 'number') {
                newTokens.add(id);
            } else {
                console.log(`Subscribed to Symbol: ${id}`);
            }
        });
        return { subscribedTokens: newTokens };
    }),
    unsubscribe: (identifiers) => set((state) => {
        const newTokens = new Set(state.subscribedTokens);
        identifiers.forEach(id => {
            if (typeof id === 'number') newTokens.delete(id);
        });
        return { subscribedTokens: newTokens };
    }),
    marketSentiment: {
        indiaVix: 13.45,
        vixChange: -2.1,
        advances: 1240,
        declines: 850,
        total: 2090
    },
    updateSentiment: (data) =>
        set((state) => ({
            marketSentiment: { ...state.marketSentiment, ...data }
        })),
    connectionStatus: 'DISCONNECTED',
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    metrics: { latency: 4, integrity: 99.9 },
    updateMetrics: (data: { latency?: number; integrity?: number }) => set((state) => ({
        metrics: { ...state.metrics, ...data }
    })),
    subscribedTokens: new Set<number>(),
    subscribedLtpTokens: new Set<number>(),
    subscribedQuoteTokens: new Set<number>(),
    subscribedFullTokens: new Set<number>(),

    subscribeMode: (identifiers, mode) => set((state) => {
        const key = mode === 'ltp' ? 'subscribedLtpTokens' : mode === 'quote' ? 'subscribedQuoteTokens' : 'subscribedFullTokens';
        const newSet = new Set(state[key]);
        const allTokens = new Set(state.subscribedTokens);

        identifiers.forEach(id => {
            if (typeof id === 'number') {
                newSet.add(id);
                allTokens.add(id);
            }
        });
        return { [key]: newSet, subscribedTokens: allTokens };
    }),

    unsubscribeMode: (identifiers, mode) => set((state) => {
        const key = mode === 'ltp' ? 'subscribedLtpTokens' : mode === 'quote' ? 'subscribedQuoteTokens' : 'subscribedFullTokens';
        const newSet = new Set(state[key]);
        identifiers.forEach(id => {
            if (typeof id === 'number') newSet.delete(id);
        });
        return { [key]: newSet };
    }),
}));
