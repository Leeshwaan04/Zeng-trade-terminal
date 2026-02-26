
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
                "group relative flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all duration-300 overflow-hidden",
                isArmed
                    ? "bg-red-900/30 border-red-500/50 text-red-500 hover:bg-red-900/50 shadow-[0_0_15px_rgba(255,0,0,0.2)]"
                    : "bg-emerald-900/30 border-emerald-500/50 text-emerald-500 hover:bg-emerald-900/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            )}
        >
            {/* Animated Background Pulse */}
            <div className={cn(
                "absolute inset-0 opacity-20 transition-opacity duration-300",
                isArmed ? "bg-red-500 animate-pulse" : "bg-emerald-500"
            )} />

            <div className="relative z-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                {isArmed ? (
                    <>
                        <Unlock className="w-3 h-3" />
                        <span>ARMED</span>
                        <AlertTriangle className="w-3 h-3 animate-pulse" />
                    </>
                ) : (
                    <>
                        <Lock className="w-3 h-3" />
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
