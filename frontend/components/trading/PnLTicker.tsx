"use client";

import React from "react";
import { usePortfolioStore } from "@/hooks/usePortfolioStore";
import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Activity } from "lucide-react";

export const PnLTicker = () => {
    const { fusedPositions } = usePortfolioStore();
    const { unifiedMargin } = useMarketStore();

    const dailyPnL = fusedPositions.reduce((acc, p) => acc + (p.pnl || 0), 0);
    const marginAvailable = unifiedMargin.totalMargin || 0;
    const marginUsed = Object.values(unifiedMargin.brokers || {}).reduce((acc: number, b: any) => acc + (b.used_margin || 0), 0);

    const isProfit = dailyPnL >= 0;
    const activePositionsCount = fusedPositions.filter(p => p.quantity !== 0).length;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(value);
    };

    return (
        <div className="h-full flex items-center bg-foreground/[0.02] dark:bg-background/50 px-3 gap-4 select-none shrink-0">
            {/* Fused P&L Section */}
            <div className="flex items-center gap-3 p-1.5 -ml-1.5 rounded-lg hover:bg-foreground/5 transition-all cursor-default group border border-transparent hover:border-border/50 relative overflow-hidden">
                <div className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                    isProfit ? "bg-up/5" : "bg-down/5"
                )} />
                <div className={cn(
                    "absolute -left-4 -right-4 h-[1px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-20 blur-[2px] transition-all duration-1000",
                    isProfit ? "bg-up animate-pulse" : "bg-down animate-pulse"
                )} />

                <div className={cn("p-1.5 rounded-md transition-transform group-hover:scale-105 relative z-10", isProfit ? "bg-up/10" : "bg-down/10")}>
                    {isProfit ? <TrendingUp className="w-4 h-4 text-up" /> : <TrendingDown className="w-4 h-4 text-down" />}
                </div>
                <div className="flex flex-col relative z-10">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest group-hover:text-muted-foreground transition-colors leading-none mb-1">Live Feed P&L</span>
                    <span className={cn(
                        "text-sm font-mono font-black tracking-tight transition-all duration-300",
                        isProfit ? "text-up drop-shadow-[0_0_8px_color-mix(in_srgb,var(--up)_30%,transparent)]" : "text-down drop-shadow-[0_0_8px_color-mix(in_srgb,var(--down)_30%,transparent)]"
                    )}>
                        {dailyPnL > 0 ? "+" : ""}{formatCurrency(dailyPnL)}
                    </span>
                </div>
            </div>

            <div className="w-px h-8 bg-border hidden 2xl:block" />

            {/* Fused Margin Section */}
            <div className="hidden 2xl:flex items-center gap-3 p-1.5 rounded-lg hover:bg-primary/10 transition-colors cursor-default group border border-transparent hover:border-border/50">
                <div className="p-1.5 rounded-md bg-surface-1 border border-border text-muted-foreground group-hover:text-foreground group-hover:border-border transition-colors shadow-sm dark:shadow-none">
                    <Wallet className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest group-hover:text-muted-foreground transition-colors">Unified Funds</span>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground">
                        <span>{formatCurrency(marginAvailable)}</span>
                        <span className="text-muted-foreground font-medium">/</span>
                        <span className="text-muted-foreground text-[10px] font-medium">{formatCurrency(marginAvailable + marginUsed)}</span>
                    </div>
                </div>
            </div>

            <div className="w-px h-8 bg-border hidden 2xl:block" />

            {/* Fused Positions Count */}
            <div className="hidden 2xl:flex items-center gap-3 p-1.5 rounded-lg hover:bg-primary/10 transition-colors cursor-default group border border-transparent hover:border-border/50">
                <div className="p-1.5 rounded-md bg-surface-1 border border-border text-muted-foreground group-hover:text-foreground group-hover:border-border transition-colors shadow-sm dark:shadow-none">
                    <Activity className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest group-hover:text-muted-foreground transition-colors">Fused Assets</span>
                    <span className="text-xs font-mono font-bold text-foreground">
                        {activePositionsCount} <span className="text-muted-foreground font-normal">Positions</span>
                    </span>
                </div>
            </div>
        </div>
    );
};
