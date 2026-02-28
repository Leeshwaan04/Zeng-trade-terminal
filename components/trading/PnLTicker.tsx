"use client";

import React from "react";
import { useOrderStore } from "@/hooks/useOrderStore";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Activity } from "lucide-react";

export const PnLTicker = () => {
    const dailyPnL = useOrderStore(state => state.dailyPnL);
    const marginAvailable = useOrderStore(state => state.marginAvailable);
    const marginUsed = useOrderStore(state => state.marginUsed);
    const positions = useOrderStore(state => state.positions);

    const isProfit = dailyPnL >= 0;
    const activePositionsCount = positions.filter(p => p.quantity !== 0).length;

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(value);
    };

    return (
        <div className="h-full flex items-center bg-background/50 px-3 gap-4 select-none shrink-0">
            {/* P&L Section */}
            {/* P&L Section */}
            <div className="flex items-center gap-3 p-1.5 -ml-1.5 rounded-lg hover:bg-primary/10 transition-colors cursor-default group">
                <div className={cn("p-1.5 rounded-md transition-transform group-hover:scale-105", isProfit ? "bg-up/10" : "bg-down/10")}>
                    {isProfit ? <TrendingUp className="w-4 h-4 text-up" /> : <TrendingDown className="w-4 h-4 text-down" />}
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest group-hover:text-muted-foreground transition-colors">Net P&L</span>
                    <span className={cn(
                        "text-sm font-mono font-bold tracking-tight",
                        isProfit ? "text-up drop-shadow-[0_0_8px_color-mix(in_srgb,var(--up)_30%,transparent)]" : "text-down drop-shadow-[0_0_8px_color-mix(in_srgb,var(--down)_30%,transparent)]"
                    )}>
                        {dailyPnL > 0 ? "+" : ""}{formatCurrency(dailyPnL)}
                    </span>
                </div>
            </div>

            <div className="w-px h-8 bg-border hidden 2xl:block" />

            {/* Margin Section */}
            <div className="hidden 2xl:flex items-center gap-3 p-1.5 rounded-lg hover:bg-primary/10 transition-colors cursor-default group">
                <div className="p-1.5 rounded-md bg-surface-1 border border-border text-muted-foreground group-hover:text-foreground group-hover:border-border transition-colors">
                    <Wallet className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest group-hover:text-muted-foreground transition-colors">Funds</span>
                    <div className="flex items-center gap-2 text-xs font-mono font-medium text-foreground">
                        <span>{formatCurrency(marginAvailable)}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground text-[10px]">{formatCurrency(marginAvailable + marginUsed)}</span>
                    </div>
                </div>
            </div>

            <div className="w-px h-8 bg-border hidden 2xl:block" />

            {/* Positions Count */}
            <div className="hidden 2xl:flex items-center gap-3 p-1.5 rounded-lg hover:bg-primary/10 transition-colors cursor-default group">
                <div className="p-1.5 rounded-md bg-surface-1 border border-border text-muted-foreground group-hover:text-foreground group-hover:border-border transition-colors">
                    <Activity className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest group-hover:text-muted-foreground transition-colors">Positions</span>
                    <span className="text-xs font-mono font-bold text-foreground">
                        {activePositionsCount} <span className="text-muted-foreground font-normal">Active</span>
                    </span>
                </div>
            </div>
        </div>
    );
};
