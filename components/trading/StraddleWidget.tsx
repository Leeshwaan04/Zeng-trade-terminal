"use client";

import React, { useState, useEffect } from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { useAuthStore } from "@/hooks/useAuthStore";
import { cn } from "@/lib/utils";
import {
    Activity,
    ChevronDown,
    Calendar,
    TrendingUp,
    Zap,
    Info,
    RefreshCcw
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts";

const INDICES = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY"];
const EXPIRIES = ["27 MAR 2026", "03 APR 2026", "10 APR 2026"];

export const StraddleWidget = () => {
    const [underlying, setUnderlying] = useState("NIFTY");
    const [expiry, setExpiry] = useState(EXPIRIES[0]);
    const [strike, setStrike] = useState<number | null>(null);
    const [history, setHistory] = useState<any[]>([]);

    const { tickers } = useMarketStore();
    const spot = tickers[underlying]?.last_price || 0;

    // Derived ATM Strike
    useEffect(() => {
        if (spot > 0) {
            const step = underlying === "NIFTY" ? 50 : 100;
            const atm = Math.round(spot / step) * step;
            if (strike === null) setStrike(atm);
        }
    }, [spot, underlying, strike]);

    // Mock Premium Stream (Aggregated CE+PE)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

            setHistory(prev => {
                const lastVal = prev.length > 0 ? prev[prev.length - 1].value : 250;
                const change = (Math.random() - 0.5) * 5;
                const newVal = Math.max(100, lastVal + change);

                return [...prev.slice(-29), {
                    time,
                    value: newVal,
                    spot: spot + (Math.random() - 0.5) * 2
                }];
            });
        }, 2000);
        return () => clearInterval(interval);
    }, [spot]);

    const currentStraddlePrice = history.length > 0 ? history[history.length - 1].value : 0;

    return (
        <div className="flex flex-col h-full bg-[#0a0f18] font-sans">
            {/* Straddle Navbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] bg-white/[0.03]">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2 py-1 rounded-sm">
                        <Zap className="w-3 h-3 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Straddle Tracker</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Underlying Select */}
                        <div className="relative group">
                            <button className="flex items-center gap-2 px-2 py-1 bg-white/[0.05] border border-white/5 rounded-sm hover:bg-white/[0.08] transition-all">
                                <span className="text-[10px] font-bold text-white/80">{underlying}</span>
                                <ChevronDown className="w-3 h-3 text-zinc-600" />
                            </button>
                        </div>

                        {/* Expiry Select */}
                        <div className="relative group">
                            <button className="flex items-center gap-2 px-2 py-1 bg-white/[0.05] border border-white/5 rounded-sm hover:bg-white/[0.08] transition-all">
                                <Calendar className="w-3 h-3 text-zinc-500" />
                                <span className="text-[10px] font-bold text-white/80">{expiry}</span>
                                <ChevronDown className="w-3 h-3 text-zinc-600" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end leading-none">
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter">Spot Price</span>
                        <span className="text-[11px] font-mono font-black text-white">{spot.toFixed(2)}</span>
                    </div>
                    <button className="p-1.5 text-zinc-600 hover:text-white transition-colors">
                        <RefreshCcw className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Main Straddle Analytics */}
            <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
                {/* Dashboard Metrics */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/[0.02] border border-white/5 p-2 rounded-md">
                        <span className="text-[7.5px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Straddle Price (ATM)</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-mono font-black text-primary text-glow">₹{currentStraddlePrice.toFixed(2)}</span>
                            <span className="text-[9px] font-bold text-up">+2.4%</span>
                        </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-2 rounded-md">
                        <span className="text-[7.5px] font-black text-zinc-600 uppercase tracking-widest block mb-1">ATM Strike</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-mono font-black text-white/90">{strike}</span>
                            <span className="text-[9px] font-bold text-zinc-500">CE+PE</span>
                        </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 p-2 rounded-md">
                        <span className="text-[7.5px] font-black text-zinc-600 uppercase tracking-widest block mb-1">IV Sensitivity</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-mono font-black text-amber-500">14.8</span>
                            <span className="text-[9px] font-bold text-zinc-500">High</span>
                        </div>
                    </div>
                </div>

                {/* Combined Premium Chart */}
                <div className="flex-1 min-h-0 bg-[#0c0f13] rounded-lg border border-white/[0.05] p-2 relative">
                    <div className="absolute top-3 left-4 z-10">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Premium Sum (Decay Tracking)</span>
                        </div>
                    </div>

                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history}>
                            <defs>
                                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="time"
                                hide
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                hide
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0c0f16', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
                                itemStyle={{ color: '#3b82f6' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorVal)"
                                isAnimationActive={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="spot"
                                stroke="#64748b"
                                strokeWidth={1}
                                strokeDasharray="3 3"
                                dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Footer Insights */}
            <div className="px-3 py-1.5 border-t border-white/[0.05] bg-black/40 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[7.5px] font-black text-zinc-700 uppercase tracking-widest">Theta Decay</span>
                        <span className="text-[9px] font-mono font-black text-down">-$4.2/hr</span>
                    </div>
                    <div className="w-px h-3 bg-white/5" />
                    <div className="flex items-center gap-1.5">
                        <span className="text-[7.5px] font-black text-zinc-700 uppercase tracking-widest">Synthetic Fut</span>
                        <span className="text-[9px] font-mono font-black text-zinc-500">25482.10</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-[8px] text-zinc-800 italic">
                    <Info className="w-2.5 h-2.5" />
                    Live 915 Calculation Cycle
                </div>
            </div>
        </div>
    );
};
