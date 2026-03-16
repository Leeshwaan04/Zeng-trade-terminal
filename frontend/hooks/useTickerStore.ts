import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TickerItemConfig {
    symbol: string;
    token: number | string;
    isActive: boolean;
}

export const AVAILABLE_TICKERS: TickerItemConfig[] = [
    // Core —  real Kite tokens
    { symbol: "NIFTY 50", token: 256265, isActive: true },
    { symbol: "NIFTY BANK", token: 260105, isActive: true },
    { symbol: "NIFTY FIN SERVICE", token: 257801, isActive: true },
    { symbol: "NIFTY MID SELECT", token: 288009, isActive: true },
    { symbol: "SENSEX", token: 265, isActive: true },
    { symbol: "BANKEX", token: 274, isActive: false },
    { symbol: "INDIA VIX", token: 264969, isActive: true },
    // Sectoral — real Kite NSE index tokens
    { symbol: "NIFTY IT", token: 262153, isActive: false },
    { symbol: "NIFTY AUTO", token: 262921, isActive: false },
    { symbol: "NIFTY METAL", token: 262409, isActive: false },
    { symbol: "NIFTY NEXT 50", token: 270857, isActive: false },
    { symbol: "NIFTY PHARMA", token: 261641, isActive: false },
    { symbol: "NIFTY FMCG", token: 261897, isActive: false },
    { symbol: "NIFTY REALTY", token: 263689, isActive: false },
    { symbol: "NIFTY ENERGY", token: 262665, isActive: false },
];

interface TickerState {
    items: TickerItemConfig[];
    speedMultiplier: number; // 0.5 (slow) to 2.0 (fast)
    toggleItem: (symbol: string) => void;
    setSpeed: (speed: number) => void;
    resetToDefault: () => void;
}

export const useTickerStore = create<TickerState>()(
    persist(
        (set) => ({
            items: AVAILABLE_TICKERS,
            speedMultiplier: 1.0,

            toggleItem: (symbol) => set((state) => ({
                items: state.items.map(item =>
                    item.symbol === symbol ? { ...item, isActive: !item.isActive } : item
                )
            })),

            setSpeed: (speed) => set({ speedMultiplier: speed }),

            resetToDefault: () => set({
                items: AVAILABLE_TICKERS,
                speedMultiplier: 1.0
            })
        }),
        {
            name: "pro-terminal-ticker-prefs",
        }
    )
);
