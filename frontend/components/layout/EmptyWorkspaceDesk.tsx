"use client";

import React from "react";
import { Plus, LayoutGrid, Zap, BarChart3, LineChart, Layers, ArrowRight } from "lucide-react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { motion } from "framer-motion";

// One-click starter desks — a new user can land in a working terminal instantly
// instead of hunting through the command palette.
const QUICK_DESKS = [
    { id: "standard", name: "Standard", desc: "Chart · Watchlist · Order ticket", icon: LayoutGrid },
    { id: "options", name: "Options Trader", desc: "Chain · Payoff · Strategy builder", icon: Layers },
    { id: "scalping", name: "Sahi Scalper", desc: "Dual charts · Depth · Fast fills", icon: Zap },
    { id: "analysis", name: "Multi-Chart", desc: "Four synced charts side-by-side", icon: LineChart },
];

export const EmptyWorkspaceDesk = () => {
    const { setCommandCenterOpen, setActiveWorkspace } = useLayoutStore();

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden p-4">
            {/* Subtle Tech Grid Background */}
            <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="z-10 flex flex-col items-center justify-center w-full max-w-xl text-center p-6 sm:p-8 glass-panel rounded-2xl neo-card"
            >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5 animate-pulse-glow">
                    <LayoutGrid className="w-8 h-8 text-primary" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight text-glow">Pick a desk to get started</h2>
                <p className="text-sm text-zinc-400 mb-7 max-w-sm">
                    Launch a ready-made trading desk in one click — you can rearrange or add widgets anytime.
                </p>

                {/* One-click starter desks */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {QUICK_DESKS.map((desk) => (
                        <button
                            key={desk.id}
                            onClick={() => setActiveWorkspace(desk.id)}
                            className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-primary/10 border border-white/10 hover:border-primary/40 transition-all text-left active:scale-[0.98]"
                        >
                            <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                                <desk.icon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground leading-tight">{desk.name}</p>
                                <p className="text-[10px] text-zinc-500 leading-tight truncate">{desk.desc}</p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                        </button>
                    ))}
                </div>

                {/* Build from scratch / browse all */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-5">
                    <button
                        onClick={() => setCommandCenterOpen(true)}
                        className="flex-1 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-foreground border border-white/10 font-bold transition-all text-xs"
                    >
                        <BarChart3 className="w-3.5 h-3.5" /> Browse all desks
                    </button>
                    <button
                        onClick={() => document.getElementById('widget-picker-trigger')?.click()}
                        className="flex-1 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-foreground border border-white/10 font-bold transition-all text-xs"
                    >
                        <Plus className="w-3.5 h-3.5" /> Build from scratch
                    </button>
                </div>

                <div className="mt-6 pt-5 border-t border-white/10 w-full">
                    <div className="text-xs text-zinc-400 flex items-center justify-center gap-2">
                        <span className="text-primary">Tip:</span> Press
                        <kbd className="px-1.5 py-0.5 bg-black/50 border border-white/10 rounded font-mono text-[9px]">⌘ K</kbd>
                        anywhere to search instruments, switch desks, or run commands.
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
