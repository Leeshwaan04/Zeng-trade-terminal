import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useOrderStore } from "@/hooks/useOrderStore";

export const HoldingsTable = () => {
    const { positions } = useOrderStore();

    // Calculate totals from actual positions (Kite Portfolio style)
    const totalInvested = positions.reduce((acc, p) => acc + (p.buy_quantity * p.buy_price), 0);
    const currentValue = positions.reduce((acc, p) => acc + (p.quantity * p.last_price), 0);
    const totalPnL = positions.reduce((acc, p) => acc + p.pnl, 0);
    const totalPnLPercent = totalInvested !== 0 ? (totalPnL / totalInvested) * 100 : 0;

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Summary Header */}
            <div className="grid grid-cols-2 gap-4 p-5 border-b border-border bg-card">
                <div className="space-y-1">
                    <div className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em]">Invested</div>
                    <div className="font-mono text-xl font-bold tracking-tighter text-foreground">₹{totalInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                </div>
                <div className="space-y-1 text-right">
                    <div className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em]">Current</div>
                    <div className="font-mono text-xl font-bold tracking-tighter text-primary neon-glow">₹{currentValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                </div>
                <div className="col-span-2 flex items-center justify-between pt-4 border-t border-border mt-2">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total P&L</div>
                    <div className={cn("font-mono text-sm font-black flex items-center gap-2", totalPnL >= 0 ? "text-up" : "text-down")}>
                        <span>{totalPnL >= 0 ? "▲" : "▼"} ₹{Math.abs(totalPnL).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span className="text-[10px] opacity-70 border border-current/20 px-1 py-0.5 rounded-sm bg-current/5">{totalPnLPercent.toFixed(2)}%</span>
                    </div>
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-4 text-right py-2 px-3 bg-surface-1 text-[9px] uppercase font-black text-muted-foreground border-b border-border tracking-[0.15em]">
                <div className="text-left">Instrument</div>
                <div>Qty</div>
                <div>Avg price</div>
                <div>Returns</div>
            </div>

            {/* Rows */}
            <ScrollArea className="flex-1">
                <div className="divide-y divide-border/20">
                    {positions.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground opacity-50">
                            <span className="text-xs uppercase tracking-widest font-mono">No Open Positions</span>
                        </div>
                    )}
                    {positions.map((p) => {
                        const isProfit = p.pnl >= 0;
                        const investVal = p.buy_quantity * p.buy_price;
                        const pnlPercent = investVal !== 0 ? (p.pnl / investVal) * 100 : 0;

                        return (
                            <div key={`${p.symbol}-${p.product}`} className="grid grid-cols-4 text-right py-3.5 px-3 hover:bg-surface-4 text-[11px] items-center font-mono transition-colors group">
                                {/* Symbol */}
                                <div className="text-left">
                                    <div className="font-bold text-foreground group-hover:text-primary transition-colors">{p.symbol}</div>
                                    <div className="text-[9px] text-muted-foreground flex gap-1 uppercase font-bold tracking-tighter">
                                        <span>{p.product}</span>
                                        <span className="text-xs text-muted-foreground mx-1">|</span>
                                        <span className="text-muted-foreground">LTP ₹{p.last_price.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Qty */}
                                <div className={cn("font-medium", p.quantity > 0 ? "text-up" : "text-down")}>
                                    {p.quantity}
                                </div>

                                {/* Avg */}
                                <div className="text-muted-foreground">{p.average_price.toFixed(2)}</div>

                                {/* P&L */}
                                <div className={cn(
                                    "font-bold",
                                    isProfit ? "text-up" : "text-down"
                                )}>
                                    <div className="flex flex-col items-end">
                                        <span>{isProfit ? "+" : ""}{p.pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        <span className="text-[9px] opacity-60 font-medium tracking-tighter">{pnlPercent.toFixed(2)}%</span>
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

