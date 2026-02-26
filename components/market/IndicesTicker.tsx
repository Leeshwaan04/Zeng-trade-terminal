"use client";

import React, { useEffect } from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";

const INDICES = [
    { symbol: "NIFTY 50", token: 256265 },
    { symbol: "NIFTY BANK", token: 260105 },
    { symbol: "NIFTY FIN SERVICE", token: 257801 },
    { symbol: "NIFTY MID SELECT", token: 288009 },
    { symbol: "SENSEX", token: 265 },
    { symbol: "INDIA VIX", token: 264969 },
];

export const IndicesTicker = () => {
    const { subscribe, tickers } = useMarketStore();

    useEffect(() => {
        subscribe(INDICES.map(i => i.token));
    }, [subscribe]);

    const TickerItem = ({ index }: { index: typeof INDICES[0] }) => {
        const ticker = tickers[index.symbol] || { last_price: 0, net_change: 0, change_percent: 0 };
        const isPositive = (ticker.net_change ?? 0) >= 0;
        const changePct = ticker.change_percent ?? (ticker.net_change / (ticker.last_price - ticker.net_change) * 100 || 0);

        return (
            <div className="flex items-center gap-2.5 px-4 shrink-0 border-r border-white/[0.04] h-full cursor-pointer hover:bg-white/[0.03] transition-colors group">
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.1em] group-hover:text-zinc-400 transition-colors">
                    {index.symbol.replace("NIFTY ", "").replace("INDIA ", "")}
                </span>
                <span className={cn("text-[10px] font-black font-mono tracking-tight", isPositive ? "text-up" : "text-down")}>
                    {ticker.last_price > 0 ? ticker.last_price.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : "—"}
                </span>
                <span className={cn("text-[9px] font-bold font-mono", isPositive ? "text-up/70" : "text-down/70")}>
                    {isPositive ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
                </span>
            </div>
        );
    };

    return (
        <div data-testid="indices-ticker" className="w-full flex overflow-hidden relative h-full group/ticker">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0c0f13] to-transparent z-10 pointer-events-none" />

            <div className="flex animate-marquee pause-on-hover h-full">
                {[...INDICES, ...INDICES].map((index, i) => (
                    <TickerItem key={`${index.symbol}-${i}`} index={index} />
                ))}
            </div>

            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0c0f13] to-transparent z-10 pointer-events-none" />
        </div>
    );
};
