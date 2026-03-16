"use client";

import React, { useState, useEffect } from "react";
import { X, Clock, BadgeCheck, ArrowRightLeft, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Trade {
    trade_id: string;
    order_id: string;
    exchange_order_id: string;
    tradingsymbol: string;
    exchange: string;
    transaction_type: "BUY" | "SELL";
    product: string;
    average_price: number;
    quantity: number;
    fill_timestamp: string;
    exchange_timestamp: string;
}

export const TradeDetailsModal = ({ 
    orderId, 
    isOpen, 
    onClose 
}: { 
    orderId: string | null, 
    isOpen: boolean, 
    onClose: () => void 
}) => {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && orderId) {
            setIsLoading(true);
            fetch(`/api/kite/orders/trades?order_id=${orderId}`)
                .then(r => r.json())
                .then(json => {
                    if (json.status === "success") {
                        setTrades(json.data);
                    }
                })
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, orderId]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-surface-1 border-border/20 text-foreground p-0 overflow-hidden font-mono">
                <DialogHeader className="p-4 border-b border-white/5 bg-foreground/[0.02]">
                    <DialogTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-primary" />
                        Execution Audit — {orderId}
                    </DialogTitle>
                </DialogHeader>

                <div className="p-4 max-h-[60vh] overflow-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-[8px] font-bold uppercase tracking-widest">Hydrating Execution Logs...</span>
                        </div>
                    ) : trades.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-[10px] uppercase font-bold tracking-widest opacity-30">
                            No trade execution data found for this order
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Execution Summary */}
                            <div className="grid grid-cols-3 gap-2 p-3 bg-foreground/[0.03] border border-white/5 rounded-lg">
                                <div className="space-y-1">
                                    <div className="text-[7px] text-muted-foreground uppercase font-black">Total Filled</div>
                                    <div className="text-sm font-black text-foreground">
                                        {trades.reduce((acc, t) => acc + t.quantity, 0)} Units
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[7px] text-muted-foreground uppercase font-black">VWAP Fill</div>
                                    <div className="text-sm font-black text-primary">
                                        ₹{(trades.reduce((acc, t) => acc + (t.average_price * t.quantity), 0) / trades.reduce((acc, t) => acc + t.quantity, 0)).toFixed(2)}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[7px] text-muted-foreground uppercase font-black">Fills Count</div>
                                    <div className="text-sm font-black text-foreground">{trades.length} Segments</div>
                                </div>
                            </div>

                            {/* Detailed List */}
                            <div className="space-y-1.5">
                                <div className="grid grid-cols-[1fr_0.8fr_1fr_0.5fr] px-2 text-[7px] font-black uppercase text-muted-foreground tracking-widest">
                                    <span>Time (Exchange)</span>
                                    <span className="text-right">Price</span>
                                    <span className="text-right">Qty / Fill ID</span>
                                    <span className="text-right">Type</span>
                                </div>
                                {trades.map((trade, idx) => (
                                    <div 
                                        key={trade.trade_id}
                                        className="grid grid-cols-[1fr_0.8fr_1fr_0.5fr] px-2 py-2 border border-white/5 bg-foreground/[0.01] hover:bg-foreground/[0.03] rounded-md items-center transition-colors group"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-foreground/80 tabular-nums">
                                                {new Date(trade.exchange_timestamp).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 2 })}
                                            </span>
                                            <span className="text-[7px] text-muted-foreground opacity-50 tabular-nums uppercase">{trade.exchange_order_id}</span>
                                        </div>
                                        <div className="text-right text-[10px] font-black text-foreground tabular-nums">
                                            ₹{trade.average_price.toFixed(2)}
                                        </div>
                                        <div className="text-right flex flex-col">
                                            <span className="text-[9px] font-black text-primary tabular-nums">{trade.quantity}</span>
                                            <span className="text-[7px] text-muted-foreground opacity-50 tabular-nums group-hover:opacity-100 transition-opacity">#{trade.trade_id}</span>
                                        </div>
                                        <div className="flex justify-end">
                                            <div className={cn(
                                                "px-1.5 py-0.5 rounded-[2px] text-[7px] font-black uppercase border",
                                                trade.transaction_type === "BUY" 
                                                    ? "bg-up/10 text-up border-up/20" 
                                                    : "bg-down/10 text-down border-down/20"
                                            )}>
                                                {trade.transaction_type}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-white/5 bg-foreground/[0.02] flex justify-between items-center">
                    <div className="flex items-center gap-2 opacity-40">
                        <Clock className="w-3 h-3" />
                        <span className="text-[8px] font-bold uppercase tracking-widest">Latency: ~45ms</span>
                    </div>
                    <button 
                        onClick={onClose}
                        className="px-4 py-1 rounded-[2px] bg-white/5 border border-white/10 text-[8px] font-black uppercase text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
                    >
                        Close Portal
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
