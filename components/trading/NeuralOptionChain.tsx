
"use client";

import React, { useMemo, useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMarketStore } from "@/hooks/useMarketStore";
import { useOrderStore } from "@/hooks/useOrderStore";
import { useStrategyStore } from "@/hooks/useStrategyStore";
import { useSafetyStore } from "@/hooks/useSafetyStore";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Layers, Zap } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { useLiveOptionChain } from "@/hooks/useLiveOptionChain";

export const NeuralOptionChain = ({ symbol = "NIFTY 50" }: { symbol?: string }) => {
    const { tickers } = useMarketStore();
    const { placeOrder } = useOrderStore();
    const { isArmed } = useSafetyStore();
    const { executeStraddle } = useStrategyStore();

    // Authentic Live-Streaming Option Chain via WebSockets
    const { spotPrice, chainData, loading } = useLiveOptionChain(symbol);

    // Heatmap scaling
    const maxOI = Math.max(...chainData.flatMap(r => [r.ce.oi, r.pe.oi]));

    const getHeatmapColor = (value: number, type: 'Call' | 'Put') => {
        const intensity = value / maxOI;
        // Cyan for Calls, Magenta for Puts
        const color = type === 'Call' ? '0, 255, 255' : '255, 0, 255';
        return `rgba(${color}, ${intensity * 0.5})`; // Max 50% opacity
    };

    const handleStraddle = (strike: number, cePrice: number, pePrice: number) => {
        if (!isArmed) {
            alert("⚠️ ARM THE SYSTEM TO EXECUTE STRADDLES!");
            return;
        }

        executeStraddle("NIFTY", strike, cePrice, pePrice);
    };

    const isMobile = useMediaQuery("(max-width: 768px)");

    // Virtualization Setup
    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: chainData.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => isMobile ? 40 : 28, // 10 Tailwind units (h-10) vs 7 (h-7)
        overscan: 10,
    });

    return (
        <div className="h-full w-full flex flex-col bg-black/90 text-xs font-mono select-none overflow-hidden">
            <WidgetHeader
                id="option-chain"
                title="Option Chain"
                symbol={symbol}
                action={
                    loading ? <div className="animate-spin w-3 h-3 border-2 border-[var(--neon-cyan)] border-t-transparent rounded-full" />
                        : <span className="text-[10px] text-zinc-400">SPOT: <span className="text-white font-bold">{spotPrice.toFixed(2)}</span></span>
                }
            />

            {/* Table Header */}
            <div className={cn(
                "grid bg-zinc-900/50 text-[9px] py-1.5 text-center border-b border-white/5 shrink-0 uppercase tracking-wider sticky top-0 z-10 font-bold",
                isMobile ? "grid-cols-3" : "grid-cols-9"
            )}>
                {!isMobile && <div className="col-span-1 text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/5">OI (Lakhs)</div>}
                {!isMobile && <div className="col-span-1 text-[var(--neon-cyan)]">Vol</div>}
                <div className="col-span-1 text-[var(--neon-cyan)]">CALL LTP</div>
                {!isMobile && <div className="col-span-1 text-[var(--neon-cyan)]">Chg%</div>}

                <div className="col-span-1 text-white bg-white/5 border-x border-white/5">STRIKE</div>

                {!isMobile && <div className="col-span-1 text-[var(--neon-purple)]">Chg%</div>}
                <div className="col-span-1 text-[var(--neon-purple)]">PUT LTP</div>
                {!isMobile && <div className="col-span-1 text-[var(--neon-purple)]">Vol</div>}
                {!isMobile && <div className="col-span-1 text-[var(--neon-purple)] bg-[var(--neon-purple)]/5">OI (Lakhs)</div>}
            </div>

            {/* Chain Rows */}
            <div ref={parentRef} className="flex-1 overflow-auto custom-scrollbar relative">
                {/* Spot Line */}
                {!loading && (
                    <div
                        className="absolute left-0 right-0 h-[1px] bg-yellow-400/50 z-20 pointer-events-none border-b border-dashed border-yellow-400"
                        style={{
                            top: `${((chainData.findIndex(r => r.strike > spotPrice) > -1 ? chainData.findIndex(r => r.strike > spotPrice) : 10) * (isMobile ? 40 : 28))}px`
                        }}
                    >
                        <div className="absolute right-0 -top-2 bg-yellow-400 text-black text-[8px] font-bold px-1 rounded-l-sm">SPOT</div>
                    </div>
                )}

                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = chainData[virtualRow.index];
                        return (
                            <div
                                key={virtualRow.index}
                                data-index={virtualRow.index}
                                ref={rowVirtualizer.measureElement}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                                className={cn(
                                    "grid text-[10px] items-center text-zinc-400 hover:bg-white/5 transition-colors border-b border-white/5 group relative",
                                    isMobile ? "grid-cols-3 h-10" : "grid-cols-9 h-7"
                                )}
                            >
                                {/* 1-Click Straddle Button (Desktop Overlay) */}
                                {!isMobile && (
                                    <button
                                        onClick={() => handleStraddle(row.strike, row.ce.ltp, row.pe.ltp)}
                                        className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/50 backdrop-blur-[1px] z-30"
                                    >
                                        <div className="bg-[var(--neon-cyan)] text-black font-black text-[9px] px-2 py-0.5 rounded shadow-[0_0_10px_var(--neon-cyan)] flex items-center gap-1 hover:scale-105 transition-transform">
                                            <Zap className="w-3 h-3 fill-black" />
                                            STRADDLE
                                        </div>
                                    </button>
                                )}

                                {/* CALL SIDE */}
                                {!isMobile && (
                                    <div className="col-span-1 text-right pr-2 relative h-full flex items-center justify-center">
                                        <div className="absolute inset-0 z-0" style={{ backgroundColor: getHeatmapColor(row.ce.oi, 'Call') }} />
                                        <span className="relative z-10 font-bold text-zinc-300">{(row.ce.oi / 100000).toFixed(1)}</span>
                                    </div>
                                )}
                                {!isMobile && <div className="col-span-1 text-right pr-2">{(row.ce.volume / 100000).toFixed(1)}</div>}

                                {/* Mobile Call Cell: Stacked Info */}
                                <div className={cn("col-span-1 text-right pr-2 font-mono h-full flex flex-col justify-center", !isMobile && "items-end")}>
                                    <span className={cn("font-bold text-[var(--neon-cyan)]")}>
                                        {row.ce.ltp.toFixed(2)}
                                    </span>
                                    {isMobile && <span className="text-[8px] opacity-60">OI: {(row.ce.oi / 100000).toFixed(1)}L</span>}
                                </div>

                                {!isMobile && (
                                    <div className={cn("col-span-1 text-right pr-2", row.ce.change >= 0 ? "text-green-500" : "text-red-500")}>
                                        {row.ce.change > 0 ? '+' : ''}{row.ce.change.toFixed(1)}%
                                    </div>
                                )}

                                {/* STRIKE */}
                                <div className="col-span-1 text-center font-bold text-white bg-white/5 h-full flex items-center justify-center border-x border-white/5 cursor-pointer hover:bg-[var(--color-neon-cyan)]/20 transition-colors">
                                    {row.strike}
                                </div>

                                {/* PUT SIDE */}
                                {!isMobile && (
                                    <div className={cn("col-span-1 text-left pl-2", row.pe.change >= 0 ? "text-green-500" : "text-red-500")}>
                                        {row.pe.change > 0 ? '+' : ''}{row.pe.change.toFixed(1)}%
                                    </div>
                                )}

                                {/* Mobile Put Cell: Stacked Info */}
                                <div className={cn("col-span-1 text-left pl-2 font-mono h-full flex flex-col justify-center", !isMobile && "items-start")}>
                                    <span className={cn("font-bold text-[var(--neon-purple)]")}>
                                        {row.pe.ltp.toFixed(2)}
                                    </span>
                                    {isMobile && <span className="text-[8px] opacity-60">OI: {(row.pe.oi / 100000).toFixed(1)}L</span>}
                                </div>

                                {!isMobile && <div className="col-span-1 text-left pl-2">{(row.pe.volume / 100000).toFixed(1)}</div>}
                                {!isMobile && (
                                    <div className="col-span-1 text-left pl-2 relative h-full flex items-center justify-center">
                                        <div className="absolute inset-0 z-0" style={{ backgroundColor: getHeatmapColor(row.pe.oi, 'Put') }} />
                                        <span className="relative z-10 font-bold text-zinc-300">{(row.pe.oi / 100000).toFixed(1)}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
