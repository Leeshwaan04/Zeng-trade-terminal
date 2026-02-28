"use client";

import React, { useState } from "react";
import { useOrderStore } from "@/hooks/useOrderStore";
import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";
import {
    LayoutList,
    ArrowUpRight,
    ArrowDownRight,
    History,
    Wallet,
    Activity,
    XCircle,
    CheckCircle2
} from "lucide-react";

type TabType = "POSITIONS" | "ORDERS" | "SUMMARY" | "LOGS";

export const AccountManager = () => {
    const [activeTab, setActiveTab] = useState<TabType>("POSITIONS");
    const { positions, orders, cancelOrder, dailyPnL, marginAvailable } = useOrderStore();
    const { tickers } = useMarketStore();

    const tabs = [
        { id: "POSITIONS", label: "Positions", icon: Activity, count: positions.length },
        { id: "ORDERS", label: "Orders", icon: LayoutList, count: orders.filter(o => o.status === 'OPEN').length },
        { id: "SUMMARY", label: "Account Summary", icon: Wallet },
        { id: "LOGS", label: "Trading Logs", icon: History },
    ];

    return (
        <div className="flex flex-col h-full w-full bg-background/90 backdrop-blur-3xl border-t border-border select-none overflow-hidden text-numeral">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between px-4 h-9 border-b border-border bg-surface-1">
                <div className="flex items-center gap-1 h-full">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={cn(
                                "flex items-center gap-2 px-3 h-full text-[11px] font-bold transition-all relative group",
                                activeTab === tab.id
                                    ? "text-primary basis-auto"
                                    : "text-muted-foreground hover:text-white"
                            )}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] min-w-[16px] text-center">
                                    {tab.count}
                                </span>
                            )}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_var(--primary)]" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Daily P&L</span>
                        <span className={cn(
                            "text-[11px] font-bold",
                            dailyPnL >= 0 ? "text-up" : "text-down"
                        )}>
                            ₹{dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="w-[1px] h-4 bg-border" />
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Available</span>
                        <span className="text-[11px] font-bold text-foreground">
                            ₹{marginAvailable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {activeTab === "POSITIONS" && (
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="sticky top-0 bg-surface-1 z-10">
                            <tr className="border-b border-border">
                                <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase">Instrument</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase">Qty</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase text-right">Avg. Price</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase text-right">LTP</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase text-right">M2M / P&L</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {positions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-xs italic">
                                        No active positions. Execute a trade to see it here.
                                    </td>
                                </tr>
                            ) : (
                                positions.map(pos => {
                                    const ltp = tickers[pos.symbol]?.last_price || pos.last_price;
                                    const pnl = (ltp - pos.average_price) * pos.quantity;
                                    const isUp = pnl >= 0;

                                    return (
                                        <tr key={pos.symbol} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-4 py-2">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-foreground leading-tight">{pos.symbol}</span>
                                                    <span className="text-[9px] text-muted-foreground uppercase tracking-tighter">{pos.product}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={cn(
                                                    "text-xs font-bold px-1.5 py-0.5 rounded",
                                                    pos.quantity > 0 ? "bg-up/10 text-up" : "bg-down/10 text-down"
                                                )}>
                                                    {pos.quantity > 0 ? "+" : ""}{pos.quantity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-right text-xs text-foreground">₹{pos.average_price.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right text-xs font-bold text-foreground">₹{ltp.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={cn("text-xs font-black", isUp ? "text-up" : "text-down")}>
                                                        {isUp ? "+" : ""}₹{pnl.toFixed(2)}
                                                    </span>
                                                    <span className={cn("text-[9px] font-bold", isUp ? "text-up/60" : "text-down/60")}>
                                                        {((pnl / (pos.average_price * Math.abs(pos.quantity))) * 100).toFixed(2)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <button className="px-2 py-1 rounded bg-white/5 hover:bg-down/20 border border-white/10 hover:border-down/30 text-[9px] font-bold text-muted-foreground hover:text-down transition-all">
                                                    EXIT
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}

                {activeTab === "ORDERS" && (
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="sticky top-0 bg-surface-1 z-10">
                            <tr className="border-b border-border">
                                <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase">Time</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase">Type</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase">Instrument</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase">Qty</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase text-right">Price</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase text-right">Status</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-xs italic">
                                        No orders found in recent history.
                                    </td>
                                </tr>
                            ) : (
                                orders.map(order => (
                                    <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-4 py-2 text-[10px] text-muted-foreground">
                                            {new Date(order.timestamp).toLocaleTimeString()}
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded text-[9px] font-black",
                                                    order.transactionType === 'BUY' ? "bg-up/10 text-up" : "bg-down/10 text-down"
                                                )}>
                                                    {order.transactionType}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-mono">{order.orderType}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-xs font-bold text-white">{order.symbol}</td>
                                        <td className="px-4 py-2 text-xs text-white">{order.qty}</td>
                                        <td className="px-4 py-2 text-right text-xs text-white">
                                            ₹{order.price === 0 ? "MKT" : order.price.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {order.status === 'EXECUTED' ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-up" />
                                                ) : order.status === 'CANCELLED' || order.status === 'REJECTED' ? (
                                                    <XCircle className="w-3.5 h-3.5 text-down" />
                                                ) : (
                                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                )}
                                                <span className={cn(
                                                    "text-[10px] font-bold uppercase",
                                                    order.status === 'EXECUTED' ? "text-up" :
                                                        (order.status === 'CANCELLED' || order.status === 'REJECTED') ? "text-down" : "text-primary"
                                                )}>
                                                    {order.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {order.status === 'OPEN' && (
                                                <button
                                                    onClick={() => cancelOrder(order.id)}
                                                    className="px-2 py-1 rounded bg-white/5 hover:bg-down/20 border border-white/10 hover:border-down/30 text-[9px] font-bold text-muted-foreground hover:text-down transition-all"
                                                >
                                                    CANCEL
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
