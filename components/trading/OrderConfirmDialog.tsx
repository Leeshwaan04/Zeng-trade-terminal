"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, X, Loader2, ShieldCheck, ShieldX } from "lucide-react";

interface OrderConfirmDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    orderDetails: {
        transaction_type: "BUY" | "SELL";
        tradingsymbol: string;
        exchange: string;
        quantity: number;
        order_type: string;
        product: string;
        price?: number;
        trigger_price?: number;
        variety?: string;
    };
}

interface PreTradeData {
    margin: {
        total: number;
        span: number;
        exposure: number;
        option_premium: number;
    } | null;
    charges: {
        brokerage: number;
        transaction_tax: number;
        gst: number;
        stamp_duty: number;
        total: number;
    } | null;
    available_margin: number;
    sufficient: boolean | null;
}

const fmt = (n: number) =>
    n >= 100000
        ? `₹${(n / 100000).toFixed(2)}L`
        : `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const OrderConfirmDialog: React.FC<OrderConfirmDialogProps> = ({
    isOpen,
    onConfirm,
    onCancel,
    orderDetails,
}) => {
    const [acknowledged, setAcknowledged] = useState(false);
    const [pretrade, setPretrade] = useState<PreTradeData | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch margin + charges every time dialog opens
    useEffect(() => {
        if (!isOpen) {
            setAcknowledged(false);
            setPretrade(null);
            return;
        }

        let cancelled = false;
        setLoading(true);

        fetch("/api/kite/pretrade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                exchange: orderDetails.exchange,
                tradingsymbol: orderDetails.tradingsymbol,
                transaction_type: orderDetails.transaction_type,
                order_type: orderDetails.order_type,
                product: orderDetails.product,
                quantity: orderDetails.quantity,
                price: orderDetails.price,
                trigger_price: orderDetails.trigger_price,
                variety: orderDetails.variety || "regular",
            }),
        })
            .then(r => r.json())
            .then(json => {
                if (!cancelled && json.status === "success") {
                    setPretrade(json.data);
                }
            })
            .catch(() => {
                // Non-blocking — show dialog even if pretrade calc fails
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [isOpen, orderDetails.exchange, orderDetails.tradingsymbol, orderDetails.transaction_type,
        orderDetails.order_type, orderDetails.product, orderDetails.quantity,
        orderDetails.price, orderDetails.trigger_price]);

    if (!isOpen) return null;

    const isBuy = orderDetails.transaction_type === "BUY";
    const accentClass = isBuy ? "text-up" : "text-down";
    const bgClass = isBuy ? "bg-up" : "bg-down";

    const marginOk = pretrade?.sufficient;
    const MarginIcon = marginOk === null ? null : marginOk ? ShieldCheck : ShieldX;
    const marginIconClass = marginOk ? "text-emerald-400" : "text-red-400";

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-[1px] animate-in fade-in duration-200"
                onClick={onCancel}
            />

            {/* Slide-out Drawer */}
            <div className="relative bg-background border-l border-border shadow-2xl w-full max-w-[300px] h-full flex flex-col animate-in slide-in-from-right-16 duration-300 ease-out">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest">Confirm Live Order</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        title="Close"
                        className="p-1 hover:bg-white/5 rounded-[4px] transition-colors"
                    >
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-4 py-4 space-y-3 flex-1 overflow-y-auto">
                    {/* Order Summary */}
                    <div className="bg-surface-1 border border-border rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Action</span>
                            <span className={`text-[10px] font-black tabular-nums ${accentClass}`}>
                                {orderDetails.transaction_type} {orderDetails.quantity} × {orderDetails.tradingsymbol}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Exchange</span>
                            <span className="text-[9px] text-foreground font-mono font-bold">{orderDetails.exchange}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Type</span>
                            <span className="text-[9px] text-foreground font-mono font-bold">
                                {orderDetails.order_type} / {orderDetails.product}
                            </span>
                        </div>
                        {orderDetails.price && (
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Price</span>
                                <span className="text-[9px] text-foreground font-mono font-bold tabular-nums">₹{orderDetails.price.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    {/* Pre-Trade Margin & Charges */}
                    <div className="bg-surface-1 border border-border rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Margin Required</span>
                            {loading && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />}
                            {!loading && MarginIcon && <MarginIcon className={`w-3 h-3 ${marginIconClass}`} />}
                        </div>

                        {loading && (
                            <div className="text-[9px] text-muted-foreground animate-pulse">Calculating…</div>
                        )}

                        {!loading && pretrade?.margin && (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-muted-foreground">Total Required</span>
                                    <span className={`text-[10px] font-black tabular-nums ${marginOk ? "text-emerald-400" : "text-red-400"}`}>
                                        {fmt(pretrade.margin.total)}
                                    </span>
                                </div>
                                {pretrade.margin.span > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-muted-foreground">SPAN</span>
                                        <span className="text-[9px] text-foreground font-mono tabular-nums">{fmt(pretrade.margin.span)}</span>
                                    </div>
                                )}
                                {pretrade.margin.exposure > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-muted-foreground">Exposure</span>
                                        <span className="text-[9px] text-foreground font-mono tabular-nums">{fmt(pretrade.margin.exposure)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between border-t border-border/50 pt-1">
                                    <span className="text-[9px] text-muted-foreground">Available</span>
                                    <span className="text-[9px] text-foreground font-mono tabular-nums">{fmt(pretrade.available_margin)}</span>
                                </div>
                                {marginOk === false && (
                                    <p className="text-[9px] text-red-400 font-bold">Insufficient margin to place this order.</p>
                                )}
                            </>
                        )}

                        {!loading && !pretrade?.margin && !loading && (
                            <div className="text-[9px] text-muted-foreground/60 italic">Margin data unavailable</div>
                        )}
                    </div>

                    {/* Charges Breakdown */}
                    {!loading && pretrade?.charges && (
                        <div className="bg-surface-1 border border-border rounded-md p-3 space-y-1.5">
                            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Est. Charges</span>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-muted-foreground">Brokerage</span>
                                <span className="text-[9px] text-foreground font-mono tabular-nums">{fmt(pretrade.charges.brokerage)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-muted-foreground">STT/CTT</span>
                                <span className="text-[9px] text-foreground font-mono tabular-nums">{fmt(pretrade.charges.transaction_tax)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-muted-foreground">Stamp Duty</span>
                                <span className="text-[9px] text-foreground font-mono tabular-nums">{fmt(pretrade.charges.stamp_duty)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-muted-foreground">GST</span>
                                <span className="text-[9px] text-foreground font-mono tabular-nums">{fmt(pretrade.charges.gst)}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-border/50 pt-1">
                                <span className="text-[9px] text-muted-foreground font-bold">Total Charges</span>
                                <span className="text-[9px] text-amber-400 font-black tabular-nums">{fmt(pretrade.charges.total)}</span>
                            </div>
                        </div>
                    )}

                    {/* Warning */}
                    <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-500/5 border border-amber-500/10">
                        <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[9px] text-amber-500/80 leading-relaxed font-bold">
                            Live exchange order. Real funds will be utilized. This action cannot be undone once matched.
                        </p>
                    </div>

                    {/* Acknowledge */}
                    <label className="flex items-center gap-2 cursor-pointer group hover:bg-white/[0.02] p-2 rounded-md transition-colors border border-transparent hover:border-border">
                        <input
                            type="checkbox"
                            checked={acknowledged}
                            onChange={(e) => setAcknowledged(e.target.checked)}
                            className="w-3 h-3 rounded-[2px] border-border bg-transparent text-primary focus:ring-primary focus:ring-offset-0 transition-all"
                        />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                            Acknowledge Risk
                        </span>
                    </label>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-surface-1 mt-auto">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 px-3 py-2 text-[9px] uppercase tracking-widest font-bold text-zinc-400 bg-white/5 hover:bg-white/10 border border-white/5 rounded-[4px] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!acknowledged}
                        className={`flex-1 px-3 py-2 text-[9px] uppercase tracking-widest font-black rounded-[4px] transition-all border ${acknowledged
                            ? `${bgClass}/10 text-${isBuy ? "up" : "down"} border-${isBuy ? "up" : "down"}/20 hover:bg-${isBuy ? "up" : "down"} hover:text-black`
                            : "bg-white/5 text-zinc-600 border-white/5 cursor-not-allowed"
                            }`}
                    >
                        {orderDetails.transaction_type}
                    </button>
                </div>
            </div>
        </div>
    );
};
