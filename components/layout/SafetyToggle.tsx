
"use client";

import React from "react";
import { useSafetyStore } from "@/hooks/useSafetyStore";
import { Lock, Unlock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const SafetyToggle = () => {
    const { isArmed, toggleArmed } = useSafetyStore();

    return (
        <button
            onClick={toggleArmed}
            className={cn(
                "group relative flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all duration-500 overflow-hidden",
                isArmed
                    ? "bg-red-500/10 border-red-500/40 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:border-red-500/60"
                    : "bg-emerald-500/10 border-emerald-500/40 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:border-emerald-500/60"
            )}
        >
            {/* Animated Background Glow Layer */}
            {isArmed && (
                <div className="absolute inset-0 bg-red-500/20 blur-xl animate-pulse-glow pointer-events-none" />
            )}

            <div className="relative z-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em]">
                {isArmed ? (
                    <>
                        <Unlock className="w-3.5 h-3.5 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        <span className="drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">ARMED</span>
                        <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-red-400" />
                    </>
                ) : (
                    <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>SAFE</span>
                    </>
                )}
            </div>

            {/* Tooltip on Hover */}
            {/* Tooltip on Hover */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-48 px-3 py-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg text-left shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-white/10">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <span className="text-[10px] font-bold text-zinc-300">EXECUTION SAFETY</span>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px]">
                        <span className="text-emerald-500 font-bold">SAFE</span>
                        <span className="text-zinc-500">Orders Blocked</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                        <span className="text-red-500 font-bold animate-pulse">ARMED</span>
                        <span className="text-zinc-500">Live Execution</span>
                    </div>
                </div>
                <div className="mt-1.5 text-[8px] text-zinc-600 leading-tight">
                    Prevents accidental "fat finger" trades. Toggle to ARM before striking.
                </div>
            </div>
        </button>
    );
};
