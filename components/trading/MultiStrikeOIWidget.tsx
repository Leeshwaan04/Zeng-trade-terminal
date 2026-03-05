"use client";

import React, { useMemo } from "react";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { useLiveOptionChain } from "@/hooks/useLiveOptionChain";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, AreaChart, Area, CartesianGrid } from "recharts";

export const MultiStrikeOIWidget = ({ symbol = "NIFTY 50" }: { symbol?: string }) => {
    const { spotPrice, chainData, loading: chainLoading } = useLiveOptionChain(symbol);
    const [viewMode, setViewMode] = React.useState<"strikes" | "trend">("strikes");
    const [trendData, setTrendData] = React.useState<any[]>([]);
    const [trendLoading, setTrendLoading] = React.useState(false);

    React.useEffect(() => {
        if (viewMode === "trend") {
            setTrendLoading(true);
            fetch(`/api/kite/oi-history?symbol=${symbol.split(' ')[0]}`) // e.g. NIFTY
                .then(res => res.json())
                .then(json => {
                    if (json.status === "success") {
                        setTrendData(json.data);
                    }
                })
                .finally(() => setTrendLoading(false));
        }
    }, [viewMode, symbol]);

    // Prepare data for chart: Filter strikes around SPOT for clean visualization
    const chartData = useMemo(() => {
        if (!chainData || chainData.length === 0) return [];

        // Find nearest strike
        let nearestIdx = 0;
        let minDiff = Infinity;
        chainData.forEach((row, i) => {
            const diff = Math.abs(row.strike - spotPrice);
            if (diff < minDiff) {
                minDiff = diff;
                nearestIdx = i;
            }
        });

        // Take 4 strikes ITM and 4 strikes OTM
        const start = Math.max(0, nearestIdx - 4);
        const end = Math.min(chainData.length, nearestIdx + 5);

        return chainData.slice(start, end).map(row => ({
            strike: row.strike.toString(),
            ceOI: row.ce.oi,
            peOI: row.pe.oi,
            isSpot: Math.abs(row.strike - spotPrice) < 25 // Approximate ATM
        }));
    }, [chainData, spotPrice]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-surface-1 border border-border p-2 rounded shadow-xl font-mono text-[10px]">
                    <div className="text-foreground font-bold mb-1 border-b border-border pb-1">Strike: {label}</div>
                    <div className="text-down">CE OI: {(payload[0].value).toLocaleString()}</div>
                    <div className="text-up">PE OI: {(payload[1].value).toLocaleString()}</div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col h-full bg-surface-1 font-mono">
            <WidgetHeader id="multi-strike-oi" title="OI ANALYSIS" symbol={symbol} />

            <div className="flex px-2 pt-2 gap-2 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                <button
                    onClick={() => setViewMode("strikes")}
                    className={viewMode === "strikes" ? "text-primary border-b-2 border-primary pb-1" : "pb-1"}
                >
                    Strikes
                </button>
                <button
                    onClick={() => setViewMode("trend")}
                    className={viewMode === "trend" ? "text-primary border-b-2 border-primary pb-1" : "pb-1"}
                >
                    Trend
                </button>
            </div>

            <div className="flex-1 p-2 relative">
                {(chainLoading && viewMode === "strikes") || (trendLoading && viewMode === "trend") ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin w-5 h-5 border-2 border-[var(--neon-cyan)] border-t-transparent rounded-full" />
                    </div>
                ) : viewMode === "strikes" ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 10, right: 10, left: 20, bottom: 5 }}
                            barGap={2}
                        >
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="strike"
                                type="category"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#71717a', fontSize: 9, fontWeight: 'bold' }}
                                width={45}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                            <ReferenceLine x={0} stroke="#3f3f46" strokeDasharray="3 3" />

                            <Bar dataKey="ceOI" fill="var(--color-down)" barSize={6} radius={[0, 2, 2, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-ce-${index}`} fill={entry.isSpot ? '#ef4444' : '#7f1d1d'} />
                                ))}
                            </Bar>
                            <Bar dataKey="peOI" fill="var(--color-up)" barSize={6} radius={[0, 2, 2, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-pe-${index}`} fill={entry.isSpot ? '#10b981' : '#064e3b'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCE" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorPE" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="time" tick={{ fill: '#71717a', fontSize: 8 }} axisLine={false} tickLine={false} minTickGap={30} />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', fontSize: '10px' }} />
                            <Area type="monotone" dataKey="ce_total" stroke="#ef4444" fillOpacity={1} fill="url(#colorCE)" strokeWidth={2} name="CE OI" />
                            <Area type="monotone" dataKey="pe_total" stroke="#10b981" fillOpacity={1} fill="url(#colorPE)" strokeWidth={2} name="PE OI" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="px-3 py-2 bg-surface-1 border-t border-border flex items-center justify-between text-[8px] font-bold text-muted-foreground tracking-widest uppercase">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-down rounded-sm inline-block"></span> Call Writers (Res)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-up rounded-sm inline-block"></span> Put Writers (Sup)</span>
            </div>
        </div>
    );
};
