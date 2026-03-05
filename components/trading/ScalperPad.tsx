"use client";

import React, { useState, useEffect } from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { useOrderStore } from "@/hooks/useOrderStore";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { Zap, Flame, Shield, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export const ScalperPad = ({ symbol = "NIFTY" }: { symbol?: string }) => {
    const [qty, setQty] = useState(50);
    const [slOffset, setSlOffset] = useState(10);
    const [tpOffset, setTpOffset] = useState(20);
    const [atmStrike, setAtmStrike] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    const tickers = useMarketStore(s => s.tickers);
    const { placeBracketOrder } = useOrderStore.getState();

    // Spot Price and ATM Calculation
    const spotSymbol = symbol === "NIFTY" ? "NIFTY 50" : symbol === "BANKNIFTY" ? "NIFTY BANK" : symbol;
    const spotPrice = tickers[spotSymbol]?.last_price || 0;

    useEffect(() => {
        if (spotPrice > 0) {
            const step = symbol === "NIFTY" ? 50 : 100;
            setAtmStrike(Math.round(spotPrice / step) * step);
        }
    }, [spotPrice, symbol]);

    const handleExecute = async (type: 'CE' | 'PE') => {
        setLoading(true);
        try {
            // 1. Fetch exact instrument details for ATM
            const url = `/api/kite/option-chain?symbol=${symbol}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.success) {
                const strikeObj = data.strikes.find((s: any) => s.strike === atmStrike);
                const inst = type === 'CE' ? strikeObj?.ce : strikeObj?.pe;

                if (!inst) throw new Error(`ATM ${type} not found for ${atmStrike}`);

                const lastPrice = tickers[String(inst.instrument_token)]?.last_price || inst.last_price || 0;

                // 2. Place Bracket Order
                placeBracketOrder(
                    {
                        symbol: inst.tradingsymbol,
                        transactionType: 'BUY',
                        orderType: 'LIMIT',
                        productType: 'MIS',
                        qty: qty,
                        price: lastPrice
                    },
                    lastPrice - slOffset,
                    lastPrice + tpOffset
                );
            }
        } catch (e) {
            console.error("ScalperPad: Execution failed", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black font-mono select-none">
            <WidgetHeader
                id="scalper-pad"
                title="ELITE SCALPER PAD"
                action={<Zap className="w-3 h-3 text-yellow-400 animate-pulse" />}
            />

            <div className="flex-1 p-3 flex flex-col gap-4">
                {/* Inputs */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                        <label className="text-[8px] text-zinc-500 uppercase">Qty</label>
                        <input
                            type="number"
                            value={qty}
                            onChange={e => setQty(Number(e.target.value))}
                            className="bg-zinc-900 border border-white/10 text-white text-xs p-1 rounded outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[8px] text-[var(--neon-red)] uppercase flex items-center gap-1">
                            <Shield className="w-2 h-2" /> SL
                        </label>
                        <input
                            type="number"
                            value={slOffset}
                            onChange={e => setSlOffset(Number(e.target.value))}
                            className="bg-zinc-900 border border-white/10 text-white text-xs p-1 rounded outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[8px] text-[var(--neon-green)] uppercase flex items-center gap-1">
                            <Target className="w-2 h-2" /> TP
                        </label>
                        <input
                            type="number"
                            value={tpOffset}
                            onChange={e => setTpOffset(Number(e.target.value))}
                            className="bg-zinc-900 border border-white/10 text-white text-xs p-1 rounded outline-none"
                        />
                    </div>
                </div>

                {/* ATM Display */}
                <div className="bg-zinc-900/50 p-2 border border-white/5 rounded flex justify-between items-center">
                    <div>
                        <span className="text-[8px] text-zinc-500 block uppercase">ATM Strike</span>
                        <span className="text-sm font-black text-[var(--neon-cyan)]">{atmStrike}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-[8px] text-zinc-500 block uppercase">Spot</span>
                        <span className="text-xs font-bold text-white tabular-nums">{spotPrice.toFixed(2)}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 flex-1 min-h-[100px]">
                    <button
                        onClick={() => handleExecute('CE')}
                        disabled={loading || !atmStrike}
                        className={cn(
                            "group relative overflow-hidden rounded-md border-2 border-[var(--neon-green)] bg-black transition-all hover:bg-[var(--neon-green)]/10 font-black",
                            loading && "opacity-50"
                        )}
                    >
                        <div className="flex flex-col items-center justify-center h-full gap-1">
                            <Zap className="w-6 h-6 text-[var(--neon-green)] group-hover:scale-110 transition-transform" />
                            <span className="text-xs text-[var(--neon-green)]">BUY ATM CE</span>
                        </div>
                    </button>

                    <button
                        onClick={() => handleExecute('PE')}
                        disabled={loading || !atmStrike}
                        className={cn(
                            "group relative overflow-hidden rounded-md border-2 border-[var(--neon-red)] bg-black transition-all hover:bg-[var(--neon-red)]/10 font-black",
                            loading && "opacity-50"
                        )}
                    >
                        <div className="flex flex-col items-center justify-center h-full gap-1">
                            <Flame className="w-6 h-6 text-[var(--neon-red)] group-hover:scale-110 transition-transform" />
                            <span className="text-xs text-[var(--neon-red)]">BUY ATM PE</span>
                        </div>
                    </button>
                </div>
            </div>

            <div className="p-2 border-t border-white/5 bg-[var(--neon-red)]/5 text-[8px] text-[var(--neon-red)] italic text-center animate-pulse">
                ⚡ BRAVADO MODE ENABLED: Instant Broker Execution Bypass
            </div>
        </div>
    );
};
