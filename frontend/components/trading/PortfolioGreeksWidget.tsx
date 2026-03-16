"use client";

import React, { useMemo } from "react";
import { useOrderStore } from "@/hooks/useOrderStore";
import { useMarketStore } from "@/hooks/useMarketStore";
import { blackScholes } from "@/lib/black-scholes";
import { cn } from "@/lib/utils";
import { Activity, TrendingDown, Clock, Zap } from "lucide-react";
import { WidgetHeader } from "@/components/ui/WidgetHeader";

interface GreeksRow {
    symbol: string;
    qty: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    iv: number;
    spotPrice: number;
}

const fmt = (v: number, decimals = 2) =>
    v === 0 ? "—" : v.toFixed(decimals);

const GreekCell = ({ value, invert = false, unit = "" }: { value: number; invert?: boolean; unit?: string }) => {
    const positive = invert ? value <= 0 : value >= 0;
    return (
        <span className={cn(
            "tabular-nums font-mono font-black text-[9px]",
            value === 0 ? "text-muted-foreground" :
                positive ? "text-cyan-400" : "text-orange-400"
        )}>
            {value >= 0 ? "+" : ""}{fmt(value)}{unit}
        </span>
    );
};

export const PortfolioGreeksWidget = () => {
    const { positions } = useOrderStore();
    const tickers = useMarketStore(s => s.tickers);

    const rows: GreeksRow[] = useMemo(() => {
        return positions
            .filter(p => p.quantity !== 0 && (p.symbol.endsWith("CE") || p.symbol.endsWith("PE")))
            .map(pos => {
                const baseSymbol = pos.symbol.split(/[0-9]/)[0];
                const spotSymbol = baseSymbol === "NIFTY" ? "NIFTY 50"
                    : baseSymbol === "BANKNIFTY" ? "NIFTY BANK"
                    : baseSymbol;
                const spotPrice = tickers[spotSymbol]?.last_price ?? 0;
                const strikeMatch = pos.symbol.match(/(\d{4,6})/);
                const strike = strikeMatch ? parseInt(strikeMatch[1]) : 0;
                const optType = pos.symbol.endsWith("CE") ? "CE" : "PE";
                const T = Math.max(1, 5) / 365; // days to expiry estimate

                const g = spotPrice > 0 && strike > 0
                    ? blackScholes(spotPrice, strike, T, 0.07, 0.2, optType)
                    : { delta: 0, gamma: 0, theta: 0, vega: 0, iv: 0 };

                return {
                    symbol: pos.symbol,
                    qty: pos.quantity,
                    delta: g.delta * pos.quantity,
                    gamma: g.gamma * pos.quantity,
                    theta: g.theta * pos.quantity,
                    vega: g.vega * pos.quantity,
                    iv: (g as any).iv ?? 0.2,
                    spotPrice,
                };
            });
    }, [positions, tickers]);

    const totals = useMemo(() => rows.reduce(
        (acc, r) => ({
            delta: acc.delta + r.delta,
            gamma: acc.gamma + r.gamma,
            theta: acc.theta + r.theta,
            vega:  acc.vega  + r.vega,
        }),
        { delta: 0, gamma: 0, theta: 0, vega: 0 }
    ), [rows]);

    const GREEK_CARDS = [
        {
            key: "delta" as const,
            label: "Net Delta",
            icon: <TrendingDown className="w-3.5 h-3.5" />,
            color: "text-cyan-400",
            bg: "bg-cyan-400/10 border-cyan-400/20",
            desc: "Price sensitivity",
        },
        {
            key: "gamma" as const,
            label: "Net Gamma",
            icon: <Activity className="w-3.5 h-3.5" />,
            color: "text-violet-400",
            bg: "bg-violet-400/10 border-violet-400/20",
            desc: "Delta rate of change",
        },
        {
            key: "theta" as const,
            label: "Net Theta",
            icon: <Clock className="w-3.5 h-3.5" />,
            color: "text-orange-400",
            bg: "bg-orange-400/10 border-orange-400/20",
            desc: "Time decay / day",
            unit: "₹",
        },
        {
            key: "vega" as const,
            label: "Net Vega",
            icon: <Zap className="w-3.5 h-3.5" />,
            color: "text-emerald-400",
            bg: "bg-emerald-400/10 border-emerald-400/20",
            desc: "IV sensitivity (1%)",
        },
    ];

    return (
        <div className="flex flex-col h-full bg-background">
            <WidgetHeader id="portfolio-greeks" title="PORTFOLIO GREEKS" />

            {/* Greek Summary Cards */}
            <div className="grid grid-cols-4 gap-1.5 p-2 border-b border-border">
                {GREEK_CARDS.map(({ key, label, icon, color, bg, desc, unit }) => (
                    <div key={key} className={cn("rounded-lg border p-2 text-center", bg)}>
                        <div className={cn("flex items-center justify-center gap-1 mb-1", color)}>
                            {icon}
                            <span className="text-[7px] font-black uppercase tracking-widest">{label}</span>
                        </div>
                        <p className={cn("text-[16px] font-black tabular-nums leading-none", color)}>
                            {unit ?? ""}{fmt(totals[key], key === "theta" ? 0 : 3)}
                        </p>
                        <p className="text-[7px] text-muted-foreground font-bold mt-0.5">{desc}</p>
                    </div>
                ))}
            </div>

            {/* Per-position greeks table */}
            <div className="flex-1 overflow-y-auto">
                {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                        <Activity className="w-6 h-6 opacity-30" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">No options positions</p>
                    </div>
                ) : (
                    <>
                        {/* Table header */}
                        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] px-3 py-1.5 border-b border-border/40 bg-surface-1 sticky top-0">
                            {["Symbol", "Qty", "Δ Delta", "Γ Gamma", "Θ Theta", "V Vega"].map(h => (
                                <span key={h} className="text-[7px] font-black uppercase tracking-widest text-muted-foreground text-right first:text-left">
                                    {h}
                                </span>
                            ))}
                        </div>

                        {/* Rows */}
                        {rows.map((row) => (
                            <div
                                key={row.symbol}
                                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center px-3 py-2 border-b border-border/20 hover:bg-foreground/[0.02] transition-colors"
                            >
                                <div>
                                    <p className="text-[10px] font-black text-foreground truncate">{row.symbol}</p>
                                    <p className="text-[8px] text-muted-foreground font-bold">
                                        {row.spotPrice > 0 ? `Spot ₹${row.spotPrice.toFixed(0)}` : "—"}
                                    </p>
                                </div>
                                <span className={cn(
                                    "text-right text-[9px] font-black tabular-nums",
                                    row.qty > 0 ? "text-emerald-400" : "text-red-400"
                                )}>
                                    {row.qty > 0 ? "+" : ""}{row.qty}
                                </span>
                                <div className="text-right"><GreekCell value={row.delta} /></div>
                                <div className="text-right"><GreekCell value={row.gamma} /></div>
                                <div className="text-right"><GreekCell value={row.theta} invert /></div>
                                <div className="text-right"><GreekCell value={row.vega} /></div>
                            </div>
                        ))}

                        {/* Totals row */}
                        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center px-3 py-2 bg-surface-2 border-t border-border font-black sticky bottom-0">
                            <span className="text-[8px] text-muted-foreground uppercase tracking-widest">Portfolio Total</span>
                            <span />
                            <div className="text-right"><GreekCell value={totals.delta} /></div>
                            <div className="text-right"><GreekCell value={totals.gamma} /></div>
                            <div className="text-right"><GreekCell value={totals.theta} invert /></div>
                            <div className="text-right"><GreekCell value={totals.vega} /></div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
