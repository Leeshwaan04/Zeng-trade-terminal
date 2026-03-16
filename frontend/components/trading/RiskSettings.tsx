"use client";

import React, { useState } from "react";
import { Shield, AlertTriangle, Save, RefreshCw, Lock } from "lucide-react";
import { useSafetyStore } from "@/hooks/useSafetyStore";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export const RiskSettings = () => {
    const { isArmed, dailyLossLimit, maxOrderValue, maxQtyPerInstrument, setDailyLossLimit, setMaxOrderValue, setMaxQtyPerInstrument } = useSafetyStore();
    const { toast } = useToast();

    const [localLoss, setLocalLoss] = useState(dailyLossLimit.toString());
    const [localOrder, setLocalOrder] = useState(maxOrderValue.toString());
    const [localQty, setLocalQty] = useState(JSON.stringify(maxQtyPerInstrument));

    const handleSave = () => {
        setDailyLossLimit(parseFloat(localLoss));
        setMaxOrderValue(parseFloat(localOrder));
        try {
            setMaxQtyPerInstrument(JSON.parse(localQty));
            toast({ title: "Risk Guards Updated", description: "Institutional safety limits are now active." });
        } catch (e) {
            toast({ title: "Invalid Qty Format", description: "Please use valid JSON for quantity caps.", variant: "destructive" });
        }
    };

    return (
        <div className="p-6 space-y-6 bg-background text-foreground max-w-lg mx-auto border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg",
                        isArmed ? "bg-up/10 text-up" : "bg-zinc-800 text-zinc-500"
                    )}>
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest">Risk Guard Center</h2>
                        <p className="text-[10px] text-muted-foreground font-bold">Institutional Safety Enforcement</p>
                    </div>
                </div>
                {!isArmed && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-down/10 border border-down/20 rounded text-[9px] font-black text-down animate-pulse">
                        <Lock className="w-3 h-3" />
                        SYSTEM SAFE
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <RiskField
                    label="Daily Loss Limit (M2M)"
                    sub="Auto-blocks all orders if hit"
                    value={localLoss}
                    setValue={setLocalLoss}
                    icon="₹"
                />
                <RiskField
                    label="Max Order Value"
                    sub="Prevents fat-finger errors"
                    value={localOrder}
                    setValue={setLocalOrder}
                    icon="₹"
                />
                <div className="space-y-1.5 text-numeral">
                    <div className="flex justify-between">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Quantity Caps (JSON)</label>
                        <span className="text-[8px] text-zinc-500 font-mono italic">per instrument</span>
                    </div>
                    <textarea
                        value={localQty}
                        onChange={(e) => setLocalQty(e.target.value)}
                        className="w-full bg-surface-1 border border-border rounded-lg p-3 text-xs font-mono text-foreground focus:border-primary/50 outline-none h-24 transition-all"
                    />
                </div>
            </div>

            <div className="bg-down/5 border border-down/20 rounded-xl p-4 flex gap-4 items-start">
                <AlertTriangle className="w-5 h-5 text-down shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <h4 className="text-[11px] font-black text-down uppercase">Caution: Override Restricted</h4>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                        These limits are stored on the server and enforced at the API gateway. Once a limit is breached, the terminal will enter **SAFE MODE** automatically.
                    </p>
                </div>
            </div>

            <button
                onClick={handleSave}
                className="w-full py-3 bg-foreground text-background font-black rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
            >
                <Save className="w-4 h-4" />
                Apply Global Limits
            </button>
        </div>
    );
};

const RiskField = ({ label, sub, value, setValue, icon }: any) => (
    <div className="space-y-1.5 text-numeral">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{label}</label>
        <div className="relative group">
            {icon && <span className="absolute left-3 top-2.5 text-zinc-500 text-xs font-bold">{icon}</span>}
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={cn(
                    "w-full bg-surface-1 border border-border rounded-xl py-2.5 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all",
                    icon ? "pl-7 pr-4" : "px-4"
                )}
            />
            <div className="absolute right-3 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <RefreshCw className="w-3.5 h-3.5 text-zinc-600" />
            </div>
        </div>
        <p className="text-[9px] text-zinc-500 font-medium pl-1">{sub}</p>
    </div>
);
