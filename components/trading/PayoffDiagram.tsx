"use client";

import React, { useMemo } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from "recharts";
import { useStrategyStore, StrategyLeg } from "@/hooks/useStrategyStore";
import { useMarketStore } from "@/hooks/useMarketStore";

export const PayoffDiagram = () => {
    const { legs } = useStrategyStore();

    // Derive underlying from first leg or default
    const underlyingSymbol = legs[0]?.instrument?.name || "NIFTY 50";
    // Adjust symbol lookup if needed (e.g. NIFTY -> NIFTY 50)
    const lookupSymbol = underlyingSymbol === "NIFTY" ? "NIFTY 50" : underlyingSymbol === "BANKNIFTY" ? "NIFTY BANK" : underlyingSymbol;

    const ticker = useMarketStore(state => state.tickers[lookupSymbol]);
    const currentPrice = ticker?.last_price || legs[0]?.instrument?.strike || 21500;

    const chartData = useMemo(() => {
        if (legs.length === 0) return [];

        const data = [];
        // Determine range based on strikes
        const strikes = legs.map(l => l.instrument.strike);
        const minStrike = Math.min(...strikes, currentPrice);
        const maxStrike = Math.max(...strikes, currentPrice);
        const range = (maxStrike - minStrike) * 1.5 || 1000; // Dynamic range

        // Round range to nice numbers
        const center = currentPrice;
        const start = Math.floor((center - range / 2) / 100) * 100;
        const end = Math.ceil((center + range / 2) / 100) * 100;
        const step = (end - start) / 100;

        for (let p = start; p <= end; p += step) {
            let totalPnL = 0;

            legs.forEach(leg => {
                let legPnL = 0;
                const strike = leg.instrument.strike;
                const type = leg.instrument.instrument_type; // CE or PE
                const entry = leg.price;
                const qty = leg.quantity;

                if (type === 'CE') {
                    const intrinsic = Math.max(0, p - strike);
                    if (leg.side === 'BUY') {
                        // Long Call: Max(0, S-K) - Premium
                        legPnL = (intrinsic - entry) * qty;
                    } else {
                        // Short Call: Premium - Max(0, S-K)
                        legPnL = (entry - intrinsic) * qty;
                    }
                } else {
                    // PE
                    const intrinsic = Math.max(0, strike - p);
                    if (leg.side === 'BUY') {
                        // Long Put: Max(0, K-S) - Premium
                        legPnL = (intrinsic - entry) * qty;
                    } else {
                        // Short Put: Premium - Max(0, K-S)
                        legPnL = (entry - intrinsic) * qty;
                    }
                }
                totalPnL += legPnL;
            });

            data.push({
                price: parseFloat(p.toFixed(2)),
                pnl: parseFloat(totalPnL.toFixed(2)),
            });
        }
        return data;
    }, [legs, currentPrice]);

    if (legs.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-zinc-600 bg-black/40 backdrop-blur-md italic text-xs">
                Add legs to see payoff diagram
            </div>
        );
    }

    const maxProfit = Math.max(...chartData.map(d => d.pnl));
    const maxLoss = Math.min(...chartData.map(d => d.pnl));

    return (
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-md p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Payoff Analysis</h3>
                <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] text-zinc-600 uppercase">Max Profit</span>
                        <span className="text-xs font-bold text-up">{maxProfit > 1000000 ? "UNLIMITED" : `₹${maxProfit.toLocaleString()}`}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] text-zinc-600 uppercase">Max Loss</span>
                        <span className="text-xs font-bold text-down">{maxLoss < -1000000 ? "UNLIMITED" : `₹${maxLoss.toLocaleString()}`}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#CCFF00" stopOpacity={0.3} />
                                <stop offset="50%" stopColor="#CCFF00" stopOpacity={0} />
                                <stop offset="95%" stopColor="#FF4D4D" stopOpacity={0.3} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="price"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            tick={{ fontSize: 10, fill: '#71717a' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#71717a' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--surface-1, #0a0a0a)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            itemStyle={{ fontSize: 12, color: '#fff' }}
                            labelStyle={{ fontSize: 10, color: '#71717a' }}
                            formatter={(value: any) => [value ? `₹${Number(value).toLocaleString()}` : "₹0", 'P&L']}
                            labelFormatter={(label) => `Price: ₹${label}`}
                        />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                        <ReferenceLine x={currentPrice} stroke="#00e5ff" strokeDasharray="3 3" label={{ value: 'SPOT', fill: '#00e5ff', fontSize: 10, position: 'top' }} />
                        <Area
                            type="monotone"
                            dataKey="pnl"
                            stroke="#00e5ff"
                            fillOpacity={1}
                            fill="url(#pnlGradient)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
