"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { RefreshCw, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrikeData {
    strike: number;
    ceOI: number;
    peOI: number;
    ceOILots: number;
    peOILots: number;
    totalPain: number;
}

/**
 * Max Pain = strike at which the aggregate value of all expiring options
 * (calls + puts) is minimised for option buyers (maximised for writers).
 *
 * pain(K) = Σ ceOI[i] * max(0, K - K[i]) + Σ peOI[i] * max(0, K[i] - K)
 */
function computeMaxPain(strikes: StrikeData[]): { maxPain: number; painData: Array<{ strike: number; totalPain: number }> } {
    const painData = strikes.map(target => {
        let totalPain = 0;
        strikes.forEach(s => {
            totalPain += s.ceOI * Math.max(0, target.strike - s.strike);
            totalPain += s.peOI * Math.max(0, s.strike - target.strike);
        });
        return { strike: target.strike, totalPain };
    });

    const minPain = Math.min(...painData.map(d => d.totalPain));
    const maxPainStrike = painData.find(d => d.totalPain === minPain)?.strike || 0;

    return { maxPain: maxPainStrike, painData };
}

export const MaxPainWidget = ({ symbol = "NIFTY" }: { symbol?: string }) => {
    const [strikes, setStrikes] = useState<StrikeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [expiry, setExpiry] = useState<string | null>(null);
    const [allExpiries, setAllExpiries] = useState<string[]>([]);

    const spotSymbol = symbol === "NIFTY" ? "NIFTY 50" : symbol === "BANKNIFTY" ? "NIFTY BANK" : symbol;
    const spotPrice = useMarketStore(s => s.tickers[spotSymbol]?.last_price || 0);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const url = `/api/kite/option-chain?symbol=${symbol}${expiry ? `&expiry=${expiry}` : ""}`;
            const res = await fetch(url);
            const data = await res.json();

            if (!data.success || !data.strikes) return;

            setAllExpiries(data.allExpiries || []);
            if (!expiry) setExpiry(data.activeExpiry);

            const parsed: StrikeData[] = data.strikes
                .filter((row: any) => row.ce?.oi || row.pe?.oi)
                .map((row: any) => ({
                    strike: row.strike,
                    ceOI: row.ce?.oi || 0,
                    peOI: row.pe?.oi || 0,
                    ceOILots: row.ce?.oi_lots || 0,
                    peOILots: row.pe?.oi_lots || 0,
                    totalPain: 0,
                }));

            setStrikes(parsed);
        } catch (err) {
            console.error("[MaxPain] Fetch failed:", err);
        } finally {
            setLoading(false);
        }
    }, [symbol, expiry]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const { maxPain, painData } = useMemo(() => {
        if (strikes.length === 0) return { maxPain: 0, painData: [] };
        return computeMaxPain(strikes);
    }, [strikes]);

    const maxPainValue = Math.max(...painData.map(d => d.totalPain), 1);

    // Show ~20 strikes around ATM
    const visibleStrikes = useMemo(() => {
        if (!spotPrice || painData.length === 0) return painData.slice(0, 20);
        const sorted = [...painData].sort((a, b) => Math.abs(a.strike - spotPrice) - Math.abs(b.strike - spotPrice));
        const atmWindow = sorted.slice(0, 20).map(s => s.strike);
        return painData.filter(d => atmWindow.includes(d.strike)).sort((a, b) => a.strike - b.strike);
    }, [painData, spotPrice]);

    const deviation = spotPrice > 0 && maxPain > 0
        ? (((spotPrice - maxPain) / maxPain) * 100).toFixed(2)
        : null;

    return (
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-md text-white overflow-hidden">
            <WidgetHeader
                id="max-pain-widget"
                title="Max Pain Calculator"
                symbol={symbol}
                action={
                    <button
                        onClick={fetchData}
                        className="p-1 text-zinc-500 hover:text-white transition-colors"
                    >
                        <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
                    </button>
                }
            />

            {/* Expiry Selector */}
            {allExpiries.length > 1 && (
                <div className="px-3 pb-2 flex gap-1 overflow-x-auto hide-scrollbar shrink-0">
                    {allExpiries.slice(0, 5).map(exp => (
                        <button
                            key={exp}
                            onClick={() => setExpiry(exp)}
                            className={cn(
                                "px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 transition-colors",
                                expiry === exp ? "bg-primary text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                            )}
                        >
                            {exp}
                        </button>
                    ))}
                </div>
            )}

            {loading && strikes.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border border-primary/30 border-t-primary animate-spin" />
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Max Pain Summary */}
                    <div className="p-4 border-b border-white/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Max Pain Strike</span>
                                <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-primary" />
                                    <span className="text-3xl font-black text-primary tabular-nums">
                                        {maxPain.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            {spotPrice > 0 && deviation !== null && (
                                <div className="text-right">
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Spot vs Max Pain</span>
                                    <span className={cn(
                                        "text-sm font-black tabular-nums",
                                        Number(deviation) > 0 ? "text-up" : "text-down"
                                    )}>
                                        {Number(deviation) > 0 ? "+" : ""}{deviation}%
                                    </span>
                                    <span className="text-[9px] text-zinc-500 block">
                                        Spot: {spotPrice.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                        <p className="text-[9px] text-zinc-600 mt-2 font-bold">
                            Option writers maximise profit at {maxPain.toLocaleString()} on expiry.
                        </p>
                    </div>

                    {/* Pain Chart */}
                    {visibleStrikes.length > 0 && (
                        <div className="p-3">
                            <h4 className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-3">Pain Distribution by Strike</h4>
                            <div className="space-y-1.5">
                                {visibleStrikes.map(row => {
                                    const isMaxPain = row.strike === maxPain;
                                    const isATM = spotPrice > 0 && Math.abs(row.strike - spotPrice) === Math.min(...visibleStrikes.map(s => Math.abs(s.strike - spotPrice)));
                                    const barWidth = (row.totalPain / maxPainValue) * 100;

                                    return (
                                        <div key={row.strike} className="flex items-center gap-2">
                                            <span className={cn(
                                                "w-14 text-[9px] font-black tabular-nums text-right shrink-0",
                                                isMaxPain ? "text-primary" : isATM ? "text-yellow-400" : "text-zinc-500"
                                            )}>
                                                {row.strike}
                                                {isMaxPain && <span className="ml-0.5 text-[6px] text-primary">★</span>}
                                                {isATM && !isMaxPain && <span className="ml-0.5 text-[6px] text-yellow-400">ATM</span>}
                                            </span>
                                            <div className="flex-1 h-3 bg-zinc-900 rounded-sm overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-sm transition-all duration-500",
                                                        isMaxPain ? "bg-primary" : "bg-zinc-700"
                                                    )}
                                                    style={{ width: `${barWidth}%` }}
                                                />
                                            </div>
                                            <span className="w-14 text-[8px] tabular-nums text-zinc-500 font-mono shrink-0">
                                                {(row.totalPain / 1e7).toFixed(1)}Cr
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
