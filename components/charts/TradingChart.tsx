"use client";

import React, { useState } from "react";
import { CustomCandlestickChart } from "./CustomCandlestickChart";
import { FloatingOrderTicket } from "@/components/trading/FloatingOrderTicket";
import { ChartControls } from "./ChartControls";

interface TradingChartProps {
    symbol: string;
    widgetId?: string;
}

export const TradingChart = ({ symbol, widgetId }: TradingChartProps) => {
    const [timeframe, setTimeframe] = useState("1D");
    const [chartType, setChartType] = useState<"candle" | "line">("candle");
    const [showOrderTicket, setShowOrderTicket] = useState(false);

    return (
        <div className="relative w-full h-full group bg-[var(--chart-bg)] flex flex-col">
            {/* Chart Controls Bar */}
            <div className="flex-none">
                <ChartControls
                    symbol={symbol}
                    period={timeframe}
                    onPeriodChange={setTimeframe}
                    interval={timeframe}
                    onIntervalChange={setTimeframe}
                    onTradeClick={() => setShowOrderTicket(!showOrderTicket)}
                    chartType={chartType}
                    onChartTypeChange={setChartType}
                    hideIndicators={false}
                    hideSnapshot={false}
                />
            </div>

            {/* Custom Canvas Chart Engine */}
            <div className="flex-1 relative">
                <CustomCandlestickChart
                    symbol={symbol}
                    interval={timeframe}
                    chartType={chartType}
                />

                {/* Floating Order Ticket Overlay */}
                {showOrderTicket && (
                    <div className="absolute top-4 right-4 z-50">
                        <FloatingOrderTicket symbol={symbol} />
                    </div>
                )}
            </div>
        </div>
    );
};
