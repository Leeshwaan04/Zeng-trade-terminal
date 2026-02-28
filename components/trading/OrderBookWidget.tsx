"use client";

import React, { useMemo } from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { useKiteTicker } from "@/hooks/useKiteTicker";
import { getInstrumentToken } from "@/lib/market-config";

const DEPTH_LEVELS = 5;

export const OrderBookWidget = ({ symbol = "NIFTY 50" }: { symbol?: string }) => {
    const ticker = useMarketStore(state => state.tickers[symbol]);
    const instrumentToken = getInstrumentToken(symbol) || 256265;

    // Establish a localized SSE connection ONLY for this symbol in "full" mode
    useKiteTicker({
        instrumentTokens: [instrumentToken],
        mode: "full",
        broker: "KITE", // Or handle auth context dynamically
        enabled: true
    });

    // Use depth from store, or fallback to empty arrays
    const depth = useMemo(() => {
        if (!ticker?.depth) return { buy: [], sell: [] };
        return {
            buy: [...ticker.depth.buy].sort((a, b) => b.price - a.price),
            sell: [...ticker.depth.sell].sort((a, b) => a.price - b.price)
        };
    }, [ticker?.depth]);

    // Calculate totals for UI
    const totalBuy = depth.buy.reduce((acc, b) => acc + b.quantity, 0);
    const totalSell = depth.sell.reduce((acc, s) => acc + s.quantity, 0);

    const maxQty = Math.max(
        ...(depth.buy.length > 0 ? depth.buy.map(b => b.quantity) : [1]),
        ...(depth.sell.length > 0 ? depth.sell.map(a => a.quantity) : [1])
    );

    const isMobile = useMediaQuery("(max-width: 768px)");

    return (
        <div className="flex flex-col h-full bg-surface-1 font-mono select-none">
            <WidgetHeader id="order-book" title="MARKET DEPTH" symbol={symbol} />

            {/* Header Info (Total Qty) */}
            <div className="px-2 py-1 border-b border-border bg-background flex justify-between items-end">
                <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">Total Bids: <span className="text-up font-bold">{(totalBuy / 1000).toFixed(1)}K</span></span>
                <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">Total Asks: <span className="text-down font-bold">{(totalSell / 1000).toFixed(1)}K</span></span>
            </div>

            {/* Table Header */}
            <div className={cn(
                "grid text-[8px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border bg-surface-1",
                isMobile ? "grid-cols-2" : "grid-cols-3"
            )}>
                <div className="pl-2 py-1">Bid Price</div>
                <div className="text-right pr-2 py-1">Bid Qty</div>
                {!isMobile && <div className="text-right pr-2 py-1">Orders</div>}
            </div>

            {/* Bids List */}
            <div className="flex-1 overflow-hidden bg-background">
                {depth.buy.map((bid, i) => (
                    <div key={`bid-${i}`} className={cn(
                        "relative grid py-0.5 px-2 text-[9px] items-center group cursor-crosshair hover:bg-white/[0.02]",
                        isMobile ? "grid-cols-2" : "grid-cols-3"
                    )}>
                        <div
                            className="absolute inset-y-0 right-0 bg-up/10 origin-right transition-all duration-300"
                            style={{ width: `${(bid.quantity / maxQty) * 100}%` }}
                        />
                        <div className="text-up font-bold z-10 tabular-nums">{bid.price.toFixed(2)}</div>
                        <div className="text-right text-zinc-200 z-10 tabular-nums">{bid.quantity}</div>
                        {!isMobile && <div className="text-right text-zinc-600 z-10 tabular-nums">{bid.orders}</div>}
                    </div>
                ))}

                {/* Spread */}
                <div className="py-1 px-2 bg-surface-1 border-y border-border flex justify-between items-center my-0.5">
                    <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">Spread</span>
                    <span className="text-[9px] font-bold font-mono text-zinc-400">
                        {depth.buy.length > 0 && depth.sell.length > 0
                            ? (depth.sell[0].price - depth.buy[0].price).toFixed(2)
                            : "0.00"}
                    </span>
                </div>

                {/* Asks Header */}
                <div className={cn(
                    "grid text-[8px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border bg-surface-1",
                    isMobile ? "grid-cols-2" : "grid-cols-3"
                )}>
                    <div className="pl-2 py-1">Ask Price</div>
                    <div className="text-right pr-2 py-1">Ask Qty</div>
                    {!isMobile && <div className="text-right pr-2 py-1">Orders</div>}
                </div>

                {/* Asks List */}
                {depth.sell.map((ask, i) => (
                    <div key={`ask-${i}`} className={cn(
                        "relative grid py-0.5 px-2 text-[9px] items-center group cursor-crosshair hover:bg-white/[0.02]",
                        isMobile ? "grid-cols-2" : "grid-cols-3"
                    )}>
                        <div
                            className="absolute inset-y-0 right-0 bg-down/10 origin-right transition-all duration-300"
                            style={{ width: `${(ask.quantity / maxQty) * 100}%` }}
                        />
                        <div className="text-down font-bold z-10 tabular-nums">{ask.price.toFixed(2)}</div>
                        <div className="text-right text-zinc-200 z-10 tabular-nums">{ask.quantity}</div>
                        {!isMobile && <div className="text-right text-zinc-600 z-10 tabular-nums">{ask.orders}</div>}
                    </div>
                ))}
            </div>

            {/* Bottom Controls */}
            <div className="p-1.5 border-t border-border bg-surface-1 flex gap-1">
                <button className="flex-1 bg-white/[0.02] border border-white/5 rounded-[2px] py-1 text-[8px] font-bold uppercase text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                    Depth 20
                </button>
                <button className="flex-1 bg-white/[0.02] border border-white/5 rounded-[2px] py-1 text-[8px] font-bold uppercase text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                    Stats
                </button>
            </div>
        </div>
    );
};
