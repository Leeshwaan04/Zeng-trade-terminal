"use client";

import React from "react";
import { Plus, LayoutGrid, Zap } from "lucide-react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { motion } from "framer-motion";

export const EmptyWorkspaceDesk = () => {
    const { setCommandCenterOpen } = useLayoutStore();

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden">
            {/* Subtle Tech Grid Background */}
            <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="z-10 flex flex-col items-center justify-center max-w-lg text-center p-8 glass-panel rounded-2xl neo-card"
            >
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse-glow">
                    <LayoutGrid className="w-10 h-10 text-primary" />
                </div>

                <h2 className="text-3xl font-black mb-2 tracking-tight text-glow">Design Your Terminal</h2>
                <p className="text-sm text-zinc-400 mb-8 max-w-sm">
                    Your workspace is currently a clean slate. Build your custom trading desk from scratch or select from our AI-optimized profiles.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                    <button
                        onClick={() => setCommandCenterOpen(true)}
                        className="flex-1 w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-primary text-primary-foreground font-bold hover:brightness-110 transition-all shadow-[0_0_20px_var(--primary)] text-sm"
                    >
                        <Zap className="w-4 h-4" /> Switch AI Profile
                    </button>

                    <button
                        onClick={() => document.getElementById('widget-picker-trigger')?.click()}
                        className="flex-1 w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-white/5 hover:bg-white/10 text-foreground border border-white/10 font-bold transition-all text-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Widget
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 w-full flex flex-col gap-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-left">Pro Tips:</span>
                    <div className="text-xs text-zinc-400 text-left flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span> Press <kbd className="px-1.5 py-0.5 bg-black/50 border border-white/10 rounded font-mono text-[9px] mx-1">⌘ + K</kbd> anywhere to open the command palette.
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
