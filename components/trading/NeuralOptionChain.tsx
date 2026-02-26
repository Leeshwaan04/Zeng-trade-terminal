
"use client";

import React, { useMemo, useState } from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { useOrderStore } from "@/hooks/useOrderStore";
import { useStrategyStore } from "@/hooks/useStrategyStore";
import { useSafetyStore } from "@/hooks/useSafetyStore";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Layers, Zap } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { WidgetHeader } from "@/components/ui/WidgetHeader";

interface OptionChainRow {
    strike: number;
    ce: { ltp: number; oi: number; volume: number; change: number };
    pe: { ltp: number; oi: number; volume: number; change: number };
}

// Mock Data Generator (Replace with Real Data Hook later)
const generateMockChain = (spot: number): OptionChainRow[] => {
    const startStrike = Math.floor(spot / 50) * 50 - 500;
    return Array.from({ length: 21 }).map((_, i) => {
        const strike = startStrike + (i * 50);
        const dist = Math.abs(strike - spot);
        const isATM = dist < 25;

        // Simulate OI/Vol decaying away from ATM
        const oiBase = 5000000 * Math.exp(-dist / 500);
        const volBase = 10000000 * Math.exp(-dist / 300);

        return {
            strike,
            ce: {
                ltp: Math.max(0.05, (spot - strike) + (Math.random() * 50)), // Basic pricing model
                oi: Math.floor(oiBase * (0.8 + Math.random() * 0.4)),
                volume: Math.floor(volBase * (0.8 + Math.random() * 0.4)),
                change: (Math.random() * 20) - 10
            },
            pe: {
                ltp: Math.max(0.05, (strike - spot) + (Math.random() * 50)),
                oi: Math.floor(oiBase * (0.8 + Math.random() * 0.4)),
                volume: Math.floor(volBase * (0.8 + Math.random() * 0.4)),
                change: (Math.random() * 20) - 10
            }
        };
    });
};

export const NeuralOptionChain = ({ symbol = "NIFTY 50" }: { symbol?: string }) => {
    const { tickers } = useMarketStore();
    const { placeOrder } = useOrderStore();
    const { isArmed } = useSafetyStore();
    const { executeStraddle } = useStrategyStore();

    // Determine active spot
    const spotPrice = useMemo(() => tickers[symbol]?.last_price || 25471.10, [tickers, symbol]);
    const chainData = useMemo(() => generateMockChain(spotPrice), [spotPrice]);

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

    return (
        <div className="h-full w-full flex flex-col bg-black/90 text-xs font-mono select-none overflow-hidden">
            <WidgetHeader
                id="option-chain"
                title="Option Chain"
                symbol={symbol}
                action={<span className="text-[10px] text-zinc-400">SPOT: <span className="text-white font-bold">{spotPrice.toFixed(2)}</span></span>}
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
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                {/* Spot Line */}
                <div
                    className="absolute left-0 right-0 h-[1px] bg-yellow-400/50 z-20 pointer-events-none border-b border-dashed border-yellow-400"
                    style={{
                        top: `${((chainData.findIndex(r => r.strike > spotPrice) || 10) * (isMobile ? 40 : 28)) + (isMobile ? 20 : 14)}px`
                    }}
                >
                    <div className="absolute right-0 -top-2 bg-yellow-400 text-black text-[8px] font-bold px-1 rounded-l-sm">SPOT</div>
                </div>

                {chainData.map((row) => (
                    <div
                        key={row.strike}
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
                        <div className="col-span-1 text-center font-bold text-white bg-white/5 h-full flex items-center justify-center border-x border-white/5 relative group/strike cursor-pointer hover:bg-[var(--color-neon-cyan)]/20 transition-colors">
                            {row.strike}
                            {/* Mobile Tap Action Overlay could go here */}
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
                ))}
            </div>
        </div>
    );
};
