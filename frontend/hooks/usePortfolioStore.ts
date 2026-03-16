import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NormalizedHolding, NormalizedPosition } from "@/lib/portfolio-utils";

interface PortfolioState {
    fusedHoldings: NormalizedHolding[];
    fusedPositions: NormalizedPosition[];
    isRefreshing: boolean;
    lastUpdated: string | null;

    // Actions
    setFusedHoldings: (holdings: NormalizedHolding[]) => void;
    setFusedPositions: (positions: NormalizedPosition[]) => void;
    refreshPortfolio: (isMock?: boolean) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>()(
    persist(
        (set) => ({
            fusedHoldings: [],
            fusedPositions: [],
            isRefreshing: false,
            lastUpdated: null,

            setFusedHoldings: (holdings) => set({ fusedHoldings: holdings }),
            setFusedPositions: (positions) => set({ fusedPositions: positions }),

            refreshPortfolio: async (isMock = false) => {
                set({ isRefreshing: true });
                try {
                    const response = await fetch(`/api/portfolio/unified?mock=${isMock}`);
                    const json = await response.json();

                    if (json.status === "success") {
                        set({
                            fusedHoldings: json.data.holdings,
                            fusedPositions: json.data.positions,
                            lastUpdated: json.timestamp
                        });
                    }
                } catch (error) {
                    console.error("Failed to refresh fused portfolio:", error);
                } finally {
                    set({ isRefreshing: false });
                }
            }
        }),
        {
            name: "pro-terminal-portfolio",
        }
    )
);
