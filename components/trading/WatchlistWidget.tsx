"use client";

import React, { useEffect, useState, useRef } from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { useWatchlistStore } from "@/hooks/useWatchlistStore";
import { useOrderStore } from "@/hooks/useOrderStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, Plus, Trash2, BarChart2, Settings } from "lucide-react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Cyber-Nerve: Price Sparkline ───
const PriceSparkline = ({ price, color }: { price: number, color: string }) => {
    const [history, setHistory] = useState<number[]>([]);

    useEffect(() => {
        if (price > 0) {
            setHistory(prev => [...prev.slice(-19), price]);
        }
    }, [price]);

    if (history.length < 2) return <div className="w-10 h-4" />;

    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min || 1;

    const points = history.map((p, i) => {
        const x = (i / (history.length - 1)) * 40;
        const y = 16 - ((p - min) / range) * 12;
        return `${x},${y}`;
    }).join(" ");

    return (
        <svg className="w-10 h-4 overflow-visible" viewBox="0 0 40 16">
            <polyline
                fill="none"
                stroke={color === "text-up" ? "#22c55e" : "#ef4444"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className="transition-all duration-300"
            />
        </svg>
    );
};

// ─── Cyber-Nerve: Dynamic Price Cell ───
const PriceCell = ({ price, isUp }: { price: number, isUp: boolean }) => {
    const [glow, setGlow] = useState<"up" | "down" | null>(null);
    const prevPriceRef = useRef(price);

    useEffect(() => {
        if (price !== prevPriceRef.current && price > 0) {
            setGlow(price > prevPriceRef.current ? "up" : "down");
            prevPriceRef.current = price;
            const timer = setTimeout(() => setGlow(null), 300);
            return () => clearTimeout(timer);
        }
    }, [price]);

    return (
        <span className={cn(
            "text-[10.5px] font-black font-mono tracking-tighter transition-all duration-300 px-1 rounded-[2px]",
            glow === "up" ? "bg-up/20 text-up ring-1 ring-up/50 scale-105" :
                glow === "down" ? "bg-down/20 text-down ring-1 ring-down/50 scale-105" :
                    isUp ? "text-up" : "text-down text-glow"
        )}>
            {price > 0 ? price.toFixed(2) : "—"}
        </span>
    );
};

export const WatchlistWidget = () => {
    const {
        watchlists,
        activeWatchlistId,
        setActiveWatchlistId,
        removeFromWatchlist,
        addWatchlist,
        deleteWatchlist
    } = useWatchlistStore();

    const { tickers, subscribe } = useMarketStore();
    const setWorkspaceSymbol = useLayoutStore(state => state.setWorkspaceSymbol);
    const [filter, setFilter] = useState("");

    useEffect(() => {
        const activeList = watchlists.find(w => w.id === activeWatchlistId);
        if (activeList && activeList.items.length > 0) {
            const tokens = activeList.items.map(i => i.token).filter(t => t > 0);
            if (tokens.length > 0) subscribe(tokens);
        }
    }, [activeWatchlistId, watchlists, subscribe]);

    const activeList = watchlists.find(w => w.id === activeWatchlistId);
    const filteredItems = activeList?.items.filter(i =>
        i.symbol.toLowerCase().includes(filter.toLowerCase())
    ) || [];

    return (
        <div data-testid="watchlist-widget" className="flex flex-col h-full bg-[#111318] font-sans">

            {/* Groww 915 Style Header & Tabs */}
            <div className="flex flex-col bg-[#0c0f13] border-b border-white/[0.05]">
                <div className="flex items-center justify-between px-2 pt-2 gap-1 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1">
                        {watchlists.map((wl) => (
                            <button
                                key={wl.id}
                                onClick={() => setActiveWatchlistId(wl.id)}
                                className={cn(
                                    "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap rounded-t-md border-b-2",
                                    activeWatchlistId === wl.id
                                        ? "text-primary border-primary bg-primary/5"
                                        : "text-zinc-600 border-transparent hover:text-zinc-400"
                                )}
                            >
                                {wl.name}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => {
                            const name = prompt("Enter Watchlist Name:");
                            if (name) addWatchlist(name);
                        }}
                        className="p-1 text-zinc-600 hover:text-white transition-colors"
                        title="Add Watchlist"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Inline Search & Add */}
                <div className="px-3 py-2 bg-black/20">
                    <div className="relative flex items-center group">
                        <Search className="absolute left-2.5 w-3 h-3 text-zinc-600 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder={`Search & Add to ${activeList?.name}...`}
                            className="w-full bg-[#181c22] border border-white/[0.05] rounded-sm py-1.5 pl-8 pr-12 text-[10px] font-mono focus:outline-none focus:border-primary/40 text-zinc-300 placeholder:text-zinc-700 transition-all font-bold"
                        />
                        <div className="absolute right-2.5 flex items-center gap-2">
                            <span className="text-[8px] text-zinc-700 font-mono font-black uppercase">
                                {filteredItems.length} FIXTURES
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Column Headers - Groww 915 Parity */}
            <div className="grid grid-cols-[1fr_75px_75px_70px] px-3 py-1.5 border-b border-white/[0.04] bg-white/[0.01]">
                <span className="text-[7.5px] font-black text-zinc-600 uppercase tracking-[0.2em]">Instrument</span>
                <span className="text-[7.5px] font-black text-zinc-600 uppercase tracking-[0.2em] text-right">LTP</span>
                <span className="text-[7.5px] font-black text-zinc-600 uppercase tracking-[0.2em] text-right">Change%</span>
                <span className="text-[7.5px] font-black text-zinc-600 uppercase tracking-[0.2em] text-right pr-1">Vol/OI</span>
            </div>

            {/* Items */}
            <ScrollArea className="flex-1">
                <div>
                    {filteredItems.map((item) => {
                        const ticker = tickers[item.symbol] || { last_price: 0, net_change: 0, change_percent: 0 };
                        const isUp = (ticker.net_change ?? 0) >= 0;

                        return (
                            <div
                                key={item.symbol}
                                onClick={() => setWorkspaceSymbol(item.symbol)}
                                className="group relative grid grid-cols-[1fr_75px_75px_70px] items-center px-3 py-1.5 hover:bg-white/[0.05] border-b border-white/[0.02] transition-all cursor-pointer overflow-hidden"
                            >
                                {/* Symbol & Exchange - High Density */}
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-black text-white/90 group-hover:text-primary transition-colors truncate uppercase tracking-tighter">
                                            {item.symbol}
                                        </span>
                                        {item.segment !== "EQ" && (
                                            <span className="px-1 py-0 rounded-[2px] bg-white/[0.05] text-[7px] font-bold text-zinc-600 border border-white/5">
                                                {item.segment}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[8px] text-zinc-700 font-bold uppercase tracking-tight -mt-0.5">
                                        {item.exchange}
                                    </span>
                                </div>

                                {/* LTP with Tick Glow */}
                                <div className="text-right flex items-center justify-end gap-1.5 pr-1">
                                    {/* <PriceSparkline price={ticker.last_price} color={isUp ? "text-up" : "text-down"} /> */}
                                    <PriceCell price={ticker.last_price} isUp={isUp} />
                                </div>

                                {/* Change % */}
                                <div className="text-right">
                                    <span className={cn(
                                        "text-[9.5px] font-bold font-mono tracking-tighter",
                                        isUp ? "text-up/60" : "text-down/60"
                                    )}>
                                        {isUp ? "+" : ""}{(ticker.change_percent ?? 0).toFixed(2)}%
                                    </span>
                                </div>

                                {/* Volume/OI - 915 Parity */}
                                <div className="text-right pr-1">
                                    <div className="flex flex-col leading-none">
                                        <span className="text-[9px] font-black text-zinc-500 font-mono tracking-tighter uppercase">
                                            {(ticker as any).volume ? `${((ticker as any).volume / 1000000).toFixed(1)}M` : "—"}
                                        </span>
                                        <span className="text-[7px] font-bold text-primary/40 uppercase tracking-tighter">
                                            {(ticker as any).oi ? `OI: ${((ticker as any).oi / 1000).toFixed(0)}K` : "VOL"}
                                        </span>
                                    </div>
                                </div>

                                {/* ⚡ Lightning Hover Action Pad — Ultra Dense */}
                                <div className="absolute inset-y-0 right-0 w-[120px] bg-gradient-to-l from-[#0c0f13] via-[#0c0f13]/95 to-transparent opacity-0 group-hover:opacity-100 flex items-center justify-end px-2 transition-all translate-x-4 group-hover:translate-x-0">
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                useOrderStore.getState().placeOrder({
                                                    symbol: item.symbol,
                                                    transactionType: 'BUY',
                                                    orderType: 'MARKET',
                                                    productType: 'MIS',
                                                    qty: 1, // Default lightning qty
                                                    price: ticker.last_price
                                                });
                                            }}
                                            className="h-[22px] px-2.5 bg-up hover:bg-up/80 text-black text-[9px] font-black rounded-sm shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all active:scale-95"
                                        >
                                            BUY
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                useOrderStore.getState().placeOrder({
                                                    symbol: item.symbol,
                                                    transactionType: 'SELL',
                                                    orderType: 'MARKET',
                                                    productType: 'MIS',
                                                    qty: 1,
                                                    price: ticker.last_price
                                                });
                                            }}
                                            className="h-[22px] px-2.5 bg-down hover:bg-down/80 text-black text-[9px] font-black rounded-sm shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all active:scale-95"
                                        >
                                            SELL
                                        </button>
                                        <div className="w-px h-3 bg-white/10 mx-0.5" />
                                        <button className="h-[22px] w-6 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                                            <BarChart2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFromWatchlist(activeWatchlistId, item.symbol); }}
                                            className="h-[22px] w-6 flex items-center justify-center text-zinc-500 hover:text-down transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Empty State */}
                    {activeList?.items.length === 0 && (
                        <div className="p-10 flex flex-col items-center justify-center text-center">
                            <Search className="w-6 h-6 mb-3 text-zinc-800" />
                            <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">Empty Watchlist</span>
                            <span className="text-[9px] text-zinc-800 mt-1">Press ⌘K to search & add symbols</span>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Watchlist Quick Actions (Bottom) */}
            <div className="flex items-center justify-between border-t border-white/[0.05] bg-[#0c0f13] px-3 py-1.5">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (confirm("Clear all items in this watchlist?")) {
                                // Logic to clear items (needs store action update)
                            }
                        }}
                        className="text-[8px] font-black text-zinc-600 hover:text-white uppercase tracking-widest transition-colors"
                    >
                        Clear List
                    </button>
                    <div className="w-px h-3 bg-white/5" />
                    <button
                        onClick={() => deleteWatchlist(activeWatchlistId)}
                        className="text-[8px] font-black text-down/60 hover:text-down uppercase tracking-widest transition-colors"
                    >
                        Delete Watchlist
                    </button>
                </div>
                <button className="p-1 text-zinc-700 hover:text-zinc-400 transition-colors">
                    <Settings className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};
