"use client";

import React, { useState } from "react";
import { ChartHeader } from "./ui/ChartHeader";
import { ChartToolbar } from "./ui/ChartToolbar";
import { HyperChartCanvas } from "./engine/HyperChartCanvas";

export const HyperChartWidget = ({ symbol = "NIFTY 50" }: { symbol?: string }) => {
    const [interval, setInterval] = useState("15m");
    const [activeTool, setActiveTool] = useState("CURSOR");

    return (
        <div className="flex flex-col h-full w-full bg-black text-white overflow-hidden">
            {/* Top Header */}
            <ChartHeader
                symbol={symbol}
                interval={interval}
                onIntervalChange={setInterval}
            />

            {/* Main Area */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Toolbar */}
                <ChartToolbar
                    activeTool={activeTool}
                    onToolChange={setActiveTool}
                />

                {/* Canvas Area */}
                <div className="flex-1 relative bg-black">
                    {/* 
                        Note: We need to pass 'activeTool' to the canvas engine 
                        so it knows how to interpret mouse events. 
                        For now, the Canvas just renders mock data.
                        Future Step: Propagate 'activeTool' to 'ChartEngine'.
                    */}
                    <HyperChartCanvas symbol={symbol} />

                    {/* Watermark (Optional) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[100px] font-black text-white/5 pointer-events-none select-none z-0">
                        HYPER
                    </div>
                </div>
            </div>
        </div>
    );
};
