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
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.5fr] text-right py-1.5 px-3 border-b border-white/[0.03] hover:bg-white/[0.05] text-[9.5px] items-center font-mono group transition-all duration-200">
            {/* Symbol & Product */}
            <div className="text-left flex flex-col leading-tight">
                <div className="font-black text-white/90 group-hover:text-primary transition-colors tracking-tighter uppercase text-[10px]">{position.symbol}</div>
                <div className="flex items-center gap-1">
                    <span className="text-[7px] text-zinc-600 font-bold uppercase tracking-tighter bg-white/5 px-1 rounded-[1px] border border-white/5">{position.product}</span>
                    <span className="text-[7px] text-zinc-800 font-black uppercase tracking-tighter">NSE</span>
                </div>
            </div>

            {/* Net Qty */}
            <div className={cn("font-black", position.quantity > 0 ? "text-up" : "text-down")}>
                {position.quantity > 0 ? "+" : ""}{position.quantity}
            </div>

            {/* Avg Price */}
            <div className="text-zinc-400 font-bold">{position.average_price.toFixed(2)}</div>

            {/* LTP */}
            <div className={cn("font-bold", (ticker?.net_change ?? 0) >= 0 ? "text-up/80" : "text-down/80")}>
                {ltp.toFixed(2)}
            </div>

            {/* P&L */}
            <div className={cn("font-black", isProfit ? "text-up" : "text-down")}>
                <div className="flex flex-col items-end leading-tight">
                    <span className="text-[11px]">{pnl > 0 ? "+" : ""}{pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[8px] font-bold opacity-70 tracking-tighter">{pnlPercent.toFixed(2)}%</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        useOrderStore.getState().closePosition(position.symbol, ltp);
                    }}
                    className="p-1 hover:bg-down/20 rounded text-zinc-600 hover:text-down transition-colors"
                >
                    <Target className="w-3 h-3" />
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
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-4 p-4 bg-[#0a0f18]">
                <div className="w-14 h-14 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-center shadow-inner">
                    <Shield className="w-7 h-7 opacity-20" />
                </div>
                <div className="text-center">
                    <div className="text-[10px] uppercase tracking-[0.3em] font-black text-white/40 mb-1">Portfolio Void</div>
                    <div className="text-[9px] text-zinc-700 font-medium">No open positions detected in this segment</div>
                </div>
                <button className="px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary/10 transition-all">
                    Search Instruments
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0a0f18] relative">
            {/* Widget Tool Header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.08] bg-white/[0.03]">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-up shadow-[0_0_8px_var(--up)]" />
                    <span className="text-[8px] font-black text-white/80 uppercase tracking-[0.2em]">Active Positions</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <button className="text-zinc-600 hover:text-white transition-colors"><BarChart3 className="w-3 h-3" /></button>
                    <button className="text-zinc-600 hover:text-white transition-colors"><Filter className="w-3 h-3" /></button>
                    <button className="text-zinc-600 hover:text-white transition-colors"><Maximize2 className="w-3 h-3" /></button>
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.5fr] text-right py-2 px-3 bg-black/40 text-[8px] uppercase font-black text-zinc-500 border-b border-white/5 tracking-[0.2em] shadow-sm">
                <div className="text-left">Symbol</div>
                <div>Qty</div>
                <div>Avg</div>
                <div>LTP</div>
                <div>Realized P&L</div>
                <div></div>
            </div>

            {/* Rows */}
            <ScrollArea className="flex-1 overflow-auto custom-scrollbar">
                <div className="divide-y divide-white/[0.02]">
                    {positions.map((pos: any) => (
                        <PositionRow key={`${pos.symbol}-${pos.product}`} position={pos} />
                    ))}
                </div>
            </ScrollArea>

            {/* 915 GREEKS BAR - HIGH DENSITY REPLICATION */}
            <div className="h-9 border-t border-white/[0.1] bg-black/40 backdrop-blur-xl flex items-center justify-between px-4 sticky bottom-0 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.6)]">
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                        <span className="text-[7.5px] font-black text-zinc-600 uppercase tracking-[0.2em]">Delta</span>
                        <div className="flex items-center gap-1 text-[9px] font-mono font-black text-up text-glow">
                            <ArrowUpRight className="w-2.5 h-2.5" />
                            {netDelta.toFixed(2)}
                        </div>
                    </div>
                    <div className="w-px h-3 bg-white/10" />
                    <div className="flex items-center gap-2">
                        <span className="text-[7.5px] font-black text-zinc-600 uppercase tracking-[0.2em]">Theta</span>
                        <div className="flex items-center gap-1 text-[9px] font-mono font-black text-down text-glow">
                            <ArrowDownLeft className="w-2.5 h-2.5" />
                            {netTheta.toFixed(2)}
                        </div>
                    </div>
                    <div className="w-px h-3 bg-white/10" />
                    <div className="flex items-center gap-2">
                        <span className="text-[7.5px] font-black text-zinc-600 uppercase tracking-[0.2em]">Vega</span>
                        <div className="text-[9px] font-mono font-black text-white/70">
                            {netVega.toFixed(2)}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-sm cursor-help group relative">
                    <Zap className="w-2.5 h-2.5 text-primary animate-pulse" />
                    <span className="text-[7.5px] font-black text-primary uppercase tracking-[0.2em]">Hedge Needed</span>

                    {/* Tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all pointer-events-none">
                        <div className="text-[10px] font-bold text-white mb-1 flex items-center gap-1.5">
                            <Info className="w-3 h-3 text-primary" /> Risk Analysis
                        </div>
                        <p className="text-[8px] text-zinc-500 leading-relaxed">Portfolio Delta exceeds recommended threshold. Consider selling calls to neutralize directional exposure.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
