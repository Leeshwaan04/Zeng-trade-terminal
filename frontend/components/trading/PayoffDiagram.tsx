"use client";

import React, { useMemo } from "react";
import {
    AreaChart,
    Area,
    Line,
    ComposedChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from "recharts";
import { useStrategyStore, StrategyLeg } from "@/hooks/useStrategyStore";
import { useMarketStore } from "@/hooks/useMarketStore";
import { blackScholes } from "@/lib/black-scholes";

// Normal CDF for Probability estimation
function normCDF(x: number) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
}

export const PayoffDiagram = () => {
    const { legs, ivShift, dayShift, setShifts } = useStrategyStore();

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

        // Base values
        const baseT = 7 / 365; // Assume 7 DTE for demo, or calculate from expiry
        const r = 0.07;
        const baseV = 0.18; // 18% Base IV

        // Shifted values
        const T = Math.max(0.0001, baseT - (dayShift / 365));
        const V = Math.max(0.05, baseV + (ivShift / 100));

        for (let p = start; p <= end; p += step) {
            let expiryPnL = 0;
            let tZeroPnL = 0;

            legs.forEach(leg => {
                const strike = leg.instrument.strike;
                const type = leg.instrument.instrument_type; // 'CE' or 'PE'
                const entry = leg.price;
                const qty = leg.quantity;

                // Expiry PnL (IV/Time shift doesn't affect expiry PnL)
                const intrinsic = type === 'CE' ? Math.max(0, p - strike) : Math.max(0, strike - p);
                const legExpiryPnL = leg.side === 'BUY' ? (intrinsic - entry) * qty : (entry - intrinsic) * qty;
                expiryPnL += legExpiryPnL;

                // T+N PnL via Black-Scholes (Dynamic T and V)
                const bs = blackScholes(p, strike, T, r, V, type as 'CE' | 'PE');
                const theoreticalPrice = bs.price;
                const legTZeroPnL = leg.side === 'BUY' ? (theoreticalPrice - entry) * qty : (entry - theoreticalPrice) * qty;
                tZeroPnL += legTZeroPnL;
            });

            data.push({
                price: parseFloat(p.toFixed(2)),
                pnl: parseFloat(expiryPnL.toFixed(2)),
                tZero: parseFloat(tZeroPnL.toFixed(2)),
            });
        }
        return data;
    }, [legs, currentPrice, ivShift, dayShift]);

    if (legs.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-zinc-600 bg-black/40 backdrop-blur-md italic text-xs">
                Add legs to see payoff diagram
            </div>
        );
    }

    const maxProfit = Math.max(...chartData.map(d => d.pnl));
    const maxLoss = Math.min(...chartData.map(d => d.pnl));

    // Probability of Profit (POP) Approximation
    const pop = useMemo(() => {
        if (chartData.length === 0) return 0;
        // Find breakevens where PnL crosses 0
        const breakevens: number[] = [];
        for (let i = 1; i < chartData.length; i++) {
            if ((chartData[i - 1].pnl < 0 && chartData[i].pnl > 0) || (chartData[i - 1].pnl > 0 && chartData[i].pnl < 0)) {
                breakevens.push(chartData[i].price);
            }
        }

        let probability = 0;
        const v = 0.18 + (ivShift / 100);
        const T = Math.max(0.0001, (7 - dayShift) / 365);

        if (breakevens.length === 0) {
            probability = maxProfit > 0 ? 99 : 1;
        } else if (breakevens.length === 1) {
            const be = breakevens[0];
            const d2 = (Math.log(currentPrice / be) + (0.07 - (v * v) / 2) * T) / (v * Math.sqrt(T));
            const isProfitAbove = chartData[chartData.length - 1].pnl > 0;
            probability = isProfitAbove ? normCDF(d2) * 100 : normCDF(-d2) * 100;
        } else {
            const be1 = breakevens[0];
            const be2 = breakevens[breakevens.length - 1];
            const d2_1 = (Math.log(currentPrice / be1) + (0.07 - (v * v) / 2) * T) / (v * Math.sqrt(T));
            const d2_2 = (Math.log(currentPrice / be2) + (0.07 - (v * v) / 2) * T) / (v * Math.sqrt(T));
            const isProfitInside = chartData[Math.floor(chartData.length / 2)].pnl > 0;
            const probInside = Math.abs(normCDF(d2_1) - normCDF(d2_2)) * 100;
            probability = isProfitInside ? probInside : 100 - probInside;
        }

        return Math.min(99, Math.max(1, probability));
    }, [chartData, currentPrice, ivShift, dayShift, maxProfit]);

    return (
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-md p-3">
            {/* Simulation Controls */}
            <div className="flex gap-4 mb-3 pb-3 border-b border-white/5">
                <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-[8px] font-black text-zinc-500 uppercase">
                        <span>IV Shift ({ivShift > 0 ? '+' : ''}{ivShift}%)</span>
                        <button onClick={() => setShifts({ iv: 0 })} className="hover:text-primary transition-colors">RESET</button>
                    </div>
                    <input
                        type="range"
                        min="-20"
                        max="50"
                        step="1"
                        value={ivShift}
                        onChange={(e) => setShifts({ iv: parseInt(e.target.value) })}
                        className="w-full accent-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-[8px] font-black text-zinc-500 uppercase">
                        <span>Days To Expiry ({7 - dayShift}d)</span>
                        <button onClick={() => setShifts({ days: 0 })} className="hover:text-primary transition-colors">RESET</button>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="7"
                        step="1"
                        value={dayShift}
                        onChange={(e) => setShifts({ days: parseInt(e.target.value) })}
                        className="w-full accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>

            <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Payoff Analyzer
                </h3>

                <div className="flex gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] text-zinc-600 uppercase">POP</span>
                        <span className="text-xs font-bold text-blue-400">{pop.toFixed(1)}%</span>
                    </div>
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
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                            formatter={(value: any, name?: string) => [value ? `₹${Number(value).toLocaleString()}` : "₹0", (name || 'pnl') === 'pnl' ? 'Expiry P&L' : 'T+0 P&L']}
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
                            name="pnl"
                        />
                        <Line
                            type="monotone"
                            dataKey="tZero"
                            stroke="#a855f7"
                            strokeWidth={2}
                            dot={false}
                            name="tZero"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
