"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useKiteTicker } from "@/hooks/useKiteTicker";
import { useMarketStore } from "@/hooks/useMarketStore";
import { KiteInstrument } from "@/lib/kite-instruments"; // Need to export this type or redefine
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useOrderStore } from "@/hooks/useOrderStore";
import { useStrategyStore } from "@/hooks/useStrategyStore";

interface OptionChainItem extends KiteInstrument {
    // Extended with live data from ticker
}

interface OptionRow {
    strike: number;
    ce?: OptionChainItem;
    pe?: OptionChainItem;
}

export const OptionChainWidget = ({ symbol = "NIFTY" }: { symbol?: string }) => {
    const [instruments, setInstruments] = useState<KiteInstrument[]>([]);
    const [loading, setLoading] = useState(true);
    const [expiry, setExpiry] = useState<string | null>(null);

    // Get Spot Price from Market Store
    const spotSymbol = symbol === "NIFTY" ? "NIFTY 50" : symbol;
    const spotTick = useMarketStore(state => state.tickers[spotSymbol]);
    const spotPrice = spotTick?.last_price || 0;

    // Fetch Chain Data
    useEffect(() => {
        const fetchChain = async () => {
            setLoading(true);
            try {
                // Normalize symbol for API (NIFTY 50 -> NIFTY, NIFTY BANK -> BANKNIFTY)
                const apiSymbol = symbol === "NIFTY 50" ? "NIFTY" : symbol === "NIFTY BANK" ? "BANKNIFTY" : symbol;
                const url = `/api/kite/instruments?symbol=${apiSymbol}${expiry ? `&expiry=${expiry}` : ""}`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.status === "success") {
                    setInstruments(data.data);
                }
            } catch (e) {
                console.error("Failed to fetch option chain", e);
            } finally {
                setLoading(false);
            }
        };

        fetchChain();
    }, [symbol, expiry]);

    // Construct Chain Rows (Group by Strike)
    const chainRows = useMemo(() => {
        const rows: Record<number, OptionRow> = {};
        instruments.forEach(inst => {
            if (!rows[inst.strike]) {
                rows[inst.strike] = { strike: inst.strike };
            }
            if (inst.instrument_type === "CE") {
                rows[inst.strike].ce = inst;
            } else if (inst.instrument_type === "PE") {
                rows[inst.strike].pe = inst;
            }
        });
        return Object.values(rows).sort((a, b) => a.strike - b.strike);
    }, [instruments]);

    // Filter to show limited range around Spot
    const visibleRows = useMemo(() => {
        if (spotPrice === 0 || chainRows.length === 0) return chainRows;

        // Find ATM index
        let closestIndex = 0;
        let minDiff = Infinity;

        chainRows.forEach((row, i) => {
            const diff = Math.abs(row.strike - spotPrice);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        });

        // Show +/- 10 strikes
        const start = Math.max(0, closestIndex - 10);
        const end = Math.min(chainRows.length, closestIndex + 11);
        return chainRows.slice(start, end);

    }, [chainRows, spotPrice]);

    // Subscribe to Ticker
    const allTokens = useMemo(() => {
        const tokens: number[] = [];
        visibleRows.forEach(row => {
            if (row.ce) tokens.push(row.ce.instrument_token);
            if (row.pe) tokens.push(row.pe.instrument_token);
        });
        return tokens;
    }, [visibleRows]);

    useKiteTicker({ instrumentTokens: allTokens });

    // Render Helpers
    const tickers = useMarketStore(state => state.tickers);

    // Order Entry
    const { placeOrder } = useOrderStore.getState();

    const { addLeg } = useStrategyStore();

    const handleTrade = (inst: KiteInstrument | undefined, side: 'BUY' | 'SELL') => {
        if (!inst) return;

        // Add to Strategy Builder
        addLeg({
            instrument: inst,
            side: side,
            quantity: inst.lot_size || 50, // Default to lot size
            price: inst.last_price || 0
        });

        // Optional: Show toast or feedback
        console.log(`Added ${side} ${inst.tradingsymbol} to Strategy`);
    };

    if (loading) return <div className="text-center p-4 text-xs text-muted-foreground animate-pulse">Loading Chain...</div>;

    return (
        <div className="flex flex-col h-full bg-background font-mono text-[10px]">
            {/* Header */}
            <div className="flex justify-between items-center p-2 border-b border-border bg-surface-1">
                <span className="font-bold text-foreground">{symbol} OPTION CHAIN</span>
                <span className="text-primary">{expiry || "Current Expiry"}</span>
                <div>
                    <span className="text-muted-foreground mr-2">SPOT:</span>
                    <span className="font-bold text-foreground">{spotPrice.toFixed(2)}</span>
                </div>
            </div>

            {/* Chain Table Header */}
            <div className="grid grid-cols-[1fr_40px_1fr] md:grid-cols-[1fr_60px_1fr] gap-0 text-center bg-surface-2 uppercase tracking-wide text-muted-foreground py-1 border-b border-border">
                <div className="grid grid-cols-3">
                    <span>OI</span>
                    <span>LTP</span>
                    <span>Call</span>
                </div>
                <div className="font-bold text-foreground">Strike</div>
                <div className="grid grid-cols-3">
                    <span>Put</span>
                    <span>LTP</span>
                    <span>OI</span>
                </div>
            </div>

            {/* Rows */}
            <ScrollArea className="flex-1">
                <div className="divide-y divide-border/10">
                    {visibleRows.map(row => {
                        // Use Token ID as string for lookup, matching useKiteTicker's dynamic mapping
                        const ceTokenStr = String(row.ce?.instrument_token || "");
                        const peTokenStr = String(row.pe?.instrument_token || "");

                        const ceData = tickers[ceTokenStr];
                        const peData = tickers[peTokenStr];

                        const isATM = Math.abs(row.strike - spotPrice) < 50; // Approx

                        return (
                            <div key={row.strike} className={cn(
                                "grid grid-cols-[1fr_40px_1fr] md:grid-cols-[1fr_60px_1fr] gap-0 text-center items-center hover:bg-surface-4 transition-colors cursor-pointer",
                                isATM && "bg-primary/5"
                            )}>
                                {/* CALLS */}
                                <div className="grid grid-cols-3 items-center py-1 border-r border-border/20" onClick={() => handleTrade(row.ce, 'BUY')}>
                                    <span className="text-[9px] opacity-70">{ceData?.oi || "-"}</span>
                                    <span className={cn(
                                        "font-medium",
                                        (ceData?.net_change || 0) >= 0 ? "text-up" : "text-down"
                                    )}>{ceData?.last_price?.toFixed(1) || "-"}</span>
                                    <span className="hidden md:inline text-[9px] opacity-50">CE</span>
                                </div>

                                {/* STRIKE */}
                                <div className="font-bold text-foreground bg-surface-3 py-1">
                                    {row.strike}
                                </div>

                                {/* PUTS */}
                                <div className="grid grid-cols-3 items-center py-1 border-l border-border/20" onClick={() => handleTrade(row.pe, 'BUY')}>
                                    <span className="hidden md:inline text-[9px] opacity-50">PE</span>
                                    <span className={cn(
                                        "font-medium",
                                        (peData?.net_change || 0) >= 0 ? "text-up" : "text-down"
                                    )}>{peData?.last_price?.toFixed(1) || "-"}</span>
                                    <span className="text-[9px] opacity-70">{peData?.oi || "-"}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
};
