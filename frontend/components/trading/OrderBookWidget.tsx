"use client";

import React, { useMemo, useState } from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { useKiteTicker } from "@/hooks/useKiteTicker";
import { getInstrumentToken } from "@/lib/market-config";
import { TradeDetailsModal } from "./TradeDetailsModal";
import { useOrderStore } from "@/hooks/useOrderStore";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { useEffect, useRef } from "react";

// Applies width imperatively to avoid inline-style lint warning
const DepthBar = ({ pct, side }: { pct: number; side: "buy" | "sell" }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.style.width = `${pct}%`;
    }, [pct]);
    return (
        <div
            ref={ref}
            className={cn(
                "absolute inset-y-0 right-0 origin-right transition-all duration-300",
                side === "buy" ? "bg-up/10" : "bg-down/10",
            )}
        />
    );
};

// ─── Constants ────────────────────────────────────────────────────────────────

type TabMode = "depth" | "timeline";

const ORDER_STATUS_META = {
    OPEN:      { icon: <Clock className="w-3 h-3" />,        color: "text-amber-400",   dot: "bg-amber-400"   },
    EXECUTED:  { icon: <CheckCircle2 className="w-3 h-3" />, color: "text-emerald-400", dot: "bg-emerald-400" },
    CANCELLED: { icon: <XCircle className="w-3 h-3" />,      color: "text-zinc-500",    dot: "bg-zinc-500"    },
    REJECTED:  { icon: <AlertCircle className="w-3 h-3" />,  color: "text-red-400",     dot: "bg-red-400"     },
} as const;

function timeLabel(ts: number) {
    return new Date(ts).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export const OrderBookWidget = ({ symbol = "NIFTY 50" }: { symbol?: string }) => {
    const ticker       = useMarketStore(state => state.tickers[symbol]);
    const instrumentToken = getInstrumentToken(symbol) || 256265;
    const [isTradesModalOpen, setIsTradesModalOpen] = useState(false);
    const [tab, setTab] = useState<TabMode>("depth");
    const { orders }   = useOrderStore();
    const isMobile     = useMediaQuery("(max-width: 768px)");

    const latestOrderId = useMemo(() => {
        const order = orders.find(o => o.symbol === symbol && o.status === "EXECUTED");
        return order?.id || null;
    }, [orders, symbol]);

    useKiteTicker({ instrumentTokens: [instrumentToken], mode: "full", broker: "KITE", enabled: true });

    const depth = useMemo(() => {
        if (!ticker?.depth) return { buy: [], sell: [] };
        return {
            buy:  [...ticker.depth.buy].sort((a, b) => b.price - a.price),
            sell: [...ticker.depth.sell].sort((a, b) => a.price - b.price),
        };
    }, [ticker?.depth]);

    const totalBuy  = depth.buy.reduce((acc, b) => acc + b.quantity, 0);
    const totalSell = depth.sell.reduce((acc, s) => acc + s.quantity, 0);
    const maxQty    = Math.max(
        ...(depth.buy.length  > 0 ? depth.buy.map(b => b.quantity)  : [1]),
        ...(depth.sell.length > 0 ? depth.sell.map(a => a.quantity) : [1]),
    );

    const symbolOrders = useMemo(() =>
        [...orders]
            .filter(o => o.symbol === symbol)
            .sort((a, b) => ((b as any).timestamp ?? 0) - ((a as any).timestamp ?? 0))
            .slice(0, 30),
        [orders, symbol],
    );

    return (
        <div className="flex flex-col h-full bg-surface-1 font-mono select-none">
            <WidgetHeader id="order-book" title="MARKET DEPTH" symbol={symbol} />

            {/* Tab switcher */}
            <div className="flex shrink-0 border-b border-border bg-surface-2">
                {(["depth", "timeline"] as TabMode[]).map(t => (
                    <button
                        type="button"
                        key={t}
                        onClick={() => setTab(t)}
                        className={cn(
                            "flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest transition-colors",
                            tab === t
                                ? "text-primary border-b-2 border-primary bg-primary/5"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {t === "depth" ? "Market Depth" : "Order Timeline"}
                    </button>
                ))}
            </div>

            {/* ── Timeline tab ──────────────────────────────────────────────── */}
            {tab === "timeline" && (
                <div className="flex-1 overflow-y-auto">
                    {symbolOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 py-8 text-muted-foreground">
                            <Clock className="w-5 h-5 opacity-30" />
                            <p className="text-[9px] font-bold uppercase tracking-widest">No orders yet</p>
                        </div>
                    ) : (
                        <div className="relative px-3 py-2">
                            <div className="absolute left-[22px] top-0 bottom-0 w-[1px] bg-border/40" />

                            {symbolOrders.map((order, i) => {
                                const o    = order as any;
                                const meta = ORDER_STATUS_META[order.status as keyof typeof ORDER_STATUS_META]
                                    ?? ORDER_STATUS_META.OPEN;
                                const side = o.transactionType ?? o.side ?? "—";
                                const qty  = o.qty ?? o.quantity ?? "—";
                                const px   = o.price ? `₹${(o.price as number).toFixed(2)}` : "MKT";
                                const ts   = o.timestamp as number | undefined;
                                const isLast = i === symbolOrders.length - 1;

                                return (
                                    <div key={order.id} className={cn("relative flex gap-3 pb-3", isLast && "pb-0")}>
                                        <div className={cn(
                                            "w-2.5 h-2.5 rounded-full border-2 border-background shrink-0 mt-0.5 z-10",
                                            meta.dot,
                                        )} />
                                        <div className="flex-1 bg-surface-2 border border-border/40 rounded-lg px-2.5 py-2 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={cn("flex items-center gap-0.5 text-[8px] font-black uppercase", meta.color)}>
                                                        {meta.icon}
                                                        {order.status}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[8px] font-black px-1 rounded",
                                                        side === "BUY" ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10",
                                                    )}>
                                                        {side}
                                                    </span>
                                                </div>
                                                <span className="text-[7px] text-muted-foreground font-mono shrink-0">
                                                    {ts ? timeLabel(ts) : "—"}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-black text-foreground truncate">{order.symbol}</p>
                                            <div className="flex items-center gap-2 mt-0.5 text-[8px] text-muted-foreground font-bold">
                                                <span>Qty: <span className="text-foreground">{qty}</span></span>
                                                <span>@</span>
                                                <span className="text-foreground font-mono">{px}</span>
                                                {o.orderType && (
                                                    <span className="px-1 py-0.5 bg-surface-3 rounded text-[7px] uppercase">{o.orderType}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Depth tab ─────────────────────────────────────────────────── */}
            {tab === "depth" && (
                <>
                    <div className="px-2 py-1 border-b border-border bg-background flex justify-between items-end">
                        <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">
                            Total Bids: <span className="text-up font-bold">{(totalBuy / 1000).toFixed(1)}K</span>
                        </span>
                        <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">
                            Total Asks: <span className="text-down font-bold">{(totalSell / 1000).toFixed(1)}K</span>
                        </span>
                    </div>

                    <div className={cn(
                        "grid text-[8px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border bg-surface-1",
                        isMobile ? "grid-cols-2" : "grid-cols-3",
                    )}>
                        <div className="pl-2 py-1">Bid Price</div>
                        <div className="text-right pr-2 py-1">Bid Qty</div>
                        {!isMobile && <div className="text-right pr-2 py-1">Orders</div>}
                    </div>

                    <div className="flex-1 overflow-hidden bg-background">
                        {depth.buy.map((bid, i) => (
                            <div key={`bid-${i}`} className={cn(
                                "relative grid py-0.5 px-2 text-[9px] items-center group cursor-crosshair hover:bg-white/[0.02]",
                                isMobile ? "grid-cols-2" : "grid-cols-3",
                            )}>
                                <DepthBar pct={(bid.quantity / maxQty) * 100} side="buy" />
                                <div className="text-up font-bold z-10 tabular-nums">{bid.price.toFixed(2)}</div>
                                <div className="text-right text-zinc-200 z-10 tabular-nums">{bid.quantity}</div>
                                {!isMobile && <div className="text-right text-zinc-600 z-10 tabular-nums">{bid.orders}</div>}
                            </div>
                        ))}

                        <div className="py-1 px-2 bg-surface-1 border-y border-border flex justify-between items-center my-0.5">
                            <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">Spread</span>
                            <span className="text-[9px] font-bold font-mono text-zinc-400">
                                {depth.buy.length > 0 && depth.sell.length > 0
                                    ? (depth.sell[0].price - depth.buy[0].price).toFixed(2)
                                    : "0.00"}
                            </span>
                        </div>

                        <div className={cn(
                            "grid text-[8px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border bg-surface-1",
                            isMobile ? "grid-cols-2" : "grid-cols-3",
                        )}>
                            <div className="pl-2 py-1">Ask Price</div>
                            <div className="text-right pr-2 py-1">Ask Qty</div>
                            {!isMobile && <div className="text-right pr-2 py-1">Orders</div>}
                        </div>

                        {depth.sell.map((ask, i) => (
                            <div key={`ask-${i}`} className={cn(
                                "relative grid py-0.5 px-2 text-[9px] items-center group cursor-crosshair hover:bg-white/[0.02]",
                                isMobile ? "grid-cols-2" : "grid-cols-3",
                            )}>
                                <DepthBar pct={(ask.quantity / maxQty) * 100} side="sell" />
                                <div className="text-down font-bold z-10 tabular-nums">{ask.price.toFixed(2)}</div>
                                <div className="text-right text-zinc-200 z-10 tabular-nums">{ask.quantity}</div>
                                {!isMobile && <div className="text-right text-zinc-600 z-10 tabular-nums">{ask.orders}</div>}
                            </div>
                        ))}
                    </div>

                    <div className="p-1.5 border-t border-border bg-surface-1 flex gap-1 shrink-0">
                        <button
                            type="button"
                            className="flex-1 bg-white/[0.02] border border-white/5 rounded-[2px] py-1 text-[8px] font-bold uppercase text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors"
                        >
                            Depth 20
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsTradesModalOpen(true)}
                            disabled={!latestOrderId}
                            className="flex-1 bg-white/[0.02] border border-white/5 rounded-[2px] py-1 text-[8px] font-bold uppercase text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Execution
                        </button>
                    </div>

                    <TradeDetailsModal
                        orderId={latestOrderId}
                        isOpen={isTradesModalOpen}
                        onClose={() => setIsTradesModalOpen(false)}
                    />
                </>
            )}
        </div>
    );
};
