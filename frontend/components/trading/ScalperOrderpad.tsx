"use client";

import React, { useState } from "react";
import { useOrderStore } from "@/hooks/useOrderStore";
import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";
import { Minus, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScalperOrderpadProps {
    symbol: string;
    onClose?: () => void;
    dragHandleProps?: any;
}

export const ScalperOrderpad = ({ symbol, onClose, dragHandleProps }: ScalperOrderpadProps) => {
    const [quantity, setQuantity] = useState(50);
    const [productType, setProductType] = useState<"MIS" | "CNC">("MIS");
    const placeOrder = useOrderStore((state) => state.placeOrder);
    const tickerData = useMarketStore((state) => state.tickers[symbol]);
    const { toast } = useToast();

    const currentPrice = tickerData?.last_price || 0;

    const handleQuantityChange = (delta: number) => {
        setQuantity(Math.max(1, quantity + delta));
    };

    const handlePresetClick = (qty: number) => {
        setQuantity(qty);
    };

    const handleOrder = (type: "BUY" | "SELL") => {
        if (!currentPrice) {
            toast({
                title: "Error",
                description: "Waiting for price data...",
                variant: "destructive",
            });
            return;
        }

        placeOrder({
            symbol,
            transactionType: type,
            orderType: "MARKET",
            productType,
            qty: quantity,
            price: currentPrice
        });

        toast({
            title: `${type} Order Executed!`,
            description: `${quantity} Qty @ ${currentPrice.toFixed(2)}`,
            variant: type === "BUY" ? "success" : "destructive",
        });
    };

    return (
        <div className="w-[280px] bg-surface-1/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden text-zinc-200 font-mono ring-1 ring-white/5">
            {/* Header - Draggable Area */}
            <div
                {...dragHandleProps}
                className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5 drag-handle cursor-move select-none group active:cursor-grabbing hover:bg-white/10 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                        <div className="w-1 h-3 bg-primary/50 rounded-full" />
                        <div className="w-1 h-3 bg-zinc-700/50 rounded-full" />
                    </div>
                    <span className="text-[10px] font-bold tracking-widest text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase">Scalper</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className={cn(
                        "text-xs font-bold tracking-tighter",
                        currentPrice > 0 ? "text-up" : "text-down"
                    )}>
                        {currentPrice.toFixed(2)}
                    </span>
                    {onClose && (
                        <button onClick={onClose} className="hover:text-white transition-colors opacity-50 hover:opacity-100">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="p-3 space-y-4">
                {/* Product Type Toggle */}
                <div className="grid grid-cols-2 gap-1 bg-zinc-900/80 p-0.5 rounded-lg border border-white/5">
                    {["MIS", "CNC"].map((type) => (
                        <button
                            key={type}
                            onClick={() => setProductType(type as "MIS" | "CNC")}
                            className={cn(
                                "py-1.5 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider",
                                productType === type
                                    ? "bg-zinc-800 text-white shadow-sm ring-1 ring-white/10"
                                    : "text-zinc-600 hover:text-zinc-400 hover:bg-white/5"
                            )}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {/* Quantity Control section */}
                <div className="space-y-3">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center justify-between bg-zinc-900/50 rounded-lg p-1 border border-white/5 group-focus-within:border-primary/30 transition-colors">
                            <button
                                onClick={() => handleQuantityChange(-50)}
                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-zinc-500 hover:text-white transition-colors active:scale-95"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="bg-transparent text-center font-mono text-xl font-bold outline-none w-24 text-white appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                                onClick={() => handleQuantityChange(50)}
                                className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-zinc-500 hover:text-white transition-colors active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-4 gap-1.5">
                        {[50, 100, 250, 500].map((qty) => (
                            <button
                                key={qty}
                                onClick={() => handlePresetClick(qty)}
                                className={cn(
                                    "px-1 py-1 text-[9px] font-mono border transition-all rounded",
                                    quantity === qty
                                        ? "bg-primary/10 text-primary border-primary/30 shadow-[0_0_10px_-5px_var(--primary)]"
                                        : "bg-transparent text-zinc-600 border-white/5 hover:border-white/20 hover:text-zinc-400"
                                )}
                            >
                                {qty}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Order Buttons — Using design tokens */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => handleOrder("BUY")}
                        className="relative overflow-hidden group p-3 rounded-lg bg-up/5 border border-up/20 hover:bg-up/10 hover:border-up/50 transition-all active:scale-[0.98]"
                    >
                        <div className="relative z-10 flex flex-col items-center">
                            <span className="text-xs font-black tracking-widest text-up mb-0.5 drop-shadow-[0_0_8px_color-mix(in_srgb,var(--up)_30%,transparent)]">BUY</span>
                            <span className="text-[9px] text-up/60 font-bold">MKT</span>
                        </div>
                        <div className="absolute inset-0 bg-up/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button
                        onClick={() => handleOrder("SELL")}
                        className="relative overflow-hidden group p-3 rounded-lg bg-down/5 border border-down/20 hover:bg-down/10 hover:border-down/50 transition-all active:scale-[0.98]"
                    >
                        <div className="relative z-10 flex flex-col items-center">
                            <span className="text-xs font-black tracking-widest text-down mb-0.5 drop-shadow-[0_0_8px_color-mix(in_srgb,var(--down)_30%,transparent)]">SELL</span>
                            <span className="text-[9px] text-down/60 font-bold">MKT</span>
                        </div>
                        <div className="absolute inset-0 bg-down/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>
            </div>

            {/* Footer Status Line */}
            <div className="px-3 py-1.5 bg-surface-0/40 border-t border-white/5 flex justify-between items-center text-[9px] text-zinc-600">
                <span>MARGIN: ₹{(quantity * currentPrice * 0.2).toLocaleString()}</span>
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-up animate-pulse shadow-[0_0_4px_var(--up)]" />
                    <span>READY</span>
                </div>
            </div>
        </div>
    );
};
