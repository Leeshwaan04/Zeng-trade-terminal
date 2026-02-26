"use client";

import React from "react";
import {
    X, BarChart3, ListOrdered, Activity, BookOpen,
    Grid3X3, Shield, TrendingUp, LayoutGrid, Zap,
    Target, BarChart, History, PieChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WidgetType } from "@/types/layout";

interface WidgetCardProps {
    type: string;
    label: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
    gradient: string;
    onClick: () => void;
}

const WidgetCard = ({ label, desc, icon, color, gradient, onClick }: WidgetCardProps) => (
    <button
        onClick={onClick}
        className="group relative flex flex-col p-4 rounded-xl border border-white/5 bg-[#12161f] hover:bg-[#1a202c] transition-all hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98] text-left"
    >
        <div className={cn("mb-3 p-2 w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br shadow-lg", gradient)}>
            <div className="text-white group-hover:scale-110 transition-transform">
                {icon}
            </div>
        </div>
        <div className="text-[11px] font-black text-white uppercase tracking-wider mb-1 group-hover:text-primary transition-colors">
            {label}
        </div>
        <div className="text-[9px] text-zinc-500 leading-tight">
            {desc}
        </div>
    </button>
);

const WIDGETS_COLLECTION = [
    { type: "CHART", label: "Chart", desc: "Advanced technical analysis with indicators", icon: <BarChart3 className="w-5 h-5" />, color: "text-blue-400", gradient: "from-blue-500/20 to-blue-600/40" },
    { type: "OPTION_CHAIN", label: "Option Chain", desc: "Real-time Greeks and premium tracking", icon: <Grid3X3 className="w-5 h-5" />, color: "text-yellow-400", gradient: "from-yellow-500/20 to-yellow-600/40" },
    { type: "WATCHLIST", label: "Watchlist", desc: "Stream live prices for your favorite stocks", icon: <ListOrdered className="w-5 h-5" />, color: "text-emerald-400", gradient: "from-emerald-500/20 to-emerald-600/40" },
    { type: "POSITIONS", label: "Positions", desc: "Track your open trades and P&L", icon: <Activity className="w-5 h-5" />, color: "text-rose-400", gradient: "from-rose-500/20 to-rose-600/40" },
    { type: "ORDER_BOOK", label: "Market Depth", desc: "Level 2 data for precise entry/exit", icon: <BookOpen className="w-5 h-5" />, color: "text-purple-400", gradient: "from-purple-500/20 to-purple-600/40" },
    { type: "SCALPER", label: "Scalper", desc: "High-speed one-click order execution", icon: <Zap className="w-5 h-5" />, color: "text-orange-400", gradient: "from-orange-500/20 to-orange-600/40" },
    { type: "GREEKS", label: "Option Greeks", desc: "Delta, Gamma, Theta, Vega analysis", icon: <Target className="w-5 h-5" />, color: "text-teal-400", gradient: "from-teal-500/20 to-teal-600/40" },
    { type: "HEATMAP", label: "Heatmap", desc: "Visual sizing of market segments", icon: <LayoutGrid className="w-5 h-5" />, color: "text-fuchsia-400", gradient: "from-fuchsia-500/20 to-fuchsia-600/40" },
    { type: "OI_ANALYSIS", label: "OI Analysis", desc: "Track Open Interest accumulation", icon: <BarChart className="w-5 h-5" />, color: "text-cyan-400", gradient: "from-cyan-500/20 to-cyan-600/40" },
    { type: "STRADDLE_CHART", label: "Straddle Chart", desc: "Visualized combined premium decay", icon: <TrendingUp className="w-5 h-5" />, color: "text-amber-400", gradient: "from-amber-500/20 to-amber-600/40" },
    { type: "HISTORY", label: "Order History", desc: "Comprehensive log of past trades", icon: <History className="w-5 h-5" />, color: "text-zinc-400", gradient: "from-zinc-500/20 to-zinc-600/40" },
    { type: "PORTFOLIO", label: "Portfolio", desc: "Consolidated view of all holdings", icon: <PieChart className="w-5 h-5" />, color: "text-indigo-400", gradient: "from-indigo-500/20 to-indigo-600/40" },
    { type: "ALGO_FEED", label: "Algo Feed", desc: "Real-time signals from automated bots", icon: <Shield className="w-5 h-5" />, color: "text-primary", gradient: "from-primary/20 to-primary/40" },
];

export const WidgetPicker = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="w-full max-w-4xl bg-[#0a0f18] border border-white/10 rounded-2xl shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
                            <LayoutGrid className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Widget Gallery</h2>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest opacity-60">Add specialized tools to your layout</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                    >
                        <X className="w-6 h-6 text-zinc-500 group-hover:text-white" />
                    </button>
                </div>

                {/* Grid */}
                <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {WIDGETS_COLLECTION.map((widget) => (
                            <WidgetCard
                                key={widget.type}
                                {...widget}
                                onClick={() => {
                                    // Logic to add widget will go here
                                    console.log(`Add widget: ${widget.type}`);
                                    onClose();
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white/2 border-t border-white/5 flex items-center justify-between">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        Total Available: {WIDGETS_COLLECTION.length}
                    </div>
                    <p className="text-[10px] text-zinc-600">
                        Pro Tip: Drag and drop widgets to reorder them in your grid.
                    </p>
                </div>
            </div>
        </div>
    );
};
