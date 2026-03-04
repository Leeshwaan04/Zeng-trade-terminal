"use client";

import React, { useState } from "react";
import { ChartHeader } from "./ui/ChartHeader";
import { ChartToolbar } from "./ui/ChartToolbar";
import { KiteLiteChart } from "./KiteLiteChart";

export const HyperChartWidget = ({ symbol = "NIFTY 50" }: { symbol?: string }) => {
    const [interval, setInterval] = useState("15minute");

    return (
        <div className="flex flex-col h-full w-full bg-background overflow-hidden">
            {/* Top Header */}
            <ChartHeader
                symbol={symbol}
                interval={interval}
                onIntervalChange={setInterval}
            />

            {/* Main Area */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Toolbar */}
                <ChartToolbar symbol={symbol} />

                {/* Chart Area */}
                <div className="flex-1 relative">
                    <KiteLiteChart symbol={symbol} interval={interval} />

                    {/* Watermark */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[100px] font-black text-white/5 pointer-events-none select-none z-0">
                        ZENG
                    </div>
                </div>
            </div>
        </div>
    );
};
