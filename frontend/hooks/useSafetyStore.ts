
import { create } from 'zustand';

interface SafetyState {
    isArmed: boolean;
    dailyLossLimit: number;
    maxOrderValue: number;
    maxQtyPerInstrument: Record<string, number>;
    setArmed: (armed: boolean) => void;
    toggleArmed: () => void;
    setDailyLossLimit: (limit: number) => void;
    setMaxOrderValue: (value: number) => void;
    setMaxQtyPerInstrument: (caps: Record<string, number>) => void;
}

export const useSafetyStore = create<SafetyState>((set) => ({
    isArmed: false,
    dailyLossLimit: 50000, // Default 50k
    maxOrderValue: 1000000, // Default 1M
    maxQtyPerInstrument: { "RELIANCE": 500, "NIFTY": 100 },
    setArmed: (armed) => set({ isArmed: armed }),
    toggleArmed: () => set((state) => ({ isArmed: !state.isArmed })),
    setDailyLossLimit: (dailyLossLimit) => set({ dailyLossLimit }),
    setMaxOrderValue: (maxOrderValue) => set({ maxOrderValue }),
    setMaxQtyPerInstrument: (maxQtyPerInstrument) => set({ maxQtyPerInstrument }),
}));
