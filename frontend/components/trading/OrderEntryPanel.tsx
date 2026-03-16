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
    const [showRiskPreview, setShowRiskPreview] = useState(false);
    const [blitzSlices, setBlitzSlices] = useState("5");
    const [blitzInterval, setBlitzInterval] = useState("3");
    const [blitzRandomize, setBlitzRandomize] = useState(false);
    const [blitzMode, setBlitzMode] = useState<'FIXED' | 'VWAP_SYNC'>('FIXED');
    const [submitting, setSubmitting] = useState(false);
    const submitLock = React.useRef(false);
    const lastSubmitTimeRef = React.useRef(0);

    const { activeBroker } = useAuthStore();
    const { tickers, unifiedMargin } = useMarketStore();
    const { marginAvailable } = useOrderStore();
    const { toast } = useToast();

    const currentTicker = tickers[symbol];
    const ltp = currentTicker?.last_price || parseFloat(price);
    const change = currentTicker?.change_percent || 0;
    const isUp = change >= 0;

    // Simple Margin Calculation: Qty * Price * Margin Factor
    const marginFactor = product === "MIS" ? 0.2 : 1.0;
    const requiredMargin = parseInt(qty || "0") * ltp * marginFactor;

    // Risk Preview Calculations
    const qtyNum = parseInt(qty || "0");
    const priceNum = parseFloat(price) || ltp;
    const triggerNum = parseFloat(trigger) || 0;
    const orderValue = qtyNum * priceNum;
    const slDistance = triggerNum > 0 ? Math.abs(priceNum - triggerNum) : priceNum * 0.01; // 1% default SL
    const maxLoss = qtyNum * slDistance;
    const potentialProfit = maxLoss * 2; // Default 2:1 RR
    const riskReward = triggerNum > 0 ? (potentialProfit / maxLoss).toFixed(1) : "2.0";
    const marginUtilPct = marginAvailable > 0 ? ((requiredMargin / marginAvailable) * 100).toFixed(0) : "0";
    const marginOk = requiredMargin <= marginAvailable;

    const handleOrderSubmit = async () => {
        const now = Date.now();
        if (submitLock.current || submitting || (now - lastSubmitTimeRef.current < 1000)) {
            console.warn("[OrderPanel] Submit blocked by debounce/lock");
            return;
        }

        submitLock.current = true;
        setSubmitting(true);
        lastSubmitTimeRef.current = now;

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
                        interval,
                        randomizeSizing: blitzRandomize,
                        participationMode: blitzMode
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
            }, 1000); // 1000ms safety debounce
        }
    };

    return (
        <div data-testid="order-entry-panel" className="h-full bg-background border-l border-border flex flex-col tracking-tight transition-colors duration-300">
            {/* Context Header */}
            <div className="p-2 border-b border-border bg-surface-1">
                <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                        <span className="px-1 py-0.5 bg-surface-2 rounded-[2px] text-[8px] items-center font-bold text-muted-foreground border border-border uppercase tracking-widest">NFO</span>
                        <h2 className="text-[11px] font-black text-foreground tracking-tighter uppercase">{symbol}</h2>
                    </div>
                    <div className={cn(
                        "flex flex-col items-end gap-0.5 px-1.5 py-0.5 rounded-sm border tabular-nums transition-colors duration-300",
                        isUp ? "bg-up/10 border-up/20" : "bg-down/10 border-down/20"
                    )}>
                        <div className="flex items-center gap-1 font-mono font-black text-[11px]">
                            {isUp ? <ArrowUpRight className="w-3 h-3 text-up" /> : <div className="w-3 h-3 rotate-180"><ArrowUpRight className="w-3 h-3 text-down" /></div>}
                            <span className={isUp ? "text-up" : "text-down"}>
                                {ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <span className={cn("text-[8px] font-sans font-black", isUp ? "text-up" : "text-down")}>
                            {isUp ? '+' : ''}{change.toFixed(2)}%
                        </span>
                    </div>
                </div>
                <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-1.5">
                    <span className="font-mono uppercase tracking-widest font-black text-[8px]">LTP: <span className={cn("font-black text-[10px] transition-colors", isUp ? "text-up" : "text-down")}>{ltp.toFixed(2)}</span></span>
                    <div className="flex gap-2 font-mono uppercase tracking-widest font-black text-[8px]">
                        <span>OI: <span className="text-foreground">{(currentTicker?.oi || 0).toLocaleString()}</span></span>
                        <span>Vol: <span className="text-foreground">{(currentTicker?.volume || 0).toLocaleString()}</span></span>
                    </div>
                </div>
            </div>

            {/* Scrollable Form Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                {/* Buy/Sell Toggle */}
                <div className="grid grid-cols-2 p-0.5 bg-surface-1 rounded-md gap-0.5 border border-border">
                    <button
                        onClick={() => setSide("buy")}
                        className={cn(
                            "py-1.5 rounded-[4px] text-[10px] font-black tracking-widest transition-all flex items-center justify-center gap-1.5 border border-transparent",
                            side === "buy"
                                ? "bg-up text-black shadow-[0_0_15px_rgba(34,197,94,0.2)] border-up/30"
                                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5 dark:hover:bg-white/[0.02]"
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
                                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5 dark:hover:bg-white/[0.02]"
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
                            : "bg-surface-1 text-muted-foreground border-border hover:bg-white/[0.02] hover:text-foreground"
                    )}
                >
                    <span className={isBlitz ? "animate-pulse" : ""}>⚡ Institutional Blitz</span>
                </button>

                {/* Blitz Controls */}
                {isBlitz && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="grid grid-cols-2 gap-2">
                            <InputGroup label="Slices" value={blitzSlices} setValue={setBlitzSlices} unit="Count" />
                            <InputGroup label="Interval" value={blitzInterval} setValue={setBlitzInterval} unit="Sec" />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setBlitzRandomize(!blitzRandomize)}
                                className={cn(
                                    "flex-1 py-1 rounded-[4px] text-[8px] font-black tracking-widest transition-all border",
                                    blitzRandomize ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400" : "bg-surface-2 border-border text-muted-foreground"
                                )}
                            >
                                ANTI-DETECT {blitzRandomize ? "ON" : "OFF"}
                            </button>
                            <button
                                onClick={() => setBlitzMode(blitzMode === 'FIXED' ? 'VWAP_SYNC' : 'FIXED')}
                                className={cn(
                                    "flex-1 py-1 rounded-[4px] text-[8px] font-black tracking-widest transition-all border",
                                    blitzMode === 'VWAP_SYNC' ? "bg-orange-500/20 border-orange-500/50 text-orange-400" : "bg-surface-2 border-border text-muted-foreground"
                                )}
                            >
                                {blitzMode === 'VWAP_SYNC' ? "VWAP SYNC" : "FIXED RATE"}
                            </button>
                        </div>
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
                                        : "border-border bg-surface-1 text-muted-foreground hover:border-white/10 hover:text-foreground hover:bg-white/[0.02]"
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
                                onClick={() => {
                                    setType(t);
                                    if (t === "MKT" || t === "SL-M") {
                                        setPrice(ltp.toFixed(2));
                                    }
                                }}
                                className={cn(
                                    "py-1 border rounded-[4px] text-[9px] font-black tracking-widest transition-all",
                                    type === t
                                        ? "border-primary/50 bg-primary/10 text-primary"
                                        : "border-border bg-surface-1 text-muted-foreground hover:border-white/10 hover:text-foreground hover:bg-white/[0.02]"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quick Lot Presets */}
                <div className="space-y-1">
                    <Label>Quick Qty</Label>
                    <div className="flex gap-1">
                        {[
                            { label: "1L", qty: "50" },
                            { label: "2L", qty: "100" },
                            { label: "5L", qty: "250" },
                            { label: "10L", qty: "500" },
                        ].map((preset) => (
                            <button
                                type="button"
                                key={preset.label}
                                onClick={() => setQty(preset.qty)}
                                className={cn(
                                    "flex-1 py-1 border rounded-[4px] text-[9px] font-black tracking-widest transition-all",
                                    qty === preset.qty
                                        ? "border-primary/50 bg-primary/10 text-primary"
                                        : "border-border bg-surface-1 text-muted-foreground hover:border-white/10 hover:text-foreground hover:bg-white/[0.02]"
                                )}
                            >
                                {preset.label}
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

                {/* Risk Preview Toggle */}
                <button
                    type="button"
                    onClick={() => setShowRiskPreview(!showRiskPreview)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-[4px] bg-surface-1 border border-border text-[8px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-white/10 transition-all"
                >
                    <span>Risk Preview</span>
                    <span className={cn("transition-transform duration-200", showRiskPreview ? "rotate-180" : "")}>▾</span>
                </button>

                {showRiskPreview && (
                    <div className="rounded-md border border-border overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="px-2 py-1.5 bg-surface-2 border-b border-border">
                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Pre-Order Risk Analysis</span>
                        </div>
                        <div className="p-2 space-y-2">
                            {/* Order value + RR */}
                            <div className="grid grid-cols-3 gap-1">
                                <div className="text-center p-1.5 rounded-[4px] bg-surface-1 border border-border">
                                    <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Order Value</p>
                                    <p className="text-[10px] font-black text-foreground tabular-nums mt-0.5">
                                        ₹{orderValue > 0 ? (orderValue / 100000).toFixed(1) + "L" : "—"}
                                    </p>
                                </div>
                                <div className="text-center p-1.5 rounded-[4px] bg-surface-1 border border-border">
                                    <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Max Loss</p>
                                    <p className="text-[10px] font-black text-down tabular-nums mt-0.5">
                                        ₹{maxLoss > 0 ? maxLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : "—"}
                                    </p>
                                </div>
                                <div className="text-center p-1.5 rounded-[4px] bg-surface-1 border border-border">
                                    <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">R:R</p>
                                    <p className="text-[10px] font-black text-cyan-400 tabular-nums mt-0.5">1:{riskReward}</p>
                                </div>
                            </div>

                            {/* Margin Utilisation Bar */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Margin Utilisation</span>
                                    <span className={cn(
                                        "text-[9px] font-black tabular-nums",
                                        !marginOk ? "text-down" : parseInt(marginUtilPct) > 70 ? "text-amber-400" : "text-up"
                                    )}>
                                        {marginUtilPct}%
                                    </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500 origin-left",
                                            !marginOk ? "bg-down" : parseInt(marginUtilPct) > 70 ? "bg-amber-400" : "bg-up",
                                            parseInt(marginUtilPct) >= 100 ? "w-full" :
                                            parseInt(marginUtilPct) >= 90 ? "w-[90%]" :
                                            parseInt(marginUtilPct) >= 80 ? "w-[80%]" :
                                            parseInt(marginUtilPct) >= 70 ? "w-[70%]" :
                                            parseInt(marginUtilPct) >= 60 ? "w-[60%]" :
                                            parseInt(marginUtilPct) >= 50 ? "w-[50%]" :
                                            parseInt(marginUtilPct) >= 40 ? "w-[40%]" :
                                            parseInt(marginUtilPct) >= 30 ? "w-[30%]" :
                                            parseInt(marginUtilPct) >= 20 ? "w-[20%]" :
                                            parseInt(marginUtilPct) >= 10 ? "w-[10%]" : "w-[5%]"
                                        )}
                                    />
                                </div>
                                {!marginOk && (
                                    <p className="text-[8px] text-down font-black uppercase tracking-widest">⚠ Insufficient Margin</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Margin Info Box */}
                <div className="bg-surface-1 rounded-md border border-border overflow-hidden">
                    <div className="px-2 py-1.5 border-b border-border bg-surface-2 flex justify-between items-center">
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Margin Required</span>
                        <RefreshCcw className="w-2.5 h-2.5 text-muted-foreground cursor-pointer hover:rotate-180 transition-transform duration-500 hover:text-primary" />
                    </div>
                    <div className="p-2 space-y-0.5">
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="text-muted-foreground font-black uppercase tracking-widest text-[8px]">Total Required</span>
                            <span className={cn(
                                "font-mono font-black tabular-nums tracking-tighter",
                                requiredMargin > marginAvailable ? "text-down" : "text-foreground"
                            )}>
                                ₹{requiredMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-muted-foreground">
                            <span className="uppercase tracking-widest font-black text-[7px]">Current Available</span>
                            <span className="font-mono tabular-nums font-black tracking-tighter text-foreground">
                                ₹{marginAvailable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-2 border-t border-border bg-surface-1 mt-auto">
                <button
                    type="button"
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
    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest pl-0.5">{children}</span>
);

const InputGroup = ({ label, value, setValue, unit, disabled }: any) => {
    const id = `order-input-${label.toLowerCase().replace(/\s+/g, '-')}`;
    return (
        <div className={cn("space-y-1", disabled && "opacity-40 pointer-events-none")}>
            <label htmlFor={id} className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest pl-0.5">
                {label}
            </label>
            <div className="relative group">
                <input
                    id={id}
                    type="text"
                    value={value}
                    onChange={(e) => setValue && setValue(e.target.value)}
                    disabled={disabled}
                    aria-label={label}
                    className="w-full bg-surface-1 border border-border rounded-[4px] px-2 py-1 text-[11px] text-foreground font-mono tracking-tighter outline-none focus:border-primary/50 focus:bg-white/[0.02] transition-all group-hover:border-white/10"
                />
                {unit && <span className="absolute right-2 top-[3px] text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{unit}</span>}
            </div>
        </div>
    );
};

