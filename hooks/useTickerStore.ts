import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TickerItemConfig {
    symbol: string;
    token: number | string;
    isActive: boolean;
}

export const AVAILABLE_TICKERS: TickerItemConfig[] = [
    { symbol: "NIFTY 50", token: 256265, isActive: true },
    { symbol: "NIFTY BANK", token: 260105, isActive: true },
    { symbol: "NIFTY FIN SERVICE", token: 257801, isActive: true },
    { symbol: "NIFTY MID SELECT", token: 288009, isActive: false },
    { symbol: "SENSEX", token: 265, isActive: true },
    { symbol: "BANKEX", token: 274, isActive: false },
    { symbol: "INDIA VIX", token: 264969, isActive: true },
    { symbol: "CRUDEOIL", token: "CRUDEOIL", isActive: true },
    { symbol: "NATURALGAS", token: "NATURALGAS", isActive: true },
    { symbol: "GOLD", token: "GOLD", isActive: false },
    { symbol: "SILVER", token: "SILVER", isActive: false },
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
