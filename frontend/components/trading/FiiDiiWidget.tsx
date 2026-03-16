"use client";

import React, { useState } from "react";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import { Info, ExternalLink, TrendingUp, TrendingDown, Target } from "lucide-react";

// Mock Data representing Daily Institutional Activity
const trendData = [
    { date: "26 Feb", fii: 450, dii: -200 },
    { date: "27 Feb", fii: 1500, dii: -800 },
    { date: "28 Feb", fii: -2800, dii: 3200 },
    { date: "01 Mar", fii: -1200, dii: 1800 },
    { date: "02 Mar", fii: -800, dii: 1200 },
    { date: "Today", fii: 540, dii: 210 },
];

const segmentData = [
    { segment: "Cash Market", fii: 420.5, dii: -120.2, bias: "BULLISH" },
    { segment: "Index Futures", fii: -120.4, dii: 45.8, bias: "BEARISH" },
    { segment: "Index Options", fii: 1205.6, dii: -340.5, bias: "BULLISH" },
    { segment: "Stock Futures", fii: -340.2, dii: 110.4, bias: "NEUTRAL" },
];

export const FiiDiiWidget = () => {
    const [view, setView] = useState<"trend" | "segment">("trend");

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background/90 backdrop-blur-md border border-border/50 p-2 rounded-lg shadow-2xl font-mono text-[10px]">
                    <div className="text-foreground font-black mb-1 border-b border-border/20 pb-1 uppercase tracking-tighter">{label} Flow</div>
                    <div className="flex justify-between gap-4 mt-1">
                        <span className="text-zinc-500 font-bold">FII:</span>
                        <span className={cn("font-black tabular-nums", payload[0].value >= 0 ? 'text-up' : 'text-down')}>
                            {payload[0].value >= 0 ? '+' : ''}{payload[0].value.toLocaleString()} Cr
                        </span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-zinc-500 font-bold">DII:</span>
                        <span className={cn("font-black tabular-nums", payload[1].value >= 0 ? 'text-primary' : 'text-amber-500')}>
                            {payload[1].value >= 0 ? '+' : ''}{payload[1].value.toLocaleString()} Cr
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col h-full bg-surface-1/50 backdrop-blur-sm font-mono overflow-hidden">
            <WidgetHeader
                id="fii-dii"
                title="Institutional Flow (FII/DII)"
                action={
                    <div className="flex items-center gap-1.5 bg-black/40 p-0.5 rounded-lg border border-white/5">
                        <button
                            onClick={() => setView("trend")}
                            className={cn(
                                "px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter rounded transition-all",
                                view === "trend" ? "bg-primary text-black" : "text-zinc-500 hover:text-foreground"
                            )}
                        >Trend</button>
                        <button
                            onClick={() => setView("segment")}
                            className={cn(
                                "px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter rounded transition-all",
                                view === "segment" ? "bg-primary text-black" : "text-zinc-500 hover:text-foreground"
                            )}
                        >Breakdown</button>
                    </div>
                }
            />

            <div className="flex-1 min-h-0 relative isolate">
                {view === "trend" ? (
                    <div className="h-full w-full p-3 flex flex-col">
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={trendData}
                                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                                    barGap={1}
                                >
                                    <defs>
                                        <linearGradient id="upGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                                        </linearGradient>
                                        <linearGradient id="downGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--muted-foreground)', fontSize: 7, fontWeight: '900' }}
                                        dy={5}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--muted-foreground)', fontSize: 7, fontWeight: '900' }}
                                        domain={['auto', 'auto']}
                                        tickFormatter={(val) => `${val / 1000}k`}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

                                    <Bar dataKey="fii" radius={[2, 2, 0, 0]}>
                                        {trendData.map((entry, index) => (
                                            <Cell key={`cell-fii-${index}`} fill={entry.fii >= 0 ? 'url(#upGradient)' : 'url(#downGradient)'} />
                                        ))}
                                    </Bar>
                                    <Bar dataKey="dii" radius={[2, 2, 0, 0]}>
                                        {trendData.map((entry, index) => (
                                            <Cell key={`cell-dii-${index}`} fill={entry.dii >= 0 ? '#338ce8' : '#eab308'} fillOpacity={0.6} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-2 flex items-center justify-between px-1">
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-up shadow-[0_0_8px_var(--up)]" />
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">FII Net</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-primary/60 border border-primary" />
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">DII Net</span>
                                </div>
                            </div>
                            <span className="text-[8px] text-zinc-600 font-black italic">Unit: Cr (INR)</span>
                        </div>
                    </div>
                ) : (
                    <div className="h-full w-full overflow-y-auto custom-scrollbar p-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-surface-1 z-10">
                                <tr className="border-b border-white/5">
                                    <th className="p-2 text-[8px] font-black text-zinc-500 uppercase tracking-widest">Segment</th>
                                    <th className="p-2 text-[8px] font-black text-zinc-500 uppercase tracking-widest text-right">FII (Cr)</th>
                                    <th className="p-2 text-[8px] font-black text-zinc-500 uppercase tracking-widest text-right">DII (Cr)</th>
                                    <th className="p-2 text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center">Bias</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {segmentData.map((item, idx) => (
                                    <tr key={idx} className="group hover:bg-white/5 transition-colors">
                                        <td className="p-2">
                                            <div className="text-[10px] font-black text-foreground tracking-tight">{item.segment}</div>
                                            <div className="text-[7px] text-zinc-600 font-bold uppercase">PRO Flow</div>
                                        </td>
                                        <td className={cn("p-2 text-[10px] font-bold text-right tabular-nums", item.fii >= 0 ? "text-up" : "text-down")}>
                                            {item.fii >= 0 ? "+" : ""}{item.fii}
                                        </td>
                                        <td className={cn("p-2 text-[10px] font-bold text-right tabular-nums", item.dii >= 0 ? "text-primary" : "text-amber-500")}>
                                            {item.dii >= 0 ? "+" : ""}{item.dii}
                                        </td>
                                        <td className="p-2 text-center">
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded-[4px] text-[7px] font-black tracking-widest uppercase",
                                                item.bias === "BULLISH" ? "bg-up/10 text-up border border-up/20" :
                                                    item.bias === "BEARISH" ? "bg-down/10 text-down border border-down/20" :
                                                        "bg-white/5 text-zinc-500 border border-white/10"
                                            )}>
                                                {item.bias}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="p-4 mt-2 bg-gradient-to-br from-primary/5 to-transparent rounded-xl border border-primary/10">
                            <div className="flex items-center gap-2 mb-1">
                                <Target className="w-3 h-3 text-primary animate-pulse" />
                                <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">Sentiment Guard</span>
                            </div>
                            <p className="text-[9px] text-zinc-500 leading-relaxed font-bold">
                                FIIs are net buyers in Option segments today while DIIs show absorption in Cash market. Overall bias remains <span className="text-up font-black">CAUTIOUSLY BULLISH</span>.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
