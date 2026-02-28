"use client";

import React, { memo } from "react";
import { useOrderStore, Position } from "@/hooks/useOrderStore";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useMarketStore } from "@/hooks/useMarketStore";
import { useWatchlistStore } from "@/hooks/useWatchlistStore";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    BarChart3, Filter, Maximize2,
    ArrowUpRight, ArrowDownLeft, Info,
    Target, Shield, Zap
} from "lucide-react";

const PositionRow = memo(({ position }: { position: Position }) => {
    const ticker = useMarketStore(state => (state as any).tickers[position.symbol]);
    const ltp = ticker?.last_price || position.average_price;

    const investVal = Math.abs(position.quantity) * position.average_price;
    const pnl = (ltp - position.average_price) * position.quantity;
    const pnlPercent = investVal !== 0 ? (pnl / investVal) * 100 : 0;

    const isProfit = pnl >= 0;

    return (
        <div className="relative grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.5fr] text-right py-1 px-2 border-b border-border/[0.01] hover:bg-primary/5 items-center font-mono group transition-all duration-200">
            {/* Symbol & Product */}
            <div className="text-left flex flex-col leading-tight">
                <div className="font-black text-foreground group-hover:text-primary transition-colors tracking-tighter uppercase text-[10px]">{position.symbol}</div>
                <div className="flex items-center gap-1">
                    <span className="text-[7px] text-muted-foreground font-bold uppercase tracking-tighter bg-surface-2 px-1 rounded-[1px] border border-border">{position.product}</span>
                    <span className="text-[7px] text-muted-foreground font-black uppercase tracking-tighter">NSE</span>
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
                <button className="px-1.5 py-0.5 rounded-[2px] bg-up/10 hover:bg-up border border-up/20 hover:border-up text-up hover:text-black text-[8px] font-black transition-all">B</button>
                <button className="px-1.5 py-0.5 rounded-[2px] bg-down/10 hover:bg-down border border-down/20 hover:border-down text-down hover:text-black text-[8px] font-black transition-all">S</button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        useOrderStore.getState().closePosition(position.symbol, ltp);
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
    const positions = useOrderStore(state => (state as any).positions);

    // Mock Greeks for 915 Parity
    const netDelta = 0.42;
    const netTheta = -120.50;
    const netVega = 45.20;

    if (positions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-4 bg-background">
                <div className="w-14 h-14 rounded-2xl border border-border bg-surface-1 flex items-center justify-center shadow-inner">
                    <Shield className="w-7 h-7 opacity-20" />
                </div>
                <div className="text-center">
                    <div className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground/40 mb-1">Portfolio Void</div>
                    <div className="text-[9px] text-muted-foreground/70 font-medium">No open positions detected in this segment</div>
                </div>
                <button className="px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary/10 transition-all">
                    Search Instruments
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
                    <span className="text-[8px] font-black text-foreground/80 uppercase tracking-[0.2em]">Active Positions</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <button className="text-zinc-600 hover:text-white transition-colors"><BarChart3 className="w-3 h-3" /></button>
                    <button className="text-zinc-600 hover:text-white transition-colors"><Filter className="w-3 h-3" /></button>
                    <button className="text-zinc-600 hover:text-white transition-colors"><Maximize2 className="w-3 h-3" /></button>
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.5fr] text-right py-1 px-2 bg-surface-1 text-[7px] uppercase font-bold text-muted-foreground border-b border-border tracking-widest shadow-sm">
                <div className="text-left">Symbol</div>
                <div>Qty</div>
                <div>Avg</div>
                <div>LTP</div>
                <div>Realized P&L</div>
                <div></div>
            </div>

            {/* Rows */}
            <ScrollArea className="flex-1 overflow-auto custom-scrollbar">
                <div className="divide-y divide-border/[0.02]">
                    {positions.map((pos: any) => (
                        <PositionRow key={`${pos.symbol}-${pos.product}`} position={pos} />
                    ))}
                </div>
            </ScrollArea>

            {/* 915 GREEKS BAR - HIGH DENSITY REPLICATION */}
            <div className="h-7 border-t border-border bg-surface-1 flex items-center justify-between px-2 sticky bottom-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">Delta</span>
                        <div className="flex items-center gap-0.5 text-[8.5px] font-mono font-bold text-up">
                            <ArrowUpRight className="w-2h-2" />
                            {netDelta.toFixed(2)}
                        </div>
                    </div>
                    <div className="w-px h-2.5 bg-white/5" />
                    <div className="flex items-center gap-1.5">
                        <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">Theta</span>
                        <div className="flex items-center gap-0.5 text-[8.5px] font-mono font-bold text-down">
                            <ArrowDownLeft className="w-2 h-2" />
                            {netTheta.toFixed(2)}
                        </div>
                    </div>
                    <div className="w-px h-2.5 bg-border" />
                    <div className="flex items-center gap-1.5">
                        <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">Vega</span>
                        <div className="text-[8.5px] font-mono font-bold text-foreground">
                            {netVega.toFixed(2)}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-sm cursor-help group relative">
                    <Zap className="w-2.5 h-2.5 text-primary animate-pulse" />
                    <span className="text-[7px] font-bold text-primary uppercase tracking-widest">Hedge Needed</span>

                    {/* Tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-surface-1 border border-border rounded-lg shadow-2xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none">
                        <div className="text-[10px] font-bold text-foreground mb-1 flex items-center gap-1.5">
                            <Info className="w-3 h-3 text-primary" /> Risk Analysis
                        </div>
                        <p className="text-[8px] text-muted-foreground leading-relaxed font-bold">Portfolio Delta exceeds recommended threshold. Consider selling calls to neutralize directional exposure.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
