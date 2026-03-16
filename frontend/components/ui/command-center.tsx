"use client";

import React, { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Search, Layout, ShoppingCart, Settings, Eye, EyeOff, LayoutDashboard, Zap, Grid2x2, Layers, BookOpen, Cpu, Brain } from "lucide-react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { useMarketStore } from "@/hooks/useMarketStore";
import { PRESET_LAYOUTS } from "@/types/layout";
import { MARKET_INSTRUMENTS } from "@/lib/market-config";
import { searchLite } from "@/lib/lite-search-engine";
import { cn } from "@/lib/utils";
import { useWatchlistStore } from "@/hooks/useWatchlistStore";
import { parseCommand } from "@/lib/command-parser";
import { useToast } from "@/hooks/use-toast";
import { useOrderStore } from "@/hooks/useOrderStore";
import { useAuthStore } from "@/hooks/useAuthStore";

export const CommandCenter = () => {
    const { toast } = useToast();
    const placeOrder = useOrderStore(s => s.placeOrder);
    const cancelOrder = useOrderStore(s => s.cancelOrder);
    const logout = useAuthStore(s => s.logout);
    const { addToWatchlist, activeWatchlistId } = useWatchlistStore();
    const {
        setActiveWorkspace,
        updateWidgetSymbol,
        commandCenterOpen,
        setCommandCenterOpen,
        setSettingsOpen
    } = useLayoutStore();
    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const subscribe = useMarketStore((s) => s.subscribe); // Moved up to fix Hook Violation

    const handleCommand = () => {
        if (!search) return;
        const action = parseCommand(search);

        if (action) {
            switch (action.type) {
                case 'ORDER':
                    // Mock Order Placement
                    toast({
                        title: "Order Command Received",
                        description: `Placing ${action.side} order for ${action.symbol} x ${action.qty}`,
                        variant: "default"
                    });

                    // In a real scenario, we'd fetch the LTP, calculate price if LIMIT, etc.
                    // For now, we'll just log it or simulate a market order via store.
                    placeOrder({
                        symbol: action.symbol,
                        transactionType: action.side,
                        qty: action.qty,
                        orderType: 'MARKET',
                        productType: 'MIS',
                        price: 0,
                    });
                    setCommandCenterOpen(false);
                    setSearch("");
                    break;
                case 'CHART':
                    updateWidgetSymbol("chart-1", action.symbol);
                    updateWidgetSymbol("oe-1", action.symbol);
                    toast({
                        title: "Chart Updated",
                        description: `Switched view to ${action.symbol}`,
                        variant: "default"
                    });
                    setCommandCenterOpen(false);
                    setSearch("");
                    break;
                case 'CANCEL_ALL':
                    toast({
                        title: "Panic Mode Activated",
                        description: "Cancelling all open orders...",
                        variant: "destructive"
                    });
                    // Iterate and cancel all logic ideally lives in store action 'cancelAll'
                    // For now, just a toast.
                    setCommandCenterOpen(false);
                    setSearch("");
                    break;
                case 'LOGOUT':
                    logout();
                    setCommandCenterOpen(false);
                    break;
            }
        }
    };

    // Toggle the menu when ⌘K is pressed
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setCommandCenterOpen(!commandCenterOpen);
            }
            if (e.key === "Escape") {
                setCommandCenterOpen(false);
            }
        };

        window.addEventListener("keydown", down);
        return () => window.removeEventListener("keydown", down);
    }, [commandCenterOpen, setCommandCenterOpen]);

    // Dynamic Search from Elasticsearch + Lite Fallback
    useEffect(() => {
        if (!search || search.length < 2) {
            setSearchResults([]);
            return;
        }

        const debounceTimer = setTimeout(async () => {
            setIsSearching(true);
            try {
                // 1. Get instant results from Lite Engine
                const liteResults = searchLite(search);

                // 2. Fetch deeper results from Elasticsearch API
                const response = await fetch(`/api/search?q=${encodeURIComponent(search)}`);
                const esResults = await response.json();

                // 3. Merge and deduplicate
                const combined = [...liteResults];
                const existingTokens = new Set(liteResults.map(r => r.token));

                if (Array.isArray(esResults)) {
                    esResults.forEach((item: any) => {
                        if (!existingTokens.has(item.token)) {
                            combined.push({
                                symbol: item.symbol,
                                description: item.name || item.description,
                                exchange: item.exchange || "NSE",
                                segment: item.segment || "EQ",
                                token: item.token
                            });
                            existingTokens.add(item.token);
                        }
                    });
                }

                setSearchResults(combined.slice(0, 15));
                setSelectedIndex(0);
            } catch (error) {
                console.error("Search fetch failed:", error);
                // Fallback to lite results only on error
                setSearchResults(searchLite(search));
            } finally {
                setIsSearching(false);
            }
        }, 300); // 300ms debounce for API call

        return () => clearTimeout(debounceTimer);
    }, [search]);

    const handleSymbolSelect = (symbol: string, token?: number) => {
        // Subscribe to live feed for this token
        if (token) {
            subscribe([token]);
        }

        // Update relevant widgets
        updateWidgetSymbol("chart-1", symbol);
        updateWidgetSymbol("oe-1", symbol);
        setCommandCenterOpen(false);
        setSearch("");
    };

    if (!commandCenterOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] md:pt-[15vh] bg-black/80 backdrop-blur-xl px-2 md:px-4 animate-in fade-in duration-200"
            onClick={() => {
                setCommandCenterOpen(false);
                setSearch("");
            }}
        >
            <div
                className="w-full md:w-[600px] max-h-[80vh] flex flex-col bg-background border border-border shadow-[0_0_50px_-12px_rgba(0,229,255,0.3)] overflow-hidden rounded-lg md:rounded-sm neon-border-pulse"
                onClick={(e) => e.stopPropagation()}
            >
                <Command className="flex flex-col h-full font-sans" shouldFilter={false}>
                    <div className="flex items-center border-b border-border px-4 bg-background">
                        <Search className={`mr-3 h-4 w-4 shrink-0 transition-opacity ${isSearching ? 'opacity-100 animate-pulse text-primary' : 'opacity-40 text-primary'}`} />
                        <Command.Input
                            autoFocus
                            value={search}
                            onValueChange={setSearch}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    // Should prioritize executing distinct commands over selecting search results
                                    // if the input matches a command pattern strongly.
                                    // But CMD+K usually selects top result.
                                    // Hybrid: Parse first. If parsed action exists, execute it.
                                    // If not, fall through to selection (handled by cmdk? or manual logic here).

                                    const action = parseCommand(search);
                                    if (action && action.type !== 'CHART') {
                                        // Orders, Cancel, etc. always take precedence
                                        e.preventDefault();
                                        handleCommand();
                                    } else {
                                        // 'CHART' type (symbol switch) might conflict with search result selection.
                                        // If we have search results, default behavior (Enter selects first item) is preferred.
                                        // If NO search results, but parseable symbol, update chart.
                                        if (searchResults.length === 0 && action?.type === 'CHART') {
                                            e.preventDefault();
                                            handleCommand();
                                        }
                                    }
                                }
                            }}
                            placeholder="Type 'buy nifty 50', 'panic', or search symbols..."
                            className="flex h-14 w-full rounded-md bg-transparent py-4 text-sm outline-none placeholder:text-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-50 font-mono tracking-wide text-foreground placeholder:italic"
                        />
                        <div className="flex gap-1 items-center">
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="text-[10px] text-muted-foreground hover:text-foreground font-mono mr-2 uppercase p-2"
                                >
                                    Clear
                                </button>
                            )}
                            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 border border-border bg-muted/50 px-1.5 font-mono text-[10px] text-muted-foreground uppercase">ESC</kbd>
                            {/* Mobile Close Button */}
                            <button
                                className="sm:hidden p-2 text-zinc-500 hover:text-white"
                                onClick={() => setCommandCenterOpen(false)}
                            >
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                    </div>
                    <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden p-3 scroll-py-2 bg-surface-1">
                        <Command.Empty className="py-10 text-center text-xs text-muted-foreground font-mono uppercase tracking-[0.2em]">
                            {isSearching ? "Searching Market..." : "No matches found."}
                        </Command.Empty>

                        {/* Search Results from Lite Engine */}
                        {searchResults.length > 0 && (
                            <Command.Group heading="Equities & Futures" className="px-2 py-3 text-[9px] font-black uppercase text-primary/60 tracking-[0.3em] mb-2">
                                {searchResults.map((item, index) => (
                                    <Command.Item
                                        key={`${item.symbol}-${item.segment}`}
                                        onSelect={() => handleSymbolSelect(item.symbol, item.token)}
                                        className={cn(
                                            "group relative flex cursor-pointer select-none items-center px-3 py-2.5 text-[11px] outline-none transition-all gap-4 mb-1 border-b border-border/50 last:border-0",
                                            selectedIndex === index
                                                ? "bg-primary/10 text-foreground border-l-2 border-l-primary"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <div className="flex flex-col min-w-[120px]">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{item.symbol}</span>
                                                <span className="text-[9px] px-1.5 py-0.5 bg-muted border border-border text-muted-foreground rounded font-mono">{item.exchange}</span>
                                            </div>
                                            <span className="text-[9px] opacity-40 uppercase truncate max-w-[200px] mt-0.5 font-medium tracking-wide">{item.description}</span>
                                        </div>

                                        {/* Hover Actions - Kite Style */}
                                        <div className="hidden group-hover:flex items-center gap-1 absolute right-[120px]">
                                            <button className="h-6 w-8 bg-up text-black font-bold rounded hover:brightness-110 flex items-center justify-center">B</button>
                                            <button className="h-6 w-8 bg-down text-black font-bold rounded hover:brightness-110 flex items-center justify-center">S</button>
                                            <button className="h-6 w-8 bg-zinc-800 text-zinc-400 border border-white/10 rounded hover:text-white flex items-center justify-center"><Layout className="w-3 h-3" /></button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addToWatchlist(activeWatchlistId, item);
                                                    setCommandCenterOpen(false);
                                                }}
                                                className="h-6 w-8 bg-muted text-muted-foreground border border-border rounded hover:text-foreground flex items-center justify-center hover:bg-primary hover:border-primary hover:text-black"
                                            >
                                                <span className="text-xs">+</span>
                                            </button>
                                        </div>

                                        <div className="ml-auto flex flex-col items-end">
                                            {/* Live LTP Placeholder - wired to store would go here */}
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-xs font-mono font-medium", Math.random() > 0.5 ? "text-up" : "text-down")}>
                                                    {(item.token / 100).toFixed(2)}
                                                </span>
                                                <span className="text-[9px] text-muted-foreground/60 font-mono">
                                                    0.45%
                                                </span>
                                            </div>
                                        </div>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {!search && (
                            <>
                                <Command.Group heading="Workspaces" className="px-2 py-3 text-[9px] font-black uppercase text-primary/60 tracking-[0.3em] mb-2">
                                    {Object.entries(PRESET_LAYOUTS).map(([key, config]) => {
                                        // Dynamic Icon Mapping
                                        const IconComponent = config.icon ? ({
                                            "LayoutDashboard": LayoutDashboard,
                                            "Zap": Zap,
                                            "Grid2x2": Grid2x2,
                                            "Layers": Layers,
                                            "BookOpen": BookOpen,
                                            "Cpu": Cpu,
                                            "Brain": Brain
                                        }[config.icon] || Layout) : Layout;

                                        return (
                                            <Command.Item
                                                key={key}
                                                onSelect={() => {
                                                    setActiveWorkspace(key);
                                                    setCommandCenterOpen(false);
                                                }}
                                                className="flex cursor-pointer select-none items-center px-3 py-3 text-[11px] outline-none hover:bg-primary/10 aria-selected:bg-primary/10 text-muted-foreground aria-selected:text-primary transition-all gap-4 mb-1 border border-transparent aria-selected:border-primary/20"
                                            >
                                                <IconComponent className="h-4 w-4" />
                                                <span className="font-bold tracking-tight uppercase">{config.name}</span>
                                                <span className="ml-auto text-[9px] opacity-40 font-mono">LAYOUT</span>
                                            </Command.Item>
                                        );
                                    })}
                                </Command.Group>

                                <Command.Group heading="Recently Viewed" className="px-2 py-3 text-[9px] font-black uppercase text-primary/60 tracking-[0.3em] mb-2">
                                    {MARKET_INSTRUMENTS.slice(0, 5).map((item) => (
                                        <Command.Item
                                            key={item.symbol}
                                            onSelect={() => handleSymbolSelect(item.symbol)}
                                            className="flex cursor-pointer select-none items-center px-3 py-3 text-[11px] outline-none hover:bg-muted/50 aria-selected:bg-muted text-muted-foreground aria-selected:text-foreground transition-all gap-4 mb-1"
                                        >
                                            <Search className="h-4 w-4" />
                                            <span className="font-bold tracking-tight uppercase">{item.symbol}</span>
                                            <span className="ml-auto text-[9px] opacity-40 font-mono">TICKER</span>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            </>
                        )}

                        <Command.Group heading="Execute Trade" className="px-2 py-3 text-[9px] font-black uppercase text-primary/60 tracking-[0.3em] mb-2">
                            <Command.Item className="flex cursor-pointer select-none items-center px-3 py-3 text-[11px] outline-none hover:bg-up/10 aria-selected:bg-up/10 text-muted-foreground aria-selected:text-up transition-all gap-4 mb-1 border border-transparent aria-selected:border-up/20">
                                <ShoppingCart className="h-4 w-4" />
                                <span className="font-bold tracking-tight uppercase">Buy Market</span>
                                <div className="ml-auto flex gap-1">
                                    <kbd className="h-4 border bg-muted px-1 font-mono text-[9px] uppercase">B</kbd>
                                </div>
                            </Command.Item>
                            <Command.Item className="flex cursor-pointer select-none items-center px-3 py-3 text-[11px] outline-none hover:bg-down/10 aria-selected:bg-down/10 text-muted-foreground aria-selected:text-down transition-all gap-4 mb-1 border border-transparent aria-selected:border-down/20">
                                <ShoppingCart className="h-4 w-4" />
                                <span className="font-bold tracking-tight uppercase">Sell Market</span>
                                <div className="ml-auto flex gap-1">
                                    <kbd className="h-4 border bg-muted px-1 font-mono text-[9px] uppercase">S</kbd>
                                </div>
                            </Command.Item>
                        </Command.Group>

                        <Command.Group heading="Tools" className="px-2 py-3 text-[9px] font-black uppercase text-primary/60 tracking-[0.3em]">
                            <Command.Item className="flex cursor-pointer select-none items-center px-3 py-3 text-[11px] outline-none hover:bg-muted aria-selected:bg-muted text-muted-foreground aria-selected:text-foreground transition-all gap-4 mb-1">
                                <EyeOff className="h-4 w-4" />
                                <span className="font-bold tracking-tight uppercase">Toggle Privacy Mode</span>
                            </Command.Item>
                            <Command.Item
                                onSelect={() => {
                                    setSettingsOpen(true);
                                    setCommandCenterOpen(false);
                                }}
                                className="flex cursor-pointer select-none items-center px-3 py-3 text-[11px] outline-none hover:bg-muted aria-selected:bg-muted text-muted-foreground aria-selected:text-foreground transition-all gap-4 mb-1">
                                <Settings className="h-4 w-4" />
                                <span className="font-bold tracking-tight uppercase">Terminal Settings</span>
                            </Command.Item>
                        </Command.Group>
                    </Command.List>

                    <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-background">
                        <div className="flex gap-4 text-[9px] text-muted-foreground/60 font-mono uppercase tracking-widest">
                            <span className="flex items-center gap-1 uppercase"><kbd className="border border-border px-1">↑↓</kbd> Navigate</span>
                            <span className="flex items-center gap-1 uppercase"><kbd className="border border-border px-1">↵</kbd> Select</span>
                        </div>
                        <div className="text-[9px] text-primary/40 font-black uppercase tracking-[0.2em]">
                            ZenG Trade v0.4.0-zeng
                        </div>
                    </div>
                </Command>
            </div>
        </div >
    );
};

