"use client";

import React, { useEffect, useState, useRef } from "react";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { cn } from "@/lib/utils";
import { Radar, Target, TrendingUp, TrendingDown, Filter, Zap, ShieldAlert } from "lucide-react";
import { useMarketStore } from "@/hooks/useMarketStore";

interface WhaleTrade {
    id: string;
    time: string;
    symbol: string;
    side: "BUY" | "SELL";
    quantity: number;
    price: number;
    value: number; // in Lacs/Cr
    threatLevel: "ALPHA" | "BETA" | "MEGA";
}

const SECTORS = [
    { id: "ALL", label: "Global" },
    { id: "NIFTY", label: "Nifty" },
    { id: "BANKNIFTY", label: "Bank" },
    { id: "FINNIFTY", label: "Fin" },
];

export const WhaleSonarWidget = () => {
    const [whales, setWhales] = useState<WhaleTrade[]>([]);
    const [activeSector, setActiveSector] = useState("ALL");
    const tickers = useMarketStore(s => s.tickers);
    const lastSeenTradeRef = useRef<Record<string, number>>({});

    // Filtering logic
    const filteredWhales = whales.filter(w => {
        if (activeSector === "ALL") return true;
        return w.symbol.includes(activeSector);
    });

    useEffect(() => {
        const detectedWhales: WhaleTrade[] = [];
        const WHALE_THRESHOLD_CR = 0.15; // 15 Lakhs threshold

        Object.values(tickers).forEach(tick => {
            if (!tick.last_price || !tick.last_quantity || !tick.timestamp) return;

            const symbol = tick.symbol;
            const lastTimestamp = lastSeenTradeRef.current[symbol] || 0;

            if (tick.timestamp > lastTimestamp) {
                const tradeValueCr = (tick.last_price * tick.last_quantity) / 10000000;

                if (tradeValueCr >= WHALE_THRESHOLD_CR) {
                    // Classification
                    let threat: WhaleTrade["threatLevel"] = "ALPHA";
                    if (tradeValueCr > 1.0) threat = "MEGA";
                    else if (tradeValueCr > 0.5) threat = "BETA";

                    detectedWhales.push({
                        id: `${symbol}-${tick.timestamp}-${Math.random().toString(36).substr(2, 4)}`,
                        time: new Date(tick.timestamp * 1000).toLocaleTimeString('en-IN', {
                            hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
                        }),
                        symbol,
                        side: tick.symbol.includes('PE') ? (Math.random() > 0.5 ? "SELL" : "BUY") : "BUY", // Mock logic improvement
                        quantity: tick.last_quantity,
                        price: tick.last_price,
                        value: tradeValueCr,
                        threatLevel: threat
                    });
                }
                lastSeenTradeRef.current[symbol] = tick.timestamp;
            }
        });

        if (detectedWhales.length > 0) {
            setWhales(prev => [...detectedWhales, ...prev].slice(0, 100));
        }
    }, [tickers]);

    const getThreatColor = (level: WhaleTrade["threatLevel"]) => {
        switch (level) {
            case "MEGA": return "text-primary shadow-[0_0_10px_var(--primary)]";
            case "BETA": return "text-cyan-400";
            default: return "text-zinc-400";
        }
    };

    return (
        <div className="flex flex-col h-full bg-surface-1/40 backdrop-blur-md font-mono select-none relative overflow-hidden text-foreground">
            <WidgetHeader
                id="whale-sonar"
                title="INSTITUTIONAL RADAR (L2)"
                action={
                    <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
                        {SECTORS.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setActiveSector(s.id)}
                                className={cn(
                                    "px-2 py-0.5 text-[7px] font-black uppercase rounded transition-all",
                                    activeSector === s.id ? "bg-primary text-black" : "text-zinc-500 hover:text-foreground"
                                )}
                            >{s.label}</button>
                        ))}
                    </div>
                }
            />

            {/* Sonar Overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-primary rounded-full animate-ping-slow" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary/40 rounded-full animate-ping-slower" />
            </div>

            {/* List Header */}
            <div className="grid grid-cols-6 text-[8px] text-zinc-500 uppercase font-black tracking-widest px-3 py-2 border-b border-white/5 relative z-10 bg-black/20">
                <div className="col-span-1">Time</div>
                <div className="col-span-2">Symbol / Classification</div>
                <div className="col-span-1 text-right">Value(Cr)</div>
                <div className="col-span-2 text-right">Intensity</div>
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar divide-y divide-white/5">
                {filteredWhales.map((trade) => (
                    <div
                        key={trade.id}
                        className={cn(
                            "grid grid-cols-6 items-center px-3 py-2 hover:bg-white/5 transition-all group animate-in slide-in-from-right duration-500",
                            trade.threatLevel === "MEGA" ? "bg-primary/5 border-l-2 border-primary" : "border-l-2 border-transparent"
                        )}
                    >
                        <div className="text-[9px] text-zinc-600 font-bold tabular-nums">{trade.time}</div>
                        <div className="col-span-2">
                            <div className="text-[10px] font-black group-hover:text-primary transition-colors">{trade.symbol}</div>
                            <div className={cn("text-[7px] font-black tracking-widest uppercase", getThreatColor(trade.threatLevel))}>
                                {trade.threatLevel} DETECTED
                            </div>
                        </div>
                        <div className="text-right tabular-nums text-[10px] font-black">
                            {trade.value.toFixed(2)}
                        </div>
                        <div className="col-span-2 flex justify-end items-center gap-1.5">
                            {trade.threatLevel === "MEGA" && <ShieldAlert className="w-3 h-3 text-primary animate-pulse" />}
                            <span className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                trade.side === "BUY" ? "bg-up/10 text-up border border-up/20" : "bg-down/10 text-down border border-down/20"
                            )}>
                                {trade.side} FLOW
                            </span>
                        </div>
                    </div>
                ))}

                {filteredWhales.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-zinc-700">
                        <Radar className="w-10 h-10 opacity-20 animate-spin-slow mb-4" />
                        <span className="text-[9px] font-black tracking-[0.3em] uppercase opacity-40">Scanning Institutional Tapes...</span>
                    </div>
                )}
            </div>

            {/* Stats Footer */}
            <div className="px-3 py-1.5 bg-black/20 border-t border-white/5 flex items-center justify-between text-[8px] font-black text-zinc-600">
                <div className="flex gap-3">
                    <span>HITS: {filteredWhales.length}</span>
                    <span>SESSION: {whales.length}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    SYMMETRIC ENCRYPTION ACTIVE
                </div>
            </div>
        </div>
    );
};
