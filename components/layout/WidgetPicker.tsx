"use client";

import React from "react";
import {
    X, BarChart3, ListOrdered, Activity, BookOpen,
    Grid3X3, Shield, TrendingUp, LayoutGrid, Zap,
    Target, BarChart, History, PieChart, Clock
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

const WidgetCard = ({ label, desc, icon, color, gradient, onClick, ready }: WidgetCardProps & { ready?: boolean }) => (
    <button
        onClick={onClick}
        disabled={!ready}
        className={cn(
            "group relative flex flex-col p-4 rounded-xl border border-border transition-all text-left",
            ready
                ? "bg-surface-1 hover:bg-muted hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98]"
                : "bg-zinc-900/50 opacity-50 grayscale cursor-not-allowed"
        )}
    >
        <div className={cn("mb-3 p-2 w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br shadow-lg", ready ? gradient : "from-zinc-800 to-zinc-900")}>
            <div className={cn("text-white transition-transform", ready && "group-hover:scale-110")}>
                {icon}
            </div>
        </div>
        <div className={cn("text-[11px] font-black uppercase tracking-wider mb-1 transition-colors", ready ? "text-foreground group-hover:text-primary" : "text-zinc-500")}>
            {label}
            {!ready && <span className="ml-2 text-[7px] bg-muted text-muted-foreground px-1 py-0.5 rounded">COMING SOON</span>}
        </div>
        <div className="text-[9px] text-zinc-500 leading-tight">
            {desc}
        </div>
    </button>
);

const WIDGETS_COLLECTION = [
    { type: "CHART", label: "Chart", desc: "Kite-grade TradingView charting", icon: <BarChart3 className="w-5 h-5" />, color: "text-blue-400", gradient: "from-blue-500/20 to-blue-600/40", ready: true },
    { type: "OPTION_CHAIN", label: "Option Chain", desc: "Real-time Greeks and premium tracking", icon: <Grid3X3 className="w-5 h-5" />, color: "text-yellow-400", gradient: "from-yellow-500/20 to-yellow-600/40", ready: true },
    { type: "WATCHLIST", label: "Watchlist", desc: "Stream live prices for your favorite stocks", icon: <ListOrdered className="w-5 h-5" />, color: "text-emerald-400", gradient: "from-emerald-500/20 to-emerald-600/40", ready: true },
    { type: "POSITIONS", label: "Positions", desc: "Track your open trades and P&L", icon: <Activity className="w-5 h-5" />, color: "text-rose-400", gradient: "from-rose-500/20 to-rose-600/40", ready: true },
    { type: "ORDER_BOOK", label: "Market Depth", desc: "Level 2 data for precise entry/exit", icon: <BookOpen className="w-5 h-5" />, color: "text-purple-400", gradient: "from-purple-500/20 to-purple-600/40", ready: true },
    { type: "SCALPER", label: "Scalper", desc: "High-speed one-click order execution", icon: <Zap className="w-5 h-5" />, color: "text-orange-400", gradient: "from-orange-500/20 to-orange-600/40", ready: true },
    { type: "GREEKS", label: "Option Greeks", desc: "Delta, Gamma, Theta, Vega analysis", icon: <Target className="w-5 h-5" />, color: "text-teal-400", gradient: "from-teal-500/20 to-teal-600/40", ready: true },
    { type: "STRATEGY_BUILDER", label: "Strategy Builder", desc: "Simulate and deploy multi-leg options", icon: <Shield className="w-5 h-5" />, color: "text-primary", gradient: "from-primary/20 to-primary/40", ready: true },
    { type: "HISTORY", label: "Order History", desc: "Comprehensive log of past trades", icon: <History className="w-5 h-5" />, color: "text-zinc-400", gradient: "from-zinc-500/20 to-zinc-600/40", ready: true },
    { type: "PORTFOLIO", label: "Portfolio", desc: "Consolidated view of all holdings", icon: <PieChart className="w-5 h-5" />, color: "text-indigo-400", gradient: "from-indigo-500/20 to-indigo-600/40", ready: true },
    { type: "GTT_MANAGER", label: "GTT Manager", desc: "Institutional GTT lifecycle control", icon: <Clock className="w-5 h-5" />, color: "text-amber-400", gradient: "from-amber-500/20 to-amber-600/40", ready: true },
    { type: "WHALE_SONAR", label: "Whale Sonar", desc: "Institutional flow detection (BETA)", icon: <Activity className="w-5 h-5" />, color: "text-zinc-500", gradient: "from-zinc-500/10 to-zinc-600/20", ready: false },
    { type: "HEATMAP", label: "Heatmap", desc: "Segment visually (BETA)", icon: <LayoutGrid className="w-5 h-5" />, color: "text-zinc-500", gradient: "from-zinc-500/10 to-zinc-600/20", ready: false },
];

export const WidgetPicker = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="w-full max-w-4xl bg-background border border-border rounded-2xl shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
                            <LayoutGrid className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Widget Gallery</h2>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Add specialized tools to your layout</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors group"
                    >
                        <X className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
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
                                    if (!widget.ready) return;
                                    console.log(`Add widget: ${widget.type}`);
                                    onClose();
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-muted/10 border-t border-border flex items-center justify-between">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Total Available: {WIDGETS_COLLECTION.length}
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">
                        Pro Tip: Drag and drop widgets to reorder them in your grid.
                    </p>
                </div>
            </div>
        </div>
    );
};
