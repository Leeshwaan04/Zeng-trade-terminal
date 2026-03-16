"use client";

import React, { useEffect, useState, useRef } from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { useWatchlistStore } from "@/hooks/useWatchlistStore";
import { useOrderStore } from "@/hooks/useOrderStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, Plus, Trash2, BarChart2, Settings, ArrowUpDown, TrendingUp, Flame, BarChart3, MoveUp } from "lucide-react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { searchLite, SearchInstrument } from "@/lib/lite-search-engine";

// ─── Cyber-Nerve: Price Cell ───
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
}

export const WatchlistWidget = ({ widgetId }: { widgetId?: string }) => {
    const {
        watchlists,
        activeWatchlistId,
        setActiveWatchlistId,
        removeFromWatchlist,
        addWatchlist,
        deleteWatchlist,
        addToWatchlist
    } = useWatchlistStore();

    const { tickers, subscribe } = useMarketStore();
    const setWorkspaceSymbol = useLayoutStore(state => state.setWorkspaceSymbol);
    const setColorGroupSymbol = useLayoutStore(state => state.setColorGroupSymbol);
    const workspaces = useLayoutStore(state => state.workspaces);
    const activeWorkspaceId = useLayoutStore(state => state.activeWorkspaceId);
    const syncSymbol = useLayoutStore(state => state.syncSymbol);

    // Determine the color group for this watchlist widget instance
    const thisWidgetColorGroup = widgetId
        ? workspaces[activeWorkspaceId]?.areas.flatMap(a => a.widgets).find(w => w.id === widgetId)?.colorGroup
        : undefined;

    const [filter, setFilter] = useState("");
    const [searchResults, setSearchResults] = useState<SearchInstrument[]>([]);
    type SortMode = "default" | "change" | "volume" | "gapup" | "oi";
    const [sortMode, setSortMode] = useState<SortMode>("default");
    const [sortMenuOpen, setSortMenuOpen] = useState(false);

    const SORT_OPTIONS: { key: SortMode; label: string; icon: React.ReactNode }[] = [
        { key: "default", label: "Default", icon: <ArrowUpDown className="w-3 h-3" /> },
        { key: "change", label: "Momentum", icon: <TrendingUp className="w-3 h-3" /> },
        { key: "volume", label: "Vol Spike", icon: <Flame className="w-3 h-3" /> },
        { key: "oi", label: "OI Change", icon: <BarChart3 className="w-3 h-3" /> },
        { key: "gapup", label: "Gap Up/Down", icon: <MoveUp className="w-3 h-3" /> },
    ];

    useEffect(() => {
        if (filter.length > 1) {
            const results = searchLite(filter);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    }, [filter]);

    useEffect(() => {
        const activeList = watchlists.find(w => w.id === activeWatchlistId);
        if (activeList && activeList.items.length > 0) {
            const tokens = activeList.items.map(i => i.token).filter(t => t > 0);
            if (tokens.length > 0) subscribe(tokens);
        }
    }, [activeWatchlistId, watchlists, subscribe]);

    const activeList = watchlists.find(w => w.id === activeWatchlistId);
    const filteredItems = React.useMemo(() => {
        const base = activeList?.items.filter(i =>
            i.symbol.toLowerCase().includes(filter.toLowerCase())
        ) || [];
        if (sortMode === "default") return base;
        return [...base].sort((a, b) => {
            const ta = tickers[a.symbol] as any;
            const tb = tickers[b.symbol] as any;
            if (sortMode === "change") return (tb?.change_percent ?? 0) - (ta?.change_percent ?? 0);
            if (sortMode === "volume") return (tb?.volume ?? 0) - (ta?.volume ?? 0);
            if (sortMode === "oi") return (tb?.oi ?? 0) - (ta?.oi ?? 0);
            if (sortMode === "gapup") return Math.abs(tb?.change_percent ?? 0) - Math.abs(ta?.change_percent ?? 0);
            return 0;
        });
    }, [activeList, filter, sortMode, tickers]);

    return (
        <div data-testid="watchlist-widget" className="flex flex-col h-full bg-background font-sans">

            {/* Header & Tabs */}
            <div className="flex flex-col bg-surface-1 border-b border-border">
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
                                        : "text-muted-foreground border-transparent hover:text-foreground"
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
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                        title="Add Watchlist"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Inline Search & Add */}
                <div className="px-3 py-2 bg-surface-2 relative">
                    <div className="relative flex items-center group">
                        <Search className="absolute left-2.5 w-3 h-3 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder={`Search & Add to ${activeList?.name}...`}
                            className="w-full bg-surface-3 border border-border rounded-sm py-1.5 pl-8 pr-12 text-[10px] font-mono focus:outline-none focus:border-primary/40 text-foreground placeholder:text-muted-foreground transition-all font-bold"
                        />
                        <div className="absolute right-2.5 flex items-center gap-2">
                            <span className="text-[8px] text-muted-foreground font-mono font-black uppercase">
                                {filteredItems.length} FIXTURES
                            </span>
                        </div>
                    </div>

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                        <div className="absolute left-2 right-2 top-[100%] z-50 mt-1 bg-surface-2 border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                            {searchResults.map((res) => (
                                <button
                                    key={res.symbol}
                                    onClick={() => {
                                        const currentPrice = tickers[res.symbol]?.last_price || 0;
                                        addToWatchlist(activeWatchlistId, {
                                            ...res,
                                            addedAtPrice: currentPrice,
                                            addedAtTimestamp: Date.now()
                                        });
                                        setFilter("");
                                        setSearchResults([]);
                                    }}
                                    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-primary/5 border-b border-white/5 last:border-0 transition-colors group"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-[10px] font-black group-hover:text-primary transition-colors text-foreground">{res.symbol}</span>
                                        <span className="text-[8px] text-muted-foreground font-bold">{res.description}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded-sm bg-surface-3 text-muted-foreground">{res.exchange}</span>
                                        <Plus className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Column Headers + Sort */}
            <div className="relative">
                <div className="grid grid-cols-[1fr_65px_65px_60px_40px] px-2 py-1 border-b border-border/10 bg-surface-2">
                    <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">Instrument</span>
                    <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest text-right">LTP</span>
                    <button
                        type="button"
                        onClick={() => setSortMenuOpen(!sortMenuOpen)}
                        className={cn(
                            "text-[7px] font-bold uppercase tracking-widest text-right flex items-center justify-end gap-0.5 transition-colors",
                            sortMode !== "default" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {sortMode === "default" ? "Chg%" : SORT_OPTIONS.find(s => s.key === sortMode)?.label}
                        <ArrowUpDown className="w-2.5 h-2.5" />
                    </button>
                    <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest text-right">Vol/OI</span>
                    <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest text-right pr-1"></span>
                </div>

                {/* Sort Dropdown */}
                {sortMenuOpen && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-surface-2 border border-border shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
                        {SORT_OPTIONS.map((opt) => (
                            <button
                                type="button"
                                key={opt.key}
                                onClick={() => { setSortMode(opt.key); setSortMenuOpen(false); }}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors",
                                    sortMode === opt.key
                                        ? "text-primary bg-primary/5"
                                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                )}
                            >
                                {opt.icon}
                                {opt.label}
                                {sortMode === opt.key && <span className="ml-auto text-primary text-[8px]">✓</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Items */}
            <ScrollArea className="flex-1">
                <div className="flex flex-col">
                    {filteredItems.map((item) => {
                        const ticker = tickers[item.symbol] || { last_price: 0, net_change: 0, change_percent: 0 };
                        const isUp = (ticker.net_change ?? 0) >= 0;

                        return (
                            <div
                                key={item.symbol}
                                onClick={() => {
                                    if (syncSymbol) {
                                        setWorkspaceSymbol(item.symbol);
                                    } else if (thisWidgetColorGroup) {
                                        setColorGroupSymbol(thisWidgetColorGroup, item.symbol);
                                    } else {
                                        setWorkspaceSymbol(item.symbol);
                                    }
                                }}
                                className="group relative grid grid-cols-[1fr_65px_65px_60px_40px] items-center px-2 py-1.5 hover:bg-foreground/5 dark:hover:bg-white/[0.02] border-b border-border/5 transition-all cursor-pointer overflow-hidden"
                            >
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-black text-foreground group-hover:text-primary transition-colors truncate uppercase tracking-tighter">
                                            {item.symbol}
                                        </span>
                                        {item.segment !== "EQ" && (
                                            <span className="px-1 py-0 rounded-sm bg-surface-3 text-[7px] font-bold text-muted-foreground border border-border">
                                                {item.segment}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-tight -mt-0.5">
                                        {item.exchange}
                                    </span>
                                </div>

                                <div className="text-right flex items-center justify-end gap-1.5 pr-1 tabular-nums">
                                    <PriceCell price={ticker.last_price} isUp={isUp} />
                                </div>

                                <div className="text-right tabular-nums flex items-center justify-end">
                                    <span className={cn(
                                        "text-[9px] font-bold tracking-tighter",
                                        isUp ? "text-up" : "text-down"
                                    )}>
                                        {isUp ? "+" : ""}{(ticker.change_percent ?? 0).toFixed(2)}%
                                    </span>
                                </div>

                                <div className="text-right tabular-nums flex items-center justify-end">
                                    <span className="text-[8px] font-bold text-zinc-400 tracking-tighter uppercase whitespace-nowrap">
                                        {(ticker as any).volume ? `${((ticker as any).volume / 1000000).toFixed(2)}M` : "—"}
                                    </span>
                                </div>

                                <div className="text-right pr-1 flex items-center justify-end">
                                    <div className={cn(
                                        "w-1 h-1 rounded-full",
                                        isUp ? "bg-up" : "bg-down"
                                    )} />
                                </div>

                                {/* Hover Actions */}
                                <div className="absolute inset-y-0 right-0 w-[120px] bg-gradient-to-l from-surface-1 via-surface-1/95 to-transparent opacity-0 group-hover:opacity-100 flex items-center justify-end px-2 transition-all translate-x-4 group-hover:translate-x-0">
                                    <div className="flex items-center gap-0.5">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                useOrderStore.getState().placeOrder({
                                                    symbol: item.symbol,
                                                    transactionType: 'BUY',
                                                    orderType: 'MARKET',
                                                    productType: 'MIS',
                                                    qty: 1,
                                                    price: ticker.last_price
                                                });
                                            }}
                                            className="h-5 px-1.5 bg-up/10 text-up hover:bg-up hover:text-black text-[8px] font-bold transition-all active:scale-95"
                                        >
                                            B
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
                                            className="h-5 px-1.5 bg-down/10 text-down hover:bg-down hover:text-black text-[8px] font-bold transition-all active:scale-95"
                                        >
                                            S
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFromWatchlist(activeWatchlistId, item.symbol); }}
                                            className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-down transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {activeList?.items.length === 0 && (
                        <div className="p-10 flex flex-col items-center justify-center text-center">
                            <Search className="w-6 h-6 mb-3 text-muted-foreground" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Empty Watchlist</span>
                            <span className="text-[9px] text-muted-foreground mt-1">Search above to add symbols</span>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between border-t border-border bg-surface-1 px-2 py-1">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => deleteWatchlist(activeWatchlistId)}
                        className="text-[7px] font-bold text-down/40 hover:text-down uppercase tracking-widest transition-colors"
                    >
                        Delete
                    </button>
                </div>
                <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                    <Settings className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};
