"use client";

import React, { useState, useMemo } from "react";
import { Search, X, Zap, TrendingUp, Activity, BarChart2 } from "lucide-react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { useDrawingStore } from "@/hooks/useDrawingStore";
import { cn } from "@/lib/utils";

const INDICATOR_LIBRARY = [
    { id: "SMA", name: "SMA (Simple Moving Average)", type: "SMA", icon: TrendingUp, category: "Trend" },
    { id: "EMA", name: "EMA (Exponential Moving Average)", type: "EMA", icon: TrendingUp, category: "Trend" },
    { id: "RSI", name: "RSI (Relative Strength Index)", type: "RSI", icon: Activity, category: "Oscillator" },
    { id: "VWAP", name: "VWAP (Volume Weighted Avg Price)", type: "VWAP", icon: BarChart2, category: "Volume" },
    { id: "BB", name: "Bollinger Bands", type: "BB", icon: Activity, category: "Volatility", disabled: true },
    { id: "MACD", name: "MACD", type: "MACD", icon: Activity, category: "Oscillator", disabled: true },
];

export const IndicatorSearchDialog = () => {
    const { indicatorsOpen, setIndicatorsOpen } = useLayoutStore();
    const { addIndicator } = useDrawingStore();
    const [search, setSearch] = useState("");

    const filtered = useMemo(() =>
        INDICATOR_LIBRARY.filter(i =>
            i.name.toLowerCase().includes(search.toLowerCase()) ||
            i.category.toLowerCase().includes(search.toLowerCase())
        ), [search]
    );

    if (!indicatorsOpen) return null;

    const handleAdd = (indicator: any) => {
        if (indicator.disabled) return;

        addIndicator({
            type: indicator.type,
            period: indicator.type === 'RSI' ? 14 : 20,
            color: indicator.type === 'RSI' ? '#a855f7' : indicator.type === 'EMA' ? '#ec4899' : '#3b82f6',
            visible: true,
            settings: indicator.type === 'RSI' ? { overbought: 70, oversold: 30 } : undefined
        });
        setIndicatorsOpen(false);
    };

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setIndicatorsOpen(false)}
        >
            <div
                className="w-[500px] max-h-[600px] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
                    <Zap className="w-5 h-5 text-primary" />
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search indicators..."
                            className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground outline-none focus:border-primary/40 transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIndicatorsOpen(false)}
                        className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {filtered.map((item) => (
                        <button
                            key={item.id}
                            disabled={item.disabled}
                            onClick={() => handleAdd(item)}
                            className={cn(
                                "w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left transition-all group",
                                item.disabled
                                    ? "opacity-40 cursor-not-allowed"
                                    : "hover:bg-muted active:scale-[0.98]"
                            )}
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center border border-border transition-colors",
                                !item.disabled && "group-hover:border-primary/30 group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary"
                            )}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    {item.name}
                                    {item.disabled && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">COMMING SOON</span>}
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{item.category}</div>
                            </div>
                        </button>
                    ))}

                    {filtered.length === 0 && (
                        <div className="py-12 text-center text-zinc-500 italic text-sm">
                            No indicators found for "{search}"
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-border bg-muted/30 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium">ZEN G PRO INDICATOR ENGINE v1.0</p>
                </div>
            </div>
        </div>
    );
};
