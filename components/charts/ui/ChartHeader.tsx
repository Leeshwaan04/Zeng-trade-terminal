"use client";

import React from "react";
import { ChevronDown, Search, BarChart2, Zap, Settings, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartHeaderProps {
    symbol: string;
    interval: string;
    onIntervalChange: (i: string) => void;
}

const HeaderButton = ({ label, icon: Icon, active, onClick, className }: any) => (
    <button
        onClick={onClick}
        className={cn(
            "flex items-center gap-1 px-3 py-1.5 hover:bg-white/10 rounded text-[13px] font-medium text-zinc-400 transition-colors",
            active && "bg-white/10 text-white",
            className
        )}
    >
        {label && <span>{label}</span>}
        {Icon && <Icon className="w-4 h-4" />}
    </button>
);

export const ChartHeader = ({ symbol, interval, onIntervalChange }: ChartHeaderProps) => {
    return (
        <div className="flex items-center h-12 bg-black border-b border-white/10 px-2 select-none z-20">
            {/* Symbol */}
            <div className="flex items-center gap-2 mr-4 cursor-pointer hover:text-white transition-colors group">
                <div className="w-6 h-6 rounded bg-[#00E5FF]/10 flex items-center justify-center text-[#00E5FF]">
                    <Search className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-lg text-zinc-200 group-hover:text-white">{symbol}</span>
                <span className="text-xs text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">NSE</span>
            </div>

            <div className="h-6 w-[1px] bg-white/10 mx-2" />

            {/* Timeframes */}
            <div className="flex items-center gap-1">
                {["1m", "5m", "15m", "1H", "4H", "D"].map(tf => (
                    <HeaderButton
                        key={tf}
                        label={tf}
                        active={interval === tf}
                        onClick={() => onIntervalChange(tf)}
                        className={interval === tf ? "text-[#00E5FF]" : ""}
                    />
                ))}
                <HeaderButton icon={ChevronDown} className="px-1" />
            </div>

            <div className="h-6 w-[1px] bg-white/10 mx-2" />

            {/* Chart Types */}
            <HeaderButton icon={BarChart2} label="Candles" />

            {/* Indicators */}
            <HeaderButton icon={Zap} label="Indicators" className="text-[#00E5FF]" />

            <div className="flex-1" />

            {/* Right Controls */}
            <HeaderButton icon={Settings} />
            <HeaderButton icon={Camera} className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30" label="Snapshot" />
            <button className="ml-2 px-4 py-1.5 bg-[#00E5FF] text-black font-bold text-xs rounded hover:bg-[#00E5FF]/90 transition-colors">
                Publish
            </button>
        </div>
    );
};
