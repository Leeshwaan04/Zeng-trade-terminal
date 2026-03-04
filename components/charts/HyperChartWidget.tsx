"use client";

import React, { useState } from "react";
import { ChartHeader } from "./ui/ChartHeader";
import { ChartToolbar } from "./ui/ChartToolbar";
import { KiteLiteChart } from "./KiteLiteChart";
import { cn } from "@/lib/utils";

const INTERVALS = [
    { label: "1m", value: "1minute" },
    { label: "5m", value: "5minute" },
    { label: "15m", value: "15minute" },
    { label: "30m", value: "30minute" },
    { label: "1h", value: "60minute" },
    { label: "D", value: "day" },
    { label: "W", value: "week" },
];

export const HyperChartWidget = ({ symbol = "NIFTY 50" }: { symbol?: string }) => {
    const [interval, setInterval] = useState("15minute");

    return (
        <div className="flex flex-col h-full w-full bg-background overflow-hidden">
            {/* Header */}
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
                <div className="flex-1 flex flex-col relative">
                    {/* Intraday Interval Strip */}
                    <div className="flex items-center gap-0.5 px-3 py-1 border-b border-border/20 bg-surface-1/50">
                        {INTERVALS.map((iv) => (
                            <button
                                key={iv.value}
                                onClick={() => setInterval(iv.value)}
                                className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                                    interval === iv.value
                                        ? "bg-primary/10 text-primary border border-primary/30"
                                        : "text-muted-foreground hover:text-foreground hover:bg-surface-4"
                                )}
                            >
                                {iv.label}
                            </button>
                        ))}
                        <span className="ml-auto text-[9px] text-muted-foreground font-mono uppercase tracking-widest select-none">
                            {symbol}
                        </span>
                    </div>

                    {/* Chart Canvas */}
                    <div className="flex-1 relative">
                        <KiteLiteChart symbol={symbol} interval={interval} />

                        {/* Watermark */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[80px] font-black text-foreground/[0.03] pointer-events-none select-none z-0">
                            ZENG
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
