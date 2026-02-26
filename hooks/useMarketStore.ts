import { create } from 'zustand';

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
    updateSecondaryTicker: (data: TickerData) => void;
    unifiedMargin: { totalMargin: number; brokers: Record<string, any> };
    updateUnifiedMargin: (data: any) => void;
    // Unified Subscription Management
    subscribe: (identifiers: (string | number)[]) => void;
    unsubscribe: (identifiers: (string | number)[]) => void;
    marketSentiment: MarketSentiment;
    updateSentiment: (data: Partial<MarketSentiment>) => void;
    connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING';
    setConnectionStatus: (status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING') => void;
    subscribedTokens: Set<number>;
}

// Initial Static Data (Yesterday's Close approx) to prevent empty header
const INITIAL_TICKERS: Record<string, TickerData> = {
    "NIFTY 50": {
        symbol: "NIFTY 50", instrument_token: "256265", last_price: 25471.10, last_quantity: 0, volume: 0,
        average_price: 0, oi: 0, net_change: -336.10, change_percent: -1.30,
        ohlc: { open: 25800, high: 25800, low: 25400, close: 25807.20 },
        depth: { buy: [], sell: [] }, timestamp: Date.now()
    },
    "BANKNIFTY": {
        symbol: "BANKNIFTY", instrument_token: "260105", last_price: 60186.65, last_quantity: 0, volume: 0,
        average_price: 0, oi: 0, net_change: -553.10, change_percent: -0.91,
        ohlc: { open: 60700, high: 60700, low: 60100, close: 60739.75 },
        depth: { buy: [], sell: [] }, timestamp: Date.now()
    },
    "FINNIFTY": {
        symbol: "FINNIFTY", instrument_token: "257801", last_price: 23950.00, last_quantity: 0, volume: 0,
        average_price: 0, oi: 0, net_change: -120, change_percent: -0.50,
        ohlc: { open: 24000, high: 24000, low: 23900, close: 24070 },
        depth: { buy: [], sell: [] }, timestamp: Date.now()
    },
    "SENSEX": {
        symbol: "SENSEX", instrument_token: "265", last_price: 82626.76, last_quantity: 0, volume: 0,
        average_price: 0, oi: 0, net_change: -1048.16, change_percent: -1.25,
        ohlc: { open: 83500, high: 83500, low: 82500, close: 83674.92 },
        depth: { buy: [], sell: [] }, timestamp: Date.now()
    },
    "GIFT NIFTY": {
        symbol: "GIFT NIFTY", instrument_token: "0", last_price: 22550.00, last_quantity: 0, volume: 0,
        average_price: 0, oi: 0, net_change: 50, change_percent: 0.22,
        ohlc: { open: 22500, high: 22600, low: 22500, close: 22500 },
        depth: { buy: [], sell: [] }, timestamp: Date.now()
    },
    "US 500": {
        symbol: "US 500", instrument_token: "0", last_price: 5100.00, last_quantity: 0, volume: 0,
        average_price: 0, oi: 0, net_change: 10, change_percent: 0.20,
        ohlc: { open: 5090, high: 5110, low: 5090, close: 5090 },
        depth: { buy: [], sell: [] }, timestamp: Date.now()
    },
    // Sectoral Indices
    "NIFTY IT": {
        symbol: "NIFTY IT", instrument_token: "0", last_price: 42100.00, last_quantity: 0, volume: 0,
        average_price: 0, oi: 0, net_change: 150, change_percent: 0.36,
        ohlc: { open: 41900, high: 42200, low: 41800, close: 41950 },
        depth: { buy: [], sell: [] }, timestamp: Date.now()
    },
    "NIFTY AUTO": {
        symbol: "NIFTY AUTO", instrument_token: "0", last_price: 25800.00, last_quantity: 0, volume: 0,
        average_price: 0, oi: 0, net_change: -120, change_percent: -0.46,
        ohlc: { open: 26000, high: 26100, low: 25700, close: 25920 },
        depth: { buy: [], sell: [] }, timestamp: Date.now()
    },
    "NIFTY METAL": {
        symbol: "NIFTY METAL", instrument_token: "0", last_price: 9800.00, last_quantity: 0, volume: 0,
        average_price: 0, oi: 0, net_change: 45, change_percent: 0.46,
        ohlc: { open: 9750, high: 9850, low: 9700, close: 9755 },
        depth: { buy: [], sell: [] }, timestamp: Date.now()
    },
    "NIFTY NEXT 50": {
        symbol: "NIFTY NEXT 50", instrument_token: "0", last_price: 74500.00, last_quantity: 0, volume: 0,
        average_price: 0, oi: 0, net_change: 320, change_percent: 0.43,
        ohlc: { open: 74200, high: 74600, low: 74000, close: 74180 },
        depth: { buy: [], sell: [] }, timestamp: Date.now()
    },
    // Global
    "NASDAQ": {
        symbol: "NASDAQ", instrument_token: "0", last_price: 18100.00, last_quantity: 0, volume: 0,
        average_price: 0, oi: 0, net_change: 80, change_percent: 0.44,
        ohlc: { open: 18000, high: 18200, low: 18000, close: 18020 },
        depth: { buy: [], sell: [] }, timestamp: Date.now()
    },
    "DOW JONES": {
        symbol: "DOW JONES", instrument_token: "0", last_price: 39100.00, last_quantity: 0, volume: 0,
        average_price: 0, oi: 0, net_change: -50, change_percent: -0.13,
        ohlc: { open: 39150, high: 39200, low: 39000, close: 39150 },
        depth: { buy: [], sell: [] }, timestamp: Date.now()
    },
    "NIKKEI 225": {
        symbol: "NIKKEI 225", instrument_token: "0", last_price: 39500.00, last_quantity: 0, volume: 0,
        average_price: 0, oi: 0, net_change: 400, change_percent: 1.02,
        ohlc: { open: 39100, high: 39600, low: 39000, close: 39100 },
        depth: { buy: [], sell: [] }, timestamp: Date.now()
    },
    "DAX": {
        symbol: "DAX", instrument_token: "0", last_price: 18200.00, last_quantity: 0, volume: 0,
        average_price: 0, oi: 0, net_change: 60, change_percent: 0.33,
        ohlc: { open: 18150, high: 18250, low: 18100, close: 18140 },
        depth: { buy: [], sell: [] }, timestamp: Date.now()
    }
};

export const useMarketStore = create<MarketState>((set) => ({
    tickers: INITIAL_TICKERS,
    secondaryTickers: {},
    updateTicker: (data) =>
        set((state) => ({
            tickers: {
                ...state.tickers,
                [data.symbol]: data,
            },
        })),
    updateSecondaryTicker: (data) =>
        set((state) => ({
            secondaryTickers: {
                ...state.secondaryTickers,
                [data.symbol]: data,
            },
        })),
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
    subscribedTokens: new Set<number>(),
}));
