"use client";

import React from "react";
import { useStrategyStore, StrategyLeg } from "@/hooks/useStrategyStore";
import { X, Trash2, Shield, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const StrategyBuilder = () => {
    const { legs, removeLeg, updateLeg, clearStrategy } = useStrategyStore();

    if (legs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 p-8 text-center bg-black/40 backdrop-blur-md">
                <Shield className="w-12 h-12 mb-4 opacity-20" />
                <h3 className="text-sm font-bold text-zinc-400 mb-1">Strategy Builder Empty</h3>
                <p className="text-xs">Select options from the chain to build a custom multi-leg strategy.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/5 bg-zinc-900/30">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded">CUSTOM STRATEGY</span>
                    <span className="text-xs text-zinc-400 font-mono">{legs.length} Legs</span>
                </div>
                <button
                    onClick={clearStrategy}
                    className="text-[10px] text-zinc-500 hover:text-white transition-colors"
                >Clear All</button>
            </div>

            {/* Legs List */}
            <div className="flex-1 overflow-auto p-2 space-y-2">
                {legs.map((leg) => (
                    <div key={leg.id} className="group flex flex-col bg-zinc-900/50 border border-white/5 rounded-lg p-2 hover:border-white/10 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-[10px] font-black px-1.5 py-0.5 rounded",
                                    leg.side === 'BUY' ? "bg-up text-black" : "bg-down text-white"
                                )}>
                                    {leg.side}
                                </span>
                                <span className="text-xs font-bold text-white">{leg.instrument.strike} {leg.instrument.instrument_type}</span>
                                <span className="text-[9px] text-zinc-500 ml-1">{leg.instrument.expiry}</span>
                            </div>
                            <button
                                onClick={() => removeLeg(leg.id)}
                                className="text-zinc-600 hover:text-white transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <span className="uppercase text-[8px] text-zinc-600 mb-1">Qty</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateLeg(leg.id, { quantity: Math.max(0, leg.quantity - (leg.instrument.lot_size || 50)) })}
                                            className="hover:text-white"
                                        >-</button>
                                        <span className="text-white w-8 text-center">{leg.quantity}</span>
                                        <button
                                            onClick={() => updateLeg(leg.id, { quantity: leg.quantity + (leg.instrument.lot_size || 50) })}
                                            className="hover:text-white"
                                        >+</button>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="uppercase text-[8px] text-zinc-600 mb-1">Price</span>
                                    <span className="text-white">₹{leg.price.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-end">
                                <span className="uppercase text-[8px] text-zinc-600 mb-1">Impact</span>
                                <span className={cn(
                                    "font-bold",
                                    leg.side === 'BUY' ? "text-down" : "text-up"
                                )}>
                                    {leg.side === 'BUY' ? "-" : "+"}₹{(leg.price * leg.quantity).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Summary */}
            <div className="p-4 border-t border-white/5 bg-zinc-900/50">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Net Premium</span>
                    <span className={cn(
                        "text-lg font-mono font-bold",
                        legs.reduce((acc, leg) => acc + (leg.side === 'BUY' ? -1 : 1) * leg.price * leg.quantity, 0) >= 0 ? "text-up" : "text-down"
                    )}>
                        ₹{legs.reduce((acc, leg) => acc + (leg.side === 'BUY' ? -1 : 1) * leg.price * leg.quantity, 0).toLocaleString()}
                    </span>
                </div>

                <button className="w-full bg-primary hover:bg-primary-light text-black font-black py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all group/btn shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                    EXECUTE BASKET
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
            </div>
        </div >
    );
};
