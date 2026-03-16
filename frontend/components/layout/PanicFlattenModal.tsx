"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ShieldAlert, X, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrderStore } from "@/hooks/useOrderStore";

interface PanicFlattenModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const COUNTDOWN_SECONDS = 3;

export const PanicFlattenModal = ({ isOpen, onClose }: PanicFlattenModalProps) => {
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
    const [executing, setExecuting] = useState(false);
    const [done, setDone] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { positions, orders, flattenAll } = useOrderStore();

    const openPositions = positions.filter(p => p.quantity !== 0);
    const pendingOrders = orders.filter(o => o.status === "OPEN");

    const reset = useCallback(() => {
        setCountdown(COUNTDOWN_SECONDS);
        setExecuting(false);
        setDone(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
    }, []);

    useEffect(() => {
        if (!isOpen) { reset(); return; }

        setCountdown(COUNTDOWN_SECONDS);
        intervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current!);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isOpen, reset]);

    const handleExecute = async () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setExecuting(true);
        try {
            await flattenAll();
            setDone(true);
            setTimeout(() => { onClose(); reset(); }, 1500);
        } catch {
            setExecuting(false);
        }
    };

    const handleCancel = () => { onClose(); reset(); };

    if (!isOpen) return null;

    const progress = ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100;
    const circumference = 2 * Math.PI * 28;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={handleCancel}
            />

            {/* Modal */}
            <div className={cn(
                "relative w-[420px] rounded-2xl border overflow-hidden shadow-[0_0_80px_rgba(220,38,38,0.4)]",
                "bg-zinc-950 border-red-500/40",
                "animate-in zoom-in-95 fade-in duration-150"
            )}>
                {/* Red pulsing border */}
                <div className="absolute inset-0 rounded-2xl border-2 border-red-500/20 animate-pulse pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-red-500/20 bg-red-950/30">
                    <div className="flex items-center gap-2.5">
                        <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
                        <div>
                            <p className="text-[12px] font-black text-red-400 uppercase tracking-[0.2em]">PANIC FLATTEN</p>
                            <p className="text-[9px] text-red-500/60 uppercase tracking-widest font-bold">Emergency Risk Closure</p>
                        </div>
                    </div>
                    <button onClick={handleCancel} className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {/* Warning */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-red-950/40 border border-red-500/20">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div className="text-[10px] text-red-300 leading-relaxed font-medium">
                            This will <span className="font-black text-red-400">immediately cancel all pending orders</span> and <span className="font-black text-red-400">close all open positions</span> at market price across all connected brokers.
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                            <p className="text-[22px] font-black text-white tabular-nums">{openPositions.length}</p>
                            <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">Open Positions</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                            <p className="text-[22px] font-black text-white tabular-nums">{pendingOrders.length}</p>
                            <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">Pending Orders</p>
                        </div>
                    </div>

                    {/* Position list preview */}
                    {openPositions.length > 0 && (
                        <div className="space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                            {openPositions.slice(0, 5).map((pos, i) => (
                                <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/60">
                                    <span className="text-[10px] font-black text-white">{pos.symbol}</span>
                                    <span className={cn(
                                        "text-[9px] font-black",
                                        pos.quantity > 0 ? "text-emerald-400" : "text-red-400"
                                    )}>
                                        {pos.quantity > 0 ? "LONG" : "SHORT"} {Math.abs(pos.quantity)}
                                    </span>
                                </div>
                            ))}
                            {openPositions.length > 5 && (
                                <p className="text-[9px] text-zinc-500 text-center font-bold">+{openPositions.length - 5} more positions</p>
                            )}
                        </div>
                    )}

                    {/* Countdown Ring + Execute */}
                    {!done ? (
                        <div className="flex items-center gap-4 pt-1">
                            {/* SVG Countdown Ring */}
                            <div className="relative w-[68px] h-[68px] shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                                    <circle
                                        cx="32" cy="32" r="28"
                                        fill="none"
                                        stroke="rgba(239,68,68,0.15)"
                                        strokeWidth="4"
                                    />
                                    <circle
                                        cx="32" cy="32" r="28"
                                        fill="none"
                                        stroke={countdown === 0 ? "#ef4444" : "#dc2626"}
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        className="transition-all duration-1000 ease-linear"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {executing ? (
                                        <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                                    ) : (
                                        <span className={cn(
                                            "text-[22px] font-black tabular-nums transition-colors",
                                            countdown === 0 ? "text-red-500 animate-pulse" : "text-white"
                                        )}>
                                            {countdown}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 space-y-2">
                                <button
                                    onClick={handleExecute}
                                    disabled={executing}
                                    className={cn(
                                        "w-full py-2.5 rounded-xl font-black text-[11px] uppercase tracking-[0.15em] transition-all",
                                        "bg-red-600 hover:bg-red-500 text-white",
                                        "shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)]",
                                        "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
                                        countdown === 0 && "animate-pulse"
                                    )}
                                >
                                    {executing ? "Executing..." : countdown === 0 ? "Execute Now" : `Execute (${countdown}s)`}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="w-full py-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-zinc-400 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 hover:text-white transition-all"
                                >
                                    Cancel — Keep Positions
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-3 py-4">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            <span className="text-[12px] font-black text-emerald-400 uppercase tracking-widest">Flatten Complete</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
