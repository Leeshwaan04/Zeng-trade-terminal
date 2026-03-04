"use client";

import React, { memo, useEffect } from "react";
import { usePortfolioStore } from "@/hooks/usePortfolioStore";
import { NormalizedPosition } from "@/lib/portfolio-utils";
import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    BarChart3, Filter, Maximize2,
    ArrowUpRight, ArrowDownLeft, Info,
    Target, Shield, Zap, RefreshCw
} from "lucide-react";

const PositionRow = memo(({ position }: { position: NormalizedPosition }) => {
    const ticker = useMarketStore(state => (state as any).tickers[position.tradingsymbol]);
    const ltp = ticker?.last_price || position.last_price || position.average_price;

    const investVal = Math.abs(position.quantity) * position.average_price;
    const pnl = (ltp - position.average_price) * position.quantity;
    const pnlPercent = investVal !== 0 ? (pnl / investVal) * 100 : 0;

    const isProfit = pnl >= 0;

    return (
        <div className="relative grid grid-cols-[0.4fr_1.1fr_1fr_1fr_1fr_1fr_0.5fr] text-right py-1 px-2 border-b border-border/10 hover:bg-surface-3 items-center font-mono group transition-all duration-200">
            {/* Broker Tag */}
            <div className="text-left">
                <span className={cn(
                    "text-[6px] font-black px-1 py-0.5 rounded-[2px] uppercase tracking-tighter border",
                    position.broker === "KITE" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                )}>
                    {position.broker.substring(0, 1)}
                </span>
            </div>

            {/* Symbol & Product */}
            <div className="text-left flex flex-col leading-tight">
                <div className="font-black text-foreground group-hover:text-primary transition-colors tracking-tighter uppercase text-[10px]">{position.tradingsymbol}</div>
                <div className="flex items-center gap-1">
                    <span className="text-[7px] text-muted-foreground font-bold uppercase tracking-tighter bg-surface-2 px-1 rounded-[1px] border border-border">{position.product}</span>
                    <span className="text-[7px] text-muted-foreground font-black uppercase tracking-tighter">{position.exchange}</span>
                </div>
            </div>

            {/* Net Qty */}
            <div className={cn("font-bold text-[10px] tabular-nums", position.quantity > 0 ? "text-up" : "text-down")}>
                {position.quantity > 0 ? "+" : ""}{position.quantity}
            </div>

            {/* Avg Price */}
            <div className="text-muted-foreground font-bold text-[9px] tabular-nums">{position.average_price.toFixed(2)}</div>

            {/* LTP */}
            <div className={cn("font-bold text-[9px] tabular-nums", (ticker?.net_change ?? 0) >= 0 ? "text-up/80" : "text-down/80")}>
                {ltp.toFixed(2)}
            </div>

            {/* P&L */}
            <div className={cn("font-bold tabular-nums", isProfit ? "text-up" : "text-down")}>
                <div className="flex flex-col items-end leading-tight">
                    <span className="text-[10px]">{pnl > 0 ? "+" : ""}{pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[8px] opacity-70 tracking-tighter">{pnlPercent.toFixed(2)}%</span>
                </div>
            </div>

            {/* Lightning Hover Actions */}
            <div className="absolute right-2 inset-y-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-background via-background to-transparent pl-8 z-10">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement multi-broker exit logic in usePortfolioStore or similar
                        console.log(`Exiting ${position.tradingsymbol} on ${position.broker}`);
                    }}
                    className="px-2 py-0.5 rounded-[2px] bg-surface-2 hover:bg-surface-3 border border-border text-muted-foreground hover:text-foreground text-[8px] font-black uppercase tracking-widest flex items-center gap-1 transition-all"
                >
                    <Target className="w-2.5 h-2.5" /> EXIT
                </button>
            </div>
        </div >
    );
});

PositionRow.displayName = "PositionRow";

export const PositionsTable = () => {
    const { fusedPositions, isRefreshing, refreshPortfolio } = usePortfolioStore();

    useEffect(() => {
        if (fusedPositions.length === 0) {
            refreshPortfolio(true); // Default to mock for demo if no real auth
        }
    }, []);

    // Aggregated Metrics
    const netPnL = fusedPositions.reduce((acc, p) => acc + (p.pnl || 0), 0);
    const netDelta = 0.42;
    const netTheta = -120.50;
    const netVega = 45.20;

    if (fusedPositions.length === 0 && !isRefreshing) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-4 bg-background">
                <div className="w-14 h-14 rounded-2xl border border-border bg-surface-1 flex items-center justify-center shadow-inner">
                    <Shield className="w-7 h-7 opacity-20" />
                </div>
                <div className="text-center">
                    <div className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground/40 mb-1">Portfolio Void</div>
                    <div className="text-[9px] text-muted-foreground/70 font-medium">No open positions detected across brokers</div>
                </div>
                <button
                    onClick={() => refreshPortfolio(true)}
                    className="px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary/10 transition-all flex items-center gap-2"
                >
                    <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} /> Initialize Fused View
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* Widget Tool Header */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-surface-1">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-up shadow-[0_0_8px_var(--up)]" />
                    <span className="text-[8px] font-black text-foreground/80 uppercase tracking-[0.2em]">Fused Positions</span>
                    <span className="text-[7px] text-muted-foreground opacity-50 font-mono">BROKER_SYNC: OK</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => refreshPortfolio(true)}
                        className={cn("text-muted-foreground hover:text-foreground transition-colors", isRefreshing && "animate-spin")}
                    >
                        <RefreshCw className="w-3 h-3" />
                    </button>
                    <button className="text-muted-foreground hover:text-foreground transition-colors"><BarChart3 className="w-3 h-3" /></button>
                    <button className="text-muted-foreground hover:text-foreground transition-colors"><Maximize2 className="w-3 h-3" /></button>
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[0.4fr_1.1fr_1fr_1fr_1fr_1fr_0.5fr] text-right py-1 px-2 bg-surface-1 text-[7px] uppercase font-bold text-muted-foreground border-b border-border tracking-widest shadow-sm">
                <div className="text-left">B</div>
                <div className="text-left">Symbol</div>
                <div>Qty</div>
                <div>Avg</div>
                <div>LTP</div>
                <div>Unrealized P&L</div>
                <div></div>
            </div>

            {/* Rows */}
            <ScrollArea className="flex-1 overflow-auto custom-scrollbar">
                <div className="divide-y divide-border/[0.02]">
                    {fusedPositions.map((pos: NormalizedPosition) => (
                        <PositionRow key={`${pos.broker}-${pos.tradingsymbol}-${pos.product}`} position={pos} />
                    ))}
                </div>
            </ScrollArea>

            {/* FUSED P&L BAR */}
            <div className="h-7 border-t border-border bg-surface-1 flex items-center justify-between px-2 sticky bottom-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">NET P&L</span>
                        <div className={cn("text-[8.5px] font-mono font-bold", netPnL >= 0 ? "text-up" : "text-down")}>
                            {netPnL > 0 ? "+" : ""}{netPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-sm cursor-help group relative">
                    <Zap className="w-2.5 h-2.5 text-primary animate-pulse" />
                    <span className="text-[7px] font-bold text-primary uppercase tracking-widest">Cross-Broker Fused</span>
                </div>
            </div>
        </div>
    );
};
