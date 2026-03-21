"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Bell, Plus, Trash2, RefreshCw, BellOff, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface KiteAlert {
    id: string;
    name: string;
    condition: {
        lhs_exchange: string;
        lhs_tradingsymbol: string;
        lhs_attribute: string;
        operator: string;
        rhs_constant: number;
    };
    triggered_at: string | null;
    expires_at: string | null;
    status: string;
}

const LHS_ATTRIBUTES = [
    { value: "last_price", label: "LTP (Last Price)" },
    { value: "volume", label: "Volume" },
    { value: "oi", label: "Open Interest" },
];

const OPERATORS = [
    { value: ">", label: "Greater than (>)" },
    { value: ">=", label: "Greater than or equal (≥)" },
    { value: "<", label: "Less than (<)" },
    { value: "<=", label: "Less than or equal (≤)" },
];

export const AlertsManager = () => {
    const [alerts, setAlerts] = useState<KiteAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const { toast } = useToast();

    const [form, setForm] = useState({
        name: "",
        exchange: "NSE",
        symbol: "",
        attribute: "last_price",
        operator: ">",
        value: "",
    });

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/kite/alerts");
            const data = await res.json();
            if (data.status === "success") {
                setAlerts(data.data || []);
            }
        } catch (err) {
            console.error("[Alerts] Fetch failed:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

    const handleCreate = async () => {
        if (!form.symbol || !form.name || !form.value) {
            toast({ title: "Validation Error", description: "Fill all fields before creating alert.", variant: "destructive" });
            return;
        }

        setIsCreating(true);
        try {
            const res = await fetch("/api/kite/alerts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    lhs_exchange: form.exchange,
                    lhs_tradingsymbol: form.symbol.toUpperCase(),
                    lhs_attribute: form.attribute,
                    operator: form.operator,
                    rhs_type: "value",
                    rhs_constant: Number(form.value),
                }),
            });
            const data = await res.json();
            if (data.status === "success") {
                toast({ title: "Alert Created", description: `Alert "${form.name}" is now active.` });
                setForm({ name: "", exchange: "NSE", symbol: "", attribute: "last_price", operator: ">", value: "" });
                await fetchAlerts();
            } else {
                throw new Error(data.error || "Failed to create alert");
            }
        } catch (err: any) {
            toast({ title: "Create Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (uuid: string) => {
        try {
            const res = await fetch(`/api/kite/alerts?uuid=${uuid}`, { method: "DELETE" });
            const data = await res.json();
            if (data.status === "success") {
                toast({ title: "Alert Deleted" });
                setAlerts(prev => prev.filter(a => a.id !== uuid));
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#09090b] text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-200">Price Alerts</span>
                    <span className="bg-amber-500/20 text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded-full border border-amber-500/30">
                        {alerts.length}
                    </span>
                </div>
                <button
                    onClick={fetchAlerts}
                    className="p-1 text-zinc-500 hover:text-white transition-colors"
                >
                    <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Create Alert Form */}
                <div className="p-3 border-b border-white/5 bg-zinc-900/30">
                    <h4 className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-3">Create New Alert</h4>
                    <div className="space-y-2">
                        <input
                            type="text"
                            placeholder="Alert name (e.g. NIFTY breakout)"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full bg-black/40 border border-white/5 rounded px-2 py-1.5 text-[11px] text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/40"
                        />

                        <div className="grid grid-cols-3 gap-2">
                            <select
                                value={form.exchange}
                                onChange={e => setForm(f => ({ ...f, exchange: e.target.value }))}
                                className="bg-black/40 border border-white/5 rounded px-2 py-1.5 text-[11px] text-white focus:outline-none col-span-1"
                            >
                                <option value="NSE">NSE</option>
                                <option value="BSE">BSE</option>
                                <option value="NFO">NFO</option>
                                <option value="MCX">MCX</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Symbol (e.g. INFY-EQ)"
                                value={form.symbol}
                                onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
                                className="col-span-2 bg-black/40 border border-white/5 rounded px-2 py-1.5 text-[11px] text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/40 uppercase"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <select
                                value={form.attribute}
                                onChange={e => setForm(f => ({ ...f, attribute: e.target.value }))}
                                className="bg-black/40 border border-white/5 rounded px-2 py-1.5 text-[11px] text-white focus:outline-none"
                            >
                                {LHS_ATTRIBUTES.map(a => (
                                    <option key={a.value} value={a.value}>{a.label}</option>
                                ))}
                            </select>
                            <select
                                value={form.operator}
                                onChange={e => setForm(f => ({ ...f, operator: e.target.value }))}
                                className="bg-black/40 border border-white/5 rounded px-2 py-1.5 text-[11px] text-white focus:outline-none"
                            >
                                {OPERATORS.map(op => (
                                    <option key={op.value} value={op.value}>{op.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Value"
                                value={form.value}
                                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                                className="flex-1 bg-black/40 border border-white/5 rounded px-2 py-1.5 text-[11px] text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/40"
                            />
                            <button
                                onClick={handleCreate}
                                disabled={isCreating}
                                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded text-[10px] font-black uppercase hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                            >
                                <Plus className="w-3 h-3" />
                                {isCreating ? "..." : "Create"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Alerts List */}
                <div className="p-3 space-y-2">
                    {loading && alerts.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 rounded-full border border-amber-500/30 border-t-amber-400 animate-spin" />
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 text-zinc-600">
                            <BellOff className="w-8 h-8 opacity-20" />
                            <span className="text-[10px] font-black uppercase tracking-widest">No alerts set</span>
                        </div>
                    ) : (
                        alerts.map(alert => (
                            <div
                                key={alert.id}
                                className={cn(
                                    "group flex items-start justify-between p-3 rounded-lg border transition-all",
                                    alert.status === "active"
                                        ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40"
                                        : "border-zinc-800 bg-zinc-900/50 opacity-60"
                                )}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn(
                                            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase",
                                            alert.status === "active" ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-500"
                                        )}>
                                            {alert.status}
                                        </span>
                                        <span className="text-[10px] font-black text-white truncate">{alert.name}</span>
                                    </div>
                                    <div className="text-[9px] text-zinc-500 font-mono">
                                        {alert.condition?.lhs_tradingsymbol} {alert.condition?.lhs_attribute?.replace('_', ' ').toUpperCase()} {alert.condition?.operator} {alert.condition?.rhs_constant?.toLocaleString()}
                                    </div>
                                    {alert.triggered_at && (
                                        <div className="text-[8px] text-zinc-600 mt-1">
                                            Triggered: {new Date(alert.triggered_at).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(alert.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 transition-all ml-2 shrink-0"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
