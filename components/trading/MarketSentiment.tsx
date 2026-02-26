"use client";

import React from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Activity, BarChart2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const MarketSentiment = () => {
    const { indiaVix, vixChange, advances, declines, total } = useMarketStore(state => state.marketSentiment);

    const isVixHigh = indiaVix > 15;
    const isBullish = advances > declines;
    const breadthRatio = (advances / total) * 100;

    return (
        <div className="flex items-center gap-4 px-4 h-8 shrink-0 select-none hidden lg:flex">
            {/* India VIX Section */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 group cursor-default">
                        <div className={cn(
                            "p-1 rounded-md transition-colors",
                            isVixHigh ? "bg-down/10 text-down group-hover:bg-down/20" : "bg-up/10 text-up group-hover:bg-up/20"
                        )}>
                            <Activity className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase">INDIA VIX</span>
                            <div className="flex items-center gap-1.5">
                                <span className={cn(
                                    "text-xs font-mono font-bold",
                                    isVixHigh ? "text-down drop-shadow-[0_0_8px_color-mix(in_srgb,var(--down)_30%,transparent)]" : "text-up drop-shadow-[0_0_8px_color-mix(in_srgb,var(--up)_30%,transparent)]"
                                )}>
                                    {indiaVix.toFixed(2)}
                                </span>
                                <span className={cn("text-[9px]", vixChange >= 0 ? "text-down" : "text-up")}>
                                    {vixChange > 0 ? "+" : ""}{vixChange}%
                                </span>
                            </div>
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Volatility Index (Fear Gauge)</p>
                    <p className="text-[10px] text-zinc-400">{isVixHigh ? "High Volatility - Caution" : "Calculated Low Volatility"}</p>
                </TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-white/5" />

            {/* Advance / Decline Ratio */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 group cursor-default">
                        <div className="p-1 rounded-md bg-muted border border-border text-muted-foreground group-hover:border-primary/20 group-hover:text-primary transition-colors">
                            <BarChart2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col w-24 gap-0.5">
                            <div className="flex justify-between text-[9px] font-bold tracking-wider leading-none">
                                <span className="text-up">{advances}</span>
                                <span className="text-muted-foreground">A/D</span>
                                <span className="text-down">{declines}</span>
                            </div>
                            {/* Breadth Bar */}
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-up shadow-[0_0_8px_var(--up)] transition-all duration-500"
                                    style={{ width: `${breadthRatio}%` }}
                                />
                                <div className="h-full flex-1 bg-down/50" />
                            </div>
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Market Breadth (Advances vs Declines)</p>
                    <p className="text-[10px] text-zinc-400">{isBullish ? "Market is Bullish" : "Market is Bearish"}</p>
                </TooltipContent>
            </Tooltip>
        </div>
    );
};
