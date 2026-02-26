"use client";

import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

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
    };
}

export const OrderConfirmDialog: React.FC<OrderConfirmDialogProps> = ({
    isOpen,
    onConfirm,
    onCancel,
    orderDetails,
}) => {
    const [acknowledged, setAcknowledged] = useState(false);

    if (!isOpen) return null;

    const isBuy = orderDetails.transaction_type === "BUY";
    const accentClass = isBuy ? "text-up" : "text-down";
    const bgClass = isBuy ? "bg-up" : "bg-down";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="relative bg-[var(--surface-1)] border border-white/10 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-bold text-white">Confirm Live Order</h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-1 hover:bg-white/5 rounded-md transition-colors"
                    >
                        <X className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-5 space-y-4">
                    {/* Order Summary */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Action</span>
                            <span className={`text-sm font-black ${accentClass}`}>
                                {orderDetails.transaction_type} {orderDetails.quantity} × {orderDetails.tradingsymbol}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Exchange</span>
                            <span className="text-xs text-zinc-300 font-mono">{orderDetails.exchange}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Type</span>
                            <span className="text-xs text-zinc-300 font-mono">
                                {orderDetails.order_type} / {orderDetails.product}
                            </span>
                        </div>
                        {orderDetails.price && (
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Price</span>
                                <span className="text-xs text-zinc-300 font-mono">₹{orderDetails.price.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-amber-300/80 leading-relaxed">
                            This order will be placed on the <strong>live exchange</strong> using real funds.
                            This action cannot be undone once the order is matched.
                        </p>
                    </div>

                    {/* Acknowledge */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={acknowledged}
                            onChange={(e) => setAcknowledged(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-zinc-600 text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-offset-0 bg-transparent"
                        />
                        <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 transition-colors">
                            I understand this is a real order with real money
                        </span>
                    </label>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 px-5 py-4 border-t border-white/5">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 text-xs font-bold text-zinc-400 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!acknowledged}
                        className={`flex-1 px-4 py-2.5 text-xs font-black rounded-lg transition-all ${acknowledged
                                ? `${bgClass} text-black hover:opacity-90 active:scale-[0.98]`
                                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                            }`}
                    >
                        {orderDetails.transaction_type === "BUY" ? "Place Buy Order" : "Place Sell Order"}
                    </button>
                </div>
            </div>
        </div>
    );
};
