"use client";

import React, { useEffect, useState } from "react";
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import { useMarketStore } from "@/hooks/useMarketStore";

interface AdvancedTradingViewChartProps {
    symbol: string;
    theme?: "light" | "dark";
    autosize?: boolean;
    interval?: string;
    style?: "1" | "2" | "3" | "8" | "9"; // 1=Candles, 2=Line, 3=Area
}

export const AdvancedTradingViewChart = ({
    symbol,
    theme = "dark",
    autosize = true,
    interval = "D",
    style = "1"
}: AdvancedTradingViewChartProps) => {
    // Map our internal symbol format (e.g., "NIFTY 50") to TradingView format (e.g., "NSE:NIFTY")
    // This is a simple mapper; in production, you'd use a robust lookup.
    const getTradingViewSymbol = (internalSymbol: string) => {
        if (internalSymbol.includes("NIFTY 50")) return "NSE:NIFTY";
        if (internalSymbol.includes("BANKNIFTY")) return "NSE:BANKNIFTY";
        if (internalSymbol.includes("RELIANCE")) return "NSE:RELIANCE";
        if (internalSymbol.includes("HDFCBANK")) return "NSE:HDFCBANK";
        if (internalSymbol.includes("INFY")) return "NSE:INFY";
        if (internalSymbol.includes("TCS")) return "NSE:TCS";
        if (internalSymbol.includes("ICICIBANK")) return "NSE:ICICIBANK";
        if (internalSymbol.includes("SBIN")) return "NSE:SBIN";
        if (internalSymbol.includes("AXISBANK")) return "NSE:AXISBANK";
        if (internalSymbol.includes("TATASTEEL")) return "NSE:TATASTEEL";

        // Default fallback
        return `NSE:${internalSymbol.replace(" ", "")}`;
    };

    const tvSymbol = getTradingViewSymbol(symbol);

    return (
        <div className="w-full h-full relative" id="tv-chart-container">
            <AdvancedRealTimeChart
                symbol={tvSymbol}
                theme={theme}
                autosize={autosize}
                interval={interval as any}
                timezone="Asia/Kolkata"
                style={style}
                locale="in"
                toolbar_bg="#000000"
                enable_publishing={false}
                hide_side_toolbar={false} // User wants tools
                allow_symbol_change={false} // We control symbol via our header
                container_id="tv_chart_container"
                withdateranges={true}
                hide_top_toolbar={false} // Need this for Indicators
            // hide_volume removed - not supported by type
            />
        </div>
    );
};
