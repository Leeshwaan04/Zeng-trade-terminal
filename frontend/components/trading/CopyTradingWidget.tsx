"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Users, UserPlus, UserMinus, TrendingUp, Shield, Star, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Trader {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    bio: string;
    metrics: {
        returns30d: number;
        returns1y: number;
        sharpe: number;
        winRate: number;
        followers: number;
    };
    tags: string[];
    isVerified: boolean;
    isFollowing?: boolean;
    allocationPercent?: number;
}

interface FollowingEntry {
    traderId: string;
    traderName: string;
    followedAt: string;
    allocationPercent: number;
    isActive: boolean;
}

// Top traders seed data
const TOP_TRADERS: Trader[] = [
    {
        id: "trader-001",
        name: "Ankit Sharma",
        handle: "@ankitAlgo",
        avatar: "AS",
        bio: "Quant trader specialising in options. 8 years on derivatives desk at Edelweiss.",
        metrics: { returns30d: 12.4, returns1y: 87.3, sharpe: 2.31, winRate: 76, followers: 4821 },
        tags: ["options", "quant", "derivatives"],
        isVerified: true,
    },
    {
        id: "trader-002",
        name: "Priya Nair",
        handle: "@pnairFutures",
        avatar: "PN",
        bio: "NIFTY futures momentum trader. Position size discipline over everything.",
        metrics: { returns30d: 8.7, returns1y: 62.1, sharpe: 1.89, winRate: 64, followers: 2903 },
        tags: ["futures", "momentum", "nifty"],
        isVerified: true,
    },
    {
        id: "trader-003",
        name: "Vikram Reddy",
        handle: "@vikramOptions",
        avatar: "VR",
        bio: "Pure premium seller. Iron condors, strangles, calendar spreads only.",
        metrics: { returns30d: 5.2, returns1y: 41.8, sharpe: 3.12, winRate: 88, followers: 6441 },
        tags: ["premium-selling", "options", "conservative"],
        isVerified: true,
    },
    {
        id: "trader-004",
        name: "Deepika Joshi",
        handle: "@deepikaFX",
        avatar: "DJ",
        bio: "Overnight swing trader on large-cap equities. Fundamentals + technical combo.",
        metrics: { returns30d: 9.1, returns1y: 55.4, sharpe: 1.54, winRate: 61, followers: 1872 },
        tags: ["equity", "swing", "large-cap"],
        isVerified: false,
    },
    {
        id: "trader-005",
        name: "Rahul Mehta",
        handle: "@scalperRM",
        avatar: "RM",
        bio: "Intraday scalper. 50+ trades a day. 5-point target, 3-point SL. Pure discipline.",
        metrics: { returns30d: 18.2, returns1y: 112.6, sharpe: 1.22, winRate: 53, followers: 3301 },
        tags: ["scalping", "intraday", "high-frequency"],
        isVerified: false,
    },
];

const AvatarBubble = ({ initials, size = "md" }: { initials: string; size?: "sm" | "md" }) => (
    <div className={cn(
        "rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-black text-white shrink-0",
        size === "md" ? "w-10 h-10 text-xs" : "w-7 h-7 text-[9px]"
    )}>
        {initials}
    </div>
);

export const CopyTradingWidget = () => {
    const [traders] = useState<Trader[]>(TOP_TRADERS);
    const [following, setFollowing] = useState<FollowingEntry[]>([]);
    const [loadingFollow, setLoadingFollow] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"discover" | "following">("discover");
    const [allocation, setAllocation] = useState<Record<string, number>>({});
    const { toast } = useToast();

    const fetchFollowing = useCallback(async () => {
        try {
            const res = await fetch("/api/marketplace/copy");
            const data = await res.json();
            if (data.status === "success") {
                setFollowing(data.data || []);
            }
        } catch { /* redis not configured in dev — ignore */ }
    }, []);

    useEffect(() => { fetchFollowing(); }, [fetchFollowing]);

    const followingIds = new Set(following.map(f => f.traderId));

    const handleFollow = async (trader: Trader) => {
        setLoadingFollow(trader.id);
        const isFollowing = followingIds.has(trader.id);
        try {
            if (isFollowing) {
                await fetch(`/api/marketplace/copy?traderId=${trader.id}`, { method: "DELETE" });
                toast({ title: `Unfollowed ${trader.name}` });
            } else {
                const alloc = allocation[trader.id] || 10;
                await fetch("/api/marketplace/copy", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ traderId: trader.id, traderName: trader.name, allocationPercent: alloc }),
                });
                toast({ title: `Now copying ${trader.name}`, description: `${alloc}% capital allocation` });
            }
            await fetchFollowing();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoadingFollow(null);
        }
    };

    const visibleTraders = activeTab === "following"
        ? traders.filter(t => followingIds.has(t.id))
        : traders;

    return (
        <div className="flex flex-col h-full bg-[#09090b] text-white overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-orange-400 rounded-md flex items-center justify-center">
                        <Users className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-pink-200">Copy Trading</h2>
                </div>
                <div className="flex gap-1 bg-black/40 rounded-lg p-0.5">
                    {(["discover", "following"] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "flex-1 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-colors",
                                activeTab === tab ? "bg-pink-500/20 text-pink-300 border border-pink-500/20" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            {tab === "discover" ? "Discover" : `Following (${following.length})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Trader List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {visibleTraders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-zinc-600">
                        <Users className="w-8 h-8 opacity-20 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {activeTab === "following" ? "Not following anyone yet" : "No traders found"}
                        </span>
                    </div>
                ) : (
                    visibleTraders.map(trader => {
                        const isFollowing = followingIds.has(trader.id);
                        const followEntry = following.find(f => f.traderId === trader.id);
                        return (
                            <div
                                key={trader.id}
                                className={cn(
                                    "p-3 rounded-xl border transition-all",
                                    isFollowing ? "border-pink-500/30 bg-pink-500/5" : "border-white/5 bg-zinc-900/40"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <AvatarBubble initials={trader.avatar} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[11px] font-black text-white">{trader.name}</span>
                                            {trader.isVerified && <Shield className="w-3 h-3 text-primary" />}
                                        </div>
                                        <span className="text-[9px] text-zinc-500">{trader.handle}</span>
                                        <p className="text-[9px] text-zinc-600 mt-1 leading-relaxed line-clamp-2">{trader.bio}</p>

                                        {/* Metrics Row */}
                                        <div className="flex gap-3 mt-2">
                                            <div className="flex flex-col">
                                                <span className={cn("text-[10px] font-black tabular-nums", trader.metrics.returns30d >= 0 ? "text-up" : "text-down")}>
                                                    {trader.metrics.returns30d >= 0 ? "+" : ""}{trader.metrics.returns30d}%
                                                </span>
                                                <span className="text-[7px] font-black text-zinc-600 uppercase">30D</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={cn("text-[10px] font-black tabular-nums", trader.metrics.returns1y >= 0 ? "text-up" : "text-down")}>
                                                    {trader.metrics.returns1y >= 0 ? "+" : ""}{trader.metrics.returns1y}%
                                                </span>
                                                <span className="text-[7px] font-black text-zinc-600 uppercase">1Y</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-primary tabular-nums">{trader.metrics.winRate}%</span>
                                                <span className="text-[7px] font-black text-zinc-600 uppercase">Win%</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-zinc-300 tabular-nums">{trader.metrics.sharpe}</span>
                                                <span className="text-[7px] font-black text-zinc-600 uppercase">Sharpe</span>
                                            </div>
                                        </div>

                                        {/* Allocation Slider (when following) */}
                                        {isFollowing && followEntry && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-[8px] font-black text-zinc-500 uppercase">Allocation</span>
                                                <span className="text-[10px] font-black text-pink-400">{followEntry.allocationPercent}%</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <div className="flex items-center gap-1 text-[9px] text-zinc-500">
                                            <Users className="w-3 h-3" />
                                            {trader.metrics.followers.toLocaleString()}
                                        </div>
                                        {!isFollowing && (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={100}
                                                    value={allocation[trader.id] || 10}
                                                    onChange={e => setAllocation(prev => ({ ...prev, [trader.id]: parseInt(e.target.value) || 10 }))}
                                                    onClick={e => e.stopPropagation()}
                                                    className="w-10 bg-black/40 border border-white/5 rounded px-1 py-0.5 text-[10px] font-mono text-white text-center focus:outline-none"
                                                />
                                                <span className="text-[8px] text-zinc-600">%</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleFollow(trader)}
                                            disabled={loadingFollow === trader.id}
                                            className={cn(
                                                "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-colors disabled:opacity-50",
                                                isFollowing
                                                    ? "bg-zinc-800 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 border border-white/5"
                                                    : "bg-pink-500/20 text-pink-300 border border-pink-500/30 hover:bg-pink-500/30"
                                            )}
                                        >
                                            {loadingFollow === trader.id ? (
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : isFollowing ? (
                                                <><UserMinus className="w-3 h-3" /> Unfollow</>
                                            ) : (
                                                <><UserPlus className="w-3 h-3" /> Copy</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
