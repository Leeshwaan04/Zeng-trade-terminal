"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, RefreshCcw, Settings, MoreHorizontal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useOrderStore } from "@/hooks/useOrderStore";
import { useToast } from "@/hooks/use-toast";

import { useMarketStore } from "@/hooks/useMarketStore";

export const OrderEntryPanel = ({ symbol = "NIFTY 50" }: { symbol?: string }) => {
    const [side, setSide] = useState<"buy" | "sell">("buy");
    const [product, setProduct] = useState("MIS");
    const [type, setType] = useState("LMT");
    const [qty, setQty] = useState("50");
    const [price, setPrice] = useState("22450.00");
    const [trigger, setTrigger] = useState("0.00");
    const [gttTrailing, setGttTrailing] = useState("0.00");
    const [isBlitz, setIsBlitz] = useState(false);
    const [blitzSlices, setBlitzSlices] = useState("5");
    const [blitzInterval, setBlitzInterval] = useState("3");
    const [submitting, setSubmitting] = useState(false);
    const submitLock = React.useRef(false);

    const { activeBroker } = useAuthStore();
    const { tickers } = useMarketStore();
    const { toast } = useToast();

    const currentTicker = tickers[symbol];
    const ltp = currentTicker?.last_price || parseFloat(price);
    const change = currentTicker?.change_percent || 0;
    const isUp = change >= 0;

    const handleOrderSubmit = async () => {
        if (submitLock.current || submitting) return;
        submitLock.current = true;
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
            const { tickers } = useMarketStore.getState();

            if (type === "GTT") {
                const triggerPrice = parseFloat(trigger);
                const limitPrice = parseFloat(price);
                const trailingSL = parseFloat(gttTrailing);

                if (isNaN(triggerPrice) || triggerPrice <= 0) throw new Error("Invalid trigger price for GTT");
                if (isNaN(limitPrice) || limitPrice <= 0) throw new Error("Invalid limit price for GTT");

                const ltp = tickers[symbol]?.last_price || limitPrice;

                // Kite allows [trigger] or [trigger, stoploss] or [trigger, stoploss, trailing] depending on single/two-leg.
                // For a robust trailing we push the value.
                const triggerValues = [triggerPrice];
                if (!isNaN(trailingSL) && trailingSL > 0) {
                    triggerValues.push(trailingSL);
                }

                const condition = {
                    exchange: symbol.includes('FUT') || symbol.includes('CE') || symbol.includes('PE') ? 'NFO' : 'NSE',
                    tradingsymbol: symbol,
                    trigger_values: triggerValues,
                    last_price: ltp
                };

                const orders = [{
                    exchange: condition.exchange,
                    tradingsymbol: symbol,
                    transaction_type: side.toUpperCase(),
                    quantity,
                    order_type: "LIMIT",
                    product: product.toUpperCase(),
                    price: limitPrice
                }];

                const payload = {
                    type: "single",
                    condition,
                    orders
                };

                const res = await fetch('/api/orders/gtt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const json = await res.json();
                if (!res.ok || json.status !== 'success') {
                    throw new Error(json.error || json.message || "Failed to place GTT");
                }

                toast({ title: "GTT Placed", description: `${side.toUpperCase()} ${qty} qty @ ${limitPrice} (Trigger: ${triggerPrice})` });
            } else {
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
            }

        } catch (error: any) {
            toast({ title: "Order Failed", description: error.message, variant: "destructive" });
        } finally {
            setTimeout(() => {
                submitLock.current = false;
                setSubmitting(false);
            }, 500); // 500ms safety debounce
        }
    };

    return (
        <div className="h-full bg-[#080a0c] border-l border-white/5 flex flex-col tracking-tight transition-colors duration-300">
            {/* Context Header */}
            <div className="p-2 border-b border-white/5 bg-[#0c0f13]">
                <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                        <span className="px-1 py-0.5 bg-white/5 rounded-[2px] text-[8px] items-center font-bold text-zinc-500 border border-white/5 uppercase tracking-widest">NFO</span>
                        <h2 className="text-[11px] font-black text-zinc-200 tracking-tighter">{symbol}</h2>
                    </div>
                    <span className={cn(
                        "flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm border tabular-nums transition-colors duration-300",
                        isUp ? "text-up bg-up/10 border-up/20" : "text-down bg-down/10 border-down/20"
                    )}>
                        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <div className="w-3 h-3 rotate-180"><ArrowUpRight className="w-3 h-3" /></div>}
                        {ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <span className="text-[8px] font-sans opacity-80 pl-0.5">({isUp ? '+' : ''}{change.toFixed(2)}%)</span>
                    </span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-zinc-500 mt-1.5">
                    <span className="font-mono uppercase tracking-widest font-bold text-[8px]">LTP: <span className={cn("font-bold text-[10px] transition-colors", isUp ? "text-up" : "text-down")}>{ltp.toFixed(2)}</span></span>
                    <div className="flex gap-2 font-mono uppercase tracking-widest font-bold text-[8px]">
                        <span>OI: <span className="text-zinc-300">{(currentTicker?.oi || 0).toLocaleString()}</span></span>
                        <span>Vol: <span className="text-zinc-300">{(currentTicker?.volume || 0).toLocaleString()}</span></span>
                    </div>
                </div>
            </div>

            {/* Scrollable Form Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                {/* Buy/Sell Toggle */}
                <div className="grid grid-cols-2 p-0.5 bg-[#0c0f13] rounded-md gap-0.5 border border-white/5">
                    <button
                        onClick={() => setSide("buy")}
                        className={cn(
                            "py-1.5 rounded-[4px] text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-1.5 border border-transparent",
                            side === "buy"
                                ? "bg-up text-black shadow-[0_0_15px_rgba(34,197,94,0.2)] border-up/30"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
                        )}
                    >
                        BUY
                    </button>
                    <button
                        onClick={() => setSide("sell")}
                        className={cn(
                            "py-1.5 rounded-[4px] text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-1.5 border border-transparent",
                            side === "sell"
                                ? "bg-down text-black shadow-[0_0_15px_rgba(239,68,68,0.2)] border-down/30"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
                        )}
                    >
                        SELL
                    </button>
                </div>

                {/* Blitz Toggle */}
                <button
                    onClick={() => setIsBlitz(!isBlitz)}
                    className={cn(
                        "w-full py-1 rounded-[4px] text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 border border-transparent transition-all",
                        isBlitz
                            ? "bg-primary text-black shadow-[0_0_15px_rgba(34,197,94,0.3)] border-primary/40 animate-pulse"
                            : "bg-[#0c0f13] text-zinc-500 border-white/5 hover:bg-white/[0.02] hover:text-zinc-400"
                    )}
                >
                    <span className={isBlitz ? "animate-pulse" : ""}>⚡ Institutional Blitz</span>
                </button>

                {/* Blitz Controls */}
                {isBlitz && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                        <InputGroup label="Slices" value={blitzSlices} setValue={setBlitzSlices} unit="Count" />
                        <InputGroup label="Interval" value={blitzInterval} setValue={setBlitzInterval} unit="Sec" />
                    </div>
                )}

                {/* Product Type */}
                <div className="space-y-1">
                    <Label>Product</Label>
                    <div className="flex gap-1">
                        {["MIS", "NRML"].map((p) => (
                            <button
                                key={p}
                                onClick={() => setProduct(p)}
                                className={cn(
                                    "flex-1 py-1 border rounded-[4px] text-[9px] font-black tracking-widest transition-all relative overflow-hidden group",
                                    product === p
                                        ? "border-primary/50 bg-primary/10 text-primary"
                                        : "border-white/5 bg-[#0c0f13] text-zinc-500 hover:border-white/10 hover:text-zinc-300 hover:bg-white/[0.02]"
                                )}
                            >
                                {p}
                                {product === p && <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Order Type */}
                <div className="space-y-1">
                    <Label>Type</Label>
                    <div className="grid grid-cols-5 gap-1">
                        {["LMT", "MKT", "SL", "SL-M", "GTT"].map((t) => (
                            <button
                                key={t}
                                onClick={() => setType(t)}
                                className={cn(
                                    "py-1 border rounded-[4px] text-[9px] font-black tracking-widest transition-all",
                                    type === t
                                        ? "border-primary/50 bg-primary/10 text-primary"
                                        : "border-white/5 bg-[#0c0f13] text-zinc-500 hover:border-white/10 hover:text-zinc-300 hover:bg-white/[0.02]"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Inputs Grid */}
                {type === "GTT" ? (
                    <div className="grid grid-cols-2 gap-2">
                        <InputGroup label="Qty" value={qty} setValue={setQty} unit="Lot" />
                        <InputGroup label="Limit Price" value={price} setValue={setPrice} />
                        <InputGroup label="Trigger SL" value={trigger} setValue={setTrigger} />
                        <InputGroup label="Trailing SL (Pts)" value={gttTrailing} setValue={setGttTrailing} />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <InputGroup label="Qty" value={qty} setValue={setQty} unit="Lot" />
                        <InputGroup label="Price" value={price} setValue={setPrice} disabled={type === "MKT" || type === "SL-M"} />
                        <InputGroup label="Trigger" value={trigger} setValue={setTrigger} disabled={type === "LMT" || type === "MKT"} />
                        <InputGroup label="Disclosed" value="0" disabled={true} />
                    </div>
                )}

                {/* Margin Info Box */}
                <div className="bg-[#0c0f13] rounded-md border border-white/5 overflow-hidden">
                    <div className="px-2 py-1.5 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Margin Required</span>
                        <RefreshCcw className="w-2.5 h-2.5 text-zinc-500 cursor-pointer hover:rotate-180 transition-transform duration-500 hover:text-primary" />
                    </div>
                    <div className="p-2 space-y-0.5">
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="text-zinc-500 font-bold uppercase tracking-widest text-[8px]">Total</span>
                            <span className="font-mono font-bold text-zinc-200 tabular-nums tracking-tighter">₹7,260.00</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-zinc-600">
                            <span className="uppercase tracking-widest font-bold text-[7px]">Available</span>
                            <span className="font-mono tabular-nums font-bold tracking-tighter">₹2,45,000.00</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-2 border-t border-white/5 bg-[#0c0f13] mt-auto">
                <button
                    disabled={submitting}
                    onClick={handleOrderSubmit}
                    className={cn(
                        "w-full py-2 rounded-md font-black text-[11px] uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-70 disabled:pointer-events-none",
                        side === "buy"
                            ? "bg-up text-black"
                            : "bg-down text-black"
                    )}
                >
                    {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
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
    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest pl-0.5">{children}</span>
);

const InputGroup = ({ label, value, setValue, unit, disabled }: any) => (
    <div className={cn("space-y-1", disabled && "opacity-40 pointer-events-none")}>
        <Label>{label}</Label>
        <div className="relative group">
            <input
                type="text"
                value={value}
                onChange={(e) => setValue && setValue(e.target.value)}
                disabled={disabled}
                className="w-full bg-[#0c0f13] border border-white/5 rounded-[4px] px-2 py-1 text-[11px] text-zinc-200 font-mono tracking-tighter outline-none focus:border-primary/50 focus:bg-white/[0.02] transition-all group-hover:border-white/10"
            />
            {unit && <span className="absolute right-2 top-[3px] text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{unit}</span>}
        </div>
    </div>
);

