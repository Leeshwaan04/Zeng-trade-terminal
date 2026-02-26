import { create } from 'zustand';
import { KiteInstrument } from '@/lib/kite-instruments';

export interface StrategyLeg {
    id: string;
    instrument: KiteInstrument;
    side: 'BUY' | 'SELL';
    quantity: number;
    price: number; // Entry price (LTP or Limit)
}

interface StrategyState {
    legs: StrategyLeg[];
    addLeg: (leg: Omit<StrategyLeg, 'id'>) => void;
    removeLeg: (id: string) => void;
    updateLeg: (id: string, updates: Partial<StrategyLeg>) => void;
    clearStrategy: () => void;
    executeStraddle: (symbol: string, strike: number, priceCE: number, pricePE: number) => void;
}

export const useStrategyStore = create<StrategyState>((set) => ({
    legs: [],
    addLeg: (leg) => set((state) => ({
        legs: [...state.legs, { ...leg, id: Math.random().toString(36).substr(2, 9) }]
    })),
    removeLeg: (id) => set((state) => ({
        legs: state.legs.filter((l) => l.id !== id)
    })),
    updateLeg: (id, updates) => set((state) => ({
        legs: state.legs.map((l) => l.id === id ? { ...l, ...updates } : l)
    })),
    clearStrategy: () => set({ legs: [] }),

    executeStraddle: (symbol, strike, priceCE, pricePE) => {
        // Dynamic Import to avoid circular dependency if possible, or use window/event
        // But direct store access is cleanest here for a client-side app
        const { placeOrder } = require('./useOrderStore').useOrderStore.getState();

        // CE Leg
        placeOrder({
            symbol: `${symbol}24SEP${strike}CE`,
            transactionType: 'BUY',
            orderType: 'MARKET',
            productType: 'MIS',
            qty: 50,
            price: priceCE
        });

        // PE Leg
        placeOrder({
            symbol: `${symbol}24SEP${strike}PE`,
            transactionType: 'BUY',
            orderType: 'MARKET',
            productType: 'MIS',
            qty: 50,
            price: pricePE
        });

        console.log(`⚡ STRADDLE EXECUTED: ${strike} CE & PE`);
    }
}));
