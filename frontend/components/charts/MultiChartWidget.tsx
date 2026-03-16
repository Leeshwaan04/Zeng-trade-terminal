"use client";

import React, { useMemo } from "react";
import { TradingChart } from "@/components/charts/TradingChart";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { MultiChartViewMode, WidgetConfig } from "@/types/layout";

interface MultiChartWidgetProps {
    widgetConfig: WidgetConfig;
}

export const MultiChartWidget = ({ widgetConfig }: MultiChartWidgetProps) => {
    // Determine current mode and symbols from config
    const multiConfig = widgetConfig.multiChartConfig || {
        viewMode: "1x1" as MultiChartViewMode,
        symbols: [widgetConfig.symbol || "NIFTY 50", "BANKNIFTY", "RELIANCE", "INFY"]
    };

    const { viewMode, symbols } = multiConfig;
    const { syncSymbol } = useLayoutStore();

    const gridClasses = useMemo(() => {
        switch (viewMode) {
            case "1x2": return "grid grid-cols-2 grid-rows-1";
            case "2x1": return "grid grid-cols-1 grid-rows-2";
            case "2x2": return "grid grid-cols-2 grid-rows-2";
            case "1x1":
            default: return "grid grid-cols-1 grid-rows-1";
        }
    }, [viewMode]);

    // How many charts do we render based on mode?
    const numCharts = viewMode === "2x2" ? 4 : (viewMode === "1x2" || viewMode === "2x1") ? 2 : 1;

    return (
        <div className={`w-full h-full ${gridClasses} gap-[1px] bg-white/10 overflow-hidden`}>
            {Array.from({ length: numCharts }).map((_, index) => {
                const subSymbol = syncSymbol ? (widgetConfig.symbol || "NIFTY 50") : (symbols[index] || "NIFTY 50");
                const subWidgetId = `${widgetConfig.id}-sub-${index}`;

                return (
                    <div key={subWidgetId} className="w-full h-full relative isolate bg-black">
                        <TradingChart
                            widgetId={subWidgetId}
                            symbol={subSymbol}
                        />
                    </div>
                );
            })}
        </div>
    );
};
