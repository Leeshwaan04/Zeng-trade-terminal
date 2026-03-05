"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { calculateIV } from "@/lib/black-scholes";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { TrendingUp, Activity } from "lucide-react";

interface IVSkewData {
    strike: number;
    callIV: number;
    putIV: number;
}

export const IVSkewWidget = ({ symbol = "NIFTY" }: { symbol?: string }) => {
    const [instruments, setInstruments] = useState<any[]>([]);
    const [expiry, setExpiry] = useState<string | null>(null);
    const [allExpiries, setAllExpiries] = useState<string[]>([]);
    const tickers = useMarketStore(s => s.tickers);

    // Spot Price
    const spotSymbol = symbol === "NIFTY" ? "NIFTY 50" : symbol === "BANKNIFTY" ? "NIFTY BANK" : symbol;
    const spotPrice = tickers[spotSymbol]?.last_price || 0;

    // 1. Fetch Option Chain structure
    useEffect(() => {
        const fetchChain = async () => {
            try {
                const url = `/api/kite/option-chain?symbol=${symbol}${expiry ? `&expiry=${expiry}` : ""}`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.success) {
                    setInstruments(data.strikes);
                    setAllExpiries(data.allExpiries || []);
                    if (!expiry) setExpiry(data.activeExpiry);
                }
            } catch (e) {
                console.error("IV Skew: Failed to fetch chain", e);
            }
        };
        fetchChain();
    }, [symbol, expiry]);

    // 2. Calculate Skew Data
    const skewData = useMemo(() => {
        if (!spotPrice || instruments.length === 0 || !expiry) return [];

        const now = new Date();
        const expDate = new Date(expiry);
        const timeToExpiryYears = Math.max(0.0001, (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365));
        const riskFreeRate = 0.07; // 7% standard

        return instruments.map(strikeObj => {
            const ceToken = String(strikeObj.ce?.instrument_token || "");
            const peToken = String(strikeObj.pe?.instrument_token || "");

            const cePrice = tickers[ceToken]?.last_price || 0;
            const pePrice = tickers[peToken]?.last_price || 0;

            let callIV = 0;
            let putIV = 0;

            if (cePrice > 0) {
                callIV = calculateIV(cePrice, spotPrice, strikeObj.strike, timeToExpiryYears, riskFreeRate, 'CE') * 100;
            }
            if (pePrice > 0) {
                putIV = calculateIV(pePrice, spotPrice, strikeObj.strike, timeToExpiryYears, riskFreeRate, 'PE') * 100;
            }

            return {
                strike: strikeObj.strike,
                callIV: callIV > 0 && callIV < 200 ? parseFloat(callIV.toFixed(2)) : null,
                putIV: putIV > 0 && putIV < 200 ? parseFloat(putIV.toFixed(2)) : null,
            };
        }).filter(d => d.callIV !== null || d.putIV !== null);
    }, [instruments, tickers, spotPrice, expiry]);

    return (
        <div className="flex flex-col h-full bg-black font-mono select-none">
            <WidgetHeader
                id="iv-skew"
                title={`${symbol} IV SKEW`}
                action={
                    <div className="flex items-center gap-2">
                        <select
                            value={expiry || ""}
                            onChange={(e) => setExpiry(e.target.value)}
                            className="bg-zinc-900 text-[9px] border border-white/10 text-primary px-1 rounded outline-none"
                        >
                            {allExpiries.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <TrendingUp className="w-3 h-3 text-[var(--neon-cyan)]" />
                    </div>
                }
            />

            <div className="flex-1 p-2 min-h-0">
                {skewData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={skewData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis
                                dataKey="strike"
                                fontSize={9}
                                stroke="#444"
                                tick={{ fill: '#666' }}
                                domain={['auto', 'auto']}
                            />
                            <YAxis
                                fontSize={9}
                                stroke="#444"
                                tick={{ fill: '#666' }}
                                label={{ value: 'IV %', angle: -90, position: 'insideLeft', fill: '#444', fontSize: 10 }}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
                                itemStyle={{ padding: '0px' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                            <Line
                                type="monotone"
                                dataKey="callIV"
                                name="Call IV"
                                stroke="var(--neon-green)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="putIV"
                                name="Put IV"
                                stroke="var(--neon-red)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                        <Activity className="w-8 h-8 opacity-20 animate-pulse" />
                        <span className="text-[10px] tracking-widest uppercase opacity-50">Calculating IV skew...</span>
                    </div>
                )}
            </div>

            <div className="px-3 py-1 bg-zinc-900/50 border-t border-white/5 flex justify-between text-[8px] text-zinc-500 italic">
                <span>* IV Calculated via Black-Scholes (r=7%)</span>
                <span>SPOT: {spotPrice.toFixed(2)}</span>
            </div>
        </div>
    );
};
