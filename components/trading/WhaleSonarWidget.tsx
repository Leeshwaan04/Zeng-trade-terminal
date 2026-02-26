"use client";

import React, { useEffect, useState, useRef } from "react";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { cn } from "@/lib/utils";
import { Radar, Target, TrendingUp, TrendingDown } from "lucide-react";
import { useMarketStore } from "@/hooks/useMarketStore";

interface WhaleTrade {
    id: string;
    time: string;
    symbol: string;
    side: "BUY" | "SELL";
    quantity: number;
    price: number;
    value: number; // in Lacs/Cr
    sentiment: "BULLISH" | "BEARISH";
}

export const WhaleSonarWidget = () => {
    const [whales, setWhales] = useState<WhaleTrade[]>([]);
    const { tickers } = useMarketStore();
    const lastCheckRef = useRef<number>(Date.now());

    // Simulation Logic for Mock Mode
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            if (Math.random() > 0.7) { // 30% chance every 2s to find a whale
                const isBuy = Math.random() > 0.5;
                const symbols = ["NIFTY 50", "BANKNIFTY", "RELIANCE", "HDFCBANK", "INFY"];
                const symbol = symbols[Math.floor(Math.random() * symbols.length)];
                const price = tickers[symbol]?.last_price || (symbol.includes("NIFTY") ? 22000 : 1500);
                const qty = Math.floor(Math.random() * 5000) + 1000;
                const value = (price * qty) / 10000000; // Value in Cr

                if (value > 0.05) { // Filter distinct 'large' trades > 5L roughly
                    const newWhale: WhaleTrade = {
                        id: Math.random().toString(36).substr(2, 9),
                        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                        symbol,
                        side: isBuy ? "BUY" : "SELL",
                        quantity: qty,
                        price,
                        value, // Cr
                        sentiment: isBuy ? "BULLISH" : "BEARISH"
                    };

                    setWhales(prev => [newWhale, ...prev].slice(0, 50));
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [tickers]);

    return (
        <div className="flex flex-col h-full bg-black font-mono select-none relative overflow-hidden">
            <WidgetHeader id="whale-sonar"
                title="WHALE SONAR"
                action={<Radar className="w-3 h-3 text-[var(--neon-green)] animate-pulse" />}
            />

            {/* Sonar Visualizer (Background) */}
            <div className="absolute inset-0 pointer-events-none opacity-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-[var(--neon-green)] rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-[var(--neon-green)] rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-5 text-[9px] text-muted-foreground uppercase font-black tracking-wider px-3 py-2 border-b border-white/10 relative z-10 bg-black/50 backdrop-blur-sm">
                <div className="col-span-1">Time</div>
                <div className="col-span-1">Symbol</div>
                <div className="col-span-1 text-right">Qty</div>
                <div className="col-span-1 text-right">Val(Cr)</div>
                <div className="col-span-1 text-right">Side</div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto relative z-10 scrollbar-hide">
                {whales.map((trade) => (
                    <div
                        key={trade.id}
                        className={cn(
                            "grid grid-cols-5 text-[10px] px-3 py-1.5 border-b border-white/5 items-center hover:bg-white/5 transition-colors cursor-pointer group",
                            trade.side === "BUY" ? "shadow-[inset_2px_0_0_var(--neon-green)]" : "shadow-[inset_2px_0_0_var(--neon-red)]"
                        )}
                    >
                        <div className="text-zinc-500 font-mono">{trade.time}</div>
                        <div className="font-bold text-zinc-300">{trade.symbol}</div>
                        <div className="text-right text-zinc-400">{trade.quantity.toLocaleString()}</div>
                        <div className="text-right font-bold text-zinc-200">{trade.value.toFixed(2)}</div>
                        <div className={cn(
                            "text-right font-black flex items-center justify-end gap-1",
                            trade.side === "BUY" ? "text-[var(--neon-green)]" : "text-[var(--neon-red)]"
                        )}>
                            {trade.side}
                            {trade.side === "BUY" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        </div>
                    </div>
                ))}

                {whales.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-zinc-600 gap-2">
                        <Target className="w-8 h-8 opacity-20 animate-spin-slow" />
                        <span className="text-xs">Scanning for institutional activity...</span>
                    </div>
                )}
            </div>
        </div>
    );
};
