"use client";

import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Wallet, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, Banknote } from "lucide-react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { useOrderStore } from "@/hooks/useOrderStore";
import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";

const fmt = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const FundsLedgerDrawer = () => {
    const fundsOpen = useLayoutStore((s) => s.fundsOpen);
    const setFundsOpen = useLayoutStore((s) => s.setFundsOpen);

    const positions = useOrderStore((s) => s.positions);
    const orders = useOrderStore((s) => s.orders);
    const marginAvailable = useOrderStore((s) => s.marginAvailable);
    const marginUsed = useOrderStore((s) => s.marginUsed);
    const dailyPnL = useOrderStore((s) => s.dailyPnL);
    const unifiedMargin = useMarketStore((s) => s.unifiedMargin);

    const isMock = typeof window !== "undefined" && window.location.search.includes("mock=true");

    const realised = useMemo(() => positions.reduce((a, p) => a + (p.realised || 0), 0), [positions]);
    const unrealised = useMemo(() => positions.reduce((a, p) => a + (p.unrealised || 0), 0), [positions]);

    // Build a simple ledger from executed orders: BUY = debit, SELL = credit.
    const ledger = useMemo(() => {
        return orders
            .filter((o) => o.status === "EXECUTED")
            .map((o) => ({
                id: o.id,
                time: o.timestamp,
                symbol: o.symbol,
                side: o.transactionType,
                amount: o.qty * (o.price || 0),
            }))
            .sort((a, b) => b.time - a.time);
    }, [orders]);

    const brokers = Object.entries(unifiedMargin.brokers || {});

    if (!fundsOpen) return null;
    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setFundsOpen(false)}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-md h-full bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-5 h-14 border-b border-border bg-surface-1 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-foreground tracking-tight">Funds &amp; Ledger</h2>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                                {isMock ? "Simulated capital" : "Live broker funds"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setFundsOpen(false)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-all"
                        aria-label="Close funds panel"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
                    {/* Available capital hero */}
                    <div className="rounded-2xl border border-border bg-gradient-to-br from-surface-1 to-surface-2 p-5">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Available to Trade</p>
                        <p className="text-3xl font-black text-foreground tabular-nums tracking-tight">
                            {fmt(marginAvailable || unifiedMargin.totalMargin || 0)}
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-background/50 border border-border/50 p-2.5">
                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Margin Used</p>
                                <p className="text-sm font-black text-amber-400 tabular-nums mt-0.5">{fmt(marginUsed)}</p>
                            </div>
                            <div className="rounded-lg bg-background/50 border border-border/50 p-2.5">
                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Total Capital</p>
                                <p className="text-sm font-black text-foreground tabular-nums mt-0.5">{fmt(unifiedMargin.totalMargin || 0)}</p>
                            </div>
                        </div>
                    </div>

                    {/* P&L summary */}
                    <div className="grid grid-cols-3 gap-3">
                        <PnLCard label="Day P&L" value={dailyPnL} />
                        <PnLCard label="Realised" value={realised} />
                        <PnLCard label="Unrealised" value={unrealised} />
                    </div>

                    {/* Per-broker breakdown */}
                    {brokers.length > 0 && (
                        <div className="rounded-xl border border-border overflow-hidden">
                            <div className="px-4 py-2 bg-surface-2 border-b border-border">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Funds by Broker</span>
                            </div>
                            <div className="divide-y divide-border/50">
                                {brokers.map(([name, b]: [string, any]) => (
                                    <div key={name} className="flex items-center justify-between px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <Banknote className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-xs font-bold text-foreground uppercase">{name}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-foreground tabular-nums">{fmt(b.available || 0)}</p>
                                            <p className="text-[8px] text-muted-foreground uppercase tracking-widest">
                                                {(b.util_percent ?? 0).toFixed(0)}% used
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Ledger */}
                    <div className="rounded-xl border border-border overflow-hidden">
                        <div className="px-4 py-2 bg-surface-2 border-b border-border flex items-center justify-between">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Transaction Ledger</span>
                            <span className="text-[9px] font-bold text-muted-foreground">{ledger.length} entries</span>
                        </div>
                        {ledger.length === 0 ? (
                            <div className="px-4 py-10 text-center">
                                <p className="text-xs text-muted-foreground">No transactions yet.</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-1">Executed trades will appear here as debits and credits.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50 max-h-72 overflow-y-auto custom-scrollbar">
                                {ledger.map((e) => {
                                    const isDebit = e.side === "BUY";
                                    return (
                                        <div key={e.id} className="flex items-center justify-between px-4 py-2.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className={cn(
                                                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                                    isDebit ? "bg-down/10" : "bg-up/10"
                                                )}>
                                                    {isDebit
                                                        ? <ArrowUpRight className="w-3.5 h-3.5 text-down" />
                                                        : <ArrowDownLeft className="w-3.5 h-3.5 text-up" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-foreground truncate">{e.symbol}</p>
                                                    <p className="text-[9px] text-muted-foreground">
                                                        {isDebit ? "Bought" : "Sold"} · {new Date(e.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={cn("text-xs font-black tabular-nums", isDebit ? "text-down" : "text-up")}>
                                                {isDebit ? "−" : "+"}{fmt(e.amount)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {isMock && (
                        <p className="text-[10px] text-muted-foreground/70 text-center leading-relaxed">
                            You're in simulation mode. These funds are virtual — connect a broker to trade with real capital.
                        </p>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

const PnLCard = ({ label, value }: { label: string; value: number }) => {
    const isUp = value >= 0;
    return (
        <div className="rounded-xl border border-border bg-surface-1 p-3">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
            <div className="flex items-center gap-1 mt-1">
                {isUp ? <TrendingUp className="w-3 h-3 text-up shrink-0" /> : <TrendingDown className="w-3 h-3 text-down shrink-0" />}
                <p className={cn("text-xs font-black tabular-nums truncate", isUp ? "text-up" : "text-down")}>
                    {isUp ? "+" : "−"}₹{Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
            </div>
        </div>
    );
};
