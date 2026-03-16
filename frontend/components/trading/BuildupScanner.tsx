"use client";

import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Activity, Info, Zap } from "lucide-react";
import { useLiveOptionChain } from "@/hooks/useLiveOptionChain";
import { cn } from "@/lib/utils";

const INDICES = ["NIFTY 50", "NIFTY BANK", "NIFTY FIN SERVICE"];

export const BuildupScanner = () => {
    return (
        <div className="flex flex-col h-full bg-background overflow-hidden border-r border-border">
            {/* Header */}
            <div className="p-3 border-b border-border bg-surface-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <h2 className="text-[10px] font-black uppercase tracking-widest">Live Buildup Scanner</h2>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[8px] font-black text-zinc-500 uppercase">Real-time</span>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
                <div className="space-y-2">
                    <span className="text-[8px] font-black text-zinc-500 uppercase pl-1 tracking-widest">Major Indices</span>
                    <div className="grid grid-cols-1 gap-2">
                        {INDICES.map(symbol => (
                            <IndexBuildupCard key={symbol} symbol={symbol} />
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Sectoral Flow (Beta)</span>
                        <Info className="w-3 h-3 text-zinc-700" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <SectorCard label="Banking" buildup="Long Buildup" color="up" />
                        <SectorCard label="IT" buildup="Short Buildup" color="down" />
                        <SectorCard label="Auto" buildup="Short Covering" color="up" />
                        <SectorCard label="Energy" buildup="Long Unwinding" color="down" />
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="p-2 border-t border-border bg-surface-1 grid grid-cols-2 gap-x-4 gap-y-1">
                <LegendItem color="bg-up" label="LB" full="Long Buildup" />
                <LegendItem color="bg-down" label="SB" full="Short Buildup" />
                <LegendItem color="bg-emerald-500/20 text-emerald-400" border="border-emerald-500/30" label="SC" full="Short Covering" />
                <LegendItem color="bg-rose-500/20 text-rose-400" border="border-rose-500/30" label="LU" full="Long Unwinding" />
            </div>
        </div>
    );
};

const IndexBuildupCard = ({ symbol }: { symbol: string }) => {
    const { spotPrice, chainData, loading } = useLiveOptionChain(symbol);

    const stats = useMemo(() => {
        if (!chainData || chainData.length === 0) return null;

        // Sum total OI change across all strikes
        const totalOIChange = chainData.reduce((acc, row) => acc + row.ce.change + row.pe.change, 0) / (chainData.length * 2);
        const priceChange = chainData[0]?.ce.change || 0; // Proxy for index change if spot ticker is late

        let buildup = "Neutral";
        let colorClass = "text-zinc-500";
        let bgClass = "bg-zinc-500/10 border-zinc-500/20";

        if (priceChange > 0 && totalOIChange > 0) {
            buildup = "Long Buildup";
            colorClass = "text-up";
            bgClass = "bg-up/10 border-up/20";
        } else if (priceChange < 0 && totalOIChange > 0) {
            buildup = "Short Buildup";
            colorClass = "text-down";
            bgClass = "bg-down/10 border-down/20";
        } else if (priceChange > 0 && totalOIChange < 0) {
            buildup = "Short Covering";
            colorClass = "text-emerald-400";
            bgClass = "bg-emerald-500/10 border-emerald-500/20";
        } else if (priceChange < 0 && totalOIChange < 0) {
            buildup = "Long Unwinding";
            colorClass = "text-rose-400";
            bgClass = "bg-rose-500/10 border-rose-500/20";
        }

        return { buildup, colorClass, bgClass, priceChange, totalOIChange };
    }, [chainData]);

    if (loading || !stats) {
        return <div className="h-16 bg-surface-2 animate-pulse rounded-lg border border-border" />;
    }

    return (
        <div className={cn("p-2.5 rounded-lg border transition-all flex items-center justify-between", stats.bgClass)}>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-white uppercase tracking-tighter">{symbol}</span>
                <span className={cn("text-[8px] font-black uppercase tracking-widest", stats.colorClass)}>
                    {stats.buildup}
                </span>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <span className="text-[7px] font-black text-zinc-500 uppercase">Price %</span>
                    <span className={cn("text-[10px] font-mono font-bold", stats.priceChange >= 0 ? "text-up" : "text-down")}>
                        {stats.priceChange > 0 ? '+' : ''}{stats.priceChange.toFixed(2)}%
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[7px] font-black text-zinc-500 uppercase">OI Δ %</span>
                    <span className={cn("text-[10px] font-mono font-bold", stats.totalOIChange >= 0 ? "text-up" : "text-down")}>
                        {stats.totalOIChange > 0 ? '+' : ''}{stats.totalOIChange.toFixed(1)}%
                    </span>
                </div>
            </div>
        </div>
    );
};

const SectorCard = ({ label, buildup, color }: any) => (
    <div className="p-2 bg-surface-2 border border-border rounded flex flex-col gap-1">
        <span className="text-[9px] font-black text-white uppercase tracking-tighter">{label}</span>
        <div className="flex items-center justify-between">
            <span className={cn("text-[7px] font-black uppercase", color === 'up' ? "text-up" : "text-down")}>{buildup}</span>
            <Zap className={cn("w-2 h-2", color === 'up' ? "text-up" : "text-down")} />
        </div>
    </div>
);

const LegendItem = ({ color, border, label, full }: any) => (
    <div className="flex items-center gap-1.5 py-0.5">
        <div className={cn("min-w-[14px] h-[14px] flex items-center justify-center text-[7px] font-black border rounded-[2px]", color, border || "border-transparent")}>{label}</div>
        <span className="text-[7px] font-black text-zinc-500 uppercase whitespace-nowrap">{full}</span>
    </div>
);
