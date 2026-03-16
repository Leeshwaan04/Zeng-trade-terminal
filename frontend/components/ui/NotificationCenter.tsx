"use client";

import React, { useState, useCallback } from "react";
import { create } from "zustand";
import { Bell, X, CheckCheck, TrendingUp, ShieldAlert, Zap, Info, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Notification Store ─────────────────────────────────────────────────────

export type NotifCategory = "order" | "alert" | "strategy" | "system";

export interface Notification {
    id: string;
    category: NotifCategory;
    title: string;
    body: string;
    timestamp: number;
    read: boolean;
}

interface NotifState {
    notifications: Notification[];
    push: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    clear: (id: string) => void;
    clearAll: () => void;
}

export const useNotifStore = create<NotifState>((set) => ({
    notifications: [
        // Seed demo notifications
        { id: "d1", category: "order",    title: "Order Filled",         body: "BUY 50 NIFTY @ 22,450 executed",           timestamp: Date.now() - 60000 * 3,  read: false },
        { id: "d2", category: "alert",    title: "Price Alert Triggered", body: "BANKNIFTY crossed ₹48,000",               timestamp: Date.now() - 60000 * 8,  read: false },
        { id: "d3", category: "strategy", title: "Strategy Signal",       body: "RSI+VWAP strategy fired BUY on NIFTY CE", timestamp: Date.now() - 60000 * 15, read: true  },
        { id: "d4", category: "system",   title: "Connection Restored",   body: "Kite WebSocket reconnected successfully",  timestamp: Date.now() - 60000 * 22, read: true  },
    ],
    push: (n) => set(state => ({
        notifications: [
            { ...n, id: Math.random().toString(36).slice(2), timestamp: Date.now(), read: false },
            ...state.notifications,
        ]
    })),
    markRead: (id) => set(state => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    })),
    markAllRead: () => set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read: true }))
    })),
    clear: (id) => set(state => ({
        notifications: state.notifications.filter(n => n.id !== id)
    })),
    clearAll: () => set({ notifications: [] }),
}));

// ─── Helper ──────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<NotifCategory, { icon: React.ReactNode; color: string; bg: string }> = {
    order:    { icon: <TrendingUp className="w-3.5 h-3.5" />, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
    alert:    { icon: <Zap className="w-3.5 h-3.5" />,         color: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/20"   },
    strategy: { icon: <ShieldAlert className="w-3.5 h-3.5" />, color: "text-cyan-400",    bg: "bg-cyan-400/10 border-cyan-400/20"     },
    system:   { icon: <Info className="w-3.5 h-3.5" />,        color: "text-zinc-400",    bg: "bg-zinc-400/10 border-zinc-400/20"     },
};

function timeAgo(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h`;
}

const ALL_CATEGORIES: NotifCategory[] = ["order", "alert", "strategy", "system"];

// ─── Notification Bell (header button) ────────────────────────────────────

export const NotificationBell = () => {
    const [open, setOpen] = useState(false);
    const unread = useNotifStore(s => s.notifications.filter(n => !n.read).length);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "relative flex items-center justify-center w-8 h-8 rounded-full border transition-all",
                    open
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                )}
            >
                <Bell className="w-3.5 h-3.5" />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center leading-none">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            {open && <NotificationPanel onClose={() => setOpen(false)} />}
        </div>
    );
};

// ─── Notification Panel ───────────────────────────────────────────────────

const NotificationPanel = ({ onClose }: { onClose: () => void }) => {
    const { notifications, markRead, markAllRead, clear, clearAll } = useNotifStore();
    const [activeFilter, setActiveFilter] = useState<NotifCategory | "all">("all");

    const filtered = notifications.filter(n =>
        activeFilter === "all" || n.category === activeFilter
    );
    const unread = notifications.filter(n => !n.read).length;

    const handleMarkRead = useCallback((id: string) => markRead(id), [markRead]);

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[90]" onClick={onClose} />

            <div className={cn(
                "absolute right-0 top-full mt-2 w-[340px] z-[91] rounded-xl border shadow-2xl overflow-hidden",
                "bg-zinc-950 border-zinc-800",
                "animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150"
            )}>
                {/* Panel Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
                    <div className="flex items-center gap-2">
                        <Bell className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-white">Notifications</span>
                        {unread > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[8px] font-black border border-red-500/20">
                                {unread} new
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {unread > 0 && (
                            <button
                                type="button"
                                onClick={markAllRead}
                                className="flex items-center gap-1 text-[8px] text-zinc-400 hover:text-white font-bold uppercase tracking-widest transition-colors"
                            >
                                <CheckCheck className="w-3 h-3" />
                                Mark all read
                            </button>
                        )}
                        <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Category Filters */}
                <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-800/60 overflow-x-auto no-scrollbar">
                    {(["all", ...ALL_CATEGORIES] as const).map((cat) => {
                        const count = cat === "all"
                            ? notifications.length
                            : notifications.filter(n => n.category === cat).length;
                        return (
                            <button
                                type="button"
                                key={cat}
                                onClick={() => setActiveFilter(cat)}
                                className={cn(
                                    "shrink-0 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all border",
                                    activeFilter === cat
                                        ? "bg-primary/10 border-primary/40 text-primary"
                                        : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                                )}
                            >
                                {cat} {count > 0 && <span className="ml-0.5 opacity-60">({count})</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Feed */}
                <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
                            <Bell className="w-6 h-6 mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">No notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800/60">
                            {filtered.map((n) => {
                                const meta = CATEGORY_META[n.category];
                                return (
                                    <div
                                        key={n.id}
                                        onClick={() => handleMarkRead(n.id)}
                                        className={cn(
                                            "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors group",
                                            n.read ? "opacity-50 hover:opacity-70" : "hover:bg-white/[0.03]",
                                            !n.read && "bg-white/[0.02]"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div className={cn("mt-0.5 p-1.5 rounded-lg border shrink-0", meta.bg, meta.color)}>
                                            {meta.icon}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn(
                                                    "text-[10px] font-black leading-tight",
                                                    n.read ? "text-zinc-400" : "text-white"
                                                )}>
                                                    {n.title}
                                                </p>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="text-[8px] text-zinc-600 font-mono">{timeAgo(n.timestamp)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); clear(n.id); }}
                                                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-all"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-zinc-500 mt-0.5 leading-relaxed">{n.body}</p>
                                        </div>

                                        {/* Unread dot */}
                                        {!n.read && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="flex items-center justify-end px-4 py-2 border-t border-zinc-800 bg-zinc-900/50">
                        <button
                            type="button"
                            onClick={clearAll}
                            className="text-[8px] font-black text-zinc-600 hover:text-red-400 uppercase tracking-widest transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};
