"use client";

import React from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { Wallet, ShieldCheck, ArrowUpRight, ArrowDownRight, RefreshCcw, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export const MarginAggregatorWidget = () => {
    const { unifiedMargin, updateUnifiedMargin } = useMarketStore();
    const [refreshing, setRefreshing] = React.useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        // Simulate fetching from multiple broker APIs
        await new Promise(r => setTimeout(r, 1500));

        // Mock consolidated data for demonstration
        const mockData = {
            totalMargin: 5420500,
            brokers: {
                "KITE": { available: 2450000, used: 1200000, status: "Connected" },
                "DHAN": { available: 1850000, used: 450000, status: "Connected" },
                "FYERS": { available: 1120500, used: 890000, status: "Connected" }
            }
        };
        updateUnifiedMargin(mockData);
        setRefreshing(false);
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] text-white">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                        <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Margin Aggregator</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-white">{formatCurrency(unifiedMargin.totalMargin)}</span>
                            <div className="flex items-center text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                                <ShieldCheck className="w-3 h-3 mr-1" /> SECURE
                            </div>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    className={cn(
                        "p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5",
                        refreshing && "animate-spin opacity-50 pointer-events-none"
                    )}
                >
                    <RefreshCcw className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-1 gap-3">
                    {Object.entries(unifiedMargin.brokers).length > 0 ? (
                        Object.entries(unifiedMargin.brokers).map(([id, data]: [string, any]) => (
                            <div key={id} className="p-3 bg-zinc-900/50 border border-white/5 rounded-xl flex items-center justify-between group hover:border-primary/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px]",
                                        id === "KITE" ? "bg-[#ff5722]/20 text-[#ff5722]" :
                                            id === "DHAN" ? "bg-[#00E5FF]/20 text-[#00E5FF]" :
                                                "bg-[#2196F3]/20 text-[#2196F3]"
                                    )}>
                                        {id.substring(0, 1)}
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-black text-zinc-500 tracking-tighter">{id} TERMINAL</p>
                                        <p className="text-sm font-bold text-white">{formatCurrency(data.available)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-zinc-500 font-mono uppercase">Used: {formatCurrency(data.used)}</p>
                                    <div className="flex items-center justify-end gap-1 mt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        <span className="text-[9px] font-bold text-primary uppercase">{data.status}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="h-40 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 grayscale opacity-40">
                            <Layers className="w-8 h-8 text-zinc-600" />
                            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500">No Linked Terminals</p>
                            <button
                                onClick={handleRefresh}
                                className="px-4 py-2 bg-white/5 rounded-lg border border-white/10 text-[10px] font-black hover:bg-white/10 transition-all"
                            >
                                START SCAN
                            </button>
                        </div>
                    )}
                </div>

                {/* Risk Radar */}
                {Object.entries(unifiedMargin.brokers).length > 0 && (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Portfolio Utilization</h3>
                            <div className="flex items-end gap-3 h-24">
                                {Object.entries(unifiedMargin.brokers).map(([id, data]: [string, any]) => {
                                    const percentage = (data.used / (data.available + data.used)) * 100;
                                    return (
                                        <div key={id} className="flex-1 flex flex-col items-center gap-2">
                                            <div className="w-full bg-zinc-800 rounded-full h-1 relative overflow-hidden">
                                                <div
                                                    className="absolute inset-y-0 left-0 bg-primary transition-all duration-1000"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <div
                                                className="w-full bg-primary/20 border border-primary/30 rounded-lg flex items-center justify-center transition-all duration-1000"
                                                style={{ height: `${percentage}%` }}
                                            >
                                                <span className="text-[10px] font-black">{Math.round(percentage)}%</span>
                                            </div>
                                            <span className="text-[8px] font-bold text-zinc-600 uppercase">{id}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Summary */}
            <div className="p-4 bg-zinc-900/30 border-t border-white/5">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter text-zinc-500">
                    <span>Active Liquidity</span>
                    <span className="text-white">{formatCurrency(Object.values(unifiedMargin.brokers).reduce((acc: number, b: any) => acc + b.available, 0))}</span>
                </div>
                <div className="w-full bg-zinc-800 h-1 rounded-full mt-2 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-primary-foreground w-[65%] transition-all duration-1000"
                    />
                </div>
            </div>
        </div>
    );
};
