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
    const { positions, orders, cancelOrder, dailyPnL, marginAvailable, closePosition } = useOrderStore();
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
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] text-muted-foreground uppercase tracking-tighter">{pos.product}</span>
                                                        {pos.broker && (
                                                            <span className={cn(
                                                                "text-[6px] font-black px-1 rounded-sm uppercase tracking-tighter border",
                                                                pos.broker === "KITE" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                                    pos.broker === "DHAN" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                                        pos.broker === "FYERS" ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" :
                                                                            "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                            )}>
                                                                {pos.broker.substring(0, 1)}
                                                            </span>
                                                        )}
                                                    </div>
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
                                                <button
                                                    onClick={() => closePosition(pos.symbol, ltp)}
                                                    className="px-2 py-1 rounded bg-white/5 hover:bg-down/20 border border-white/10 hover:border-down/30 text-[9px] font-bold text-muted-foreground hover:text-down transition-all"
                                                >
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
                                        <td className="px-4 py-2 text-xs font-bold text-white">
                                            <div className="flex items-center gap-1.5">
                                                <span>{order.symbol}</span>
                                                {order.broker && (
                                                    <span className={cn(
                                                        "text-[6px] font-black px-1 rounded-sm uppercase tracking-tighter border",
                                                        order.broker === "KITE" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                            order.broker === "DHAN" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                                order.broker === "FYERS" ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" :
                                                                    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                    )}>
                                                        {order.broker.substring(0, 1)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
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

                {activeTab === "SUMMARY" && (
                    <div className="p-6 max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-2 gap-6">
                            <SummaryCard label="Available Margin" value={`₹${marginAvailable.toLocaleString()}`} highlight />
                            <SummaryCard label="Margin Used" value={`₹${(500000 - marginAvailable + dailyPnL).toLocaleString()}`} />
                            <SummaryCard label="Realised P&L" value={`₹${positions.reduce((a, p) => a + p.realised, 0).toLocaleString()}`} color={positions.reduce((a, p) => a + p.realised, 0) >= 0 ? "text-up" : "text-down"} />
                            <SummaryCard label="Unrealised P&L" value={`₹${positions.reduce((a, p) => a + p.unrealised, 0).toLocaleString()}`} color={positions.reduce((a, p) => a + p.unrealised, 0) >= 0 ? "text-up" : "text-down"} />
                        </div>

                        <div className="bg-surface-1 border border-border rounded-xl p-4">
                            <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-4 tracking-widest">Broker Limits & Cap</h4>
                            <div className="space-y-3">
                                <LimitRow label="Max Order Value" value="₹25,00,000" />
                                <LimitRow label="Daily Loss Limit" value="₹1,00,000" />
                                <LimitRow label="Max Open Positions" value="20" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "LOGS" && (
                    <div className="p-4 space-y-2">
                        {orders.length === 0 ? (
                            <div className="py-20 text-center text-xs text-muted-foreground italic">No system logs for this session.</div>
                        ) : (
                            orders.map((log, i) => (
                                <div key={i} className="flex items-center gap-4 p-2 bg-surface-1/50 border border-border/30 rounded text-[10px] font-mono">
                                    <span className="text-muted-foreground">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                    <span className={cn("font-bold uppercase", log.status === 'EXECUTED' ? "text-up" : "text-down")}>
                                        {log.status}
                                    </span>
                                    <span className="text-foreground">
                                        {log.transactionType} {log.qty} {log.symbol} @ {log.price || "MARKET"}
                                    </span>
                                    {log.broker && (
                                        <span className={cn(
                                            "text-[7px] font-black px-1 rounded-sm uppercase tracking-tighter border",
                                            log.broker === "KITE" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                log.broker === "DHAN" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                    log.broker === "FYERS" ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" :
                                                        "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                        )}>
                                            {log.broker}
                                        </span>
                                    )}
                                    <div className="flex-1 px-4 border-l border-border/20 text-muted-foreground truncate italic">
                                        Routing via institutional gateway... success.
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const SummaryCard = ({ label, value, highlight, color }: any) => (
    <div className={cn(
        "p-4 rounded-xl border border-border transition-all hover:border-primary/30 group",
        highlight ? "bg-primary/5 border-primary/20" : "bg-surface-1"
    )}>
        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1 tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{label}</div>
        <div className={cn("text-xl font-black tracking-tighter", color || "text-foreground")}>{value}</div>
    </div>
);

const LimitRow = ({ label, value }: any) => (
    <div className="flex justify-between items-center text-[10px]">
        <span className="text-muted-foreground font-bold">{label}</span>
        <span className="font-mono text-foreground font-bold">{value}</span>
    </div>
);
