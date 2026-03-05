"use client";

import React, { useMemo } from "react";
import { useOrderStore } from "@/hooks/useOrderStore";
import { useMarketStore } from "@/hooks/useMarketStore";
import { blackScholes, BSResult } from "@/lib/black-scholes";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { ShieldAlert, Info, TrendingUp, TrendingDown, Clock, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export const GreeksDashboard = () => {
    const { positions } = useOrderStore();
    const tickers = useMarketStore(s => s.tickers);

    const portfolioGreeks = useMemo(() => {
        let totalDelta = 0;
        let totalGamma = 0;
        let totalTheta = 0;
        let totalVega = 0;
        let totalValue = 0;

        const positionDetails = positions.map(pos => {
            const isOption = pos.symbol.includes('CE') || pos.symbol.includes('PE');
            if (!isOption) return { ...pos, greeks: null };

            // Determine Spot
            const baseSymbol = pos.symbol.split(/[0-9]/)[0]; // Simplistic extraction
            const spotSymbol = baseSymbol === "NIFTY" ? "NIFTY 50" : baseSymbol === "BANKNIFTY" ? "NIFTY BANK" : baseSymbol;
            const spotPrice = tickers[spotSymbol]?.last_price || 0;
            const lastPrice = tickers[pos.symbol]?.last_price || pos.last_price || 0;

            if (spotPrice === 0) return { ...pos, greeks: null };

            // Find Strike (Simplistic)
            const strikeMatch = pos.symbol.match(/[0-9]{5}/);
            const strike = strikeMatch ? parseInt(strikeMatch[0]) : 0;
            const type = pos.symbol.endsWith('CE') ? 'CE' : 'PE';

            // Constants
            const T = (7 - new Date().getDay()) / 365; // Approx days to expiry if weekly? Default 5 days.
            const r = 0.07;
            const v = 0.20; // Hardcoded fallback IV

            const greeks = blackScholes(spotPrice, strike, Math.max(0.001, T), r, v, type);

            // Adjust for Quantity
            totalDelta += greeks.delta * pos.quantity;
            totalGamma += greeks.gamma * pos.quantity;
            totalTheta += greeks.theta * pos.quantity;
            totalVega += greeks.vega * pos.quantity;
            totalValue += lastPrice * pos.quantity;

            return { ...pos, greeks };
        });

        return { totalDelta, totalGamma, totalTheta, totalVega, totalValue, positionDetails };
    }, [positions, tickers]);

    return (
        <div className="flex flex-col h-full bg-black font-mono select-none">
            <WidgetHeader
                id="greeks-dashboard"
                title="PORTFOLIO GREEKS"
                action={<ShieldAlert className="w-3 h-3 text-red-500 animate-pulse" />}
            />

            <div className="p-3 grid grid-cols-2 gap-2 border-b border-white/10 bg-zinc-900/40">
                <MetricCard
                    label="NET DELTA"
                    value={portfolioGreeks.totalDelta}
                    icon={<TrendingUp className="w-3 h-3 text-cyan-400" />}
                    subtext="Market Bias"
                    color={portfolioGreeks.totalDelta >= 0 ? "text-cyan-400" : "text-red-400"}
                />
                <MetricCard
                    label="THETA DECAY"
                    value={portfolioGreeks.totalTheta}
                    icon={<Clock className="w-3 h-3 text-orange-400" />}
                    subtext="₹ / Day"
                    format="currency"
                    color="text-orange-400"
                />
                <MetricCard
                    label="VEGA RISK"
                    value={portfolioGreeks.totalVega}
                    icon={<Activity className="w-3 h-3 text-purple-400" />}
                    subtext="Vol Sensitivity"
                    color="text-purple-400"
                />
                <MetricCard
                    label="NET GAMMA"
                    value={portfolioGreeks.totalGamma}
                    icon={<TrendingUp className="w-3 h-3 text-green-400" />}
                    subtext="Acceleration"
                    color="text-green-400"
                />
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
                <table className="w-full text-[9px]">
                    <thead className="sticky top-0 bg-black text-zinc-500 border-b border-white/10 uppercase font-black tracking-widest">
                        <tr>
                            <th className="p-2 text-left">Symbol</th>
                            <th className="p-2 text-right">Delta</th>
                            <th className="p-2 text-right">Theta</th>
                            <th className="p-2 text-right">Vega</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {portfolioGreeks.positionDetails.map(pos => pos.greeks && (
                            <tr key={pos.symbol} className="hover:bg-white/5 group">
                                <td className="p-2 font-bold text-zinc-300 group-hover:text-white">{pos.symbol}</td>
                                <td className={cn("p-2 text-right tabular-nums", pos.greeks.delta > 0 ? "text-cyan-400" : "text-red-400")}>
                                    {(pos.greeks.delta * pos.quantity).toFixed(1)}
                                </td>
                                <td className="p-2 text-right tabular-nums text-orange-400">
                                    {(pos.greeks.theta * pos.quantity).toFixed(0)}
                                </td>
                                <td className="p-2 text-right tabular-nums text-purple-400">
                                    {(pos.greeks.vega * pos.quantity).toFixed(1)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {positions.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-10 text-zinc-600 gap-2 opacity-30">
                        <Info className="w-8 h-8" />
                        <span className="text-[10px] uppercase">No active exposures detected.</span>
                    </div>
                )}
            </div>

            <div className="p-2 bg-red-900/10 border-t border-white/5 text-[8px] text-zinc-500 italic text-center">
                WARNING: Greeks are theoretical approximations based on Black-Scholes.
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, icon, subtext, color, format = "number" }: any) => {
    const formatted = format === "currency" ? `₹${Math.round(value).toLocaleString()}` : value.toFixed(2);
    return (
        <div className="p-2 rounded border border-white/5 bg-black/40">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] text-zinc-500 uppercase font-black">{label}</span>
                {icon}
            </div>
            <div className={cn("text-sm font-black tabular-nums", color)}>{formatted}</div>
            <div className="text-[8px] text-zinc-600 uppercase">{subtext}</div>
        </div>
    );
}
