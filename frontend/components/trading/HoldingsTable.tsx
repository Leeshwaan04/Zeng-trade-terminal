"use client";

import React, { memo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { usePortfolioStore } from "@/hooks/usePortfolioStore";
import { NormalizedHolding } from "@/lib/portfolio-utils";
import { useMarketStore } from "@/hooks/useMarketStore";

export const HoldingsTable = () => {
    const { fusedHoldings, isRefreshing } = usePortfolioStore();
    const tickers = useMarketStore(state => (state as any).tickers);

    // Calculate totals from fused holdings
    const totalInvested = fusedHoldings.reduce((acc, h) => acc + (h.quantity * h.average_price), 0);
    const currentValue = fusedHoldings.reduce((acc, h) => {
        const ltp = tickers[h.tradingsymbol]?.last_price || h.last_price || h.average_price;
        return acc + (h.quantity * ltp);
    }, 0);

    const totalPnL = currentValue - totalInvested;
    const totalPnLPercent = totalInvested !== 0 ? (totalPnL / totalInvested) * 100 : 0;

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Summary Header */}
            <div className="grid grid-cols-2 gap-4 p-3 border-b border-border bg-surface-1">
                <div className="space-y-0.5">
                    <div className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Fused Invested</div>
                    <div className="font-mono text-[14px] font-bold tracking-tighter text-foreground tabular-nums my-0.5">₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                </div>
                <div className="space-y-0.5 text-right">
                    <div className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">Total Value</div>
                    <div className="font-mono text-[14px] font-bold tracking-tighter text-blue-400 tabular-nums my-0.5">₹{currentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                </div>
                <div className="col-span-2 flex items-center justify-between pt-2 border-t border-border mt-1">
                    <div className="text-[8px] uppercase font-bold text-muted-foreground tracking-widest">Holdings P&L</div>
                    <div className={cn("font-mono text-[11px] font-bold flex items-center gap-2 tabular-nums", totalPnL >= 0 ? "text-up" : "text-down")}>
                        <span>{totalPnL >= 0 ? "+" : "-"}₹{Math.abs(totalPnL).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span className={cn("text-[9px] px-1 py-0.5 rounded-[2px] font-bold uppercase", totalPnL >= 0 ? "bg-up/10 border border-up/20 text-up" : "bg-down/10 border border-down/20 text-down")}>
                            {totalPnLPercent.toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[0.4fr_1.1fr_1fr_1fr_1fr] text-right py-1 px-2 bg-surface-1 text-[7px] uppercase font-bold text-muted-foreground border-b border-border tracking-widest">
                <div className="text-left">B</div>
                <div className="text-left">Instrument</div>
                <div>Qty</div>
                <div>Avg price</div>
                <div>Returns</div>
            </div>

            {/* Rows */}
            <ScrollArea className="flex-1 custom-scrollbar">
                <div className="divide-y divide-white/[0.02]">
                    {fusedHoldings.length === 0 && !isRefreshing && (
                        <div className="flex flex-col items-center justify-center h-40 text-zinc-600 opacity-50">
                            <span className="text-[9px] uppercase tracking-widest font-bold">No Open Holdings Detected</span>
                        </div>
                    )}
                    {fusedHoldings.map((h: NormalizedHolding) => {
                        const ltp = tickers[h.tradingsymbol]?.last_price || h.last_price || h.average_price;
                        const pnl = (ltp - h.average_price) * h.quantity;
                        const isProfit = pnl >= 0;
                        const investVal = h.quantity * h.average_price;
                        const pnlPercent = investVal !== 0 ? (pnl / investVal) * 100 : 0;

                        return (
                            <div key={`${h.broker}-${h.tradingsymbol}`} className="relative grid grid-cols-[0.4fr_1.1fr_1fr_1fr_1fr] text-right py-1 px-2 border-b border-border/[0.01] hover:bg-primary/5 items-center font-mono group transition-all duration-200">
                                {/* Broker Tag */}
                                <div className="text-left">
                                    <span className={cn(
                                        "text-[6px] font-black px-1 py-0.5 rounded-[2px] uppercase tracking-tighter border",
                                        h.broker === "KITE" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                    )}>
                                        {h.broker.substring(0, 1)}
                                    </span>
                                </div>

                                {/* Symbol */}
                                <div className="text-left flex flex-col leading-tight">
                                    <div className="font-black text-foreground group-hover:text-primary transition-colors tracking-tighter uppercase text-[10px]">{h.tradingsymbol}</div>
                                    <div className="flex items-center gap-1 mt-[1px]">
                                        <span className="text-[7px] text-muted-foreground font-black uppercase tracking-tighter">LTP <span className="text-foreground">₹{ltp.toFixed(2)}</span></span>
                                    </div>
                                </div>

                                {/* Qty */}
                                <div className={cn("font-bold text-[10px] tabular-nums", h.quantity > 0 ? "text-up" : "text-down")}>
                                    {h.quantity}
                                </div>

                                {/* Avg */}
                                <div className="text-zinc-400 font-bold text-[9px] tabular-nums">{h.average_price.toFixed(2)}</div>

                                {/* P&L */}
                                <div className={cn(
                                    "font-bold tabular-nums",
                                    isProfit ? "text-up" : "text-down"
                                )}>
                                    <div className="flex flex-col items-end leading-tight">
                                        <span className="text-[10px]">{isProfit ? "+" : ""}{pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        <span className="text-[8px] opacity-70 tracking-tighter">{pnlPercent.toFixed(2)}%</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
};

