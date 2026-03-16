"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useKiteTicker } from "@/hooks/useKiteTicker";
import { useMarketStore } from "@/hooks/useMarketStore";
import { KiteInstrument } from "@/lib/kite-instruments"; // Need to export this type or redefine
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useOrderStore } from "@/hooks/useOrderStore";
import { useStrategyStore } from "@/hooks/useStrategyStore";
import { BSResult } from "@/lib/black-scholes";

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
    const [allExpiries, setAllExpiries] = useState<string[]>([]);

    // Web Worker State for Greeks
    const workerRef = React.useRef<Worker | null>(null);
    const [chainGreeks, setChainGreeks] = useState<Record<number, { ce: BSResult, pe: BSResult }>>({});

    // Get Spot Price from Market Store
    const spotSymbol = symbol === "NIFTY" ? "NIFTY 50" : symbol;
    const spotTick = useMarketStore(state => state.tickers[spotSymbol]);
    const spotPrice = spotTick?.last_price || 0;

    // Initialize Web Worker
    useEffect(() => {
        workerRef.current = new Worker(new URL('../../workers/greeks.worker.ts', import.meta.url));
        workerRef.current.onmessage = (e: MessageEvent) => {
            if (e.data.type === 'CHAIN_GREEKS_RESULT' && e.data.success) {
                setChainGreeks(e.data.payload);
            }
        };
        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    // Fetch Chain Data
    useEffect(() => {
        const fetchChain = async () => {
            setLoading(true);
            try {
                // Normalize symbol for API (NIFTY 50 -> NIFTY, NIFTY BANK -> BANKNIFTY)
                const url = `/api/kite/option-chain?symbol=${symbol}${expiry ? `&expiry=${expiry}` : ""}`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.success) {
                    setInstruments(data.strikes);
                    setAllExpiries(data.allExpiries || []);
                    if (!expiry) setExpiry(data.activeExpiry);
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

    // Fire Web Worker on Spot Tick
    useEffect(() => {
        if (!workerRef.current || visibleRows.length === 0 || spotPrice === 0) return;

        workerRef.current.postMessage({
            id: Date.now(),
            type: "COMPUTE_CHAIN_GREEKS",
            payload: {
                strikes: visibleRows.map(r => r.strike),
                spotPrice,
                timeToExpiry: 5 / 365, // Mock 5 days
                riskFreeRate: 0.07,
                impliedVol: 0.2
            }
        });
    }, [visibleRows, spotPrice]);

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
                <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground">{symbol}</span>
                    {/* Expiry Selector */}
                    <select
                        value={expiry || ""}
                        onChange={(e) => setExpiry(e.target.value)}
                        className="bg-transparent border-none text-primary font-bold focus:outline-none cursor-pointer hover:underline underline-offset-4"
                    >
                        {allExpiries.map(e => (
                            <option key={e} value={e} className="bg-background text-foreground">{e}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <span className="text-muted-foreground mr-2 text-[8px] uppercase tracking-tighter">SPOT:</span>
                    <span className="font-bold text-foreground tabular-nums">{spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* Chain Table Header */}
            <div className="grid grid-cols-[1fr_40px_1fr] md:grid-cols-[1fr_60px_1fr] gap-0 text-center bg-surface-2 uppercase tracking-wide text-muted-foreground py-1 border-b border-border">
                <div className="grid grid-cols-4">
                    <span>Delta</span>
                    <span>OI</span>
                    <span>LTP</span>
                    <span>Call</span>
                </div>
                <div className="font-bold text-foreground">Strike</div>
                <div className="grid grid-cols-4">
                    <span>Put</span>
                    <span>LTP</span>
                    <span>OI</span>
                    <span>Delta</span>
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
                                <div className="grid grid-cols-4 items-center py-1 border-r border-border/20" onClick={() => handleTrade(row.ce, 'BUY')}>
                                    <span className="text-[9px] text-blue-400 opacity-80">{chainGreeks[row.strike]?.ce.delta.toFixed(2) || "-"}</span>
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
                                <div className="grid grid-cols-4 items-center py-1 border-l border-border/20" onClick={() => handleTrade(row.pe, 'BUY')}>
                                    <span className="hidden md:inline text-[9px] opacity-50">PE</span>
                                    <span className={cn(
                                        "font-medium",
                                        (peData?.net_change || 0) >= 0 ? "text-up" : "text-down"
                                    )}>{peData?.last_price?.toFixed(1) || "-"}</span>
                                    <span className="text-[9px] opacity-70">{peData?.oi || "-"}</span>
                                    <span className="text-[9px] text-orange-400 opacity-80">{chainGreeks[row.strike]?.pe.delta.toFixed(2) || "-"}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
};
