"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PCRData {
    symbol: string;
    expiry: string;
    pcr: number;
    totalCallOI: number;
    totalPutOI: number;
    interpretation: "BEARISH" | "BULLISH" | "NEUTRAL";
    timestamp: string;
}

interface StrikeOIData {
    strike: number;
    ceOI: number;
    peOI: number;
}

const getInterpretation = (pcr: number): PCRData["interpretation"] => {
    if (pcr > 1.2) return "BULLISH";
    if (pcr < 0.8) return "BEARISH";
    return "NEUTRAL";
};

export const PCRWidget = ({ symbol = "NIFTY" }: { symbol?: string }) => {
    const [pcrData, setPcrData] = useState<PCRData | null>(null);
    const [strikeData, setStrikeData] = useState<StrikeOIData[]>([]);
    const [loading, setLoading] = useState(true);
    const [expiry, setExpiry] = useState<string | null>(null);
    const [allExpiries, setAllExpiries] = useState<string[]>([]);

    const spotSymbol = symbol === "NIFTY" ? "NIFTY 50" : symbol === "BANKNIFTY" ? "NIFTY BANK" : symbol;
    const spotPrice = useMarketStore(s => s.tickers[spotSymbol]?.last_price || 0);

    const fetchPCR = useCallback(async () => {
        setLoading(true);
        try {
            const url = `/api/kite/option-chain?symbol=${symbol}${expiry ? `&expiry=${expiry}` : ""}`;
            const res = await fetch(url);
            const data = await res.json();

            if (!data.success || !data.strikes) return;

            setAllExpiries(data.allExpiries || []);
            if (!expiry) setExpiry(data.activeExpiry);

            let totalCallOI = 0;
            let totalPutOI = 0;
            const strikes: StrikeOIData[] = [];

            data.strikes.forEach((row: any) => {
                const ceOI = row.ce?.oi || 0;
                const peOI = row.pe?.oi || 0;
                totalCallOI += ceOI;
                totalPutOI += peOI;
                if (ceOI > 0 || peOI > 0) {
                    strikes.push({ strike: row.strike, ceOI, peOI });
                }
            });

            const pcr = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;

            setPcrData({
                symbol,
                expiry: expiry || data.activeExpiry,
                pcr,
                totalCallOI,
                totalPutOI,
                interpretation: getInterpretation(pcr),
                timestamp: new Date().toISOString(),
            });
            setStrikeData(strikes.sort((a, b) => a.strike - b.strike));
        } catch (err) {
            console.error("[PCR] Fetch failed:", err);
        } finally {
            setLoading(false);
        }
    }, [symbol, expiry]);

    useEffect(() => {
        fetchPCR();
        const interval = setInterval(fetchPCR, 30000);
        return () => clearInterval(interval);
    }, [fetchPCR]);

    const atmStrike = spotPrice > 0
        ? strikeData.reduce((prev, curr) =>
            Math.abs(curr.strike - spotPrice) < Math.abs(prev.strike - spotPrice) ? curr : prev
          , strikeData[0] || { strike: 0, ceOI: 0, peOI: 0 })?.strike
        : null;

    const topStrikes = strikeData
        .sort((a, b) => (b.ceOI + b.peOI) - (a.ceOI + a.peOI))
        .slice(0, 8)
        .sort((a, b) => a.strike - b.strike);

    const maxOI = Math.max(...topStrikes.map(s => Math.max(s.ceOI, s.peOI)), 1);

    return (
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-md text-white overflow-hidden">
            <WidgetHeader
                id="pcr-widget"
                title="PCR — Put/Call Ratio"
                symbol={symbol}
                action={
                    <button
                        onClick={fetchPCR}
                        className="p-1 text-zinc-500 hover:text-white transition-colors"
                        title="Refresh"
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

            {loading && !pcrData ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border border-primary/30 border-t-primary animate-spin" />
                </div>
            ) : pcrData ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* PCR Gauge */}
                    <div className="p-4 border-b border-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">PCR Value</span>
                                <span className={cn(
                                    "text-3xl font-black tabular-nums",
                                    pcrData.interpretation === "BULLISH" ? "text-up" :
                                    pcrData.interpretation === "BEARISH" ? "text-down" : "text-yellow-400"
                                )}>
                                    {pcrData.pcr.toFixed(3)}
                                </span>
                            </div>
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                                pcrData.interpretation === "BULLISH" ? "bg-up/10 border-up/30 text-up" :
                                pcrData.interpretation === "BEARISH" ? "bg-down/10 border-down/30 text-down" :
                                "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                            )}>
                                {pcrData.interpretation === "BULLISH" ? <TrendingUp className="w-4 h-4" /> :
                                 pcrData.interpretation === "BEARISH" ? <TrendingDown className="w-4 h-4" /> :
                                 <Minus className="w-4 h-4" />}
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {pcrData.interpretation}
                                </span>
                            </div>
                        </div>

                        {/* PCR Scale Bar */}
                        <div className="relative h-3 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                            <div className="absolute inset-0 flex">
                                <div className="w-1/3 bg-down/20" />
                                <div className="w-1/3 bg-yellow-500/20" />
                                <div className="w-1/3 bg-up/20" />
                            </div>
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_6px_white] transition-all"
                                style={{ left: `${Math.min(95, Math.max(5, (pcrData.pcr / 2.5) * 100))}%`, transform: 'translate(-50%, -50%)' }}
                            />
                        </div>
                        <div className="flex justify-between text-[7px] text-zinc-600 mt-1 font-black uppercase">
                            <span>Bearish (&lt;0.8)</span>
                            <span>Neutral</span>
                            <span>Bullish (&gt;1.2)</span>
                        </div>
                    </div>

                    {/* OI Summary */}
                    <div className="grid grid-cols-2 gap-[1px] bg-white/5 border-b border-white/5">
                        <div className="bg-black/60 p-3">
                            <span className="text-[8px] font-black text-down/60 uppercase tracking-widest block mb-1">Total Call OI</span>
                            <span className="text-sm font-black text-down tabular-nums">
                                {(pcrData.totalCallOI / 100000).toFixed(2)}L
                            </span>
                        </div>
                        <div className="bg-black/60 p-3">
                            <span className="text-[8px] font-black text-up/60 uppercase tracking-widest block mb-1">Total Put OI</span>
                            <span className="text-sm font-black text-up tabular-nums">
                                {(pcrData.totalPutOI / 100000).toFixed(2)}L
                            </span>
                        </div>
                    </div>

                    {/* Strike-wise OI Bars */}
                    {topStrikes.length > 0 && (
                        <div className="p-3">
                            <h4 className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-3">Top OI Strikes</h4>
                            <div className="space-y-2">
                                {topStrikes.map(row => (
                                    <div key={row.strike} className="flex items-center gap-2">
                                        <span className={cn(
                                            "w-14 text-[9px] font-black tabular-nums text-right shrink-0",
                                            row.strike === atmStrike ? "text-primary" : "text-zinc-400"
                                        )}>
                                            {row.strike}
                                            {row.strike === atmStrike && <span className="ml-1 text-[6px] text-primary">ATM</span>}
                                        </span>
                                        <div className="flex-1 flex gap-1 items-center">
                                            {/* CE bar (right-aligned) */}
                                            <div className="flex-1 flex justify-end">
                                                <div
                                                    className="h-2 bg-down/40 rounded-sm transition-all"
                                                    style={{ width: `${(row.ceOI / maxOI) * 100}%` }}
                                                />
                                            </div>
                                            <div className="w-[1px] h-3 bg-white/10 shrink-0" />
                                            {/* PE bar (left-aligned) */}
                                            <div className="flex-1">
                                                <div
                                                    className="h-2 bg-up/40 rounded-sm transition-all"
                                                    style={{ width: `${(row.peOI / maxOI) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-[7px] text-zinc-600 mt-2 font-black uppercase">
                                <span>Call OI ←</span>
                                <span>→ Put OI</span>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-600 text-[10px] font-black uppercase">
                    No data available
                </div>
            )}
        </div>
    );
};
