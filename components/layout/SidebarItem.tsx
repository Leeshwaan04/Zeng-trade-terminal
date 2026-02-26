"use client";

import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";

export const SidebarItem = ({ symbol }: { symbol: string }) => {
    const data = useMarketStore((state) => state.tickers[symbol]);

    if (!data) return (
        <div className="flex justify-between items-center p-3 border-b border-border/50 animate-pulse">
            <div className="h-4 w-16 bg-muted rounded"></div>
            <div className="h-4 w-12 bg-muted rounded"></div>
        </div>
    );

    const isPositive = (data.net_change ?? 0) >= 0;

    return (
        <div className="flex justify-between items-center p-3 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group">
            <div className="flex flex-col gap-0.5">
                <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">{symbol}</span>
                <span className="text-[10px] text-muted-foreground">NSE</span>
            </div>
            <div className="flex flex-col items-end gap-0.5 font-mono">
                <div className={cn("text-xs font-medium text-foreground")}>
                    {data.last_price.toFixed(2)}
                </div>
                <div className={cn("text-[10px]", isPositive ? "text-up" : "text-down")}>
                    {isPositive ? '+' : ''}{data.change_percent.toFixed(2)}%
                </div>
            </div>
        </div>
    );
};
