"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, RefreshCcw, Settings, MoreHorizontal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useOrderStore } from "@/hooks/useOrderStore";
import { useToast } from "@/hooks/use-toast";

export const OrderEntryPanel = ({ symbol = "NIFTY 50" }: { symbol?: string }) => {
    const [side, setSide] = useState<"buy" | "sell">("buy");
    const [product, setProduct] = useState("MIS");
    const [type, setType] = useState("LMT");
    const [qty, setQty] = useState("50");
    const [price, setPrice] = useState("22450.00");
    const [trigger, setTrigger] = useState("0.00");
    const [isBlitz, setIsBlitz] = useState(false);
    const [blitzSlices, setBlitzSlices] = useState("5");
    const [blitzInterval, setBlitzInterval] = useState("3");
    const [submitting, setSubmitting] = useState(false);

    const { activeBroker } = useAuthStore();
    const { toast } = useToast();

    const handleOrderSubmit = async () => {
        setSubmitting(true);
        try {
            if (!activeBroker) {
                toast({ title: "Broker Disconnected", description: "Please login to execute trades", variant: "destructive" });
                return;
            }

            const quantity = parseInt(qty);
            if (isNaN(quantity) || quantity <= 0) {
                throw new Error("Invalid quantity");
            }

            const { placeOrder, executeBlitz } = useOrderStore.getState();
            const orderParams = {
                symbol: symbol,
                transactionType: side.toUpperCase() as any,
                orderType: type.toUpperCase() as any,
                productType: product.toUpperCase() as any,
                qty: quantity,
                price: parseFloat(price),
                triggerPrice: parseFloat(trigger),
            };

            if (isBlitz) {
                const slices = parseInt(blitzSlices);
                const interval = parseFloat(blitzInterval);

                if (isNaN(slices) || slices < 2) throw new Error("Need at least 2 slices for Blitz");
                if (isNaN(interval) || interval < 0.5) throw new Error("Interval must be > 0.5s");

                executeBlitz(orderParams, {
                    enabled: true,
                    slices,
                    interval
                });
                toast({ title: "⚡ Blitz Initiated", description: `Executing ${quantity} qty over ${slices} slices` });
            } else {
                await placeOrder(orderParams);
                toast({ title: "Order Placed", description: `${side.toUpperCase()} ${qty} qty @ ${price}` });
            }

        } catch (error: any) {
            toast({ title: "Order Failed", description: error.message, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="h-full bg-card border-l border-border flex flex-col tracking-tight transition-colors duration-300">
            {/* Context Header */}
            <div className="p-3 border-b border-border bg-muted/20">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] items-center font-bold text-muted-foreground border border-border">NFO</span>
                        <h2 className="text-sm font-bold text-foreground">NIFTY 28MAR 22500 CE</h2>
                    </div>
                    <span className="flex items-center gap-1 text-up text-xs font-bold bg-up/10 px-1.5 py-0.5 rounded border border-up/20">
                        <ArrowUpRight className="w-3 h-3" /> 145.20 (+12%)
                    </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-mono">LTP: <span className="text-foreground font-bold">145.20</span></span>
                    <div className="flex gap-2">
                        <span>OI: <span className="text-foreground font-bold">1.2Cr</span></span>
                        <span>Vol: <span className="text-foreground font-bold">45.2L</span></span>
                    </div>
                </div>
            </div>

            {/* Scrollable Form Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Buy/Sell Toggle */}
                <div className="grid grid-cols-2 p-1 bg-muted rounded-lg gap-1 border border-border">
                    <button
                        onClick={() => setSide("buy")}
                        className={cn(
                            "py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2",
                            side === "buy"
                                ? "bg-up text-black shadow-lg shadow-up/20 ring-1 ring-up/50 scale-[1.02]"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                    >
                        BUY
                    </button>
                    <button
                        onClick={() => setSide("sell")}
                        className={cn(
                            "py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2",
                            side === "sell"
                                ? "bg-down text-white shadow-lg shadow-down/20 ring-1 ring-down/50 scale-[1.02]"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                    >
                        SELL
                    </button>
                </div>

                {/* Blitz Toggle */}
                <button
                    onClick={() => setIsBlitz(!isBlitz)}
                    className={cn(
                        "w-full py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all",
                        isBlitz
                            ? "bg-primary text-black border-primary shadow-[0_0_20px_rgba(0,229,255,0.6)] animate-pulse"
                            : "bg-zinc-800 text-zinc-500 border-transparent hover:bg-zinc-700"
                    )}
                >
                    <span className={isBlitz ? "animate-pulse" : ""}>⚡ Institutional Blitz</span>
                </button>

                {/* Blitz Controls */}
                {isBlitz && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <InputGroup label="Slices" value={blitzSlices} setValue={setBlitzSlices} unit="Count" />
                        <InputGroup label="Interval" value={blitzInterval} setValue={setBlitzInterval} unit="Sec" />
                    </div>
                )}

                {/* Product Type */}
                <div className="space-y-1.5">
                    <Label>Product</Label>
                    <div className="flex gap-2">
                        {["MIS", "NRML"].map((p) => (
                            <button
                                key={p}
                                onClick={() => setProduct(p)}
                                className={cn(
                                    "flex-1 py-1.5 border rounded-md text-[10px] font-bold transition-all relative overflow-hidden group",
                                    product === p
                                        ? "border-primary bg-primary/10 text-primary shadow-[0_0_10px_-3px_var(--primary)]"
                                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                {p}
                                {product === p && <div className="absolute inset-0 bg-primary/5 animate-pulse" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Order Type */}
                <div className="space-y-1.5">
                    <Label>Type</Label>
                    <div className="grid grid-cols-4 gap-1.5">
                        {["LMT", "MKT", "SL", "SL-M"].map((t) => (
                            <button
                                key={t}
                                onClick={() => setType(t)}
                                className={cn(
                                    "py-1.5 border rounded-md text-[10px] font-bold transition-all",
                                    type === t
                                        ? "border-primary bg-primary/10 text-primary shadow-[0_0_10px_-3px_var(--primary)]"
                                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Inputs Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <InputGroup label="Qty" value={qty} setValue={setQty} unit="Lot: 50" />
                    <InputGroup label="Price" value={price} setValue={setPrice} disabled={type === "MKT" || type === "SL-M"} />
                    <InputGroup label="Trigger" value={trigger} setValue={setTrigger} disabled={type === "LMT" || type === "MKT"} />
                    <InputGroup label="Disclosed" value="0" disabled={true} />
                </div>

                {/* Margin Info Box */}
                <div className="bg-muted/20 rounded-lg border border-border overflow-hidden">
                    <div className="px-3 py-2 border-b border-border bg-muted/30 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-muted-foreground">MARGIN REQUIRED</span>
                        <RefreshCcw className="w-3 h-3 text-primary cursor-pointer hover:rotate-180 transition-transform duration-500" />
                    </div>
                    <div className="p-3 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-mono font-bold text-foreground">₹7,260.00</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                            <span>Available</span>
                            <span className="font-mono">₹2,45,000.00</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-3 border-t border-border bg-muted/10 mt-auto">
                <button
                    disabled={submitting}
                    onClick={handleOrderSubmit}
                    className={cn(
                        "w-full py-3 rounded-lg font-bold text-sm shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-70 disabled:pointer-events-none",
                        side === "buy"
                            ? "bg-up hover:bg-emerald-400 text-black shadow-up/20"
                            : "bg-down hover:bg-rose-500 text-white shadow-down/20"
                    )}
                >
                    {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <span className="relative z-10">{side === "buy" ? "BUY" : "SELL"}</span>
                    )}
                    <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300" />
                </button>
            </div>
        </div>
    );
};

const Label = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-0.5">{children}</span>
);

const InputGroup = ({ label, value, setValue, unit, disabled }: any) => (
    <div className={cn("space-y-1.5", disabled && "opacity-50 pointer-events-none")}>
        <Label>{label}</Label>
        <div className="relative group">
            <input
                type="text"
                value={value}
                onChange={(e) => setValue && setValue(e.target.value)}
                disabled={disabled}
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono outline-none focus:border-primary/50 focus:bg-background/80 transition-all group-hover:border-primary/30"
            />
            {unit && <span className="absolute right-2 top-2.5 text-[10px] text-muted-foreground">{unit}</span>}
        </div>
    </div>
);

