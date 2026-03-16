"use client";

import React, { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    RefreshCcw,
    Trash2,
    AlertCircle,
    Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface GTTOrder {
    trigger_id: number;
    tradingsymbol: string;
    exchange: string;
    type: string;
    status: string;
    condition: {
        trigger_values: number[];
        last_price: number;
    };
    orders: Array<{
        transaction_type: string;
        quantity: number;
        product: string;
        order_type: string;
        price: number;
    }>;
    updated_at: string;
}

const StatusBadge = ({ status }: { status: string }) => {
    const s = status.toLowerCase();
    const style = s === "active" ? "text-up border-up/30 bg-up/5" :
        s === "triggered" ? "text-primary border-primary/30 bg-primary/5" :
            s === "cancelled" ? "text-muted-foreground border-muted-foreground/30 bg-muted-foreground/5" :
                "text-down border-down/30 bg-down/5";

    return (
        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", style)}>
            {status}
        </span>
    );
};

export const GTTManager = () => {
    const [gtts, setGtts] = useState<GTTOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchGTTs = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/orders/gtt");
            const json = await res.json();
            if (json.status === "success") {
                setGtts(json.data);
            } else {
                setError(json.error || "Failed to fetch GTTs");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const cancelGTT = async (id: number) => {
        try {
            const res = await fetch(`/api/orders/gtt?trigger_id=${id}`, { method: "DELETE" });
            const json = await res.json();
            if (json.status === "success") {
                setGtts(prev => prev.filter(g => g.trigger_id !== id));
            } else {
                alert(json.error || "Failed to cancel GTT");
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    useEffect(() => {
        fetchGTTs();
    }, []);

    return (
        <div className="h-full flex flex-col bg-background/30 backdrop-blur-sm overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-surface/40">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground">GTT Manager</h3>
                    <span className="bg-secondary text-secondary-foreground text-[10px] h-4 px-1.5 font-mono rounded-full flex items-center justify-center">
                        {gtts.length}
                    </span>
                </div>
                <button
                    className="p-1.5 rounded-md hover:bg-primary/10 transition-colors disabled:opacity-50"
                    onClick={fetchGTTs}
                    disabled={loading}
                >
                    <RefreshCcw className={cn("w-3.5 h-3.5 text-muted-foreground", loading && "animate-spin")} />
                </button>
            </div>

            <ScrollArea className="flex-1">
                {error && (
                    <div className="p-4 flex flex-col items-center justify-center text-center gap-2">
                        <AlertCircle className="w-8 h-8 text-down/50" />
                        <p className="text-xs text-muted-foreground">{error}</p>
                        <button onClick={fetchGTTs} className="mt-2 text-[10px] h-8 px-4 border border-border rounded-md hover:bg-muted transition-colors">
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && gtts.length === 0 && (
                    <div className="p-8 flex flex-col items-center justify-center text-center opacity-40 grayscale">
                        <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-3">
                            <Clock className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">No Active GTT Triggers</p>
                    </div>
                )}

                <div className="w-full overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-surface-2/50 sticky top-0 z-10">
                            <tr className="border-b border-border/60">
                                <th className="h-8 text-[9px] uppercase font-bold text-muted-foreground px-3">Instrument</th>
                                <th className="h-8 text-[9px] uppercase font-bold text-muted-foreground px-2">Type</th>
                                <th className="h-8 text-[9px] uppercase font-bold text-muted-foreground px-2 text-right">Trigger</th>
                                <th className="h-8 text-[9px] uppercase font-bold text-muted-foreground text-right px-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {gtts.map((gtt) => (
                                <tr key={gtt.trigger_id} className="group border-b border-border/20 hover:bg-primary/5 transition-colors">
                                    <td className="px-3 py-2">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-foreground leading-tight">
                                                {gtt.tradingsymbol}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">{gtt.exchange}</span>
                                                <div className="w-0.5 h-0.5 rounded-full bg-border" />
                                                <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">
                                                    {gtt.orders[0]?.product}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2">
                                        <div className="flex flex-col gap-1">
                                            <StatusBadge status={gtt.status} />
                                            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none ml-1">
                                                {gtt.type === "single" ? "Single" : "OCO"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                        <div className="flex flex-col">
                                            <div className="flex items-center justify-end gap-1 text-[11px] font-mono font-bold text-primary">
                                                <span>₹{gtt.condition.trigger_values[0]}</span>
                                                {gtt.type === "two-leg" && (
                                                    <>
                                                        <span className="text-muted-foreground text-[9px]">/</span>
                                                        <span>₹{gtt.condition.trigger_values[1]}</span>
                                                    </>
                                                )}
                                            </div>
                                            <span className="text-[9px] text-muted-foreground">
                                                Qty: {gtt.orders[0]?.quantity}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <button
                                            className="p-1.5 rounded-md text-muted-foreground hover:text-down hover:bg-down/10 transition-all opacity-0 group-hover:opacity-100"
                                            onClick={() => cancelGTT(gtt.trigger_id)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ScrollArea>
        </div>
    );
};
