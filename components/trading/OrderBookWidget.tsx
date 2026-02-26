"use client";

import React, { useMemo } from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { WidgetHeader } from "@/components/ui/WidgetHeader";

const DEPTH_LEVELS = 5;

export const OrderBookWidget = ({ symbol = "NIFTY 50" }: { symbol?: string }) => {
    const ticker = useMarketStore(state => state.tickers[symbol]);

    // Use depth from store, or fallback to empty arrays
    const depth = useMemo(() => {
        if (!ticker?.depth) return { buy: [], sell: [] };
        return ticker.depth;
    }, [ticker?.depth]);

    const maxQty = Math.max(
        ...(depth.buy.length > 0 ? depth.buy.map(b => b.quantity) : [1]),
        ...(depth.sell.length > 0 ? depth.sell.map(a => a.quantity) : [1])
    );

    const isMobile = useMediaQuery("(max-width: 768px)");

    return (
        <div className="flex flex-col h-full bg-surface-1 font-mono select-none">
            <WidgetHeader title="MARKET DEPTH" symbol={symbol} />

            {/* Header Info (Total Qty) */}
            <div className="px-2 py-1.5 border-b border-border bg-surface-1 flex justify-between items-end">
                <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Total Qty</span>
                <span className="text-[10px] text-zinc-400">1.2M</span>
            </div>

            {/* Table Header */}
            <div className={cn(
                "grid text-[9px] font-black uppercase tracking-tighter text-muted-foreground border-b border-border bg-surface-1",
                isMobile ? "grid-cols-2" : "grid-cols-3"
            )}>
                <div className="pl-3 py-1">Bid Price</div>
                <div className="text-right pr-3 py-1">Bid Qty</div>
                {!isMobile && <div className="text-right pr-3 py-1">Orders</div>}
            </div>

            {/* Bids List */}
            <div className="flex-1 overflow-hidden">
                {depth.buy.map((bid, i) => (
                    <div key={`bid-${i}`} className={cn(
                        "relative grid py-1 px-3 text-[10px] items-center group cursor-crosshair",
                        isMobile ? "grid-cols-2" : "grid-cols-3"
                    )}>
                        <div
                            className="absolute inset-0 bg-up/5 origin-left transition-all duration-300"
                            style={{ width: `${(bid.quantity / maxQty) * 100}%` }}
                        />
                        <div className="text-up font-bold z-10">{bid.price.toFixed(2)}</div>
                        <div className="text-right text-foreground z-10">{bid.quantity}</div>
                        {!isMobile && <div className="text-right text-muted-foreground z-10 italic">{bid.orders}</div>}
                    </div>
                ))}

                {/* Spread */}
                <div className="py-1.5 px-3 bg-surface-2 border-y border-border flex justify-between items-center">
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Spread</span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                        {depth.buy.length > 0 && depth.sell.length > 0
                            ? (depth.sell[0].price - depth.buy[0].price).toFixed(2)
                            : "0.00"}
                    </span>
                </div>

                {/* Asks Header */}
                <div className={cn(
                    "grid text-[9px] font-black uppercase tracking-tighter text-muted-foreground border-b border-border bg-surface-1 mt-1",
                    isMobile ? "grid-cols-2" : "grid-cols-3"
                )}>
                    <div className="pl-3 py-1">Ask Price</div>
                    <div className="text-right pr-3 py-1">Ask Qty</div>
                    {!isMobile && <div className="text-right pr-3 py-1">Orders</div>}
                </div>

                {/* Asks List */}
                {depth.sell.map((ask, i) => (
                    <div key={`ask-${i}`} className={cn(
                        "relative grid py-1 px-3 text-[10px] items-center group cursor-crosshair",
                        isMobile ? "grid-cols-2" : "grid-cols-3"
                    )}>
                        <div
                            className="absolute inset-0 bg-down/5 origin-left transition-all duration-300"
                            style={{ width: `${(ask.quantity / maxQty) * 100}%` }}
                        />
                        <div className="text-down font-bold z-10">{ask.price.toFixed(2)}</div>
                        <div className="text-right text-foreground z-10">{ask.quantity}</div>
                        {!isMobile && <div className="text-right text-muted-foreground z-10 italic">{ask.orders}</div>}
                    </div>
                ))}
            </div>

            {/* Bottom Controls */}
            <div className="p-2 border-t border-border bg-surface-1 flex gap-1">
                <button className="flex-1 bg-surface-2 border border-border rounded-sm py-1 text-[9px] font-black uppercase text-muted-foreground hover:text-primary transition-colors hover:border-primary/50">
                    Depth 20
                </button>
                <button className="flex-1 bg-surface-2 border border-border rounded-sm py-1 text-[9px] font-black uppercase text-muted-foreground hover:text-primary transition-colors hover:border-primary/50">
                    Stats
                </button>
            </div>
        </div>
    );
};
