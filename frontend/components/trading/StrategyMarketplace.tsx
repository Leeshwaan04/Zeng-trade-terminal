"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Search, Star, TrendingUp, Users, ShieldCheck, Zap, RefreshCw, CheckCircle, ChevronRight, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Strategy {
    id: string;
    name: string;
    author: string;
    authorId: string;
    description: string;
    tags: string[];
    metrics: {
        cagr: number;
        sharpe: number;
        maxDrawdown: number;
        winRate: number;
        totalTrades: number;
    };
    subscribers: number;
    price: number;
    pricePeriod: string;
    category: string;
    risk: "LOW" | "MEDIUM" | "HIGH";
    createdAt: string;
    isVerified: boolean;
    isSubscribed?: boolean;
}

const RISK_COLORS = {
    LOW: "text-up bg-up/10 border-up/20",
    MEDIUM: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    HIGH: "text-down bg-down/10 border-down/20",
};

const CATEGORIES = ["All", "Options", "Equity", "Futures"];
const RISKS = ["All", "LOW", "MEDIUM", "HIGH"];

const MetricBadge = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
    <div className="flex flex-col items-center bg-black/40 rounded-lg p-2 min-w-[60px]">
        <span className={cn("text-[11px] font-black tabular-nums", color || "text-white")}>{value}</span>
        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
);

export const StrategyMarketplace = () => {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [risk, setRisk] = useState("All");
    const [subscribing, setSubscribing] = useState<string | null>(null);
    const [selected, setSelected] = useState<Strategy | null>(null);
    const { toast } = useToast();

    const fetchStrategies = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (category !== "All") params.set("category", category);
            if (risk !== "All") params.set("risk", risk);
            if (search) params.set("q", search);

            const res = await fetch(`/api/marketplace/strategies?${params}`);
            const data = await res.json();
            if (data.status === "success") {
                setStrategies(data.data);
            }
        } catch (err) {
            console.error("[Marketplace] Fetch failed:", err);
        } finally {
            setLoading(false);
        }
    }, [category, risk, search]);

    useEffect(() => {
        const debounce = setTimeout(fetchStrategies, 300);
        return () => clearTimeout(debounce);
    }, [fetchStrategies]);

    const handleSubscribe = async (strategy: Strategy) => {
        setSubscribing(strategy.id);
        try {
            const method = strategy.isSubscribed ? "DELETE" : "POST";
            const url = strategy.isSubscribed
                ? `/api/marketplace/subscribe?strategyId=${strategy.id}`
                : "/api/marketplace/subscribe";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                ...(method === "POST" ? { body: JSON.stringify({ strategyId: strategy.id }) } : {}),
            });
            const data = await res.json();

            if (data.status === "success") {
                toast({
                    title: strategy.isSubscribed ? "Unsubscribed" : "Subscribed! ✅",
                    description: strategy.isSubscribed
                        ? `You've unsubscribed from "${strategy.name}"`
                        : `You're now following "${strategy.name}"`,
                });
                setStrategies(prev => prev.map(s =>
                    s.id === strategy.id ? { ...s, isSubscribed: !s.isSubscribed, subscribers: s.subscribers + (s.isSubscribed ? -1 : 1) } : s
                ));
                if (selected?.id === strategy.id) {
                    setSelected(prev => prev ? { ...prev, isSubscribed: !prev.isSubscribed } : null);
                }
            } else {
                throw new Error(data.error || "Failed");
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setSubscribing(null);
        }
    };

    return (
        <div className="flex h-full bg-[#09090b] text-white overflow-hidden">
            {/* Left Panel - Strategy List */}
            <div className={cn("flex flex-col shrink-0 border-r border-white/5 transition-all", selected ? "w-[55%]" : "w-full")}>
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-md flex items-center justify-center">
                            <BarChart2 className="w-3.5 h-3.5 text-white" />
                        </div>
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-purple-200">Strategy Marketplace</h2>
                        <span className="ml-auto text-[9px] font-black text-zinc-500 uppercase">{strategies.length} available</span>
                    </div>

                    {/* Search */}
                    <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search strategies..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/40"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2">
                        <div className="flex gap-1 overflow-x-auto hide-scrollbar">
                            {CATEGORIES.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setCategory(c)}
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 transition-colors",
                                        category === c ? "bg-purple-500/30 text-purple-300 border border-purple-500/30" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                                    )}
                                >{c}</button>
                            ))}
                        </div>
                        <div className="h-4 w-[1px] bg-white/5 self-center shrink-0" />
                        <div className="flex gap-1 overflow-x-auto hide-scrollbar">
                            {RISKS.map(r => (
                                <button
                                    key={r}
                                    onClick={() => setRisk(r)}
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 transition-colors",
                                        risk === r ? "bg-zinc-700 text-white" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                                    )}
                                >{r === "All" ? "All Risk" : r}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Strategy List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="w-6 h-6 rounded-full border border-purple-500/30 border-t-purple-400 animate-spin" />
                        </div>
                    ) : strategies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-zinc-600">
                            <Search className="w-8 h-8 opacity-20 mb-2" />
                            <span className="text-[10px] font-black uppercase tracking-widest">No strategies found</span>
                        </div>
                    ) : (
                        <div className="p-2 space-y-2">
                            {strategies.map(strategy => (
                                <div
                                    key={strategy.id}
                                    onClick={() => setSelected(selected?.id === strategy.id ? null : strategy)}
                                    className={cn(
                                        "group relative p-3 rounded-xl border cursor-pointer transition-all",
                                        selected?.id === strategy.id
                                            ? "border-purple-500/50 bg-purple-500/10"
                                            : "border-white/5 bg-zinc-900/40 hover:border-white/10 hover:bg-zinc-900/60"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black text-white truncate">{strategy.name}</span>
                                                {strategy.isVerified && (
                                                    <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
                                                )}
                                                {strategy.isSubscribed && (
                                                    <CheckCircle className="w-3 h-3 text-up shrink-0" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[9px] text-zinc-500">by <span className="text-zinc-300">{strategy.author}</span></span>
                                                <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded border", RISK_COLORS[strategy.risk])}>
                                                    {strategy.risk}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                <MetricBadge label="CAGR" value={`${strategy.metrics.cagr}%`} color="text-up" />
                                                <MetricBadge label="Sharpe" value={strategy.metrics.sharpe.toFixed(2)} color="text-primary" />
                                                <MetricBadge label="Win%" value={`${strategy.metrics.winRate}%`} />
                                                <MetricBadge label="MaxDD" value={`${strategy.metrics.maxDrawdown}%`} color="text-down" />
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <div className="text-right">
                                                <span className="text-[11px] font-black text-white">₹{strategy.price}</span>
                                                <span className="text-[8px] text-zinc-500">/{strategy.pricePeriod}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[9px] text-zinc-500">
                                                <Users className="w-3 h-3" />
                                                {strategy.subscribers.toLocaleString()}
                                            </div>
                                            <button
                                                onClick={e => { e.stopPropagation(); handleSubscribe(strategy); }}
                                                disabled={subscribing === strategy.id}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-colors disabled:opacity-50",
                                                    strategy.isSubscribed
                                                        ? "bg-up/20 text-up border border-up/30 hover:bg-up/30"
                                                        : "bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
                                                )}
                                            >
                                                {subscribing === strategy.id ? "..." : strategy.isSubscribed ? "✓ Following" : "Subscribe"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Strategy Detail */}
            {selected && (
                <div className="flex-1 flex flex-col overflow-hidden border-l border-white/5">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setSelected(null)}
                            className="p-1 text-zinc-500 hover:text-white transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 rotate-180" />
                        </button>
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Strategy Details</span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                        <div>
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h3 className="text-base font-black text-white flex items-center gap-2">
                                        {selected.name}
                                        {selected.isVerified && <ShieldCheck className="w-4 h-4 text-primary" />}
                                    </h3>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">
                                        by <span className="text-zinc-300">{selected.author}</span> · {selected.category} · Since {selected.createdAt}
                                    </p>
                                </div>
                                <span className={cn("text-[9px] font-black px-2 py-1 rounded-lg border", RISK_COLORS[selected.risk])}>
                                    {selected.risk} RISK
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">{selected.description}</p>
                        </div>

                        {/* Full Metrics Grid */}
                        <div>
                            <h4 className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2">Performance Metrics</h4>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-zinc-900/60 rounded-lg p-3 border border-white/5">
                                    <span className="text-[9px] font-black text-zinc-500 block mb-1">CAGR</span>
                                    <span className="text-lg font-black text-up">{selected.metrics.cagr}%</span>
                                </div>
                                <div className="bg-zinc-900/60 rounded-lg p-3 border border-white/5">
                                    <span className="text-[9px] font-black text-zinc-500 block mb-1">Sharpe Ratio</span>
                                    <span className="text-lg font-black text-primary">{selected.metrics.sharpe}</span>
                                </div>
                                <div className="bg-zinc-900/60 rounded-lg p-3 border border-white/5">
                                    <span className="text-[9px] font-black text-zinc-500 block mb-1">Win Rate</span>
                                    <span className="text-lg font-black text-white">{selected.metrics.winRate}%</span>
                                </div>
                                <div className="bg-zinc-900/60 rounded-lg p-3 border border-white/5">
                                    <span className="text-[9px] font-black text-zinc-500 block mb-1">Max Drawdown</span>
                                    <span className="text-lg font-black text-down">{selected.metrics.maxDrawdown}%</span>
                                </div>
                                <div className="bg-zinc-900/60 rounded-lg p-3 border border-white/5">
                                    <span className="text-[9px] font-black text-zinc-500 block mb-1">Total Trades</span>
                                    <span className="text-lg font-black text-white">{selected.metrics.totalTrades.toLocaleString()}</span>
                                </div>
                                <div className="bg-zinc-900/60 rounded-lg p-3 border border-white/5">
                                    <span className="text-[9px] font-black text-zinc-500 block mb-1">Subscribers</span>
                                    <span className="text-lg font-black text-purple-400">{selected.subscribers.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <h4 className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2">Tags</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {selected.tags.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-[9px] font-black uppercase border border-white/5">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Subscribe CTA */}
                        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-2xl font-black text-white">₹{selected.price}</span>
                                    <span className="text-[10px] text-zinc-500">/{selected.pricePeriod}</span>
                                </div>
                                <button
                                    onClick={() => handleSubscribe(selected)}
                                    disabled={subscribing === selected.id}
                                    className={cn(
                                        "px-6 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all disabled:opacity-50",
                                        selected.isSubscribed
                                            ? "bg-up/20 text-up border border-up/40 hover:bg-up/30"
                                            : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                                    )}
                                >
                                    {subscribing === selected.id ? "Processing..." : selected.isSubscribed ? "✓ Following" : "Subscribe Now"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
